import dotenv from 'dotenv';
dotenv.config({ quiet: true });

const { crearApp } = await import('./app.js');
const { pool } = await import('./db.js');
const { migrar } = await import('./migraciones.js');
const { sincronizarCuentas } = await import('./cuentas.js');
const { iniciarAvisos } = await import('./services/avisos.js');

if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET en server/.env');
  process.exit(1);
}

try {
  await pool.query('SELECT 1');
} catch (error) {
  console.error('No me pude conectar a PostgreSQL. ¿Está corriendo "docker compose up -d" y coinciden las contraseñas de los dos .env?');
  console.error(error.message);
  process.exit(1);
}

// Pone la base al día (columnas nuevas) para que un `git pull` nunca deje al servidor fallando
try {
  await migrar(pool);
} catch (error) {
  console.error('No pude actualizar la estructura de la base de datos:', error.message);
  process.exit(1);
}

// Crea o actualiza las cuentas del panel con los correos y contraseñas de server/.env
try {
  for (const r of await sincronizarCuentas(pool)) {
    if (r.estado === 'omitida') console.log(`Cuenta de ${r.rol} omitida: ${r.motivo}`);
    else if (r.estado !== 'sin cambios') console.log(`Cuenta ${r.estado}: ${r.correo} (${r.rol})`);
  }
} catch (error) {
  console.error('No pude crear las cuentas del panel:', error.message);
}

const port = Number(process.env.PORT || 3001);
// En Express 5 el callback de listen también recibe el error si no se pudo abrir el puerto
crearApp().listen(port, (error) => {
  if (!error) {
    iniciarAvisos(pool); // correo automático cuando algo se está acabando
    return console.log(`API de M&T lista en http://localhost:${port}`);
  }
  if (error.code === 'EADDRINUSE') {
    console.error(`El puerto ${port} está ocupado por otro programa.`);
    console.error('Ciérralo, o cambia PORT en server/.env (el frontend lo detecta solo) y vuelve a arrancar.');
  } else {
    console.error(error);
  }
  process.exit(1);
});
