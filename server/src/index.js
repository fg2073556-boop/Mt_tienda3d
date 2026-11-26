import dotenv from 'dotenv';
dotenv.config({ quiet: true });

const { crearApp } = await import('./app.js');
const { pool } = await import('./db.js');
const { migrar } = await import('./migraciones.js');

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

const port = Number(process.env.PORT || 3001);
// En Express 5 el callback de listen también recibe el error si no se pudo abrir el puerto
crearApp().listen(port, (error) => {
  if (!error) return console.log(`API de M&T lista en http://localhost:${port}`);
  if (error.code === 'EADDRINUSE') {
    console.error(`El puerto ${port} está ocupado por otro programa.`);
    console.error('Ciérralo, o cambia PORT en server/.env (el frontend lo detecta solo) y vuelve a arrancar.');
  } else {
    console.error(error);
  }
  process.exit(1);
});
