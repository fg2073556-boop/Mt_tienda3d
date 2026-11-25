import { Router } from 'express';
import { transaction } from '../db.js';
import { HttpError, handle } from '../errors.js';
import { METODOS_PAGO } from '../constants.js';
import { fijarExistencias } from '../services/stock.js';
import { email, int, oneOf, text } from '../validate.js';

const router = Router();

/**
 * POST /api/pedidos  → completa la compra
 * { cliente_nombre, cliente_correo, cliente_telefono, direccion, metodo_pago, items: [{ producto_id, cantidad }] }
 *
 * Es todo o nada: si algún producto ya no alcanza, no se guarda el pedido ni se descuenta nada.
 */
router.post('/pedidos', handle(async (req, res) => {
  const b = req.body;
  const datos = {
    cliente_nombre: text(b.cliente_nombre, 'nombre', { min: 3, max: 120 }),
    cliente_correo: email(b.cliente_correo),
    cliente_telefono: text(b.cliente_telefono, 'teléfono', { max: 20, required: false }),
    direccion: text(b.direccion, 'dirección de entrega', { max: 500 }),
    metodo_pago: oneOf(b.metodo_pago, 'forma de pago', Object.keys(METODOS_PAGO)),
  };

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
      `SELECT * FROM producto WHERE id = ANY($1) AND activo AND eliminado_en IS NULL ORDER BY id FOR UPDATE`,
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

    // En la versión con pasarela real, el pedido queda "pagado" cuando la pasarela confirma
    const estado = datos.metodo_pago === 'tarjeta_prueba' ? 'pagado' : 'pendiente';
    const { rows: [nuevo] } = await client.query(
      `INSERT INTO pedido (cliente_nombre, cliente_correo, cliente_telefono, direccion, metodo_pago, estado)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [datos.cliente_nombre, datos.cliente_correo, datos.cliente_telefono, datos.direccion, datos.metodo_pago, estado],
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

    const folio = `MT-${String(nuevo.id).padStart(5, '0')}`;
    await client.query('UPDATE pedido SET folio = $1, total = $2 WHERE id = $3', [folio, total, nuevo.id]);

    return { folio, estado, total, metodo_pago: datos.metodo_pago, cliente_nombre: datos.cliente_nombre, detalle };
  });

  res.status(201).json(pedido);
}));

export default router;
