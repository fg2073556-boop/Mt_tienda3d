import { Router } from 'express';
import { query, transaction } from '../db.js';
import { HttpError, handle } from '../errors.js';
import { permitir, requiereSesion } from '../middleware/auth.js';
import {
  armarCorreo, correoListo, enlaceWhatsapp, enviarCorreo, estadoAvisos, inventario, leerAjuste,
  mensajeBase, normalizarWhatsapp, porReponer,
} from '../services/avisos.js';
import { iaActiva, pedirJson } from '../services/gemini.js';
import { enviarWhatsapp, modoWhatsapp, queFaltaWhatsapp, whatsappListo } from '../services/whatsapp.js';
import { fijarExistencias } from '../services/stock.js';
import { bool, email, int, text } from '../validate.js';

/**
 * Reposición de inventario: qué se está acabando, aviso por correo y
 * borrador de WhatsApp para el proveedor (redactado con Gemini).
 */
const router = Router();
router.use(requiereSesion, permitir('administrador', 'vendedor'));
const soloAdmin = permitir('administrador');
// Interruptores: si no vienen en la petición se quedan como estaban
const siVino = (v) => (v === undefined ? null : bool(v));

// GET /api/admin/reposicion → inventario completo, ajustes y estado de los avisos
router.get('/', handle(async (_req, res) => {
  const [productos, ajuste, pendientes, historial] = await Promise.all([
    inventario({ query }),
    leerAjuste({ query }),
    query('SELECT COUNT(*)::int AS n FROM alerta_stock WHERE notificada_en IS NULL'),
    query(`SELECT a.id, a.tipo, a.existencias, a.creada_en, a.notificada_en, p.nombre AS producto
           FROM alerta_stock a JOIN producto p ON p.id = a.producto_id
           ORDER BY a.creada_en DESC LIMIT 8`),
  ]);
  res.json({
    productos,
    ajuste,
    estado: {
      correo: correoListo(),
      ia: iaActiva(),
      pendientes: pendientes.rows[0].n,
      ultimo_envio: estadoAvisos.ultimoEnvio,
      ultimo_error: estadoAvisos.ultimoError,
      whatsapp: whatsappListo(),
      whatsapp_modo: modoWhatsapp() || null,
      whatsapp_falta: whatsappListo() ? null : queFaltaWhatsapp(),
      ultimo_whatsapp: estadoAvisos.ultimoWhatsapp,
      error_whatsapp: estadoAvisos.errorWhatsapp,
    },
    historial: historial.rows,
  });
}));

// PUT /api/admin/reposicion/ajuste { correo_destino, aviso_automatico, proveedor_nombre, proveedor_whatsapp }
router.put('/ajuste', soloAdmin, handle(async (req, res) => {
  const correos = text(req.body.correo_destino, 'correo de avisos', { max: 400, required: false });
  const lista = correos ? correos.split(/[,;\s]+/).filter(Boolean).map((c) => email(c, 'correo de avisos')) : [];
  if (lista.length > 5) throw new HttpError(422, 'Pon máximo 5 correos para los avisos.');
  const telefono = normalizarWhatsapp(req.body.proveedor_whatsapp);
  if (telefono && (telefono.length < 11 || telefono.length > 15)) {
    throw new HttpError(422, 'El WhatsApp del proveedor debe tener 10 dígitos (o la lada del país y el número).');
  }
  const { rows } = await query(
    `UPDATE ajuste_reposicion SET correo_destino = $1, aviso_automatico = COALESCE($2, aviso_automatico), proveedor_nombre = $3,
            proveedor_whatsapp = $4, whatsapp_automatico = COALESCE($5, whatsapp_automatico), actualizado_en = NOW()
     WHERE id = 1 RETURNING *`,
    [lista.join(', ') || null, siVino(req.body.aviso_automatico), text(req.body.proveedor_nombre, 'nombre del proveedor', { max: 120, required: false }), telefono, siVino(req.body.whatsapp_automatico)],
  );
  res.json(rows[0]);
}));

// PATCH /api/admin/reposicion/productos/:id/minimo { stock_minimo }
router.patch('/productos/:id/minimo', handle(async (req, res) => {
  const id = int(req.params.id, 'id', { min: 1, max: 2_000_000_000 });
  const minimo = int(req.body.stock_minimo, 'mínimo', { min: 0, max: 10000 });
  const { rows } = await query(
    `UPDATE producto SET stock_minimo = $1, actualizado_en = NOW() WHERE id = $2 AND eliminado_en IS NULL
     RETURNING id, existencias, stock_minimo`,
    [minimo, id],
  );
  if (!rows[0]) throw new HttpError(404, 'El producto no existe.');
  res.json(rows[0]);
}));

// POST /api/admin/reposicion/correo { ids?: [] } → manda ahora el reporte de lo que falta
router.post('/correo', handle(async (req, res) => {
  const ajuste = await leerAjuste({ query });
  if (!ajuste.correo_destino) throw new HttpError(422, 'Primero escribe a qué correo llegan los avisos (en Ajustes de avisos).');
  if (!correoListo()) throw new HttpError(503, 'Falta configurar el correo: agrega SMTP_USER y SMTP_PASS en server/.env y reinicia el servidor.');

  let productos = await porReponer({ query });
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Number.isInteger) : [];
  if (ids.length) productos = productos.filter((p) => ids.includes(p.id));
  if (!productos.length) throw new HttpError(422, 'No hay productos por reponer en este momento.');

  try {
    await enviarCorreo({ para: ajuste.correo_destino, ...armarCorreo(productos, { titulo: 'Reporte de reposición' }) });
  } catch (error) {
    throw new HttpError(502, error.message);
  }
  res.json({ enviado: true, para: ajuste.correo_destino, productos: productos.length });
}));

// POST /api/admin/reposicion/mensaje { items: [{ id, cantidad }], ia?: true } → borrador de WhatsApp
router.post('/mensaje', handle(async (req, res) => {
  const pedidos = Array.isArray(req.body?.items) ? req.body.items.slice(0, 40) : [];
  if (!pedidos.length) throw new HttpError(422, 'Elige al menos un producto para pedir.');
  const cantidades = new Map(pedidos.map((i) => [int(i.id, 'producto', { min: 1, max: 2_000_000_000 }), int(i.cantidad, 'cantidad', { min: 1, max: 1000 })]));

  const { rows } = await query('SELECT id, nombre FROM producto WHERE id = ANY($1) AND eliminado_en IS NULL', [[...cantidades.keys()]]);
  if (!rows.length) throw new HttpError(404, 'Esos productos no existen.');
  const items = rows.map((p) => ({ nombre: p.nombre, cantidad: cantidades.get(p.id) }));

  const ajuste = await leerAjuste({ query });
  let mensaje = mensajeBase(items, ajuste.proveedor_nombre);
  let conIA = false;
  let aviso = null;

  if (req.body.ia !== false && iaActiva()) {
    try {
      const r = await pedirJson([{
        text: `Redacta un mensaje de WhatsApp en español de México para pedirle reposición de inventario a un proveedor.
Tienda: M&T (venta de computadoras, componentes y accesorios).
Proveedor: ${ajuste.proveedor_nombre || 'sin nombre (saluda de forma general)'}.
Productos y cantidades (copia cada nombre y cantidad EXACTAMENTE igual, uno por renglón con "•"):
${items.map((i) => `${i.cantidad} × ${i.nombre}`).join('\n')}

Reglas: tono amable y profesional, breve (máximo 900 caracteres), sin inventar precios, fechas ni datos;
pide confirmar disponibilidad, precio y fecha de entrega; firma como "Tienda M&T"; puedes usar *negritas* de WhatsApp.
Responde solo JSON: {"mensaje": "..."}`,
      }], { timeout: 20000 });
      const texto = typeof r?.mensaje === 'string' ? r.mensaje.trim() : '';
      if (texto && items.every((i) => texto.includes(i.nombre))) {
        mensaje = texto.slice(0, 1500);
        conIA = true;
      } else {
        aviso = 'Gemini cambió la lista de productos; se usó el mensaje base.';
      }
    } catch (error) {
      aviso = `${error.message} Se usó el mensaje base.`;
    }
  }

  res.json({
    mensaje,
    conIA,
    aviso,
    telefono: ajuste.proveedor_whatsapp,
    proveedor: ajuste.proveedor_nombre,
    url: enlaceWhatsapp(ajuste.proveedor_whatsapp, mensaje),
  });
}));

// POST /api/admin/reposicion/whatsapp { items: [{ id, cantidad }], mensaje } → lo manda directo al proveedor
router.post('/whatsapp', handle(async (req, res) => {
  const pedidos = Array.isArray(req.body?.items) ? req.body.items.slice(0, 40) : [];
  if (!pedidos.length) throw new HttpError(422, 'Elige al menos un producto para pedir.');
  const cantidades = new Map(pedidos.map((i) => [int(i.id, 'producto', { min: 1, max: 2_000_000_000 }), int(i.cantidad, 'cantidad', { min: 1, max: 1000 })]));
  const { rows } = await query('SELECT id, nombre FROM producto WHERE id = ANY($1) AND eliminado_en IS NULL', [[...cantidades.keys()]]);
  if (!rows.length) throw new HttpError(404, 'Esos productos no existen.');
  const items = rows.map((p) => ({ nombre: p.nombre, cantidad: cantidades.get(p.id) }));

  const ajuste = await leerAjuste({ query });
  const mensaje = text(req.body.mensaje, 'mensaje', { max: 1500, required: false }) || mensajeBase(items, ajuste.proveedor_nombre);
  if (!ajuste.proveedor_whatsapp) throw new HttpError(422, 'Primero guarda el WhatsApp del proveedor en Ajustes de avisos.');
  if (!whatsappListo()) throw new HttpError(503, queFaltaWhatsapp());
  try {
    await enviarWhatsapp({ telefono: ajuste.proveedor_whatsapp, mensaje, items, proveedor: ajuste.proveedor_nombre });
  } catch (error) {
    throw new HttpError(502, error.message);
  }
  res.json({ enviado: true, telefono: ajuste.proveedor_whatsapp });
}));

// POST /api/admin/reposicion/reponer { items: [{ id, cantidad }] } → suma existencias de varios a la vez
router.post('/reponer', handle(async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 100) : [];
  if (!items.length) throw new HttpError(422, 'Elige al menos un producto.');
  const r = await transaction(async (client) => {
    const hechos = [];
    for (const i of items) {
      const id = int(i.id, 'producto', { min: 1, max: 2_000_000_000 });
      const cantidad = int(i.cantidad, 'cantidad', { min: 1, max: 1000 });
      const { rows: [p] } = await client.query('SELECT * FROM producto WHERE id = $1 AND eliminado_en IS NULL FOR UPDATE', [id]);
      if (!p) throw new HttpError(404, 'Uno de los productos ya no existe.');
      hechos.push({ id, ...(await fijarExistencias(client, p, p.existencias + cantidad)) });
    }
    return hechos;
  });
  res.json({ repuestos: r });
}));

export default router;
