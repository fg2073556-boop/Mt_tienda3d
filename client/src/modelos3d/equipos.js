/**
 * Equipos completos, periféricos, mobiliario y software.
 * Las PCs se arman con los mismos modelos de componentes, a escala real en centímetros.
 */
import {
  THREE, M, caja, canvasTex, cil, color, emisivo, etiqueta, extruir, matEtiqueta, metalCepillado, plano, rcaja, rectRedondo,
  repetir, ventilador,
} from './base.js';
import { memoria } from './memorias.js';
import { placaMadre } from './placas.js';
import { fuente, ssd, tarjetaVideo, ventilador120 } from './componentes.js';
import { procesador } from './procesadores.js';

/** Marca todas las mallas de un objeto con la pieza del catálogo a la que pertenecen */
export function marcar(obj, pieza) {
  obj.traverse((o) => { if (o.isMesh) o.userData.pieza = pieza; });
  return obj;
}

/** Coloca una tarjeta madre (modelada acostada) sobre la pared derecha de un gabinete */
function montarEnPared(obj) {
  obj.rotation.set(0, 0, 0);
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, -1, 0));
  obj.quaternion.setFromRotationMatrix(m);
  return obj;
}

/** Malla perforada para frentes de gabinete */
const texMalla = (clave, fondo = '#0e1012') => canvasTex('malla:' + clave, 256, 256, (ctx, w, h) => {
  ctx.fillStyle = fondo; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#000';
  for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 ? 8 : 0; x < w; x += 16) { ctx.beginPath(); ctx.arc(x + 4, y + 4, 5, 0, 7); ctx.fill(); }
}, { repetir: [6, 10] });

/* ======================= PC armadas ======================= */
export function pcGamer({ nombre = 'M&T FÉNIX', rgb = true } = {}) {
  const g = new THREE.Group(), partes = [];
  const W = 23, H = 47, D = 46, t = .4;
  const chasis = metalCepillado('gab', '#15181b', .6, .45);
  // estructura: piso, techo, pared derecha y trasera
  caja(W, t, D, chasis, 0, t / 2, 0, g);
  caja(t, H, D, chasis, W / 2 - t / 2, H / 2, 0, g);
  caja(W, H, t, chasis, 0, H / 2, -D / 2 + t / 2, g);
  // patas
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([x, z]) => rcaja(3, 1.2, 4, .4, M.goma, x * (W / 2 - 2.5), -.6, z * (D / 2 - 4), g));

  // tarjeta madre ATX con CPU, RAM y bomba de enfriamiento
  const mb = placaMadre({ formato: 'atx', socket: 'am5', chipset: 'B650', nombre: 'M&T B650', serie: 'M&T SERIES' });
  montarEnPared(mb.g); mb.g.position.set(W / 2 - t - .6, H - 2 - 15.25, -D / 2 + 2 + 12.2); g.add(mb.g);
  // RAM: dos módulos insertados en la placa (coordenadas de la placa)
  const ram = memoria({ ddr: 5, estilo: 'fury', base: '#2b3036', acento: '#36e39a', marca: 'M&T', linea: ' VANGUARD', detalle: 'DDR5-6000', rgb });
  ram.g.rotation.set(0, Math.PI / 2, 0); ram.g.position.set(-12.2 + 10 + 4.8 + .95, 2, -15.25 + 8);
  ram.g.children.forEach((m, i) => { m.position.z = i ? 1.9 : 0; });
  mb.g.add(ram.g);
  // bomba sobre el socket
  // procesador en el socket (se ve al quitar la bomba)
  const cpu = procesador({ tipo: 'am5', linea: 'RYZEN 7', modelo: '7700', codigo: 'AM5' });
  cpu.g.rotation.set(0, 0, 0); cpu.g.position.set(-12.2 + 10, .45, -15.25 + 8); mb.g.add(cpu.g);
  // SSD M.2 junto a la cubierta del chipset
  const disco = ssd();
  disco.g.rotation.set(0, 0, 0); disco.g.position.set(-12.2 + 16.5, .3, -15.25 + 8 + 11.5); mb.g.add(disco.g);
  const bomba = new THREE.Group(); bomba.position.set(-12.2 + 10, .9, -15.25 + 8); mb.g.add(bomba);
  rcaja(6.5, 2, 6.5, .6, M.plastico, 0, 1.2, 0, bomba);
  const anillo = new THREE.Mesh(new THREE.TorusGeometry(2.5, .16, 12, 80), M.rgb); anillo.rotation.x = Math.PI / 2; anillo.position.y = 2.25; bomba.add(anillo);
  cil(2.35, 2.35, .2, [M.plastico, matEtiqueta(etiqueta('pump:' + nombre, 512, 512, '#0f1214', '#e9edf0', [[nombre, 60, 256, 256, '800', 'center']]), .35), M.plastico], 0, 2.25, 0, bomba, 48).rotation.y = Math.PI / 2;

  // tarjeta de video horizontal con los ventiladores hacia abajo
  const gpu = tarjetaVideo({ largo: 24, ventiladores: 2, base: '#2a2f34', acento: '#c9ced3', marca: 'GEFORCE ', modelo: 'RTX 4060', memoria: '8 GB GDDR6' });
  const gpuSoporte = new THREE.Group(); gpuSoporte.position.set(W / 2 - t - 6.6, H - 2 - 15.25 - 2.25, -D / 2 + 2 + 12.2 + .7); g.add(gpuSoporte);
  gpu.g.rotation.set(Math.PI / 2, 0, 0); gpu.g.position.set(0, 0, 0);
  const gpuEje = new THREE.Group(); gpuEje.rotation.y = -Math.PI / 2; gpuEje.add(gpu.g); gpuSoporte.add(gpuEje);

  // cubierta de la fuente en la parte baja
  const cubierta = rcaja(W - t * 2, 9, 37.6, .3, chasis, 0, 4.9, -3.8, g);
  const letrero = plano(14, 2, matEtiqueta(etiqueta('cub:' + nombre, 1024, 140, '#15181b', '#e9edf0', [[nombre, 80, 512, 70, '800', 'center']]), .5), -(W / 2 - t) - .01, 1.5, 6, cubierta);
  letrero.rotation.y = -Math.PI / 2;

  // ventiladores: 3 al frente y 1 atrás
  const frente = new THREE.Group(); g.add(frente);
  [12.5, 25.5, 38].forEach((y) => { const f = ventilador120({ rgb }); f.g.position.set(0, y, D / 2 - 2.6); frente.add(f.g); });
  const trasero = ventilador120({ rgb }); trasero.g.position.set(1.5, H - 10, -D / 2 + 1.8); g.add(trasero.g);
  // tira de luz interior y una luz suave para que se vea el interior a través del vidrio
  caja(.3, .3, D - 6, emisivo('#dff7ff', 1.2), -W / 2 + 1.5, H - 1.2, 0, g);
  const interior = new THREE.PointLight(0xdff7ff, 900, 60, 1.6); interior.position.set(-4, H - 6, 2); g.add(interior);

  // tubos de la bomba al radiador del frente
  g.updateMatrixWorld(true);
  const centroBomba = bomba.localToWorld(new THREE.Vector3(0, 1.4, 0));
  const tubos = [];
  [-1, 1].forEach((k) => {
    const a = centroBomba.clone().add(new THREE.Vector3(-1.5, 0, k * 1.6));
    const curva = new THREE.CatmullRomCurve3([a, a.clone().add(new THREE.Vector3(-3, 2, 4)), new THREE.Vector3(-2 + k * 2, H - 6, D / 2 - 8), new THREE.Vector3(-2 + k * 2, H - 8, D / 2 - 5)]);
    const tubo = new THREE.Mesh(new THREE.TubeGeometry(curva, 50, .5, 12), color(0x1d2125, .85)); tubo.castShadow = true; g.add(tubo); tubos.push(tubo);
  });
  const radiador = rcaja(W - 6, 28, 2.6, .2, M.negroMate, 0, 25, D / 2 - 5.4, g); // radiador frontal
  // fuente de poder bajo la cubierta, con la etiqueta hacia el vidrio
  const psu = fuente({ potencia: 750, eficiencia: 'GOLD', modular: 'total', marca: 'M&T VOLT' });
  psu.g.rotation.set(0, -Math.PI / 2, 0); psu.g.position.set(1, 4.9, -14.6); g.add(psu.g);

  // paneles que se quitan al desarmar
  const vidrio = new THREE.Group(); vidrio.position.set(-W / 2, H / 2, 0); g.add(vidrio);
  caja(.5, H, D, M.vidrio, 0, 0, 0, vidrio);
  [H / 2 - .5, -H / 2 + .5].forEach((y) => caja(.55, 1, D, M.negroMate, 0, y, 0, vidrio));
  const malla = new THREE.MeshStandardMaterial({ map: texMalla('frente'), roughness: .7, metalness: .3 });
  const frontal = rcaja(W + .4, H, 1.4, .3, [chasis, chasis, chasis, chasis, malla, chasis], 0, H / 2, D / 2 + .5, g);
  if (rgb) caja(.3, H - 6, .2, M.rgb, -W / 2 + 1.4, 0, .75, frontal);
  const techo = new THREE.Group(); techo.position.y = H; g.add(techo);
  rcaja(W + .4, .8, D, .2, [chasis, chasis, new THREE.MeshStandardMaterial({ map: texMalla('techo'), roughness: .7, metalness: .3 }), chasis, chasis, chasis], 0, 0, 0, techo);
  cil(.6, .6, .2, emisivo('#36e39a', 1), W / 2 - 3, .45, D / 2 - 3, techo); // botón de encendido
  [-1, 1].forEach((k) => caja(1.2, .1, .5, M.plastico, W / 2 - 6 + k * 1.6, .42, D / 2 - 3, techo));

  partes.push(
    { obj: vidrio, off: [-14, 0, 0] }, { obj: frontal, off: [0, 0, 14] }, { obj: techo, off: [0, 10, 0] },
    { obj: gpuSoporte, off: [-12, 0, 0] }, { obj: frente, off: [0, 0, 8] }, { obj: cubierta, off: [-8, -4, 0] },
    { obj: bomba, off: [0, 6, 0] }, { obj: ram.g, off: [0, 3, 0] },
  );
  // qué parte del modelo corresponde a cada producto (la escena de la tienda las vuelve seleccionables)
  marcar(g, 'gab');
  const piezas = { cpu: [cpu.g], ssd: [disco.g], ram: [ram.g], gpu: [gpuSoporte], psu: [psu.g], cooler: [bomba, radiador, ...tubos], fans: [frente, trasero.g] };
  Object.entries(piezas).forEach(([k, objs]) => objs.forEach((o) => marcar(o, k)));
  g.rotation.y = 1.75; // el vidrio queda de frente a la cámara
  return { g, partes, piezas: { ...piezas, gab: [g] } };
}

export function pcOficina({ nombre = 'M&T BÁSICA' } = {}) {
  const g = new THREE.Group(), partes = [];
  const W = 18, H = 38, D = 36, t = .4;
  const chasis = metalCepillado('ofi', '#1c1f23', .5, .5);
  caja(W, t, D, chasis, 0, t / 2, 0, g);
  caja(t, H, D, chasis, W / 2 - t / 2, H / 2, 0, g);
  caja(W, H, t, chasis, 0, H / 2, -D / 2 + t / 2, g);
  caja(W, t, D, chasis, 0, H - t / 2, 0, g);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([x, z]) => cil(1, 1, .8, M.goma, x * (W / 2 - 2), -.4, z * (D / 2 - 3), g));
  // tarjeta Micro-ATX con disipador de fábrica
  const mb = placaMadre({ formato: 'matx', socket: 'am4', chipset: 'B550', nombre: 'M&T B550M', serie: 'M&T OFFICE', estilo: 'media', acento: '#9aa6ad' });
  montarEnPared(mb.g); mb.g.position.set(W / 2 - t - .6, H - 2 - 12.2, -D / 2 + 2 + 12.2); g.add(mb.g);
  const cooler = new THREE.Group(); cooler.position.set(-12.2 + 10, 0, -12.2 + 8); mb.g.add(cooler);
  repetir(new THREE.BoxGeometry(8.6, 3, .08), M.aluminio, Array.from({ length: 34 }, (_, i) => [0, 1.6, -3.4 + i * .2]), cooler);
  const fanTapa = ventilador(4.2, { aro: true, aspas: 7, matAspa: M.plastico }); fanTapa.rotation.x = -Math.PI / 2; fanTapa.position.y = 3.4; cooler.add(fanTapa);
  const ram = memoria({ ddr: 4, estilo: 'fury', base: '#16181b', marca: 'M&T', linea: ' DDR4', detalle: '8 GB' });
  ram.g.rotation.set(0, Math.PI / 2, 0); ram.g.position.set(-12.2 + 10 + 4.8 + .95, 2, -12.2 + 8);
  ram.g.children.forEach((m, i) => { m.position.z = i ? 1.9 : 0; });
  mb.g.add(ram.g);
  // fuente en la parte baja
  rcaja(15, 8.6, 14, .3, metalCepillado('psuOfi', '#202428', .5, .5), 0, 4.8, -D / 2 + 8, g);
  // panel lateral sólido con rejilla
  const lateral = new THREE.Group(); lateral.position.set(-W / 2, H / 2, 0); g.add(lateral);
  caja(.4, H, D, chasis, 0, 0, 0, lateral);
  plano(14, 10, new THREE.MeshStandardMaterial({ map: texMalla('lat', '#1c1f23'), roughness: .7, metalness: .3 }), -.21, 4, 4, lateral).rotation.y = -Math.PI / 2;
  // frente con franja plateada, botón y puertos USB
  const frente = new THREE.Group(); frente.position.set(0, H / 2, D / 2); g.add(frente);
  rcaja(W + .2, H, 1.4, .4, color(0x15181b, .45, .2), 0, 0, .6, frente);
  caja(2, H - 4, .1, metalCepillado('franja', '#b8bec4', .95, .25), -W / 2 + 3.5, 0, 1.32, frente);
  cil(.9, .9, .2, M.niquel, 3, H / 2 - 4, 1.35, frente).rotation.x = Math.PI / 2;
  cil(.5, .5, .25, emisivo('#22d3ee', .9), 3, H / 2 - 4, 1.4, frente).rotation.x = Math.PI / 2;
  [-1, 1].forEach((k) => caja(1.3, .5, .1, M.plastico, 3 + k * 1.1, H / 2 - 7, 1.32, frente));
  plano(8, 1.4, matEtiqueta(etiqueta('ofi:' + nombre, 1024, 180, '#15181b', '#cfd6da', [[nombre, 92, 512, 90, '700', 'center']]), .5), 2, -H / 2 + 3, 1.33, frente);
  partes.push({ obj: lateral, off: [-12, 0, 0] }, { obj: frente, off: [0, 0, 8] });
  g.rotation.y = .55;
  return { g, partes };
}

/* ======================= Monitor ======================= */
function texPantalla(clave, titulo, sub) {
  return canvasTex('scr:' + clave, 1280, 720, (ctx, w, h) => {
    const cielo = ctx.createLinearGradient(0, 0, 0, h); cielo.addColorStop(0, '#081b2b'); cielo.addColorStop(.6, '#0f5b5a'); cielo.addColorStop(1, '#36e39a');
    ctx.fillStyle = cielo; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,240,200,.85)'; ctx.beginPath(); ctx.arc(w * .72, h * .36, 70, 0, 7); ctx.fill();
    [[.62, '#0b3a40'], [.72, '#082a30'], [.84, '#051a1f']].forEach(([y, c], k) => {
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 40) ctx.lineTo(x, h * y - Math.sin(x / (140 + k * 60) + k) * 60 - Math.sin(x / 47) * 12);
      ctx.lineTo(w, h); ctx.fill();
    });
    ctx.fillStyle = 'rgba(5,15,20,.55)'; ctx.fillRect(0, 0, w, 54);
    ctx.fillStyle = '#e9edf0'; ctx.font = '700 30px Arial'; ctx.fillText(titulo, 30, 37);
    ctx.font = '500 24px Arial'; ctx.fillStyle = '#9fe9d0'; ctx.textAlign = 'right'; ctx.fillText(sub, w - 30, 37);
  });
}

export function monitor({ pulgadas = 27, titulo = 'M&T · Soluciones integrales de PC', sub = 'QHD 2560×1440 · 165 Hz' } = {}) {
  const g = new THREE.Group(), partes = [];
  const diag = pulgadas * 2.54, W = diag * .8716, Hs = diag * .4903; // pantalla 16:9
  const panel = new THREE.Group(); panel.position.y = 12 + Hs / 2; g.add(panel);
  rcaja(W + 1, Hs + 1.6, 1.2, .3, M.plastico, 0, -.3, 0, panel);
  rcaja(W * .7, Hs * .6, 3, 1.2, color(0x191c1f, .5), 0, -.5, -1.8, panel); // carcasa trasera
  const pantalla = plano(W, Hs, new THREE.MeshBasicMaterial({ map: texPantalla('mon', titulo, sub) }), 0, 0, .62, panel);
  pantalla.userData.brilla = true;
  caja(6, .25, .1, M.niquel, 0, -Hs / 2 - .75, .62, panel);
  // brazo y base en V
  const base = new THREE.Group(); g.add(base);
  rcaja(4.5, 30, 2.4, .8, metalCepillado('cuello', '#2b3036', .8, .35), 0, 15, -4.5, base).rotation.x = -.08;
  const v = new THREE.Shape(); v.moveTo(-14, 6); v.lineTo(-2, -8); v.lineTo(2, -8); v.lineTo(14, 6); v.lineTo(11, 7); v.lineTo(0, -3); v.lineTo(-11, 7); v.closePath();
  const pie = extruir(v, .9, metalCepillado('pie', '#2b3036', .8, .35), .2); pie.rotation.x = -Math.PI / 2; pie.position.set(0, .5, -4); base.add(pie);
  partes.push({ obj: panel, off: [0, 6, 6] }, { obj: base, off: [0, -2, -6] });
  g.rotation.y = -.35;
  return { g, partes };
}

/* ======================= Teclado y mouse ======================= */
export function tecladoMouse({ rgb = true } = {}) {
  const g = new THREE.Group(), partes = [];
  const teclado = new THREE.Group(); g.add(teclado);
  rcaja(44, 2.4, 14, .6, metalCepillado('kb', '#1d2125', .75, .4), 0, 1.2, 0, teclado);
  if (rgb) caja(42.6, .1, 12.6, M.rgb, 0, 2.42, 0, teclado);
  // distribución tipo ANSI: [ancho en unidades, ...] por fila; 1 u = 1.9 cm
  const u = 1.9;
  const filas = [
    [1, -.5, 1, 1, 1, 1, -.5, 1, 1, 1, 1, -.5, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
    [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5],
    [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25],
    [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.75],
    [1.25, 1.25, 1.25, 6.25, 1.25, 1.25, 1.25, 1.25],
  ];
  const teclas = { normales: [], anchas: new Map() };
  const x0 = -21.2, z0 = -5.6;
  filas.forEach((fila, r) => {
    let x = x0;
    const z = z0 + r * u + (r > 0 ? .4 : 0);
    fila.forEach((w) => {
      if (w < 0) { x += -w * u; return; }
      const cx = x + (w * u) / 2;
      if (w === 1) teclas.normales.push([cx, 2.95, z]);
      else { if (!teclas.anchas.has(w)) teclas.anchas.set(w, []); teclas.anchas.get(w).push([cx, 2.95, z]); }
      x += w * u;
    });
  });
  // bloque de navegación y teclado numérico
  for (let r = 1; r < 6; r++) for (let c = 0; c < 4; c++) { if (r === 5 && c === 0) continue; teclas.normales.push([14.4 + c * u, 2.95, z0 + r * u + .4]); }
  [[1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2], [4, 1], [5, 0], [5, 1], [5, 2]].forEach(([r, c]) => teclas.normales.push([8.2 + c * u, 2.95, z0 + r * u + .4]));
  const capas = new THREE.Group(); teclado.add(capas);
  const geoTecla = (w) => new THREE.BoxGeometry(w * u - .25, 1, u - .25);
  const matTecla = color(0x16191c, .55);
  repetir(geoTecla(1), matTecla, teclas.normales, capas);
  teclas.anchas.forEach((pos, w) => repetir(geoTecla(w), matTecla, pos, capas));
  // letras impresas en una textura sobre la fila de función
  partes.push({ obj: capas, off: [0, 4, 0] });
  // mouse con rueda y franja RGB
  const mouse = new THREE.Group(); mouse.position.set(30, 0, 1); g.add(mouse);
  const cuerpo = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), color(0x15181b, .45)); cuerpo.scale.set(3.2, 1.9, 6.2); cuerpo.position.y = .2; cuerpo.castShadow = true; mouse.add(cuerpo);
  caja(.1, .6, 4, M.negroMate, 0, 1.95, -2.4, mouse);
  cil(.35, .35, .5, M.goma, 0, 2.05, -2.6, mouse).rotation.z = Math.PI / 2;
  if (rgb) { const t = new THREE.Mesh(new THREE.TorusGeometry(1, .05, 8, 60), M.rgb); t.scale.set(3.22, 6.22, 1); t.rotation.x = Math.PI / 2; t.position.y = .6; mouse.add(t); }
  partes.push({ obj: mouse, off: [6, 0, 0] });
  g.rotation.x = .1;
  return { g, partes };
}

/* ======================= Escritorio ======================= */
export function escritorio({ largo = 140, fondo = 70 } = {}) {
  const g = new THREE.Group(), partes = [];
  const cubierta = new THREE.Group(); cubierta.position.y = 74; g.add(cubierta);
  rcaja(largo, 2.5, fondo, .8, color(0x2c3c42, .65, .05), 0, 0, 0, cubierta);
  const pasacable = new THREE.Mesh(new THREE.TorusGeometry(2.6, .4, 10, 40), M.plastico); pasacable.rotation.x = Math.PI / 2; pasacable.position.set(largo / 2 - 12, 1.25, -fondo / 2 + 10); cubierta.add(pasacable);
  cil(2.3, 2.3, .1, M.negroMate, largo / 2 - 12, 1.26, -fondo / 2 + 10, cubierta);
  const acero = metalCepillado('desk', '#2b3035', .85, .35);
  const estructura = new THREE.Group(); g.add(estructura);
  [-1, 1].forEach((k) => {
    const x = k * (largo / 2 - 10);
    rcaja(6, 70, 6, .5, acero, x, 37.5, 0, estructura);
    rcaja(7, 3, fondo - 6, .5, acero, x, 1.5, 0, estructura);
    rcaja(7, 2.5, fondo - 12, .5, acero, x, 71.4, 0, estructura);
    [-1, 1].forEach((z) => cil(1.2, 1.2, 1, M.goma, x, -.4, z * (fondo / 2 - 5), estructura));
  });
  rcaja(largo - 26, 4, 3, .4, acero, 0, 68, -fondo / 2 + 10, estructura);
  // charola pasacables bajo la cubierta
  const charola = new THREE.Group(); charola.position.set(0, 68, -fondo / 2 + 14); g.add(charola);
  caja(largo * .5, .3, 10, M.grafito, 0, 0, 0, charola);
  caja(largo * .5, 4, .3, M.grafito, 0, 2, 5, charola);
  partes.push({ obj: cubierta, off: [0, 18, 0] }, { obj: charola, off: [0, -6, -10] });
  g.rotation.y = .4;
  return { g, partes };
}

/* ======================= Silla ergonómica ======================= */
export function silla() {
  const g = new THREE.Group(), partes = [];
  const base = new THREE.Group(); g.add(base);
  const plasticoBase = color(0x15181b, .45, .3);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2;
    const pata = rcaja(30, 3, 5, 1.2, plasticoBase, Math.cos(a) * 15, 8, Math.sin(a) * 15, base); pata.rotation.y = -a; pata.rotation.z = .08;
    const rueda = new THREE.Group(); rueda.position.set(Math.cos(a) * 29, 3, Math.sin(a) * 29); base.add(rueda);
    cil(3, 3, 3.6, M.goma, 0, 0, 0, rueda, 24).rotation.x = Math.PI / 2;
    cil(.6, .6, 4, M.acero, 0, 3, 0, rueda);
  }
  cil(4, 4, 6, plasticoBase, 0, 8, 0, base);
  const piston = cil(2.4, 2.4, 20, M.niquel, 0, 20, 0, base);
  // asiento acolchado
  const asiento = new THREE.Group(); asiento.position.y = 30; g.add(asiento);
  rcaja(32, 4, 6, 1, M.grafito, 0, 2, 0, asiento);
  rcaja(52, 8, 50, 3.5, M.tela, 0, 7, 2, asiento);
  // respaldo de malla con soporte lumbar y cabecera
  const mallaTex = canvasTex('mallaSilla', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#0e1013'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#2d3338'; ctx.lineWidth = 2;
    for (let i = 0; i < w; i += 8) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke(); }
  }, { repetir: [8, 10] });
  const respaldo = new THREE.Group(); respaldo.position.set(0, 42, -24); respaldo.rotation.x = -.12; g.add(respaldo);
  const marco = rectRedondo(48, 58, 8); const hueco = rectRedondo(42, 52, 6); marco.holes.push(hueco);
  const aro = extruir(marco, 2.5, plasticoBase, .4); aro.position.y = 29; respaldo.add(aro);
  plano(43, 53, new THREE.MeshStandardMaterial({ map: mallaTex, roughness: .9, transparent: true, opacity: .92, side: THREE.DoubleSide }), 0, 29, 0, respaldo);
  rcaja(36, 9, 3, 2, M.tela, 0, 14, 1.5, respaldo);
  rcaja(30, 12, 4, 3, M.tela, 0, 64, 1, respaldo);
  rcaja(6, 30, 3, 1, plasticoBase, 0, 8, -2.5, respaldo);
  // descansabrazos
  const brazos = new THREE.Group(); brazos.position.y = 30; g.add(brazos);
  [-1, 1].forEach((k) => {
    rcaja(3, 22, 4, 1, plasticoBase, k * 27, 14, 0, brazos);
    rcaja(7, 2.5, 26, 1.2, M.goma, k * 27, 26, 1, brazos);
  });
  partes.push({ obj: respaldo, off: [0, 14, -20] }, { obj: asiento, off: [0, 10, 0] }, { obj: brazos, off: [0, 18, 0] }, { obj: piston, off: [0, 4, 0] });
  g.rotation.y = .7;
  return { g, partes };
}

/* ======================= Software (caja con tarjeta de licencia) ======================= */
const PORTADAS = {
  sistema: { c1: '#0a3a8c', c2: '#2aa7ff', simbolo: 'ventana' },
  oficina: { c1: '#7a2a0a', c2: '#ff8a3d', simbolo: 'hojas' },
  cad: { c1: '#073b3b', c2: '#2ee6c8', simbolo: 'cubo' },
  antivirus: { c1: '#0b3a1f', c2: '#36e39a', simbolo: 'escudo' },
};
export function cajaSoftware({ tipo = 'sistema', titulo = 'Sistema operativo', sub = 'Licencia digital', detalle = '' } = {}) {
  const g = new THREE.Group(), partes = [];
  const p = PORTADAS[tipo];
  const portada = canvasTex(`sw:${tipo}:${titulo}`, 768, 1024, (ctx, w, h) => {
    const gr = ctx.createLinearGradient(0, 0, w, h); gr.addColorStop(0, p.c1); gr.addColorStop(1, p.c2); ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = .9; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 14;
    const cx = w / 2, cy = h * .38;
    if (p.simbolo === 'ventana') { ctx.strokeRect(cx - 150, cy - 120, 300, 240); ctx.fillRect(cx - 150, cy - 120, 300, 46); }
    if (p.simbolo === 'hojas') [0, 1, 2].forEach((i) => { ctx.strokeRect(cx - 140 + i * 40, cy - 150 + i * 40, 200, 240); });
    if (p.simbolo === 'cubo') { ctx.beginPath(); ctx.moveTo(cx, cy - 150); ctx.lineTo(cx + 130, cy - 75); ctx.lineTo(cx + 130, cy + 75); ctx.lineTo(cx, cy + 150); ctx.lineTo(cx - 130, cy + 75); ctx.lineTo(cx - 130, cy - 75); ctx.closePath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + 150); ctx.moveTo(cx, cy); ctx.lineTo(cx + 130, cy - 75); ctx.moveTo(cx, cy); ctx.lineTo(cx - 130, cy - 75); ctx.stroke(); }
    if (p.simbolo === 'escudo') { ctx.beginPath(); ctx.moveTo(cx, cy - 160); ctx.lineTo(cx + 130, cy - 110); ctx.quadraticCurveTo(cx + 130, cy + 90, cx, cy + 170); ctx.quadraticCurveTo(cx - 130, cy + 90, cx - 130, cy - 110); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx - 55, cy); ctx.lineTo(cx - 10, cy + 50); ctx.lineTo(cx + 65, cy - 45); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.textAlign = 'center';
    ctx.font = '800 62px Arial'; ctx.fillText(titulo, cx, h * .7, w - 60);
    ctx.font = '500 38px Arial'; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillText(sub, cx, h * .78, w - 60);
    if (detalle) { ctx.font = '600 32px Arial'; ctx.fillText(detalle, cx, h * .85, w - 60); }
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, h - 90, w, 90); ctx.fillStyle = '#fff'; ctx.font = '700 36px Arial'; ctx.fillText('M&T SOFTWARE', cx, h - 36);
  });
  const lomo = canvasTex(`swl:${tipo}:${titulo}`, 1024, 96, (ctx, w, h) => {
    ctx.fillStyle = p.c1; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#fff'; ctx.font = '700 52px Arial'; ctx.textBaseline = 'middle'; ctx.fillText(titulo, 30, h / 2);
  });
  const dorso = color(p.c1, .5);
  const caja3 = rcaja(13.5, 19, 1.6, .15, [matEtiqueta(lomo, .4), dorso, dorso, dorso, matEtiqueta(portada, .35), dorso], 0, 9.5, 0, g);
  caja3.material[0].map.rotation = Math.PI / 2; caja3.material[0].map.center.set(.5, .5);
  // tarjeta con la clave de producto que se asoma por arriba
  const tarjeta = rcaja(8.5, 5.4, .08, .3, [M.plasticoBlanco, M.plasticoBlanco, M.plasticoBlanco, M.plasticoBlanco, matEtiqueta(etiqueta(`key:${tipo}`, 512, 320, '#f2f4f5', '#15191c', [
    ['Clave de producto', 34, 30, 60, '700'], ['XXXXX-XXXXX-XXXXX', 40, 30, 150, '600', 'left', '#333'], ['XXXXX-XXXXX', 40, 30, 210, '600', 'left', '#333'],
  ], (ctx) => { ctx.fillStyle = p.c2; ctx.fillRect(0, 290, 512, 30); }), .5), M.plasticoBlanco], 0, 18, -.2, g);
  partes.push({ obj: tarjeta, off: [0, 7, 3] });
  g.rotation.y = -.35;
  return { g, partes };
}

export const EQUIPOS = {
  'pc-gamer-fenix': { nombre: 'PC Gamer M&T Fénix', crear: () => pcGamer() },
  'pc-oficina': { nombre: 'PC Oficina M&T Básica', crear: () => pcOficina() },
  'monitor-27': { nombre: 'Monitor 27" QHD', crear: () => monitor() },
  'teclado-mouse': { nombre: 'Teclado mecánico + mouse', crear: () => tecladoMouse() },
  'escritorio-140': { nombre: 'Escritorio 140 cm', crear: () => escritorio() },
  'silla-ergonomica': { nombre: 'Silla ergonómica', crear: () => silla() },
  'sw-sistema-operativo': { nombre: 'Caja de sistema operativo', crear: () => cajaSoftware({ tipo: 'sistema', titulo: 'Windows 11 Pro', sub: 'Licencia digital' }) },
  'sw-oficina': { nombre: 'Caja de suite de oficina', crear: () => cajaSoftware({ tipo: 'oficina', titulo: 'Suite de oficina', sub: 'Suscripción 1 año' }) },
  'sw-cad': { nombre: 'Caja de software CAD', crear: () => cajaSoftware({ tipo: 'cad', titulo: 'CAD educativo', sub: 'Suscripción 1 año', detalle: '2D y 3D' }) },
  'sw-antivirus': { nombre: 'Caja de antivirus', crear: () => cajaSoftware({ tipo: 'antivirus', titulo: 'Antivirus', sub: '3 equipos · 1 año' }) },
};
