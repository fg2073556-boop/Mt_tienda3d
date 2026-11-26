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
const { revisarAvisos, usarTransporte } = await import('../src/services/avisos.js');
const { enviarWhatsapp, usarWhatsappDePrueba } = await import('../src/services/whatsapp.js');

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

test('reposición: lista lo que se acaba primero y solo el administrador cambia los ajustes', async () => {
  const vendedor = await login('vende@test.mx');
  const r = await api('GET', '/api/admin/reposicion', { token: vendedor });
  assert.equal(r.status, 200);
  const estados = r.body.productos.map((p) => p.estado);
  assert.ok(estados.indexOf('ok') > -1);
  assert.equal(estados.slice(0, estados.indexOf('ok')).every((e) => e !== 'ok'), true, 'lo que falta va arriba');
  assert.equal(estados.slice(estados.indexOf('ok')).every((e) => e === 'ok'), true);
  for (const p of r.body.productos.filter((x) => x.estado !== 'ok')) assert.equal(p.sugerido, Math.max(p.stock_minimo * 2 - p.existencias, 1));

  assert.equal((await api('PUT', '/api/admin/reposicion/ajuste', { token: vendedor, body: { correo_destino: 'a@b.mx' } })).status, 403);

  const admin = await login('admin@test.mx');
  const malo = await api('PUT', '/api/admin/reposicion/ajuste', { token: admin, body: { correo_destino: 'no-es-correo' } });
  assert.equal(malo.status, 422);
  const ok = await api('PUT', '/api/admin/reposicion/ajuste', {
    token: admin,
    body: { correo_destino: 'Compras@MT.mx, gerencia@mt.mx', aviso_automatico: true, proveedor_nombre: 'Distribuidora Centro', proveedor_whatsapp: '222 123 4567' },
  });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.correo_destino, 'compras@mt.mx, gerencia@mt.mx');
  assert.equal(ok.body.proveedor_whatsapp, '522221234567');
});

test('reposición: cambia el mínimo y repone varios productos a la vez', async () => {
  const vendedor = await login('vende@test.mx');
  const id = await idDe('teclado-mecanico-mouse');
  const m = await api('PATCH', `/api/admin/reposicion/productos/${id}/minimo`, { token: vendedor, body: { stock_minimo: 7 } });
  assert.equal(m.status, 200);
  assert.equal(m.body.stock_minimo, 7);
  const antes = await existencias('teclado-mecanico-mouse');
  const r = await api('POST', '/api/admin/reposicion/reponer', { token: vendedor, body: { items: [{ id, cantidad: 4 }] } });
  assert.equal(r.status, 200);
  assert.equal(await existencias('teclado-mecanico-mouse'), antes + 4);
});

test('reposición: manda el reporte y el aviso automático junta las alertas en un correo', async () => {
  const enviados = [];
  usarTransporte({ sendMail: async (m) => { enviados.push(m); return { messageId: 'prueba' }; } });
  try {
    const admin = await login('admin@test.mx');
    await pool.query('UPDATE alerta_stock SET notificada_en = NOW()');

    const r = await api('POST', '/api/admin/reposicion/correo', { token: admin, body: {} });
    assert.equal(r.status, 200);
    assert.equal(enviados[0].to, 'compras@mt.mx, gerencia@mt.mx');
    assert.match(enviados[0].subject, /Reporte de reposición/);
    assert.match(enviados[0].html, /\/panel\/reposicion/);

    // Dos productos se agotan → un solo correo con las dos alertas
    for (const slug of ['teclado-mecanico-mouse', 'monitor-27-qhd-165-hz']) {
      const id = await idDe(slug);
      await api('PATCH', `/api/admin/productos/${id}/existencias`, { token: admin, body: { delta: -(await existencias(slug)) } });
    }
    const a = await revisarAvisos(pool);
    assert.equal(a.enviado, true);
    assert.equal(a.alertas, 2);
    assert.equal(enviados.length, 2);
    assert.match(enviados[1].subject, /Se agotaron/);
    assert.match(enviados[1].text, /Se agotó: Teclado/);
    assert.equal((await revisarAvisos(pool)).motivo, 'sin alertas');

    // Apagado: no manda nada
    await pool.query('UPDATE ajuste_reposicion SET aviso_automatico = FALSE, whatsapp_automatico = FALSE');
    assert.equal((await revisarAvisos(pool)).motivo, 'apagado');
    await pool.query('UPDATE ajuste_reposicion SET aviso_automatico = TRUE, whatsapp_automatico = TRUE');
  } finally { usarTransporte(null); }
});

test('reposición: borrador de WhatsApp para el proveedor con y sin Gemini', async () => {
  const admin = await login('admin@test.mx');
  const id = await idDe('teclado-mecanico-mouse');
  delete process.env.GEMINI_API_KEY;
  const base = await api('POST', '/api/admin/reposicion/mensaje', { token: admin, body: { items: [{ id, cantidad: 6 }] } });
  assert.equal(base.status, 200);
  assert.equal(base.body.conIA, false);
  assert.match(base.body.mensaje, /Hola Distribuidora Centro/);
  assert.match(base.body.mensaje, /6 × Teclado/);
  assert.match(base.body.url, /^https:\/\/wa\.me\/522221234567\?text=/);

  process.env.GEMINI_API_KEY = 'llave-falsa';
  const nombre = (await pool.query('SELECT nombre FROM producto WHERE id = $1', [id])).rows[0].nombre;
  let g = simularGemini({ mensaje: `Hola, buen día. Les pedimos:\n• 6 × ${nombre}\nTienda M&T` });
  try {
    const r = await api('POST', '/api/admin/reposicion/mensaje', { token: admin, body: { items: [{ id, cantidad: 6 }] } });
    assert.equal(r.body.conIA, true);
    assert.match(g.llamadas[0].contents[0].parts[0].text, /Distribuidora Centro/);
  } finally { g.restaurar(); }
  g = simularGemini({ mensaje: 'Hola, mándenos unos teclados.' });
  try {
    const r = await api('POST', '/api/admin/reposicion/mensaje', { token: admin, body: { items: [{ id, cantidad: 6 }] } });
    assert.equal(r.body.conIA, false);
    assert.match(r.body.aviso, /mensaje base/);
  } finally { g.restaurar(); delete process.env.GEMINI_API_KEY; }
});

test('WhatsApp: sin configurar avisa qué falta; configurado se manda solo con las alertas', async () => {
  const admin = await login('admin@test.mx');
  const id = await idDe('silla-ergonomica-con-soporte-lumbar');
  delete process.env.WHATSAPP_MODO;
  const sin = await api('POST', '/api/admin/reposicion/whatsapp', { token: admin, body: { items: [{ id, cantidad: 2 }] } });
  assert.equal(sin.status, 503);
  assert.match(sin.body.error, /WHATSAPP_MODO/);

  const mensajes = [];
  usarWhatsappDePrueba(mensajes);
  try {
    const r = await api('POST', '/api/admin/reposicion/whatsapp', { token: admin, body: { items: [{ id, cantidad: 2 }], mensaje: 'Hola, mándenos 2 sillas.' } });
    assert.equal(r.status, 200);
    assert.deepEqual(mensajes[0], { telefono: '522221234567', mensaje: 'Hola, mándenos 2 sillas.', items: [{ nombre: 'Silla ergonómica con soporte lumbar', cantidad: 2 }], proveedor: 'Distribuidora Centro' });

    // Solo WhatsApp (correo apagado): al agotarse la silla se le pide al proveedor automáticamente
    await pool.query('UPDATE ajuste_reposicion SET aviso_automatico = FALSE');
    await pool.query('UPDATE alerta_stock SET notificada_en = NOW()');
    await api('PATCH', `/api/admin/productos/${id}/existencias`, { token: admin, body: { delta: -(await existencias('silla-ergonomica-con-soporte-lumbar')) } });
    const a = await revisarAvisos(pool);
    assert.equal(a.enviado, true, JSON.stringify(a));
    assert.equal(a.whatsapp, true);
    assert.equal(a.correo, false);
    assert.equal(mensajes.length, 2);
    assert.deepEqual(mensajes[1].items.map((i) => i.nombre), ['Silla ergonómica con soporte lumbar']);
    assert.match(mensajes[1].mensaje, /Hola Distribuidora Centro/);
    const estado = await api('GET', '/api/admin/reposicion', { token: admin });
    assert.equal(estado.body.estado.whatsapp, true);
    assert.ok(estado.body.estado.ultimo_whatsapp);
  } finally {
    usarWhatsappDePrueba(null);
    await pool.query('UPDATE ajuste_reposicion SET aviso_automatico = TRUE');
  }
});

test('WhatsApp: arma bien la petición para CallMeBot, Meta y Make', async () => {
  const real = globalThis.fetch;
  const llamadas = [];
  const items = [{ nombre: 'SSD NVMe 1 TB', cantidad: 4 }, { nombre: 'Silla', cantidad: 3 }];
  try {
    globalThis.fetch = async (url, op = {}) => { llamadas.push({ url: String(url), op }); return new Response('Message queued. You will receive it in a few seconds.'); };
    Object.assign(process.env, { WHATSAPP_MODO: 'callmebot', WHATSAPP_CALLMEBOT_APIKEY: ' 123456 ' });
    await enviarWhatsapp({ telefono: '522221234567', mensaje: 'Hola • 4 × SSD', items });
    const u = new URL(llamadas[0].url);
    assert.equal(u.host, 'api.callmebot.com');
    assert.equal(u.searchParams.get('phone'), '+522221234567');
    assert.equal(u.searchParams.get('apikey'), '123456');
    assert.equal(u.searchParams.get('text'), 'Hola • 4 × SSD');

    globalThis.fetch = async () => new Response('APIKey is invalid. Please check');
    await assert.rejects(enviarWhatsapp({ telefono: '522221234567', mensaje: 'x', items }), /CallMeBot rechazó la llave/);

    globalThis.fetch = async (url, op = {}) => { llamadas.push({ url: String(url), op }); return Response.json({ messages: [{ id: 'wamid.1' }] }); };
    Object.assign(process.env, { WHATSAPP_MODO: 'meta', WHATSAPP_TOKEN: 'tok', WHATSAPP_PHONE_ID: '1065', WHATSAPP_PLANTILLA: 'reposicion_inventario' });
    await enviarWhatsapp({ telefono: '522221234567', mensaje: 'no se usa', items, proveedor: 'Fernando' });
    const meta = llamadas.at(-1);
    assert.equal(meta.url, 'https://graph.facebook.com/v24.0/1065/messages');
    assert.equal(meta.op.headers.Authorization, 'Bearer tok');
    const cuerpo = JSON.parse(meta.op.body);
    assert.equal(cuerpo.template.name, 'reposicion_inventario');
    assert.deepEqual(cuerpo.template.components[0].parameters.map((p) => p.text), ['Fernando', '4 × SSD NVMe 1 TB; 3 × Silla']);

    globalThis.fetch = async () => Response.json({ error: { code: 131047, message: 'Re-engagement message' } }, { status: 400 });
    delete process.env.WHATSAPP_PLANTILLA;
    await assert.rejects(enviarWhatsapp({ telefono: '522221234567', mensaje: 'x', items }), /24 h/);

    // Make: manda el pedido al webhook del escenario
    globalThis.fetch = async (url, op = {}) => { llamadas.push({ url: String(url), op }); return new Response('Accepted'); };
    Object.assign(process.env, { WHATSAPP_MODO: 'make', WHATSAPP_MAKE_WEBHOOK: 'https://hook.us2.make.com/abc123' });
    await enviarWhatsapp({ telefono: '522221234567', mensaje: 'Hola Fernando', items, proveedor: 'Fernando' });
    const make = llamadas.at(-1);
    assert.equal(make.url, 'https://hook.us2.make.com/abc123');
    assert.deepEqual(JSON.parse(make.op.body), { origen: 'tienda-mt', telefono: '522221234567', proveedor: 'Fernando', mensaje: 'Hola Fernando', items, lista: '4 × SSD NVMe 1 TB; 3 × Silla' });
    process.env.WHATSAPP_MAKE_WEBHOOK = 'https://otro-sitio.com/x';
    await assert.rejects(enviarWhatsapp({ telefono: '522221234567', mensaje: 'x', items }), /WHATSAPP_MAKE_WEBHOOK/);
  } finally {
    globalThis.fetch = real;
    for (const k of ['WHATSAPP_MODO', 'WHATSAPP_MAKE_WEBHOOK', 'WHATSAPP_CALLMEBOT_APIKEY', 'WHATSAPP_TOKEN', 'WHATSAPP_PHONE_ID', 'WHATSAPP_PLANTILLA']) delete process.env[k];
  }
});
