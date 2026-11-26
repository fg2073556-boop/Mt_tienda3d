import { Router } from 'express';
import { query } from '../db.js';
import { HttpError, handle } from '../errors.js';
import { PIEZAS } from '../constants.js';

const router = Router();

/** Consulta base de productos con su categoría, ya en la forma que usa el frontend */
export const SELECT_PRODUCTO = `
  SELECT p.id, p.nombre, p.slug, p.descripcion, p.precio, p.existencias, p.stock_minimo,
         p.imagen, p.modelo_3d, p.pieza_3d, p.modelo_codigo, p.especificaciones, p.activo,
         json_build_object('id', c.id, 'nombre', c.nombre, 'slug', c.slug) AS categoria
  FROM producto p JOIN categoria c ON c.id = p.categoria_id`;

/** Agrega las URLs públicas de foto y modelo 3D */
export const conUrls = (p) => ({
  ...p,
  imagen_url: p.imagen ? `/uploads/${p.imagen}` : null,
  modelo_url: p.modelo_3d ? `/uploads/${p.modelo_3d}` : null,
  pieza_nombre: p.pieza_3d ? PIEZAS[p.pieza_3d] : null,
});

// GET /api/categorias
router.get('/categorias', handle(async (_req, res) => {
  const { rows } = await query('SELECT id, nombre, slug FROM categoria ORDER BY nombre');
  res.json(rows);
}));

// GET /api/productos?categoria=componentes&q=ryzen
router.get('/productos', handle(async (req, res) => {
  const params = [];
  let where = 'WHERE p.activo AND p.eliminado_en IS NULL';
  if (req.query.categoria) {
    params.push(String(req.query.categoria));
    where += ` AND c.slug = $${params.length}`;
  }
  if (req.query.q) {
    params.push(`%${String(req.query.q).trim()}%`);
    where += ` AND (p.nombre ILIKE $${params.length} OR p.descripcion ILIKE $${params.length})`;
  }
  const { rows } = await query(`${SELECT_PRODUCTO} ${where} ORDER BY c.nombre, p.nombre`, params);
  res.json(rows.map(conUrls));
}));

// GET /api/productos/:slug
router.get('/productos/:slug', handle(async (req, res) => {
  const { rows } = await query(
    `${SELECT_PRODUCTO} WHERE p.slug = $1 AND p.activo AND p.eliminado_en IS NULL`,
    [req.params.slug],
  );
  if (!rows[0]) throw new HttpError(404, 'Ese producto no existe o ya no está disponible.');
  res.json(conUrls(rows[0]));
}));

// GET /api/piezas → producto que corresponde a cada pieza de la escena 3D
router.get('/piezas', handle(async (_req, res) => {
  const { rows } = await query(`
    SELECT DISTINCT ON (p.pieza_3d) p.*
    FROM (${SELECT_PRODUCTO} WHERE p.pieza_3d IS NOT NULL AND p.activo AND p.eliminado_en IS NULL) p
    ORDER BY p.pieza_3d, p.id`);
  res.json(Object.fromEntries(rows.map((p) => [p.pieza_3d, conUrls(p)])));
}));

export default router;
