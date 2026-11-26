/**
 * Pruebas de los 4 módulos obligatorios del reto contra una base PostgreSQL de PRUEBAS.
 *
 * Crea una base vacía cuyo nombre termine en _test (por seguridad, no corre sobre otra):
 *   docker exec -it mt_tienda_db createdb -U mt_admin mt_tienda_test
 * y corre:
 *   DB_NAME=mt_tienda_test npm test        (Linux / Git Bash)
 *   $env:DB_NAME="mt_tienda_test"; npm test (PowerShell)
 */
import dotenv from 'dotenv';
dotenv.config({ quiet: true });
process.env.JWT_SECRET ||= 'secreto-de-pruebas';

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import bcrypt from 'bcryptjs';

if (!String(process.env.DB_NAME).endsWith('_test')) {
  throw new Error(`Por seguridad las pruebas solo corren en una base que termine en _test (DB_NAME=${process.env.DB_NAME}).`);
}

const { pool } = await import('../src/db.js');
const { crearApp } = await import('../src/app.js');
const { sincronizarCuentas } = await import('../src/cuentas.js');

let server;
let base;
const api = async (method, ruta, { body, token } = {}) => {
  const res = await fetch(base + ruta, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
};
const idDe = async (slug) => (await pool.query('SELECT id FROM producto WHERE slug = $1', [slug])).rows[0].id;
const existencias = async (slug) => (await pool.query('SELECT existencias FROM producto WHERE slug = $1', [slug])).rows[0].existencias;
const login = async (correo) => (await api('POST', '/api/auth/login', { body: { correo, password: 'clave-de-prueba' } })).body.token;

before(async () => {
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await pool.query(await fs.readFile(new URL('../../database/schema.sql', import.meta.url), 'utf8'));
  await pool.query(await fs.readFile(new URL('../../database/seed.sql', import.meta.url), 'utf8'));
  const hash = await bcrypt.hash('clave-de-prueba', 4);
  await pool.query(
    `INSERT INTO usuario (nombre, correo, password_hash, rol) VALUES ('Admin', 'admin@test.mx', $1, 'administrador'), ('Vende', 'vende@test.mx', $1, 'vendedor')`,
    [hash],
  );
  server = crearApp().listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server?.close();
  await pool.end();
});

test('cuentas: el servidor crea y actualiza las cuentas del panel desde .env', async () => {
  const env = { ADMIN_NAME: 'Admin Env', ADMIN_EMAIL: 'Env.Admin@Prueba.test', ADMIN_PASSWORD: 'primera-clave', SELLER_EMAIL: 'corta@prueba.test', SELLER_PASSWORD: '123' };
  let r = await sincronizarCuentas(pool, env);
  assert.equal(r[0].estado, 'creada');
  assert.equal(r[1].estado, 'omitida');
  const entrar = (password) => api('POST', '/api/auth/login', { body: { correo: 'env.admin@prueba.test', password } });
  assert.equal((await entrar('primera-clave')).status, 200);

  r = await sincronizarCuentas(pool, env);
  assert.equal(r[0].estado, 'sin cambios');

  r = await sincronizarCuentas(pool, { ...env, ADMIN_PASSWORD: 'segunda-clave' });
  assert.equal(r[0].estado, 'actualizada');
  assert.equal((await entrar('primera-clave')).status, 401);
  assert.equal((await entrar('segunda-clave')).status, 200);
});

test('catálogo: lista productos activos, filtra y da piezas 3D', async () => {
  const todos = await api('GET', '/api/productos');
  assert.equal(todos.status, 200);
  assert.equal(todos.body.length, 34);
  const comp = await api('GET', '/api/productos?categoria=componentes');
  assert.ok(comp.body.every((p) => p.categoria.slug === 'componentes'));
  const piezas = await api('GET', '/api/piezas');
  assert.equal(piezas.body.gpu.nombre, 'Tarjeta de video RTX 4060 8 GB');
  assert.equal(typeof piezas.body.gpu.precio, 'number');
});

test('pago: no vende más de lo que hay y no guarda nada', async () => {
  const gpu = await idDe('tarjeta-de-video-rtx-4060-8-gb');
  const r = await api('POST', '/api/pedidos', { body: {
    cliente_nombre: 'Cliente', cliente_correo: 'c@ejemplo.com', direccion: 'Tepeaca', metodo_pago: 'tienda',
    items: [{ producto_id: gpu, cantidad: 3 }],
  } });
  assert.equal(r.status, 409);
  assert.equal(await existencias('tarjeta-de-video-rtx-4060-8-gb'), 2);
});

test('pago: crea pedido, descuenta stock y genera alerta de agotado', async () => {
  const gpu = await idDe('tarjeta-de-video-rtx-4060-8-gb');
  const ram = await idDe('memoria-32-gb-ddr5-rgb-2x16');
  const r = await api('POST', '/api/pedidos', { body: {
    cliente_nombre: 'Cliente de prueba', cliente_correo: 'cliente@ejemplo.com', direccion: 'Tepeaca, Puebla',
    metodo_pago: 'tarjeta_prueba', items: [{ producto_id: gpu, cantidad: 2 }, { producto_id: ram, cantidad: 1 }],
  } });
  assert.equal(r.status, 201);
  assert.equal(r.body.folio, 'MT-00005');
  assert.equal(r.body.estado, 'pagado');
  assert.equal(r.body.total, 6999 * 2 + 2199);
  assert.equal(await existencias('tarjeta-de-video-rtx-4060-8-gb'), 0);
  const alertas = await pool.query(`SELECT tipo FROM alerta_stock WHERE producto_id = $1`, [gpu]);
  assert.deepEqual(alertas.rows.map((a) => a.tipo), ['agotado']);
});

test('panel: pide sesión y respeta roles', async () => {
  assert.equal((await api('GET', '/api/admin/resumen')).status, 401);
  const vendedor = await login('vende@test.mx');
  assert.equal((await api('GET', '/api/admin/resumen', { token: vendedor })).status, 200);
  assert.equal((await api('DELETE', `/api/admin/productos/${await idDe('ssd-nvme-1-tb')}`, { token: vendedor })).status, 403);
  const mala = await api('POST', '/api/auth/login', { body: { correo: 'vende@test.mx', password: 'otra' } });
  assert.equal(mala.status, 401);
});

test('panel: alta, edición con alerta de stock bajo y baja de producto', async () => {
  const admin = await login('admin@test.mx');
  const form = new FormData();
  Object.entries({ nombre: 'Mouse inalámbrico', categoria_id: '1', precio: '499', existencias: '10', stock_minimo: '2', activo: 'true' })
    .forEach(([k, v]) => form.append(k, v));
  const alta = await fetch(`${base}/api/admin/productos`, { method: 'POST', headers: { Authorization: `Bearer ${admin}` }, body: form });
  assert.equal(alta.status, 201);
  const nuevo = await alta.json();
  assert.equal(nuevo.slug, 'mouse-inalambrico');

  const edit = new FormData();
  Object.entries({ nombre: 'Mouse inalámbrico', categoria_id: '1', precio: '459', existencias: '2', stock_minimo: '2', activo: 'true' })
    .forEach(([k, v]) => edit.append(k, v));
  const cambio = await fetch(`${base}/api/admin/productos/${nuevo.id}`, { method: 'PUT', headers: { Authorization: `Bearer ${admin}` }, body: edit });
  assert.equal(cambio.status, 200);
  assert.equal((await cambio.json()).precio, 459);
  const alerta = await pool.query('SELECT tipo FROM alerta_stock WHERE producto_id = $1', [nuevo.id]);
  assert.deepEqual(alerta.rows.map((a) => a.tipo), ['bajo']);

  assert.equal((await api('DELETE', `/api/admin/productos/${nuevo.id}`, { token: admin })).status, 204);
  assert.equal((await api('GET', '/api/productos/mouse-inalambrico')).status, 404);
});

test('modelos 3D: el catálogo trae modelo y ficha técnica; el panel los valida', async () => {
  const gpu = await api('GET', '/api/productos/tarjeta-de-video-nvidia-geforce-rtx-5060-ti-16-gb');
  assert.equal(gpu.status, 200);
  assert.equal(gpu.body.modelo_codigo, 'gpu-rtx-5060-ti');
  assert.deepEqual(gpu.body.especificaciones[0], ['Núcleos CUDA', '4,608']);

  const admin = await login('admin@test.mx');
  const enviar = (campos) => {
    const form = new FormData();
    Object.entries({ nombre: 'Gabinete de prueba', categoria_id: '1', precio: '999', existencias: '3', activo: 'true', ...campos }).forEach(([k, v]) => form.append(k, v));
    return fetch(`${base}/api/admin/productos`, { method: 'POST', headers: { Authorization: `Bearer ${admin}` }, body: form });
  };
  const ok = await enviar({ modelo_codigo: 'pc-gamer-fenix', especificaciones: 'Formato: ATX\nVidrio: Templado' });
  assert.equal(ok.status, 201);
  const creado = await ok.json();
  assert.equal(creado.modelo_codigo, 'pc-gamer-fenix');
  assert.deepEqual(creado.especificaciones, [['Formato', 'ATX'], ['Vidrio', 'Templado']]);

  assert.equal((await enviar({ modelo_codigo: '../hack' })).status, 422);
  assert.equal((await enviar({ especificaciones: 'renglón sin dos puntos' })).status, 422);
  assert.equal((await enviar({ especificaciones: JSON.stringify([['Solo dato']]) })).status, 422);
});

test('CSV: lee especificaciones separadas por barras y valida el modelo', async () => {
  const { validarFila } = await import('../src/services/catalogo-csv.js');
  const fila = { nombre: 'SSD de prueba', categoria: 'Componentes', precio_mxn: '1,299', existencias: '4', modelo_codigo: 'ssd-samsung-990-pro', especificaciones: 'Capacidad: 2 TB | Lectura: 7,450 MB/s' };
  const p = validarFila(fila);
  assert.equal(p.precio, 1299);
  assert.deepEqual(p.especificaciones, [['Capacidad', '2 TB'], ['Lectura', '7,450 MB/s']]);
  assert.throws(() => validarFila({ ...fila, modelo_codigo: 'Con Espacios' }), /modelo 3D/);
});

test('panel: cambiar estado y cancelar regresa piezas al inventario', async () => {
  const vendedor = await login('vende@test.mx');
  const pedido = (await pool.query(`SELECT id FROM pedido WHERE folio = 'MT-00005'`)).rows[0];
  const envio = await api('PATCH', `/api/admin/pedidos/${pedido.id}/estado`, { token: vendedor, body: { estado: 'enviado' } });
  assert.equal(envio.body.estado, 'enviado');

  const cancel = await api('PATCH', `/api/admin/pedidos/${pedido.id}/estado`, { token: vendedor, body: { estado: 'cancelado' } });
  assert.equal(cancel.status, 200);
  assert.equal(await existencias('tarjeta-de-video-rtx-4060-8-gb'), 2);

  const reactivar = await api('PATCH', `/api/admin/pedidos/${pedido.id}/estado`, { token: vendedor, body: { estado: 'pagado' } });
  assert.equal(reactivar.status, 409);
});

test('asesor: recomienda productos en existencia sin llave de Gemini', async () => {
  delete process.env.GEMINI_API_KEY;
  const r = await api('POST', '/api/asesor', { body: { necesidad: 'estudio ingeniería civil y uso AutoCAD' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.fuente, 'reglas');
  assert.ok(r.body.productos.some((p) => p.nombre.includes('CAD')));
});

/* ---------- IA (Gemini simulado: no se gasta cuota en las pruebas) ---------- */
function simularGemini(respuestaJson, status = 200) {
  const real = globalThis.fetch;
  const llamadas = [];
  globalThis.fetch = async (url, opts) => {
    if (!String(url).includes('generativelanguage.googleapis.com')) return real(url, opts);
    llamadas.push(JSON.parse(opts.body));
    return new Response(
      JSON.stringify(status === 200 ? { candidates: [{ content: { parts: [{ text: JSON.stringify(respuestaJson) }] } }] } : { error: { message: 'x' } }),
      { status, headers: { 'Content-Type': 'application/json' } },
    );
  };
  return { llamadas, restaurar: () => { globalThis.fetch = real; } };
}

test('IA: sin llave avisa que falta configurarla', async () => {
  delete process.env.GEMINI_API_KEY;
  const admin = await login('admin@test.mx');
  const r = await api('POST', '/api/admin/ia/descripcion', { token: admin, body: { nombre: 'Mouse gamer' } });
  assert.equal(r.status, 503);
  assert.match(r.body.error, /GEMINI_API_KEY/);
});

test('IA: el vendedor no puede usar las herramientas de IA', async () => {
  const vendedor = await login('vende@test.mx');
  assert.equal((await api('GET', '/api/admin/ia/estado', { token: vendedor })).status, 403);
});

test('IA: genera descripción con Gemini', async () => {
  process.env.GEMINI_API_KEY = 'llave-falsa';
  const g = simularGemini({ descripcion: 'Mouse preciso y cómodo para jugar o trabajar todo el día.' });
  try {
    const admin = await login('admin@test.mx');
    const r = await api('POST', '/api/admin/ia/descripcion', { token: admin, body: { nombre: 'Mouse gamer', categoria: 'Equipo' } });
    assert.equal(r.status, 200);
    assert.match(r.body.descripcion, /Mouse preciso/);
    assert.match(g.llamadas[0].contents[0].parts[0].text, /Mouse gamer/);
  } finally { g.restaurar(); delete process.env.GEMINI_API_KEY; }
});

test('IA: resume una ficha técnica en PDF', async () => {
  process.env.GEMINI_API_KEY = 'llave-falsa';
  const g = simularGemini({ producto: 'RTX 4060', resumen: 'Tarjeta para juegos en 1080p.', descripcion_tienda: 'Ideal para jugar.', especificaciones: [{ nombre: 'Memoria', valor: '8 GB' }] });
  try {
    const admin = await login('admin@test.mx');
    const form = new FormData();
    form.append('ficha', new Blob(['%PDF-1.4 prueba'], { type: 'application/pdf' }), 'ficha.pdf');
    const res = await fetch(`${base}/api/admin/ia/resumir-ficha`, { method: 'POST', headers: { Authorization: `Bearer ${admin}` }, body: form });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.especificaciones[0].valor, '8 GB');
    assert.equal(g.llamadas[0].contents[0].parts[0].inlineData.mimeType, 'application/pdf');

    const noPdf = new FormData();
    noPdf.append('ficha', new Blob(['hola'], { type: 'text/plain' }), 'nota.txt');
    const mal = await fetch(`${base}/api/admin/ia/resumir-ficha`, { method: 'POST', headers: { Authorization: `Bearer ${admin}` }, body: noPdf });
    assert.equal(mal.status, 422);
  } finally { g.restaurar(); delete process.env.GEMINI_API_KEY; }
});

test('IA: el asesor usa Gemini y si falla cae a reglas', async () => {
  process.env.GEMINI_API_KEY = 'llave-falsa';
  const cad = (await pool.query(`SELECT id FROM producto WHERE slug = 'software-cad-educativo-1-ano'`)).rows[0].id;
  let g = simularGemini({ mensaje: 'Te recomiendo el software CAD.', ids: [cad] });
  try {
    const r = await api('POST', '/api/asesor', { body: { necesidad: 'necesito dibujar planos' } });
    assert.equal(r.body.fuente, 'gemini');
    assert.deepEqual(r.body.productos.map((p) => p.id), [cad]);
  } finally { g.restaurar(); }
  g = simularGemini(null, 429);
  try {
    const r = await api('POST', '/api/asesor', { body: { necesidad: 'quiero jugar' } });
    assert.equal(r.body.fuente, 'reglas');
  } finally { g.restaurar(); delete process.env.GEMINI_API_KEY; }
});

test('seguimiento: el cliente consulta su pedido solo con folio y correo correctos', async () => {
  const ok = await api('POST', '/api/pedidos/seguimiento', { body: { folio: 'mt-00004', correo: 'Laura@Ejemplo.com' } });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.estado, 'pendiente');
  assert.equal(ok.body.detalle.length, 2);
  assert.equal(ok.body.id, undefined);
  const otro = await api('POST', '/api/pedidos/seguimiento', { body: { folio: 'MT-00004', correo: 'otra@ejemplo.com' } });
  assert.equal(otro.status, 404);
});
