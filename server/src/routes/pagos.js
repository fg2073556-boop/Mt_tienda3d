import crypto from 'node:crypto';
import { Router } from 'express';
import { pool } from '../db.js';
import { handle } from '../errors.js';
import { configPublica, consultarCargo, openpayListo } from '../services/openpay.js';
import { aplicarCargo } from '../services/pagos.js';

const router = Router();

// GET /api/pagos/config → si hay Openpay y las llaves públicas para Openpay.js
router.get('/pagos/config', (_req, res) => res.json(configPublica()));

// Compara sin filtrar por tiempo cuánto se parecen las contraseñas
const iguales = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/**
 * POST /api/pagos/openpay/webhook
 * Openpay avisa aquí cuando se paga una transferencia o un pago en tienda.
 * No se confía en lo que llega: se vuelve a consultar el cargo en Openpay antes de marcar el pedido.
 * Opcional: OPENPAY_WEBHOOK_USUARIO y OPENPAY_WEBHOOK_CLAVE (autenticación básica que se configura en Openpay).
 */
router.post('/pagos/openpay/webhook', handle(async (req, res) => {
  const usuario = process.env.OPENPAY_WEBHOOK_USUARIO;
  const clave = process.env.OPENPAY_WEBHOOK_CLAVE;
  if (usuario && clave) {
    const [tipo, valor] = String(req.headers.authorization || '').split(' ');
    const [u, c] = Buffer.from(valor || '', 'base64').toString().split(':');
    if (tipo !== 'Basic' || !iguales(u, usuario) || !iguales(c, clave)) return res.status(401).json({ error: 'No autorizado.' });
  }

  const evento = req.body || {};
  // Al dar de alta el webhook, Openpay manda un código que hay que copiar en su panel
  if (evento.type === 'verification') {
    console.log(`Openpay: código de verificación del webhook → ${evento.verification_code}`);
    return res.json({ ok: true });
  }

  const id = evento.transaction?.id;
  if (!openpayListo() || typeof id !== 'string' || !String(evento.type || '').startsWith('charge.')) return res.json({ ok: true });

  try {
    const cargo = await consultarCargo(id);
    const r = await aplicarCargo(pool, cargo);
    if (r) console.log(`Openpay: ${r.folio} → pago ${r.pago_estado}${r.estado === 'pagado' ? ' (pedido pagado)' : ''}`);
  } catch (error) {
    console.warn('Webhook de Openpay:', error.message);
    return res.status(502).json({ error: 'No se pudo confirmar el pago con Openpay; vuelve a intentar.' });
  }
  res.json({ ok: true });
}));

export default router;
