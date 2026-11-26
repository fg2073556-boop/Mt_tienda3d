/**
 * Crea (o actualiza) las cuentas del panel con los datos de server/.env:
 *   ADMIN_*  → rol administrador (puede todo)
 *   SELLER_* → rol vendedor (atiende pedidos y existencias)
 * El servidor ya lo hace solo al arrancar; este comando sirve para hacerlo sin arrancarlo.
 * Uso: npm run crear-usuarios
 */
import dotenv from 'dotenv';
dotenv.config({ quiet: true });

const { pool } = await import('../src/db.js');
const { sincronizarCuentas } = await import('../src/cuentas.js');

try {
  for (const r of await sincronizarCuentas(pool)) {
    if (r.estado === 'omitida') console.log(`Se omitió la cuenta de ${r.rol}: ${r.motivo}`);
    else console.log(`Cuenta ${r.estado}: ${r.correo} (${r.rol})`);
  }
} catch (error) {
  console.error('No se pudieron crear las cuentas:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
