import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { HttpError, handle } from '../errors.js';
import { requiereSesion } from '../middleware/auth.js';
import { email, text } from '../validate.js';

const router = Router();

// POST /api/auth/login  { correo, password }
router.post('/login', handle(async (req, res) => {
  const correo = email(req.body.correo);
  const password = text(req.body.password, 'contraseña', { max: 200 });

  const { rows } = await query('SELECT * FROM usuario WHERE correo = $1 AND activo', [correo]);
  const usuario = rows[0];
  if (!usuario || !(await bcrypt.compare(password, usuario.password_hash))) {
    throw new HttpError(401, 'El correo o la contraseña no son correctos.');
  }

  const datos = { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol };
  const token = jwt.sign(datos, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, usuario: datos });
}));

// GET /api/auth/yo  → datos del usuario con sesión
router.get('/yo', requiereSesion, (req, res) => {
  const { id, nombre, correo, rol } = req.usuario;
  res.json({ id, nombre, correo, rol });
});

export default router;
