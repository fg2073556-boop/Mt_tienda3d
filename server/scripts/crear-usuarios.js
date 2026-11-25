/**
 * Crea (o actualiza) las cuentas del panel con los datos de server/.env:
 *   ADMIN_*  → rol administrador (puede todo)
 *   SELLER_* → rol vendedor (atiende pedidos y existencias)
 * Uso: npm run crear-usuarios
 */
import dotenv from 'dotenv';
dotenv.config({ quiet: true });

const bcrypt = (await import('bcryptjs')).default;
const { pool } = await import('../src/db.js');

const cuentas = [
  { rol: 'administrador', nombre: process.env.ADMIN_NAME, correo: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
  { rol: 'vendedor', nombre: process.env.SELLER_NAME, correo: process.env.SELLER_EMAIL, password: process.env.SELLER_PASSWORD },
];

try {
  for (const c of cuentas) {
    if (!c.correo || !c.password) {
      console.log(`Se omitió la cuenta de ${c.rol}: faltan correo o contraseña en server/.env`);
      continue;
    }
    if (c.password.length < 8) {
      console.log(`Se omitió la cuenta de ${c.rol}: la contraseña debe tener al menos 8 caracteres`);
      continue;
    }
    const hash = await bcrypt.hash(c.password, 10);
    await pool.query(
      `INSERT INTO usuario (nombre, correo, password_hash, rol) VALUES ($1, $2, $3, $4)
       ON CONFLICT (correo) DO UPDATE SET nombre = EXCLUDED.nombre, password_hash = EXCLUDED.password_hash, rol = EXCLUDED.rol, activo = TRUE`,
      [c.nombre || c.rol, c.correo.toLowerCase(), hash, c.rol],
    );
    console.log(`Cuenta lista: ${c.correo} (${c.rol})`);
  }
} catch (error) {
  console.error('No se pudieron crear las cuentas:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
