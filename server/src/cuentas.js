import bcrypt from 'bcryptjs';

/**
 * Deja las cuentas del panel igual que en server/.env:
 *   ADMIN_*  → rol administrador (puede todo)
 *   SELLER_* → rol vendedor (atiende pedidos y existencias)
 * Si la cuenta no existe la crea; si cambió el nombre, la contraseña o estaba
 * desactivada, la actualiza. Se llama al arrancar el servidor y desde
 * `npm run crear-usuarios`.
 */
export async function sincronizarCuentas(pool, env = process.env) {
  const cuentas = [
    { rol: 'administrador', nombre: env.ADMIN_NAME, correo: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD },
    { rol: 'vendedor', nombre: env.SELLER_NAME, correo: env.SELLER_EMAIL, password: env.SELLER_PASSWORD },
  ];
  const resultado = [];

  for (const c of cuentas) {
    const correo = c.correo?.trim().toLowerCase();
    const password = c.password ?? '';
    if (!correo || !password) {
      resultado.push({ rol: c.rol, estado: 'omitida', motivo: 'faltan correo o contraseña en server/.env' });
      continue;
    }
    if (password.length < 8) {
      resultado.push({ rol: c.rol, correo, estado: 'omitida', motivo: 'la contraseña debe tener al menos 8 caracteres' });
      continue;
    }
    const nombre = c.nombre?.trim() || c.rol;

    const { rows } = await pool.query('SELECT nombre, password_hash, rol, activo FROM usuario WHERE correo = $1', [correo]);
    const actual = rows[0];
    const igual = actual && actual.activo && actual.rol === c.rol && actual.nombre === nombre
      && (await bcrypt.compare(password, actual.password_hash));
    if (igual) {
      resultado.push({ rol: c.rol, correo, estado: 'sin cambios' });
      continue;
    }

    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO usuario (nombre, correo, password_hash, rol) VALUES ($1, $2, $3, $4)
       ON CONFLICT (correo) DO UPDATE SET nombre = EXCLUDED.nombre, password_hash = EXCLUDED.password_hash, rol = EXCLUDED.rol, activo = TRUE`,
      [nombre, correo, hash, c.rol],
    );
    resultado.push({ rol: c.rol, correo, estado: actual ? 'actualizada' : 'creada' });
  }
  return resultado;
}
