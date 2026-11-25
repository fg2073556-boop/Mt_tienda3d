import { Router } from 'express';
import { handle } from '../errors.js';
import { recomendar } from '../services/asesor.js';
import { text } from '../validate.js';

const router = Router();

// Límite sencillo: 10 consultas por minuto por IP, para no gastar la cuota de Gemini
const consultas = new Map();
function limitar(req, res, next) {
  const ahora = Date.now();
  const lista = (consultas.get(req.ip) || []).filter((t) => ahora - t < 60_000);
  if (lista.length >= 10) return res.status(429).json({ error: 'Hiciste muchas consultas seguidas. Espera un minuto.' });
  lista.push(ahora);
  consultas.set(req.ip, lista);
  next();
}

// POST /api/asesor  { necesidad }
router.post('/asesor', limitar, handle(async (req, res) => {
  const necesidad = text(req.body.necesidad, 'descripción', { min: 4, max: 300 });
  const r = await recomendar(necesidad);
  res.json({
    fuente: r.fuente,
    mensaje: r.mensaje,
    total: r.productos.reduce((s, p) => s + p.precio, 0),
    productos: r.productos.map(({ id, nombre, slug, precio, existencias }) => ({ id, nombre, slug, precio, existencias })),
  });
}));

export default router;
