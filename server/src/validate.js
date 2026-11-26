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

/** Código de modelo 3D hecho con código, p. ej. "gpu-rtx-5060-ti" */
export const modeloCodigo = (value) => {
  const v = typeof value === 'string' ? value.trim() : '';
  if (!v) return null;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(v) || v.length > 40) throw new HttpError(422, 'El modelo 3D no es válido.');
  return v;
};

/**
 * Especificaciones del producto como lista de pares [dato, valor].
 * Acepta un arreglo, su texto JSON o renglones "Dato: valor".
 */
export const especificaciones = (value) => {
  let lista = value;
  if (lista === undefined || lista === null || lista === '') return [];
  if (typeof lista === 'string') {
    const t = lista.trim();
    if (t.startsWith('[')) {
      try { lista = JSON.parse(t); } catch { throw new HttpError(422, 'Las especificaciones no tienen un formato válido.'); }
    } else {
      lista = t.split(/\r?\n/).map((r) => r.trim()).filter(Boolean).map((r) => {
        const i = r.indexOf(':');
        if (i < 1) throw new HttpError(422, `Escribe cada especificación como "Dato: valor" (renglón "${r.slice(0, 40)}").`);
        return [r.slice(0, i), r.slice(i + 1)];
      });
    }
  }
  if (!Array.isArray(lista) || lista.length > 20) throw new HttpError(422, 'Las especificaciones deben ser una lista de máximo 20 datos.');
  return lista.map((par) => {
    if (!Array.isArray(par) || par.length !== 2) throw new HttpError(422, 'Cada especificación debe tener dato y valor.');
    const [k, v] = par.map((x) => String(x ?? '').trim());
    if (!k || !v) throw new HttpError(422, 'Cada especificación debe tener dato y valor.');
    if (k.length > 40 || v.length > 120) throw new HttpError(422, 'Una especificación es demasiado larga (dato 40, valor 120 caracteres).');
    return [k, v];
  });
};

export const bool = (value) => value === true || value === 'true' || value === '1' || value === 1 || value === 'on';

export const slugify = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'producto';
