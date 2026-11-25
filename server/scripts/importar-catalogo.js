/**
 * Importa el catálogo desde datos/catalogo.csv a PostgreSQL.
 *
 *   npm run importar-catalogo              → aplica los cambios
 *   npm run importar-catalogo -- --prueba  → solo muestra qué cambiaría
 *   npm run importar-catalogo -- ruta/otro.csv
 *
 * Columnas: nombre, categoria, precio_mxn, existencias, pieza_3d, descripcion, imagen, stock_minimo
 * - Cada producto se identifica por su nombre: si ya existe se actualiza, si no se crea.
 * - Las categorías nuevas se crean solas.
 * - "imagen" es el nombre de un archivo dentro de assets/imagenes/productos/ (opcional).
 * - Los productos que no estén en el CSV NO se borran.
 */
import dotenv from 'dotenv';
dotenv.config({ quiet: true });

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { leerCsv, validarFila } from '../src/services/catalogo-csv.js';

const { pool, transaction } = await import('../src/db.js');
const { slugify } = await import('../src/validate.js');
const { fijarExistencias } = await import('../src/services/stock.js');

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const args = process.argv.slice(2);
const prueba = args.includes('--prueba');
const archivo = path.resolve(args.find((a) => !a.startsWith('--')) || path.join(raiz, 'datos/catalogo.csv'));
const carpetaFotos = path.join(raiz, 'assets/imagenes/productos');
const uploads = fileURLToPath(new URL('../uploads/productos/', import.meta.url));

try {
  const filas = leerCsv(await fs.readFile(archivo, 'utf8'));
  const errores = [];
  const productos = filas.map((f, i) => {
    try {
      return validarFila(f);
    } catch (e) {
      errores.push(`Renglón ${i + 2}: ${e.message}`);
      return null;
    }
  }).filter(Boolean);

  if (errores.length) {
    console.log('El CSV tiene errores. Corrígelos y vuelve a intentar; no se cambió nada:');
    errores.forEach((e) => console.log('  - ' + e));
    process.exitCode = 1;
  } else {
    const resumen = await transaction(async (client) => {
      const r = { creados: [], actualizados: [], sinCambio: 0, fotos: 0 };
      for (const p of productos) {
        // Categoría: se crea si no existe
        const slugCat = slugify(p.categoria);
        let { rows: [cat] } = await client.query('SELECT id FROM categoria WHERE slug = $1', [slugCat]);
        if (!cat) ({ rows: [cat] } = await client.query('INSERT INTO categoria (nombre, slug) VALUES ($1, $2) RETURNING id', [p.categoria, slugCat]));

        // Foto: se copia de assets/imagenes/productos a server/uploads/productos
        let imagen = null;
        if (p.imagen) {
          const origen = path.join(carpetaFotos, path.basename(p.imagen));
          try {
            await fs.access(origen);
            imagen = `productos/catalogo-${path.basename(p.imagen)}`;
            if (!prueba) await fs.copyFile(origen, path.join(uploads, path.basename(imagen)));
            r.fotos++;
          } catch {
            console.log(`  Aviso: no encontré la foto ${p.imagen} en assets/imagenes/productos (se importa sin foto)`);
          }
        }

        // Se busca por nombre (sin importar mayúsculas) o por su slug
        const slug = slugify(p.nombre);
        const { rows: [actual] } = await client.query(
          'SELECT * FROM producto WHERE lower(nombre) = lower($1) OR slug = $2 ORDER BY eliminado_en NULLS FIRST LIMIT 1 FOR UPDATE',
          [p.nombre, slug],
        );
        if (!actual) {
          let slugLibre = slug;
          for (let i = 2; (await client.query('SELECT 1 FROM producto WHERE slug = $1', [slugLibre])).rowCount; i++) slugLibre = `${slug}-${i}`;
          await client.query(
            `INSERT INTO producto (categoria_id, nombre, slug, descripcion, precio, existencias, stock_minimo, pieza_3d, imagen)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [cat.id, p.nombre, slugLibre, p.descripcion, p.precio, p.existencias, p.stock_minimo, p.pieza_3d, imagen],
          );
          r.creados.push(p.nombre);
          continue;
        }

        const cambia = actual.categoria_id !== cat.id || actual.descripcion !== p.descripcion || actual.precio !== p.precio
          || actual.existencias !== p.existencias || actual.stock_minimo !== p.stock_minimo || actual.pieza_3d !== p.pieza_3d
          || (imagen && actual.imagen !== imagen) || actual.eliminado_en;
        if (!cambia) { r.sinCambio++; continue; }

        await client.query(
          `UPDATE producto SET categoria_id=$1, nombre=$2, descripcion=$3, precio=$4, stock_minimo=$5, pieza_3d=$6,
                  imagen=COALESCE($7, imagen), activo=TRUE, eliminado_en=NULL, actualizado_en=NOW() WHERE id=$8`,
          [cat.id, p.nombre, p.descripcion, p.precio, p.stock_minimo, p.pieza_3d, imagen, actual.id],
        );
        await fijarExistencias(client, { ...actual, stock_minimo: p.stock_minimo }, p.existencias);
        r.actualizados.push(p.nombre);
      }
      if (prueba) throw Object.assign(new Error('prueba'), { resumen: r });
      return r;
    }).catch((e) => { if (e.message === 'prueba') return e.resumen; throw e; });

    console.log(prueba ? 'MODO PRUEBA: no se guardó nada.' : 'Catálogo importado.');
    console.log(`  Nuevos: ${resumen.creados.length}${resumen.creados.length ? ' → ' + resumen.creados.join(', ') : ''}`);
    console.log(`  Actualizados: ${resumen.actualizados.length}${resumen.actualizados.length ? ' → ' + resumen.actualizados.join(', ') : ''}`);
    console.log(`  Sin cambios: ${resumen.sinCambio}`);
    console.log(`  Fotos: ${resumen.fotos}`);
  }
} catch (error) {
  console.error(error.code === 'ENOENT' ? `No encontré el archivo ${archivo}` : `No se pudo importar: ${error.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
