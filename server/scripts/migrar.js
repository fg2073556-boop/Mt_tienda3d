/**
 * Aplica los cambios de estructura de database/migraciones/ a una base de datos que ya existe
 * (las bases nuevas ya los traen en schema.sql). Cada archivo se puede repetir sin dañar datos.
 *
 *   npm run migrar
 */
import dotenv from 'dotenv';
dotenv.config({ quiet: true });

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { pool } = await import('../src/db.js');
const carpeta = fileURLToPath(new URL('../../database/migraciones/', import.meta.url));

try {
  const archivos = (await fs.readdir(carpeta)).filter((f) => f.endsWith('.sql')).sort();
  for (const archivo of archivos) {
    await pool.query(await fs.readFile(path.join(carpeta, archivo), 'utf8'));
    console.log(`  ✓ ${archivo}`);
  }
  console.log('Base de datos al día. Si quieres cargar los productos nuevos: npm run importar-catalogo');
} catch (error) {
  console.error(`No se pudo migrar: ${error.message}`);
  if (error.code === 'ECONNREFUSED') console.error('¿Está encendida la base de datos? Ejecuta: npm run bd');
  process.exitCode = 1;
} finally {
  await pool.end();
}
