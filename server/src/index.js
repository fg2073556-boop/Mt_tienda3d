import dotenv from 'dotenv';
dotenv.config({ quiet: true });

const { crearApp } = await import('./app.js');
const { pool } = await import('./db.js');

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

const port = Number(process.env.PORT || 3001);
crearApp().listen(port, () => console.log(`API de M&T lista en http://localhost:${port}`));
