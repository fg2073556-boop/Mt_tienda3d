import { Router } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { query, transaction } from '../db.js';
import { HttpError, handle } from '../errors.js';
import { ESTADOS, ESTADOS_ABIERTOS, METODOS_PAGO, PIEZAS } from '../constants.js';
import { permitir, requiereSesion } from '../middleware/auth.js';
import { fijarExistencias } from '../services/stock.js';
import { ErrorPago } from '../services/openpay.js';
import { revisarPedido } from '../services/pagos.js';
import { bool, especificaciones, int, modeloCodigo, money, oneOf, slugify, text } from '../validate.js';
import { SELECT_PRODUCTO, conUrls } from './catalogo.js';

export const UPLOADS = fileURLToPath(new URL('../../uploads', import.meta.url));
const router = Router();

// Todo el panel requiere sesión. Administrador puede todo; vendedor atiende pedidos y existencias.
router.use(requiereSesion, permitir('administrador', 'vendedor'));
const soloAdmin = permitir('administrador');

/* ---------- Subida de archivos (foto y modelo 3D) ---------- */
const subir = multer({
  storage: multer.diskStorage({
    destination: (_req, file, cb) => cb(null, path.join(UPLOADS, file.fieldname === 'modelo' ? 'modelos' : 'productos')),
    filename: (_req, file, cb) => {
      const ext = file.fieldname === 'modelo' ? '.glb' : path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === 'imagen' && !/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) {
      return cb(new HttpError(422, 'La foto debe ser JPG, PNG, WEBP o GIF.'));
    }
    if (file.fieldname === 'modelo' && path.extname(file.originalname).toLowerCase() !== '.glb') {
      return cb(new HttpError(422, 'El modelo 3D debe ser un archivo .glb.'));
    }
    cb(null, true);
  },
}).fields([{ name: 'imagen', maxCount: 1 }, { name: 'modelo', maxCount: 1 }]);

const rutaRelativa = (file) => (file ? `${file.fieldname === 'modelo' ? 'modelos' : 'productos'}/${file.filename}` : null);
const borrarArchivo = async (rel) => { if (rel) await fs.rm(path.join(UPLOADS, rel), { force: true }); };

/* ---------- Catálogos para los formularios ---------- */
router.get('/catalogos', handle(async (_req, res) => {
  const { rows: categorias } = await query('SELECT id, nombre, slug FROM categoria ORDER BY nombre');
  res.json({ categorias, piezas: PIEZAS, estados: ESTADOS, metodos: METODOS_PAGO });
}));

/* ---------- Resumen ---------- */
router.get('/resumen', handle(async (_req, res) => {
  const [ventas, abiertos, bajos, total, alertas, recientes] = await Promise.all([
    query(`SELECT COALESCE(SUM(total), 0) AS v FROM pedido WHERE creado_en::date = CURRENT_DATE AND estado <> 'cancelado'`),
    query('SELECT COUNT(*)::int AS n FROM pedido WHERE estado = ANY($1)', [ESTADOS_ABIERTOS]),
    query(`${SELECT_PRODUCTO} WHERE p.eliminado_en IS NULL AND p.activo AND p.existencias <= p.stock_minimo ORDER BY p.existencias, p.nombre`),
    query('SELECT COUNT(*)::int AS n FROM producto WHERE eliminado_en IS NULL'),
    query(`SELECT a.id, a.tipo, a.existencias, a.creada_en, p.nombre AS producto
           FROM alerta_stock a JOIN producto p ON p.id = a.producto_id
           WHERE a.leida_en IS NULL ORDER BY a.creada_en DESC LIMIT 20`),
    query('SELECT id, folio, cliente_nombre, total, estado, creado_en FROM pedido ORDER BY creado_en DESC LIMIT 6'),
  ]);
  res.json({
    ventas_hoy: ventas.rows[0].v,
    pedidos_abiertos: abiertos.rows[0].n,
    productos_total: total.rows[0].n,
    stock_bajo: bajos.rows.map(conUrls),
    alertas: alertas.rows,
    pedidos_recientes: recientes.rows,
  });
}));

/* ---------- Productos ---------- */
router.get('/productos', handle(async (req, res) => {
  const params = [];
  let where = 'WHERE p.eliminado_en IS NULL';
  if (req.query.q) {
    params.push(`%${String(req.query.q).trim()}%`);
    where += ` AND p.nombre ILIKE $1`;
  }
  const { rows } = await query(`${SELECT_PRODUCTO} ${where} ORDER BY c.nombre, p.nombre`, params);
  res.json(rows.map(conUrls));
}));

/** Lee y valida los campos del formulario de producto */
function leerProducto(body) {
  return {
    nombre: text(body.nombre, 'nombre', { min: 3, max: 150 }),
    categoria_id: int(body.categoria_id, 'categoría', { min: 1, max: 1_000_000 }),
    descripcion: text(body.descripcion, 'descripción', { max: 2000, required: false }),
    precio: money(body.precio, 'precio'),
    existencias: int(body.existencias, 'existencias', { min: 0, max: 100000 }),
    stock_minimo: int(body.stock_minimo ?? 2, 'aviso de stock bajo', { min: 0, max: 1000 }),
    pieza_3d: body.pieza_3d ? oneOf(body.pieza_3d, 'pieza 3D', Object.keys(PIEZAS)) : null,
    modelo_codigo: modeloCodigo(body.modelo_codigo),
    especificaciones: especificaciones(body.especificaciones),
    activo: bool(body.activo),
  };
}

async function slugUnico(client, nombre, ignorarId = 0) {
  const base = slugify(nombre);
  let slug = base;
  for (let i = 2; ; i++) {
    const { rowCount } = await client.query('SELECT 1 FROM producto WHERE slug = $1 AND id <> $2', [slug, ignorarId]);
    if (!rowCount) return slug;
    slug = `${base}-${i}`;
  }
}

const conSubida = (req, res, next) => subir(req, res, (err) => next(err));

router.post('/productos', soloAdmin, conSubida, handle(async (req, res) => {
  const archivos = { imagen: rutaRelativa(req.files?.imagen?.[0]), modelo: rutaRelativa(req.files?.modelo?.[0]) };
  try {
    const d = leerProducto(req.body);
    const producto = await transaction(async (client) => {
      const slug = await slugUnico(client, d.nombre);
      const { rows } = await client.query(
        `INSERT INTO producto (categoria_id, nombre, slug, descripcion, precio, existencias, stock_minimo, pieza_3d, activo, imagen, modelo_3d,
                               modelo_codigo, especificaciones)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
        [d.categoria_id, d.nombre, slug, d.descripcion, d.precio, d.existencias, d.stock_minimo, d.pieza_3d, d.activo, archivos.imagen, archivos.modelo,
          d.modelo_codigo, JSON.stringify(d.especificaciones)],
      );
      return rows[0];
    });
    const { rows } = await query(`${SELECT_PRODUCTO} WHERE p.id = $1`, [producto.id]);
    res.status(201).json(conUrls(rows[0]));
  } catch (error) {
    await borrarArchivo(archivos.imagen);
    await borrarArchivo(archivos.modelo);
    if (error.code === '23503') throw new HttpError(422, 'La categoría no existe.');
    throw error;
  }
}));

router.put('/productos/:id', soloAdmin, conSubida, handle(async (req, res) => {
  const id = int(req.params.id, 'id', { min: 1, max: 2_000_000_000 });
  const nuevos = { imagen: rutaRelativa(req.files?.imagen?.[0]), modelo: rutaRelativa(req.files?.modelo?.[0]) };
  let porBorrar = [];
  try {
    const d = leerProducto(req.body);
    await transaction(async (client) => {
      const { rows: [actual] } = await client.query('SELECT * FROM producto WHERE id = $1 AND eliminado_en IS NULL FOR UPDATE', [id]);
      if (!actual) throw new HttpError(404, 'El producto no existe.');

      let imagen = actual.imagen;
      let modelo = actual.modelo_3d;
      if (nuevos.imagen || bool(req.body.quitar_imagen)) { porBorrar.push(imagen); imagen = nuevos.imagen; }
      if (nuevos.modelo || bool(req.body.quitar_modelo)) { porBorrar.push(modelo); modelo = nuevos.modelo; }

      const slug = d.nombre === actual.nombre ? actual.slug : await slugUnico(client, d.nombre, id);
      await client.query(
        `UPDATE producto SET categoria_id=$1, nombre=$2, slug=$3, descripcion=$4, precio=$5, stock_minimo=$6,
                pieza_3d=$7, activo=$8, imagen=$9, modelo_3d=$10, modelo_codigo=$11, especificaciones=$12, actualizado_en=NOW() WHERE id=$13`,
        [d.categoria_id, d.nombre, slug, d.descripcion, d.precio, d.stock_minimo, d.pieza_3d, d.activo, imagen, modelo,
          d.modelo_codigo, JSON.stringify(d.especificaciones), id],
      );
      // Las existencias pasan por el servicio para que se generen las alertas
      await fijarExistencias(client, { ...actual, stock_minimo: d.stock_minimo }, d.existencias);
    });
  } catch (error) {
    await borrarArchivo(nuevos.imagen);
    await borrarArchivo(nuevos.modelo);
    porBorrar = [];
    if (error.code === '23503') throw new HttpError(422, 'La categoría no existe.');
    throw error;
  }
  await Promise.all(porBorrar.map(borrarArchivo));
  const { rows } = await query(`${SELECT_PRODUCTO} WHERE p.id = $1`, [id]);
  res.json(conUrls(rows[0]));
}));

// PATCH /api/admin/productos/:id/existencias  { delta: 1 | -1 | n }
router.patch('/productos/:id/existencias', handle(async (req, res) => {
  const id = int(req.params.id, 'id', { min: 1, max: 2_000_000_000 });
  const delta = int(req.body.delta, 'cantidad', { min: -1000, max: 1000 });
  const r = await transaction(async (client) => {
    const { rows: [p] } = await client.query('SELECT * FROM producto WHERE id = $1 AND eliminado_en IS NULL FOR UPDATE', [id]);
    if (!p) throw new HttpError(404, 'El producto no existe.');
    return fijarExistencias(client, p, p.existencias + delta);
  });
  res.json(r);
}));

// Borrado suave: el producto se oculta, pero los pedidos anteriores lo conservan
router.delete('/productos/:id', soloAdmin, handle(async (req, res) => {
  const id = int(req.params.id, 'id', { min: 1, max: 2_000_000_000 });
  const { rowCount } = await query(
    'UPDATE producto SET eliminado_en = NOW(), activo = FALSE, actualizado_en = NOW() WHERE id = $1 AND eliminado_en IS NULL',
    [id],
  );
  if (!rowCount) throw new HttpError(404, 'El producto no existe.');
  res.status(204).end();
}));

/* ---------- Pedidos ---------- */
router.get('/pedidos', handle(async (req, res) => {
  const params = [];
  let where = '';
  if (req.query.estado && ESTADOS[req.query.estado]) {
    params.push(req.query.estado);
    where = 'WHERE p.estado = $1';
  }
  const { rows } = await query(
    `SELECT p.id, p.folio, p.cliente_nombre, p.total, p.estado, p.metodo_pago, p.creado_en,
            (SELECT COALESCE(SUM(cantidad), 0)::int FROM pedido_detalle d WHERE d.pedido_id = p.id) AS articulos
     FROM pedido p ${where} ORDER BY p.creado_en DESC LIMIT 200`,
    params,
  );
  res.json(rows);
}));

router.get('/pedidos/:id', handle(async (req, res) => {
  const id = int(req.params.id, 'id', { min: 1, max: 2_000_000_000 });
  const { rows: [pedido] } = await query('SELECT * FROM pedido WHERE id = $1', [id]);
  if (!pedido) throw new HttpError(404, 'El pedido no existe.');
  const { rows: detalle } = await query('SELECT * FROM pedido_detalle WHERE pedido_id = $1 ORDER BY id', [id]);
  res.json({ ...pedido, detalle });
}));

// PATCH /api/admin/pedidos/:id/estado  { estado }
router.patch('/pedidos/:id/estado', handle(async (req, res) => {
  const id = int(req.params.id, 'id', { min: 1, max: 2_000_000_000 });
  const estado = oneOf(req.body.estado, 'estado', Object.keys(ESTADOS));

  const pedido = await transaction(async (client) => {
    const { rows: [p] } = await client.query('SELECT * FROM pedido WHERE id = $1 FOR UPDATE', [id]);
    if (!p) throw new HttpError(404, 'El pedido no existe.');
    if (p.estado === 'cancelado' && estado !== 'cancelado') {
      throw new HttpError(409, 'Un pedido cancelado no se puede reactivar. Pide al cliente que compre de nuevo.');
    }
    // Al cancelar, las piezas regresan al inventario
    if (estado === 'cancelado' && p.estado !== 'cancelado') {
      const { rows: items } = await client.query(
        `SELECT d.cantidad, pr.* FROM pedido_detalle d JOIN producto pr ON pr.id = d.producto_id
         WHERE d.pedido_id = $1 ORDER BY pr.id FOR UPDATE OF pr`, [id]);
      for (const item of items) await fijarExistencias(client, item, item.existencias + item.cantidad);
    }
    const { rows: [actualizado] } = await client.query(
      'UPDATE pedido SET estado = $1, actualizado_en = NOW() WHERE id = $2 RETURNING *', [estado, id]);
    return actualizado;
  });
  res.json(pedido);
}));

// POST /api/admin/pedidos/:id/revisar-pago → pregunta a Openpay si ya se pagó
router.post('/pedidos/:id/revisar-pago', handle(async (req, res) => {
  const id = int(req.params.id, 'id', { min: 1, max: 2_000_000_000 });
  const { rows: [p] } = await query('SELECT id, pago_id FROM pedido WHERE id = $1', [id]);
  if (!p) throw new HttpError(404, 'El pedido no existe.');
  if (!p.pago_id) throw new HttpError(422, 'Este pedido no se cobró con Openpay.');
  try {
    res.json(await revisarPedido({ query }, p));
  } catch (error) {
    if (error instanceof ErrorPago) throw new HttpError(error.status, error.message);
    throw error;
  }
}));

/* ---------- Alertas ---------- */
router.patch('/alertas/:id/leida', handle(async (req, res) => {
  const id = int(req.params.id, 'id', { min: 1, max: 2_000_000_000 });
  await query('UPDATE alerta_stock SET leida_en = NOW() WHERE id = $1 AND leida_en IS NULL', [id]);
  res.status(204).end();
}));

router.post('/alertas/leer-todas', handle(async (_req, res) => {
  await query('UPDATE alerta_stock SET leida_en = NOW() WHERE leida_en IS NULL');
  res.status(204).end();
}));

export default router;
