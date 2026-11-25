import { HttpError } from './errors.js';

/**
 * Validaciones sencillas para los formularios. Cada función regresa el valor limpio
 * o lanza un HttpError 422 con el mensaje en español.
 */
export const text = (value, field, { min = 1, max = 255, required = true } = {}) => {
  const v = typeof value === 'string' ? value.trim() : '';
  if (!v) {
    if (required) throw new HttpError(422, `El campo ${field} es obligatorio.`);
    return null;
  }
  if (v.length < min) throw new HttpError(422, `El campo ${field} debe tener al menos ${min} caracteres.`);
  if (v.length > max) throw new HttpError(422, `El campo ${field} no debe tener más de ${max} caracteres.`);
  return v;
};

export const email = (value, field = 'correo') => {
  const v = text(value, field, { max: 150 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new HttpError(422, `El ${field} no es válido.`);
  return v.toLowerCase();
};

export const int = (value, field, { min = 0, max = 100000 } = {}) => {
  const n = Number(value);
  if (value === '' || value === null || value === undefined || !Number.isInteger(n)) {
    throw new HttpError(422, `El campo ${field} debe ser un número entero.`);
  }
  if (n < min || n > max) throw new HttpError(422, `El campo ${field} debe estar entre ${min} y ${max}.`);
  return n;
};

export const money = (value, field) => {
  const n = Number(value);
  if (value === '' || value === null || value === undefined || !Number.isFinite(n) || n <= 0) {
    throw new HttpError(422, `El campo ${field} debe ser un número mayor a cero.`);
  }
  return Math.round(n * 100) / 100;
};

export const oneOf = (value, field, options) => {
  if (!options.includes(value)) throw new HttpError(422, `El valor de ${field} no es válido.`);
  return value;
};

export const bool = (value) => value === true || value === 'true' || value === '1' || value === 1 || value === 'on';

export const slugify = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'producto';
