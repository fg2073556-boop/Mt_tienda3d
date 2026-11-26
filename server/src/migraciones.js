import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const carpeta = fileURLToPath(new URL('../../database/migraciones/', import.meta.url));

/**
 * Aplica los archivos de database/migraciones/ en orden. Cada uno se puede repetir sin dañar
 * datos (usa IF NOT EXISTS), así que se corre al arrancar el servidor y con `npm run migrar`.
 * Regresa la lista de archivos aplicados.
 */
export async function migrar(pool) {
  let archivos = [];
  try {
    archivos = (await fs.readdir(carpeta)).filter((f) => f.endsWith('.sql')).sort();
  } catch {
    return [];
  }
  for (const archivo of archivos) await pool.query(await fs.readFile(path.join(carpeta, archivo), 'utf8'));
  return archivos;
}
