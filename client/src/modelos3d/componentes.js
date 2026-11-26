/**
 * Tarjetas de video, SSD M.2, fuentes de poder, ventiladores y enfriamiento líquido.
 */
import {
  THREE, M, caja, canvasTex, cil, circulo, color, contactos, emisivo, etiqueta, extruir, matEtiqueta, metalCepillado, pcbMat, plano,
  rcaja, rectRedondo, repetir, ventilador,
} from './base.js';

/* ======================= Tarjetas de video ======================= */
export function tarjetaVideo({
  largo = 24, alto = 11.2, ventiladores = 2, base = '#24282d', acento = '#c9ced3', marca = 'GEFORCE', modelo = 'RTX 5060', memoria = '8 GB GDDR7',
  conectores = 1, slots = 2, rgb = false,
} = {}) {
  const g = new THREE.Group(), partes = [];
  const L = largo, H = alto, grosor = slots === 3 ? 2.4 : 1.6;
  // tarjeta de circuito con contactos PCIe x16
  const placa = new THREE.Group(); g.add(placa);
  caja(L - 2.5, H - 1.6, .16, pcbMat('pcbGpu', '#0d1512', [2, 1], 33), -.5, .5, 0, placa);
  contactos(82, .1, .07, .65, -L / 2 + 3.6, -H / 2 + .25, .086, 11, .3, placa);
  for (let i = 0; i < conectores; i++) rcaja(1.6, .9, .8, .05, M.plastico, L / 2 - 4 - i * 1.9, H / 2 - .1, 0, placa);

  // disipador de aletas y tubos de calor
  const disip = new THREE.Group(); disip.position.z = .5 + grosor / 2; g.add(disip);
  const aletas = Math.round((L - 3) / .16);
  repetir(new THREE.BoxGeometry(.05, H - 2.4, grosor), M.aluminio, Array.from({ length: aletas }, (_, i) => [-L / 2 + 1.5 + i * .16, .3, 0]), disip);
  [-2.2, -.7, .8, 2.3].slice(0, slots === 3 ? 4 : 3).forEach((y) => { cil(.18, .18, L - 2.4, M.cobre, -.3, y, -grosor / 2 + .2, disip, 14).rotation.z = Math.PI / 2; });

  // carcasa frontal con huecos para los ventiladores
  const s = rectRedondo(L, H, .9);
  const radio = Math.min(H / 2 - .9, (L - 1.6) / ventiladores / 2 - .25);
  const xs = Array.from({ length: ventiladores }, (_, i) => -L / 2 + .8 + radio + .25 + i * ((L - 1.6) / ventiladores));
  xs.forEach((x) => s.holes.push(circulo(x, 0, radio + .1)));
  const carcasa = extruir(s, .45, metalCepillado('shroud' + base, base, .55, .45), .12);
  carcasa.position.z = .55 + grosor + .3; g.add(carcasa);
  // acentos entre ventiladores
  const ac = color(acento, .3, .9);
  xs.slice(0, -1).forEach((x) => caja(.18, H - 2.6, .1, ac, x + (L - 1.6) / ventiladores / 2, 0, .32, carcasa));
  caja(L - 3, .12, .1, ac, 0, H / 2 - .45, .32, carcasa); caja(L - 3, .12, .1, ac, 0, -H / 2 + .45, .32, carcasa);
  const ventis = new THREE.Group(); ventis.position.z = .55 + grosor + .45; g.add(ventis);
  xs.forEach((x) => { const v = ventilador(radio, { aro: false, aspas: ventiladores === 3 ? 11 : 9, matAspa: M.aspaOscura, centro: marca.trim().slice(0, 3) === 'RAD' ? 'RX' : 'RTX' }); v.position.x = x; ventis.add(v); });

  // canto superior con el nombre del modelo (se ve en el gabinete)
  const canto = etiqueta(`gpuLbl:${marca}:${modelo}`, 1024, 128, base, '#e9edf0', [[marca, 54, 40, 66, '700', 'left', acento], [modelo, 60, 40 + marca.length * 36, 66, '800']]);
  const borde = plano(L * .55, grosor * .8, matEtiqueta(canto, .45), -L * .15, H / 2 + .02, .55 + grosor / 2, g);
  borde.rotation.x = -Math.PI / 2;
  if (rgb) partes.push({ obj: rcaja(L * .3, .18, .3, .08, M.rgb, L * .28, H / 2 + .08, .55 + grosor / 2, g), off: [0, 2, 3] });

  // placa trasera con ventilas
  const bp = rectRedondo(L - .6, H - .6, .6);
  for (let i = 0; i < 8; i++) { const h = new THREE.Path(), x = L / 2 - 7 + i * .7; h.moveTo(x, -2.5); h.lineTo(x + .3, -2.5); h.lineTo(x + .3, 2.5); h.lineTo(x, 2.5); h.closePath(); bp.holes.push(h); }
  const trasera = extruir(bp, .12, metalCepillado('back' + base, '#2f353b', .9, .3), .03); trasera.position.z = -.35; g.add(trasera);
  plano(6, 1.4, matEtiqueta(etiqueta(`bp:${memoria}`, 512, 128, '#2f353b', '#9aa6ad', [[memoria, 46, 256, 64, '600', 'center']]), .4), -L / 4, -1, -.43, g).rotation.y = Math.PI;

  // soporte de salidas de video: 3 DisplayPort + 1 HDMI
  const soporte = new THREE.Group(); soporte.position.set(-L / 2 - .1, -.2, .6 + (slots === 3 ? .4 : 0)); g.add(soporte);
  caja(.12, H - .4, 2.2 * slots, M.acero, 0, 0, 0, soporte);
  [-3, -1.7, -.4].forEach((y) => caja(.3, .9, 1.3, M.negroMate, -.1, y, .3, soporte));
  caja(.3, .7, 1.5, M.negroMate, -.1, 1, .3, soporte);
  repetir(new THREE.BoxGeometry(.13, .9, .2), M.plastico, Array.from({ length: 8 }, (_, i) => [0, 2.8 - i * .1, 1.8]), soporte);

  partes.push({ obj: carcasa, off: [0, 0, 5] }, { obj: ventis, off: [0, 0, 6.6] }, { obj: disip, off: [0, 0, 2.6] }, { obj: trasera, off: [0, 0, -3] }, { obj: soporte, off: [-3, 0, 0] });
  g.rotation.y = -.15;
  return { g, partes };
}

/* ======================= SSD M.2 2280 ======================= */
export function ssd({ pcb = '#0e2238', fondo = '#101418', tinta = '#eef2f4', acento = '#36e39a', marca = 'M&T NOVA', detalle = 'NVMe PCIe 4.0 · 1 TB', velocidad = '5000 MB/s', dram = false } = {}) {
  const g = new THREE.Group(), partes = [];
  const w = 8, h = 2.2;
  // placa con la muesca del tornillo y la llave M
  const s = new THREE.Shape();
  s.moveTo(-w / 2, -h / 2); s.lineTo(w / 2, -h / 2); s.lineTo(w / 2, -.35); s.lineTo(w / 2 - .25, -.35); s.lineTo(w / 2 - .25, -.15); s.lineTo(w / 2, -.15);
  s.lineTo(w / 2, h / 2); s.lineTo(-w / 2 + .35, h / 2); s.absarc(-w / 2 + .35, 0, .35, Math.PI / 2, -Math.PI / 2, false);
  s.lineTo(-w / 2, -.35); s.lineTo(-w / 2, -h / 2);
  const placa = extruir(s, .08, pcbMat('pcbSsd' + pcb, pcb, [1, 1], 44), .005); placa.rotation.x = -Math.PI / 2; g.add(placa);
  const pins = [];
  for (let i = 0; i < 30; i++) { const z = -1.0 + i * .07; if (z > .1 && z < .4) continue; pins.push([w / 2 - .2, .045, z], [w / 2 - .2, -.045, z]); }
  repetir(new THREE.BoxGeometry(.38, .01, .045), M.oro, pins, g);
  const chip = (x, z, cw, cd, txt) => rcaja(cw, .12, cd, .02, [M.chip, M.chip, matEtiqueta(etiqueta('chip' + txt, 256, 256, '#17181a', '#8b9196', [[txt, 34, 128, 128, '600', 'center']]), .4), M.chip, M.chip, M.chip], x, .11, z, g);
  const chips = [chip(-1.9, 0, 1.4, 1.5, 'NAND'), chip(-.2, 0, 1.4, 1.5, 'NAND'), chip(2.3, -.1, 1.1, 1.1, 'CTRL')];
  if (dram) chips.push(chip(1.1, .1, .8, 1.1, 'DRAM'));
  const lbl = etiqueta(`ssd:${marca}:${detalle}`, 1024, 300, fondo, tinta, [[marca, 72, 40, 90, '800'], [detalle, 40, 40, 170, '500', 'left', '#9aa6ad'], [velocidad, 44, 40, 240, '700', 'left', acento]], (ctx) => {
    ctx.fillStyle = acento; ctx.fillRect(0, 290, 1024, 10);
  });
  const sticker = plano(6.2, 1.8, matEtiqueta(lbl, .65), -.5, .2, 0, g); sticker.rotation.x = -Math.PI / 2;
  partes.push({ obj: sticker, off: [0, 1.2, 0] });
  chips.forEach((c) => partes.push({ obj: c, off: [0, .5, 0] }));
  g.rotation.x = .5;
  return { g, partes };
}

/* ======================= Fuentes de poder ======================= */
export function fuente({ potencia = 750, eficiencia = 'GOLD', modular = 'total', marca = 'M&T VOLT', base = '#1d2125', ventilador: diam = 13.5, largo = 14 } = {}) {
  const g = new THREE.Group(), partes = [];
  const W = 15, H = 8.6, D = largo;
  rcaja(W, H, D, .35, metalCepillado('psu' + base, base, .55, .5), 0, 0, 0, g);
  // ventilador inferior visto desde arriba con rejilla de alambre
  const vent = ventilador(diam / 2 - .5, { aro: false, aspas: 7, matAspa: M.plastico }); vent.rotation.x = -Math.PI / 2; vent.position.y = H / 2 - .1; g.add(vent);
  const rejilla = new THREE.Group(); rejilla.position.y = H / 2 + .05; g.add(rejilla);
  [1.5, 2.8, 4.1, 5.4, diam / 2 - .3].forEach((r) => { const t = new THREE.Mesh(new THREE.TorusGeometry(r, .06, 8, 80), M.acero); t.rotation.x = Math.PI / 2; t.castShadow = true; rejilla.add(t); });
  [0, 1, 2, 3].forEach((i) => { caja(diam - .6, .1, .12, M.acero, 0, 0, 0, rejilla).rotation.y = i * Math.PI / 4; });
  // etiqueta lateral con la eficiencia
  const colorEf = { BRONZE: '#b0703a', GOLD: '#d4a63a', PLATINUM: '#cfd6da' }[eficiencia] || '#d4a63a';
  const amp = (potencia / 12 * .98).toFixed(1);
  const lbl = etiqueta(`psu:${marca}:${potencia}`, 1024, 600, base, '#e9edf0', [
    [marca, 76, 50, 100, '800'], [`${potencia} W  ·  80 PLUS ${eficiencia}`, 44, 50, 190, '600', 'left', colorEf],
    [modular === 'total' ? 'Totalmente modular' : 'Cables fijos', 40, 50, 260, '500', 'left', '#9aa6ad'], [`+12V  ${amp} A`, 46, 50, 360, '700'],
    ['AC 100-240 V ~ 50/60 Hz', 32, 50, 440, '500', 'left', '#7f8a91'],
  ], (ctx) => { ctx.fillStyle = colorEf; ctx.fillRect(800, 400, 180, 150); ctx.fillStyle = '#111'; ctx.font = '700 34px Arial'; ctx.textAlign = 'center'; ctx.fillText(eficiencia, 890, 485); });
  plano(11, 6.4, matEtiqueta(lbl, .6), 0, 0, D / 2 + .01, g);

  // frente: panel modular o salida de cables fijos
  const panel = new THREE.Group(); panel.position.x = W / 2 + .02; g.add(panel);
  if (modular === 'total') {
    const con = (y, z, w, h) => rcaja(.3, h, w, .04, M.plastico, .1, y, z, panel);
    con(2.4, -2.8, 4.2, 1.1); con(2.4, 2.6, 2.6, 1.1); [-4, -1.3, 1.4, 4.1].forEach((z) => { con(.7, z, 2.2, 1.0); con(-1.1, z, 2.2, .9); });
    con(-2.8, -2.5, 3.2, .8); con(-2.8, 2.5, 3.2, .8);
  } else {
    // haz de cables con malla saliendo del frente
    const haz = new THREE.Group(); panel.add(haz);
    caja(.4, 4, 5, M.negroMate, .1, .4, 0, panel);
    const cables = [[1.6, -1.2, 0xe0e0e0], [1.4, 1.2, 0x15181b], [.5, -1.6, 0x15181b], [.6, .2, 0x15181b], [-.4, 1.6, 0x15181b], [-.7, -.6, 0x15181b]];
    cables.forEach(([y, z, c], i) => {
      const curva = new THREE.CatmullRomCurve3([new THREE.Vector3(0, y, z), new THREE.Vector3(3, y + .2, z * 1.2), new THREE.Vector3(5 + i * .6, y - 1.5 - i * .3, z * 1.5 + (i % 2 ? 1 : -1))]);
      const t = new THREE.Mesh(new THREE.TubeGeometry(curva, 30, i < 2 ? .42 : .26, 10), color(c, .85)); t.castShadow = true; haz.add(t);
      const fin = curva.getPoint(1);
      rcaja(1.2, .6, 1.6, .05, M.plastico, fin.x + .4, fin.y, fin.z, haz);
    });
    partes.push({ obj: haz, off: [3, 0, 0] });
  }
  // atrás: conector de corriente C14 e interruptor
  const atras = new THREE.Group(); atras.position.x = -W / 2 - .02; g.add(atras);
  caja(.1, H - 1, D - 1, M.negroMate, -.02, 0, 0, atras);
  repetir(new THREE.CylinderGeometry(.22, .22, .12, 6), M.plastico, Array.from({ length: 40 }, (_, i) => [-.06, -2.6 + (i % 5) * 1.1, -1 + Math.floor(i / 5) * .8, 0, 0, Math.PI / 2]), atras);
  rcaja(.4, 1.6, 2.6, .1, M.plastico, -.1, 2.2, -4, atras);
  rcaja(.4, 1.2, 1.4, .1, emisivo('#2a2f35', .1), -.1, 2.2, -1.4, atras);
  partes.push({ obj: rejilla, off: [0, 3, 0] }, { obj: vent, off: [0, 1.6, 0] });
  g.rotation.y = -.5;
  return { g, partes };
}

/* ======================= Ventilador de 120 mm ======================= */
export function ventilador120({ rgb = true, marcoColor = 0x0d0f11 } = {}) {
  const g = new THREE.Group(), partes = [];
  const s = rectRedondo(12, 12, 1);
  s.holes.push(circulo(0, 0, 5.75));
  [[-5.2, -5.2], [5.2, -5.2], [-5.2, 5.2], [5.2, 5.2]].forEach(([x, y]) => s.holes.push(circulo(x, y, .25)));
  g.add(extruir(s, 2.5, color(marcoColor, .5, .1), .1));
  const v = ventilador(5.5, { rgb }); g.add(v);
  [0, 1, 2, 3].forEach((i) => { const a = Math.PI / 4 + i * Math.PI / 2; const b = caja(5.6, .25, .15, M.plastico, Math.cos(a) * 2.9, Math.sin(a) * 2.9, -1.05, g); b.rotation.z = a; });
  partes.push({ obj: v, off: [0, 0, 4] });
  return { g, partes };
}

/** Kit de 3 ventiladores RGB con controlador */
export function kitVentiladores() {
  const g = new THREE.Group(), partes = [];
  [-13, 0, 13].forEach((x, i) => {
    const f = ventilador120(); f.g.position.set(x, 6, i * -1.5); g.add(f.g);
    partes.push({ obj: f.g, off: [(i - 1) * 4, 0, 3] });
    f.partes.forEach((p) => partes.push(p));
  });
  // controlador RGB y cable
  const ctrl = rcaja(5, 1.2, 3.2, .3, M.plastico, 0, .6, 8, g);
  plano(3, .9, emisivo('#36e39a', .7), 0, .61, 0, ctrl).rotation.x = -Math.PI / 2;
  partes.push({ obj: ctrl, off: [0, 0, 5] });
  g.rotation.y = .3;
  return { g, partes };
}

/* ======================= Enfriamiento líquido (AIO) ======================= */
export function enfriamientoLiquido({ ventiladores = 2, rgb = true, texto = 'M&T FROST' } = {}) {
  const g = new THREE.Group(), partes = [];
  const largo = ventiladores * 12 + 3.4;
  // radiador con aletas y tanques laterales
  const rad = new THREE.Group(); rad.position.y = 7; g.add(rad);
  caja(largo - 3, 12, 2.7, M.negroMate, 0, 0, 0, rad);
  repetir(new THREE.BoxGeometry(largo - 3.2, .05, 2.5), M.grafito, Array.from({ length: 60 }, (_, i) => [0, -5.8 + i * .197, .12]), rad);
  rcaja(1.8, 12.4, 3.2, .3, M.plastico, -largo / 2 + .9, 0, 0, rad);
  rcaja(1.8, 12.4, 3.2, .3, M.plastico, largo / 2 - .9, 0, 0, rad);
  // ventiladores sobre el radiador
  const ventis = new THREE.Group(); ventis.position.set(0, 7, 2.7); g.add(ventis);
  for (let i = 0; i < ventiladores; i++) { const f = ventilador120({ rgb }); f.g.position.x = -largo / 2 + 1.7 + 6 + i * 12; ventis.add(f.g); }
  // bloque de la bomba con anillo RGB y tapa
  const bomba = new THREE.Group(); bomba.position.set(largo / 2 + 9, 3.2, 4); g.add(bomba);
  rcaja(7, 2, 7, .6, M.plastico, 0, 1, 0, bomba);
  cil(3.2, 3.2, .5, M.cobre, 0, -.1, 0, bomba);
  const anillo = new THREE.Mesh(new THREE.TorusGeometry(2.7, .16, 12, 80), rgb ? M.rgb : M.niquel); anillo.rotation.x = Math.PI / 2; anillo.position.y = 2.05; bomba.add(anillo);
  const tapa = cil(2.55, 2.55, .2, [M.plastico, matEtiqueta(etiqueta('aio:' + texto, 512, 512, '#0f1214', '#e9edf0', [[texto, 64, 256, 256, '800', 'center']], (ctx) => {
    ctx.strokeStyle = '#2c3237'; ctx.lineWidth = 16; ctx.beginPath(); ctx.arc(256, 256, 230, 0, 7); ctx.stroke();
  }), .35), M.plastico], 0, 2.1, 0, bomba, 48);
  tapa.rotation.y = Math.PI / 2;
  // mangueras trenzadas del radiador a la bomba
  const tuboMat = new THREE.MeshStandardMaterial({ map: canvasTrenzado(), color: 0x30363b, roughness: .8 });
  [-1.2, 1.2].forEach((dz, i) => {
    const ini = new THREE.Vector3(largo / 2 - .9, 7 + 4.5 - i * 1.6, dz);
    const curva = new THREE.CatmullRomCurve3([ini, ini.clone().add(new THREE.Vector3(3, 1, 0)), new THREE.Vector3(largo / 2 + 9 + dz * 1.4, 7, 4 + dz), new THREE.Vector3(largo / 2 + 9 + dz * 1.4, 3.8, 4 + dz * 1.6)]);
    const t = new THREE.Mesh(new THREE.TubeGeometry(curva, 60, .55, 14), tuboMat); t.castShadow = true; g.add(t);
  });
  partes.push({ obj: ventis, off: [0, 0, 5] }, { obj: bomba, off: [6, 3, 4] });
  g.rotation.y = -.25;
  return { g, partes };
}

function canvasTrenzado() {
  return canvasTex('trenza', 256, 64, (ctx, w, h) => {
    ctx.fillStyle = '#2b3035'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 3;
    for (let x = -h; x < w; x += 10) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + h, h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + h, 0); ctx.lineTo(x, h); ctx.stroke(); }
  }, { repetir: [12, 1] });
}

/* ======================= Catálogo de componentes ======================= */
export const COMPONENTES = {
  'gpu-rtx-5060': { nombre: 'NVIDIA GeForce RTX 5060 8 GB', crear: () => tarjetaVideo({ largo: 22, ventiladores: 2, base: '#202428', acento: '#76b900', marca: 'GEFORCE ', modelo: 'RTX 5060', memoria: '8 GB GDDR7' }) },
  'gpu-rtx-5060-ti': { nombre: 'NVIDIA GeForce RTX 5060 Ti 16 GB', crear: () => tarjetaVideo({ largo: 24, ventiladores: 2, base: '#1b1e22', acento: '#c9ced3', marca: 'GEFORCE ', modelo: 'RTX 5060 Ti', memoria: '16 GB GDDR7', rgb: true }) },
  'gpu-rx-9070-xt': { nombre: 'AMD Radeon RX 9070 XT 16 GB', crear: () => tarjetaVideo({ largo: 30.5, alto: 12.6, ventiladores: 3, slots: 3, base: '#1a1c1f', acento: '#e8343b', marca: 'RADEON ', modelo: 'RX 9070 XT', memoria: '16 GB GDDR6', conectores: 2, rgb: true }) },
  'gpu-rtx-4060': { nombre: 'Tarjeta de video RTX 4060', crear: () => tarjetaVideo({ largo: 24, ventiladores: 2, base: '#2a2f34', acento: '#c9ced3', marca: 'GEFORCE ', modelo: 'RTX 4060', memoria: '8 GB GDDR6' }) },
  'ssd-sandisk-optimus-5100': { nombre: 'SanDisk Optimus 5100 NVMe', crear: () => ssd({ pcb: '#101214', fondo: '#111315', acento: '#e3262f', marca: 'SANDISK OPTIMUS 5100', detalle: 'NVMe PCIe 4.0 x4 · 1 TB', velocidad: 'Hasta 7,100 MB/s' }) },
  'ssd-samsung-990-pro': { nombre: 'Samsung 990 PRO NVMe M.2', crear: () => ssd({ pcb: '#0d0f11', fondo: '#0b0c0e', acento: '#7aa7ff', marca: '990 PRO', detalle: 'NVMe M.2 PCIe 4.0 · 2 TB', velocidad: 'Hasta 7,450 MB/s', dram: true }) },
  'ssd-nvme-generico': { nombre: 'SSD NVMe 1 TB', crear: () => ssd() },
  'psu-msi-mag-a650bn': { nombre: 'MSI MAG A650BN 650 W Bronze', crear: () => fuente({ potencia: 650, eficiencia: 'BRONZE', modular: 'no', marca: 'MAG A650BN', base: '#17191c', ventilador: 12, largo: 14 }) },
  'psu-gigabyte-ud850gm': { nombre: 'Gigabyte UD850GM 850 W Gold', crear: () => fuente({ potencia: 850, eficiencia: 'GOLD', modular: 'total', marca: 'UD850GM', base: '#141619', ventilador: 12, largo: 14 }) },
  'psu-750-gold': { nombre: 'Fuente 750 W 80+ Gold', crear: () => fuente() },
  'ventiladores-kit-rgb': { nombre: 'Kit 3 ventiladores RGB 120 mm', crear: kitVentiladores },
  'ventilador-120-rgb': { nombre: 'Ventilador RGB 120 mm', crear: ventilador120 },
  'aio-240': { nombre: 'Enfriamiento líquido 240 mm', crear: () => enfriamientoLiquido({ ventiladores: 2 }) },
  'aio-360': { nombre: 'Enfriamiento líquido 360 mm', crear: () => enfriamientoLiquido({ ventiladores: 3 }) },
};
