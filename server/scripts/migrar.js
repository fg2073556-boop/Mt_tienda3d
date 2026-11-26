/**
 * Aplica los cambios de estructura de database/migraciones/ a una base de datos que ya existe
 * (las bases nuevas ya los traen en schema.sql). Cada archivo se puede repetir sin dañar datos.
 * El servidor también lo hace solo al arrancar; este comando sirve para hacerlo a mano.
 *
 *   npm run migrar
 */
import dotenv from 'dotenv';
dotenv.config({ quiet: true });

const { pool } = await import('../src/db.js');
const { migrar } = await import('../src/migraciones.js');

try {
  (await migrar(pool)).forEach((archivo) => console.log(`  ✓ ${archivo}`));
  console.log('Base de datos al día. Si quieres cargar los productos nuevos: npm run importar-catalogo');
} catch (error) {
  console.error(`No se pudo migrar: ${error.message}`);
  if (error.code === 'ECONNREFUSED') console.error('¿Está encendida la base de datos? Ejecuta: npm run bd');
  process.exitCode = 1;
} finally {
  await pool.end();
}
