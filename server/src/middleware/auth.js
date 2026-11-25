import jwt from 'jsonwebtoken';
import { HttpError } from '../errors.js';

/** Exige un token válido en el encabezado Authorization: Bearer <token> */
export function requiereSesion(req, _res, next) {
  const [tipo, token] = (req.headers.authorization || '').split(' ');
  if (tipo !== 'Bearer' || !token) return next(new HttpError(401, 'Inicia sesión para continuar.'));

  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new HttpError(401, 'Tu sesión expiró. Vuelve a iniciar sesión.'));
  }
}

/** Limita una ruta a ciertos roles, ej. permitir('administrador') */
export const permitir = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.usuario?.rol)) return next(new HttpError(403, 'Tu rol no tiene permiso para esta acción.'));
  next();
};
