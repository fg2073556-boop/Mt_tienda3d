import { Router } from 'express';
import { query, transaction } from '../db.js';
import { HttpError, handle } from '../errors.js';
import { METODOS_CON_OPENPAY, METODOS_PAGO, METODOS_SIN_OPENPAY } from '../constants.js';
import { crearCargo, ErrorPago, openpayListo } from '../services/openpay.js';
import { cotizar, esDigital } from '../services/envios.js';
import { fijarExistencias } from '../services/stock.js';
import { email, int, oneOf, text } from '../validate.js';

const router = Router();

// Límite de intentos de pago con tarjeta por IP: evita que alguien pruebe tarjetas robadas en la tienda
const intentosTarjeta = new Map();
function limitarTarjeta(req, res, next) {
  if (req.body?.metodo_pago !== 'tarjeta') return next();
  const ahora = Date.now();
  const lista = (intentosTarjeta.get(req.ip) || []).filter((t) => ahora - t < 10 * 60_000);
  if (lista.length >= 8) return res.status(429).json({ error: 'Hubo demasiados intentos de pago con tarjeta. Espera unos minutos o elige otra forma de pago.' });
  lista.push(ahora);
  intentosTarjeta.set(req.ip, lista);
  next();
}

/**
 * POST /api/pedidos  → completa la compra
 * { cliente_nombre, cliente_correo, cliente_telefono, direccion, metodo_pago, items: [{ producto_id, cantidad }],
 *   token_id?, device_session_id? }   ← los dos últimos solo para tarjeta con Openpay
 *
 * Es todo o nada: si algún producto ya no alcanza, o si Openpay rechaza la tarjeta,
 * no se guarda el pedido ni se descuenta nada.
 */
router.post('/pedidos', limitarTarjeta, handle(async (req, res) => {
  const b = req.body;
  const datos = {
    cliente_nombre: text(b.cliente_nombre, 'nombre', { min: 3, max: 120 }),
    cliente_correo: email(b.cliente_correo),
    cliente_telefono: text(b.cliente_telefono, 'teléfono', { max: 20, required: false }),
    direccion: text(b.direccion, 'calle y número', { max: 500, required: false }),
    metodo_pago: oneOf(b.metodo_pago, 'forma de pago', openpayListo() ? METODOS_CON_OPENPAY : METODOS_SIN_OPENPAY),
  };
  // Datos que genera Openpay.js en el navegador (el token sustituye a la tarjeta)
  const token = datos.metodo_pago === 'tarjeta' ? text(b.token_id, 'token de la tarjeta', { max: 60 }) : null;
  const dispositivo = datos.metodo_pago === 'tarjeta' ? text(b.device_session_id, 'identificador del dispositivo', { max: 255 }) : null;

  if (!Array.isArray(b.items) || b.items.length === 0) throw new HttpError(422, 'Tu carrito está vacío.');
  if (b.items.length > 50) throw new HttpError(422, 'El carrito tiene demasiados productos.');

  // Junta cantidades si el mismo producto viene repetido
  const cantidades = new Map();
  for (const item of b.items) {
    const id = int(item.producto_id, 'producto', { min: 1, max: 2_000_000_000 });
    const cantidad = int(item.cantidad, 'cantidad', { min: 1, max: 99 });
    cantidades.set(id, (cantidades.get(id) || 0) + cantidad);
  }

  const pedido = await transaction(async (client) => {
    // FOR UPDATE bloquea los productos para que dos compras al mismo tiempo no vendan lo mismo
    const { rows: productos } = await client.query(
      `SELECT p.*, c.slug AS categoria_slug FROM producto p JOIN categoria c ON c.id = p.categoria_id
       WHERE p.id = ANY($1) AND p.activo AND p.eliminado_en IS NULL ORDER BY p.id FOR UPDATE OF p`,
      [[...cantidades.keys()]],
    );
    const porId = new Map(productos.map((p) => [p.id, p]));

    for (const [id, cantidad] of cantidades) {
      const p = porId.get(id);
      if (!p) throw new HttpError(409, 'Un producto de tu carrito ya no está disponible. Revisa tu carrito.');
      if (p.existencias < cantidad) {
        throw new HttpError(409, `${p.nombre}: solo quedan ${p.existencias}. Ajusta tu carrito.`, { producto_id: id, existencias: p.existencias });
      }
    }

    // Envío: solo si hay algo físico (las licencias de software llegan por correo)
    const conEnvio = [...cantidades.keys()].some((id) => !esDigital(porId.get(id).categoria_slug));
    let envio = null;
    if (conEnvio) {
      if (!datos.direccion) throw new HttpError(422, 'Escribe la calle y el número para la entrega.');
      const cotizacion = await cotizar(client, b.envio_cp);
      if (!cotizacion.cubre) throw new HttpError(422, cotizacion.mensaje, { envio: cotizacion.motivo });
      const colonia = text(b.envio_colonia, 'colonia', { max: 120 });
      if (!cotizacion.colonias.some((c) => c.nombre === colonia)) throw new HttpError(422, 'Elige una colonia de la lista de tu código postal.');
      envio = {
        cp: cotizacion.cp, colonia, municipio: cotizacion.municipio, zona: cotizacion.zona.nombre, km: cotizacion.ruta.km_aprox,
        dias: `${cotizacion.zona.dias_min}–${cotizacion.zona.dias_max}`, costo: cotizacion.zona.costo,
      };
    }

    // Simulado: la tarjeta de prueba queda pagada. Con Openpay: queda pagado cuando Openpay lo confirma
    let estado = datos.metodo_pago === 'tarjeta_prueba' ? 'pagado' : 'pendiente';
    const { rows: [nuevo] } = await client.query(
      `INSERT INTO pedido (cliente_nombre, cliente_correo, cliente_telefono, direccion, metodo_pago, estado)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [datos.cliente_nombre, datos.cliente_correo, datos.cliente_telefono, datos.direccion || 'Entrega digital por correo', datos.metodo_pago, estado],
    );

    let total = 0;
    const detalle = [];
    for (const [id, cantidad] of cantidades) {
      const p = porId.get(id);
      const subtotal = Math.round(p.precio * cantidad * 100) / 100;
      total += subtotal;
      await client.query(
        `INSERT INTO pedido_detalle (pedido_id, producto_id, producto_nombre, precio_unitario, cantidad, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [nuevo.id, p.id, p.nombre, p.precio, cantidad, subtotal],
      );
      await fijarExistencias(client, p, p.existencias - cantidad);
      detalle.push({ producto_nombre: p.nombre, precio_unitario: p.precio, cantidad, subtotal });
    }

    if (envio) {
      total = Math.round((total + envio.costo) * 100) / 100;
      await client.query(
        `UPDATE pedido SET envio_cp = $2, envio_colonia = $3, envio_municipio = $4, envio_zona = $5, envio_km = $6, envio_dias = $7, envio_costo = $8
         WHERE id = $1`,
        [nuevo.id, envio.cp, envio.colonia, envio.municipio, envio.zona, envio.km, envio.dias, envio.costo],
      );
    }
    const folio = `MT-${String(nuevo.id).padStart(5, '0')}`;
    await client.query('UPDATE pedido SET folio = $1, total = $2 WHERE id = $3', [folio, total, nuevo.id]);

    // Cobro con Openpay. Si falla, se lanza el error y la transacción deshace todo (pedido y existencias).
    let pago = null;
    if (openpayListo()) {
      try {
        const cargo = await crearCargo({
          metodo: datos.metodo_pago,
          monto: total,
          folio,
          descripcion: `Tienda M&T · Pedido ${folio}`,
          comprador: { nombre: datos.cliente_nombre, correo: datos.cliente_correo, telefono: datos.cliente_telefono },
          token,
          dispositivo,
        });
        if (cargo.pagado) estado = 'pagado';
        await client.query(
          `UPDATE pedido SET estado = $2, pago_proveedor = 'openpay', pago_id = $3, pago_estado = $4, pago_datos = $5,
                  pagado_en = CASE WHEN $6 THEN NOW() END
           WHERE id = $1`,
          [nuevo.id, estado, cargo.id, cargo.estado, JSON.stringify(cargo.datos), cargo.pagado],
        );
        pago = { proveedor: 'openpay', estado: cargo.estado, datos: cargo.datos };
      } catch (error) {
        if (error instanceof ErrorPago) throw new HttpError(error.status, error.message, error.codigo ? { codigo: error.codigo } : undefined);
        throw error;
      }
    }

    return { folio, estado, total, metodo_pago: datos.metodo_pago, cliente_nombre: datos.cliente_nombre, detalle, pago, envio };
  });

  res.status(201).json(pedido);
}));

// Límite sencillo para que no se adivinen folios: 20 consultas por minuto por IP
const consultas = new Map();
function limitar(req, res, next) {
  const ahora = Date.now();
  const lista = (consultas.get(req.ip) || []).filter((t) => ahora - t < 60_000);
  if (lista.length >= 20) return res.status(429).json({ error: 'Hiciste muchas consultas seguidas. Espera un minuto.' });
  lista.push(ahora);
  consultas.set(req.ip, lista);
  next();
}

/**
 * POST /api/pedidos/seguimiento  { folio, correo }
 * El cliente consulta el estado de su pedido. Se pide el correo además del folio
 * para que nadie vea pedidos ajenos (y va en el cuerpo, no en la URL).
 */
router.post('/pedidos/seguimiento', limitar, handle(async (req, res) => {
  const folio = text(req.body.folio, 'folio', { max: 20 }).toUpperCase();
  const correo = email(req.body.correo);
  const { rows: [p] } = await query(
    `SELECT id, folio, estado, total, metodo_pago, creado_en, actualizado_en, pago_estado, pago_datos,
            envio_cp, envio_colonia, envio_municipio, envio_zona, envio_km, envio_dias, envio_costo
     FROM pedido WHERE folio = $1 AND lower(cliente_correo) = $2`,
    [folio, correo],
  );
  if (!p) throw new HttpError(404, 'No encontramos un pedido con ese folio y correo. Revisa que estén bien escritos.');
  const { rows: detalle } = await query(
    'SELECT producto_nombre, cantidad, subtotal FROM pedido_detalle WHERE pedido_id = $1 ORDER BY id', [p.id]);
  const { id, ...publico } = p;
  res.json({ ...publico, detalle });
}));

export default router;
