import { consultarCargo, openpayListo } from './openpay.js';

/**
 * Pone el pedido al día con lo que dice Openpay de su cargo.
 * Si Openpay ya lo cobró y el pedido seguía pendiente, pasa a "pagado".
 * @returns {Promise<{folio:string, estado:string, pago_estado:string}|null>}
 */
export async function aplicarCargo(db, cargo) {
  const { rows: [p] } = await db.query(
    `UPDATE pedido SET
       pago_estado = $2::varchar,
       estado = CASE WHEN $3::boolean AND estado = 'pendiente' THEN 'pagado' ELSE estado END,
       pagado_en = CASE WHEN $3::boolean AND pagado_en IS NULL THEN NOW() ELSE pagado_en END,
       actualizado_en = CASE WHEN pago_estado IS DISTINCT FROM $2::varchar THEN NOW() ELSE actualizado_en END
     WHERE pago_id = $1
     RETURNING id, folio, estado, pago_estado`,
    [cargo.id, cargo.estado, cargo.pagado],
  );
  return p ? { folio: p.folio, estado: p.estado, pago_estado: p.pago_estado } : null;
}

/** Consulta en Openpay el cargo de un pedido y lo aplica */
export async function revisarPedido(db, pedido) {
  if (!pedido.pago_id) return null;
  const cargo = await consultarCargo(pedido.pago_id);
  return aplicarCargo(db, cargo);
}

export const estadoRevision = { ultima: null, error: null };
let revisando = false;

/**
 * Revisa los pedidos pendientes de pago con Openpay (transferencias y efectivo de los
 * últimos 7 días). Sirve aunque Openpay no pueda avisar por webhook (por ejemplo, cuando
 * la tienda corre en una computadora sin dirección pública).
 */
export async function revisarPendientes(db) {
  if (revisando || !openpayListo()) return { revisados: 0, pagados: 0 };
  revisando = true;
  let revisados = 0;
  let pagados = 0;
  try {
    const { rows } = await db.query(
      `SELECT id, pago_id FROM pedido
       WHERE pago_proveedor = 'openpay' AND estado = 'pendiente' AND pago_id IS NOT NULL
         AND creado_en > NOW() - INTERVAL '7 days'
       ORDER BY creado_en LIMIT 20`,
    );
    for (const pedido of rows) {
      const r = await revisarPedido(db, pedido);
      revisados += 1;
      if (r?.estado === 'pagado') pagados += 1;
    }
    Object.assign(estadoRevision, { ultima: new Date().toISOString(), error: null });
  } catch (error) {
    if (estadoRevision.error !== error.message) console.warn('Revisión de pagos:', error.message);
    estadoRevision.error = error.message;
  } finally {
    revisando = false;
  }
  return { revisados, pagados };
}

/** Cada 2 minutos (OPENPAY_REVISAR_CADA_SEG para cambiarlo) */
export function iniciarRevisionPagos(db) {
  const cada = Math.max(30, Number(process.env.OPENPAY_REVISAR_CADA_SEG) || 120) * 1000;
  const t = setInterval(() => { revisarPendientes(db); }, cada);
  t.unref();
  return t;
}
