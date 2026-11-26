import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { HttpError, handle } from '../errors.js';
import { requiereSesion } from '../middleware/auth.js';
import { email, text } from '../validate.js';

/**
 * Un solo inicio de sesión para todos:
 *  - cliente: compra en la tienda y ve sus pedidos (se registra solo)
 *  - vendedor y administrador: entran al panel (sus cuentas vienen de server/.env)
 */
const router = Router();

/* Límites contra ataques de fuerza bruta (en memoria, por IP) */
function limitador(maximo, ventanaMs) {
  const registro = new Map();
  return {
    excedido(clave) {
      const ahora = Date.now();
      const lista = (registro.get(clave) || []).filter((t) => ahora - t < ventanaMs);
      registro.set(clave, lista);
      return lista.length >= maximo;
    },
    anotar(clave) {
      if (!registro.has(clave)) registro.set(clave, []);
      registro.get(clave).push(Date.now());
    },
    limpiar(clave) { registro.delete(clave); },
  };
}
const fallidos = limitador(10, 15 * 60_000); // 10 contraseñas equivocadas cada 15 min
const registros = limitador(5, 60 * 60_000); // 5 cuentas nuevas por hora

const publico = (u) => ({ id: u.id, nombre: u.nombre, correo: u.correo, rol: u.rol, telefono: u.telefono ?? null });
const firmar = (u) => jwt.sign(
  { id: u.id, nombre: u.nombre, correo: u.correo, rol: u.rol },
  process.env.JWT_SECRET,
  // El personal vuelve a entrar cada día; el cliente se queda con sesión una semana
  { expiresIn: u.rol === 'cliente' ? '7d' : '8h' },
);

// POST /api/auth/login  { correo, password }
router.post('/login', handle(async (req, res) => {
  if (fallidos.excedido(req.ip)) throw new HttpError(429, 'Demasiados intentos fallidos. Espera 15 minutos e intenta de nuevo.');
  const correo = email(req.body.correo);
  const password = text(req.body.password, 'contraseña', { max: 200 });

  const { rows } = await query('SELECT * FROM usuario WHERE correo = $1 AND activo', [correo]);
  const usuario = rows[0];
  if (!usuario || !(await bcrypt.compare(password, usuario.password_hash))) {
    fallidos.anotar(req.ip);
    throw new HttpError(401, 'El correo o la contraseña no son correctos.');
  }
  fallidos.limpiar(req.ip);
  res.json({ token: firmar(usuario), usuario: publico(usuario) });
}));

// POST /api/auth/registro  { nombre, correo, password, telefono? }  → crea una cuenta de cliente
router.post('/registro', handle(async (req, res) => {
  if (registros.excedido(req.ip)) throw new HttpError(429, 'Se crearon demasiadas cuentas desde esta conexión. Intenta más tarde.');
  const nombre = text(req.body.nombre, 'nombre', { min: 3, max: 120 });
  const correo = email(req.body.correo);
  const password = text(req.body.password, 'contraseña', { min: 8, max: 100 });
  const telefono = text(req.body.telefono, 'teléfono', { max: 20, required: false });
  if (telefono && !/^[\d\s()+-]{8,20}$/.test(telefono)) throw new HttpError(422, 'El teléfono no es válido.');

  const hash = await bcrypt.hash(password, 10);
  const { rows: [u] } = await query(
    `INSERT INTO usuario (nombre, correo, password_hash, rol, telefono) VALUES ($1, $2, $3, 'cliente', $4)
     ON CONFLICT (correo) DO NOTHING RETURNING *`,
    [nombre, correo, hash, telefono],
  );
  if (!u) throw new HttpError(409, 'Ya existe una cuenta con ese correo. Inicia sesión.');
  registros.anotar(req.ip);
  res.status(201).json({ token: firmar(u), usuario: publico(u) });
}));

// GET /api/auth/yo  → datos del usuario con sesión
router.get('/yo', requiereSesion, handle(async (req, res) => {
  const { rows: [u] } = await query('SELECT * FROM usuario WHERE id = $1 AND activo', [req.usuario.id]);
  if (!u) throw new HttpError(401, 'Tu cuenta ya no está activa. Vuelve a iniciar sesión.');
  res.json(publico(u));
}));

export default router;
