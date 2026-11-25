/**
 * Único lugar donde cambian las existencias, para que siempre se generen las alertas.
 * Recibe el "client" de una transacción para que todo se guarde junto.
 *
 * @param {import('pg').PoolClient} client
 * @param {{id:number, existencias:number, stock_minimo:number}} producto  fila actual del producto
 * @param {number} nuevas  existencias nuevas
 */
export async function fijarExistencias(client, producto, nuevas) {
  const antes = producto.existencias;
  const despues = Math.max(0, nuevas);

  await client.query(
    'UPDATE producto SET existencias = $1, actualizado_en = NOW() WHERE id = $2',
    [despues, producto.id],
  );

  let tipo = null;
  if (antes > 0 && despues === 0) tipo = 'agotado';
  else if (antes > producto.stock_minimo && despues > 0 && despues <= producto.stock_minimo) tipo = 'bajo';

  if (tipo) {
    await client.query(
      'INSERT INTO alerta_stock (producto_id, tipo, existencias) VALUES ($1, $2, $3)',
      [producto.id, tipo, despues],
    );
  }

  return { existencias: despues, alerta: tipo };
}
