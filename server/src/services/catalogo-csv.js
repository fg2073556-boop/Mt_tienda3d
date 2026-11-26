import { PIEZAS } from '../constants.js';
import { especificaciones, modeloCodigo } from '../validate.js';

/**
 * Lee un CSV (separado por comas, con comillas para textos que llevan comas)
 * y regresa un arreglo de objetos usando el primer renglón como encabezados.
 */
export function leerCsv(texto) {
  const renglones = [];
  let campo = '', fila = [], comillas = false;
  const t = texto.replace(/^﻿/, ''); // quita el BOM que agrega Excel

  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (comillas) {
      if (c === '"' && t[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') comillas = false;
      else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === ',') { fila.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      fila.push(campo); campo = '';
      if (fila.some((x) => x.trim() !== '')) renglones.push(fila);
      fila = [];
    } else campo += c;
  }
  fila.push(campo);
  if (fila.some((x) => x.trim() !== '')) renglones.push(fila);

  const [encabezados, ...datos] = renglones;
  if (!encabezados) return [];
  const claves = encabezados.map((h) => h.trim().toLowerCase());
  return datos.map((r) => Object.fromEntries(claves.map((k, i) => [k, (r[i] ?? '').trim()])));
}

/** Valida y limpia un renglón del catálogo. Lanza Error con el problema en español. */
export function validarFila(f) {
  const nombre = f.nombre;
  if (!nombre || nombre.length < 3) throw new Error('falta el nombre o es muy corto');
  if (nombre.length > 150) throw new Error(`"${nombre}": el nombre tiene más de 150 caracteres`);
  if (!f.categoria) throw new Error(`"${nombre}": falta la categoría`);

  const precio = Number(String(f.precio_mxn ?? f.precio ?? '').replace(/[$,\s]/g, ''));
  if (!(precio > 0)) throw new Error(`"${nombre}": el precio debe ser un número mayor a cero`);

  const existencias = Number(f.existencias);
  if (!Number.isInteger(existencias) || existencias < 0) throw new Error(`"${nombre}": las existencias deben ser un entero desde 0`);

  const stockMin = f.stock_minimo === undefined || f.stock_minimo === '' ? 2 : Number(f.stock_minimo);
  if (!Number.isInteger(stockMin) || stockMin < 0) throw new Error(`"${nombre}": stock_minimo debe ser un entero desde 0`);

  const pieza = f.pieza_3d || null;
  if (pieza && !PIEZAS[pieza]) throw new Error(`"${nombre}": pieza_3d "${pieza}" no existe (usa: ${Object.keys(PIEZAS).join(', ')})`);

  let modelo, specs;
  try {
    modelo = modeloCodigo(f.modelo_codigo);
    // en el CSV las especificaciones van en una celda: "Dato: valor | Dato: valor"
    specs = especificaciones((f.especificaciones || '').split('|').join('\n'));
  } catch (e) {
    throw new Error(`"${nombre}": ${e.message}`);
  }

  return {
    nombre,
    categoria: f.categoria,
    precio: Math.round(precio * 100) / 100,
    existencias,
    stock_minimo: stockMin,
    pieza_3d: pieza,
    descripcion: f.descripcion || null,
    imagen: f.imagen || null,
    modelo_codigo: modelo,
    especificaciones: specs,
  };
}
