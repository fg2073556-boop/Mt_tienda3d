import { Router } from 'express';
import { query } from '../db.js';
import { HttpError, handle } from '../errors.js';
import { permitir, requiereSesion } from '../middleware/auth.js';
import { cotizar, mapaDeZonas } from '../services/envios.js';
import { int, text } from '../validate.js';

// El envío puede ser gratis (0), pero no negativo
const costoEnvio = (v) => {
  const n = Number(v);
  if (v === '' || v === null || v === undefined || !Number.isFinite(n) || n < 0 || n > 10000) {
    throw new HttpError(422, 'El costo de envío debe ser un número entre 0 y 10,000.');
  }
  return Math.round(n * 100) / 100;
};

const router = Router();

// GET /api/envios/cotizar?cp=75200 → si llegamos, colonias, zona, costo, días y ruta desde la tienda
router.get('/envios/cotizar', handle(async (req, res) => {
  res.json(await cotizar({ query }, req.query.cp));
}));

// GET /api/envios/zonas → zonas y los 217 municipios de Puebla para el mapa
router.get('/envios/zonas', handle(async (_req, res) => {
  res.json(await mapaDeZonas({ query }));
}));

/* ---------- Panel (solo administrador) ---------- */
const admin = [requiereSesion, permitir('administrador')];

// PUT /api/admin/envios/zonas/:id  { costo, dias_min, dias_max }
router.put('/admin/envios/zonas/:id', ...admin, handle(async (req, res) => {
  const id = int(req.params.id, 'zona', { min: 1, max: 99 });
  const costo = costoEnvio(req.body.costo);
  const diasMin = int(req.body.dias_min, 'días mínimos', { min: 0, max: 60 });
  const diasMax = int(req.body.dias_max, 'días máximos', { min: diasMin, max: 60 });
  const nombre = text(req.body.nombre, 'nombre de la zona', { min: 3, max: 60, required: false });
  const { rows: [z] } = await query(
    `UPDATE zona_envio SET costo = $2, dias_min = $3, dias_max = $4, nombre = COALESCE($5, nombre)
     WHERE id = $1 RETURNING *`,
    [id, costo, diasMin, diasMax, nombre],
  );
  if (!z) throw new HttpError(404, 'La zona no existe.');
  res.json({ ...z, costo: Number(z.costo) });
}));

// PATCH /api/admin/envios/municipios/:cve  { zona_id: 1 | 2 | 3 | null }  (null = sin cobertura)
router.patch('/admin/envios/municipios/:cve', ...admin, handle(async (req, res) => {
  const cve = String(req.params.cve);
  if (!/^\d{3}$/.test(cve)) throw new HttpError(422, 'Clave de municipio no válida.');
  const zona = req.body.zona_id === null || req.body.zona_id === '' ? null : int(req.body.zona_id, 'zona', { min: 1, max: 99 });
  if (zona !== null) {
    const { rowCount } = await query('SELECT 1 FROM zona_envio WHERE id = $1', [zona]);
    if (!rowCount) throw new HttpError(422, 'Esa zona no existe.');
  }
  const { rows: [m] } = await query(
    'UPDATE municipio_envio SET zona_id = $2 WHERE cve_mun = $1 RETURNING cve_mun, nombre, distancia_km, zona_id', [cve, zona]);
  if (!m) throw new HttpError(404, 'El municipio no existe.');
  res.json({ ...m, distancia_km: Number(m.distancia_km) });
}));

export default router;
