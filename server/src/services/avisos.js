import nodemailer from 'nodemailer';
import { enviarWhatsapp, whatsappListo } from './whatsapp.js';

/**
 * Avisos de reposición.
 *  - Lista de productos por reponer, con la cantidad sugerida para volver a un nivel sano.
 *  - Correo con esa lista (SMTP configurado en server/.env, nunca en el código).
 *  - Revisión automática: cada minuto junta las alertas nuevas de `alerta_stock`
 *    y manda UN correo con todas, para no llenar la bandeja.
 */

/* ---------- Productos por reponer ---------- */

export const estadoDe = (p) => (p.existencias <= 0 ? 'agotado' : p.existencias <= p.stock_minimo ? 'bajo' : 'ok');
// Cuánto pedir para quedar en el doble del mínimo (al menos 1)
export const sugeridoDe = (p) => Math.max(p.stock_minimo * 2 - p.existencias, 1);

const SELECT_INVENTARIO = `
  SELECT p.id, p.nombre, p.slug, p.precio, p.existencias, p.stock_minimo, p.imagen, p.pieza_3d, p.modelo_codigo,
         c.nombre AS categoria, c.slug AS categoria_slug
  FROM producto p JOIN categoria c ON c.id = p.categoria_id
  WHERE p.eliminado_en IS NULL AND p.activo`;

/** Todo el inventario activo, con estado y cantidad sugerida */
export async function inventario(db) {
  const { rows } = await db.query(`${SELECT_INVENTARIO}
    ORDER BY (p.existencias <= 0) DESC, (p.existencias <= p.stock_minimo) DESC,
             p.existencias::numeric / GREATEST(p.stock_minimo, 1), p.nombre`);
  return rows.map((p) => ({ ...p, estado: estadoDe(p), sugerido: estadoDe(p) === 'ok' ? 0 : sugeridoDe(p) }));
}

export const porReponer = async (db) => (await inventario(db)).filter((p) => p.estado !== 'ok');

/* ---------- Ajustes (a quién avisar) ---------- */

export async function leerAjuste(db) {
  const { rows } = await db.query('SELECT * FROM ajuste_reposicion WHERE id = 1');
  return rows[0] ?? { correo_destino: null, aviso_automatico: true, proveedor_nombre: null, proveedor_whatsapp: null, whatsapp_automatico: true };
}

/* ---------- Correo ---------- */

let transportePrueba = null;
/** Solo para las pruebas: usa un transporte falso en lugar de SMTP */
export const usarTransporte = (t) => { transportePrueba = t; };

/** ¿Están los datos del servidor de correo en server/.env? */
export const correoListo = () => Boolean(transportePrueba || (process.env.SMTP_USER && process.env.SMTP_PASS));

// Las contraseñas de aplicación de Google se muestran con espacios ("abcd efgh ijkl mnop"):
// se los quitamos por si se copiaron así, igual que comillas sobrantes.
const limpiar = (v) => String(v ?? '').trim().replace(/^["']|["']$/g, '');
export const usuarioSmtp = () => limpiar(process.env.SMTP_USER);
export const claveSmtp = () => limpiar(process.env.SMTP_PASS).replace(/\s+/g, '');

function transporte() {
  if (transportePrueba) return transportePrueba;
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: limpiar(process.env.SMTP_HOST) || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: { user: usuarioSmtp(), pass: claveSmtp() },
    connectionTimeout: 15000,
  });
}

const escapar = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const urlPanel = () => `${(process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '')}/panel/reposicion`;

/**
 * Arma el correo con la lista de productos por reponer.
 * @param {Array} productos  salida de porReponer()
 * @param {{titulo?:string, nuevas?:Array<{producto:string,tipo:string,existencias:number}>}} opciones
 */
export function armarCorreo(productos, { titulo = 'Productos por reponer', nuevas = [] } = {}) {
  const agotados = productos.filter((p) => p.estado === 'agotado').length;
  const asunto = `M&T · ${titulo}: ${productos.length} producto${productos.length === 1 ? '' : 's'}${agotados ? ` (${agotados} agotado${agotados === 1 ? '' : 's'})` : ''}`;

  const lineas = productos.map((p) => `- ${p.nombre}: quedan ${p.existencias} (mínimo ${p.stock_minimo}) → pedir ${p.sugerido}`);
  const avisoNuevas = nuevas.map((a) => (a.tipo === 'agotado' ? `- Se agotó: ${a.producto}` : `- Quedan ${a.existencias} de ${a.producto}`));
  const texto = [
    avisoNuevas.length ? `Lo que acaba de pasar:\n${avisoNuevas.join('\n')}\n` : '',
    `Productos por reponer (${productos.length}):`,
    ...lineas,
    '',
    `Revisa y pide la reposición desde el panel: ${urlPanel()}`,
  ].join('\n');

  const filas = productos.map((p) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e3ebe8">
          <div style="font-weight:600;color:#0c1b21">${escapar(p.nombre)}</div>
          <div style="font-size:12px;color:#6b7f85">${escapar(p.categoria)}</div>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #e3ebe8;text-align:center">
          <span style="display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600;${p.estado === 'agotado' ? 'background:#fdecee;color:#a11d2f' : 'background:#fff4e0;color:#8a5a00'}">
            ${p.estado === 'agotado' ? 'Agotado' : `Quedan ${p.existencias}`}
          </span>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #e3ebe8;text-align:center;color:#53666c">${p.stock_minimo}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e3ebe8;text-align:center;font-weight:700;color:#0b8f58">${p.sugerido}</td>
      </tr>`).join('');

  const html = `
  <div style="background:#f2f5f4;padding:24px;font-family:Inter,Segoe UI,Arial,sans-serif">
    <div style="max-width:620px;margin:0 auto;background:#fff;border:1px solid #d8e2e0;border-radius:16px;overflow:hidden">
      <div style="background:#061018;color:#e4efec;padding:22px 24px">
        <div style="font-size:22px;font-weight:700">M<span style="color:#36e39a">&amp;</span>T</div>
        <div style="font-size:18px;font-weight:600;margin-top:6px">${escapar(titulo)}</div>
      </div>
      <div style="padding:20px 24px">
        ${avisoNuevas.length ? `<div style="background:#f3fbf7;border:1px solid #bfe8d3;border-radius:12px;padding:12px 14px;margin-bottom:16px;color:#0c1b21">
          <b>Lo que acaba de pasar</b><br>${nuevas.map((a) => escapar(a.tipo === 'agotado' ? `Se agotó: ${a.producto}` : `Quedan ${a.existencias} de ${a.producto}`)).join('<br>')}</div>` : ''}
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead><tr style="text-align:left;color:#53666c;font-size:12px;text-transform:uppercase;letter-spacing:.04em">
            <th style="padding:8px 12px">Producto</th><th style="padding:8px 12px;text-align:center">Existencias</th>
            <th style="padding:8px 12px;text-align:center">Mínimo</th><th style="padding:8px 12px;text-align:center">Pedir</th>
          </tr></thead>
          <tbody>${filas}</tbody>
        </table>
        <div style="text-align:center;margin:24px 0 6px">
          <a href="${escapar(urlPanel())}" style="display:inline-block;background:#0b8f58;color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:12px">Abrir reposición en el panel</a>
        </div>
      </div>
    </div>
    <p style="text-align:center;color:#6b7f85;font-size:12px;margin-top:14px">Aviso automático de la tienda M&amp;T.</p>
  </div>`;

  return { asunto, texto, html };
}

/** Manda un correo. Lanza un Error con mensaje en español si algo falla. */
export async function enviarCorreo({ para, asunto, texto, html }) {
  if (!correoListo()) throw new Error('Falta configurar el correo: agrega SMTP_USER y SMTP_PASS en server/.env.');
  const remitente = usuarioSmtp() || 'avisos@mt.local';
  try {
    return await transporte().sendMail({
      from: { name: process.env.SMTP_REMITENTE || 'Avisos M&T', address: remitente },
      to: para,
      subject: asunto,
      text: texto,
      html,
    });
  } catch (error) {
    const msg = error.code === 'EAUTH'
      ? `Gmail rechazó el acceso de ${usuarioSmtp()}: revisa que SMTP_USER sea la misma cuenta donde creaste la contraseña de aplicación y que SMTP_PASS tenga sus 16 letras.`
      : error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT' || error.code === 'ESOCKET'
        ? 'No se pudo conectar con el servidor de correo. Revisa SMTP_HOST, SMTP_PORT y tu internet.'
        : `No se pudo enviar el correo (${error.message}).`;
    throw new Error(msg);
  }
}

/* ---------- Aviso automático ---------- */

export const estadoAvisos = { ultimoEnvio: null, ultimoError: null, ultimoWhatsapp: null, errorWhatsapp: null };
let revisando = false;

const anotarError = (clave, error) => {
  if (estadoAvisos[clave] !== error.message) console.warn(`Aviso de reposición (${clave === 'ultimoError' ? 'correo' : 'WhatsApp'}):`, error.message);
  estadoAvisos[clave] = error.message;
};

/**
 * Junta las alertas nuevas y avisa una sola vez por cada tanda:
 *  - correo con todo lo que falta (si está configurado)
 *  - WhatsApp al proveedor pidiendo lo que se acaba de acabar (si está configurado)
 * Las alertas de hace más de 24 horas que nunca se mandaron se marcan sin enviar (ya no son noticia).
 * @returns {Promise<{enviado:boolean, alertas?:number, correo?:boolean, whatsapp?:boolean, motivo?:string}>}
 */
export async function revisarAvisos(db) {
  if (revisando) return { enviado: false, motivo: 'ocupado' };
  revisando = true;
  try {
    const ajuste = await leerAjuste(db);
    const porCorreo = Boolean(ajuste.aviso_automatico && ajuste.correo_destino && correoListo());
    const porWhatsapp = Boolean(ajuste.whatsapp_automatico && ajuste.proveedor_whatsapp && whatsappListo());
    if (!ajuste.aviso_automatico && !ajuste.whatsapp_automatico) return { enviado: false, motivo: 'apagado' };
    if (!porCorreo && !porWhatsapp) return { enviado: false, motivo: 'sin configurar' };

    await db.query(`UPDATE alerta_stock SET notificada_en = NOW()
                    WHERE notificada_en IS NULL AND creada_en < NOW() - INTERVAL '24 hours'`);
    const { rows: nuevas } = await db.query(
      `SELECT a.id, a.tipo, a.existencias, a.producto_id, p.nombre AS producto
       FROM alerta_stock a JOIN producto p ON p.id = a.producto_id
       WHERE a.notificada_en IS NULL ORDER BY a.creada_en`,
    );
    if (!nuevas.length) return { enviado: false, motivo: 'sin alertas' };

    const ids = nuevas.map((a) => a.id);
    const productos = await porReponer(db);
    if (!productos.length) {
      // Ya se repuso todo antes de que saliera el aviso: no hay nada que avisar
      await db.query('UPDATE alerta_stock SET notificada_en = NOW() WHERE id = ANY($1)', [ids]);
      return { enviado: false, motivo: 'ya repuesto' };
    }

    let correo = false;
    let whatsapp = false;
    if (porCorreo) {
      try {
        const titulo = nuevas.some((a) => a.tipo === 'agotado') ? 'Se agotaron productos' : 'Productos por acabarse';
        await enviarCorreo({ para: ajuste.correo_destino, ...armarCorreo(productos, { titulo, nuevas }) });
        Object.assign(estadoAvisos, { ultimoEnvio: new Date().toISOString(), ultimoError: null });
        correo = true;
      } catch (error) { anotarError('ultimoError', error); }
    }
    if (porWhatsapp) {
      // Al proveedor solo se le pide lo que se acaba de acabar (lo demás ya se le pidió antes)
      const recientes = new Set(nuevas.map((a) => a.producto_id));
      const items = productos.filter((p) => recientes.has(p.id)).map((p) => ({ nombre: p.nombre, cantidad: p.sugerido }));
      if (items.length) {
        try {
          await enviarWhatsapp({ telefono: ajuste.proveedor_whatsapp, proveedor: ajuste.proveedor_nombre, items, mensaje: mensajeBase(items, ajuste.proveedor_nombre) });
          Object.assign(estadoAvisos, { ultimoWhatsapp: new Date().toISOString(), errorWhatsapp: null });
          whatsapp = true;
        } catch (error) { anotarError('errorWhatsapp', error); }
      }
    }

    // Si ningún canal salió, se reintenta en la siguiente vuelta
    if (!correo && !whatsapp) return { enviado: false, motivo: estadoAvisos.ultimoError || estadoAvisos.errorWhatsapp };
    await db.query('UPDATE alerta_stock SET notificada_en = NOW() WHERE id = ANY($1)', [ids]);
    return { enviado: true, alertas: nuevas.length, correo, whatsapp };
  } catch (error) {
    anotarError('ultimoError', error);
    return { enviado: false, motivo: error.message };
  } finally {
    revisando = false;
  }
}

/** Revisa cada minuto (AVISOS_CADA_SEG en server/.env para cambiarlo) */
export function iniciarAvisos(db) {
  const cada = Math.max(15, Number(process.env.AVISOS_CADA_SEG) || 60) * 1000;
  const t = setInterval(() => { revisarAvisos(db); }, cada);
  t.unref();
  setTimeout(() => revisarAvisos(db), 5000).unref();
  return t;
}

/* ---------- WhatsApp ---------- */

/** Deja solo dígitos; a un número de 10 dígitos (México) le agrega la lada 52 */
export function normalizarWhatsapp(valor) {
  const d = String(valor ?? '').replace(/\D/g, '');
  if (!d) return null;
  return d.length === 10 ? `52${d}` : d;
}

export const enlaceWhatsapp = (telefono, mensaje) => `https://wa.me/${telefono || ''}?text=${encodeURIComponent(mensaje)}`;

/** Mensaje base cuando no hay IA */
export function mensajeBase(items, proveedor) {
  const saludo = proveedor ? `Hola ${proveedor}, buen día.` : 'Hola, buen día.';
  const lista = items.map((i) => `• ${i.cantidad} × ${i.nombre}`).join('\n');
  return `${saludo} Le escribimos de la tienda M&T para hacer un pedido de reposición:\n\n${lista}\n\n¿Nos puede confirmar disponibilidad, precio y fecha de entrega? Muchas gracias.`;
}
