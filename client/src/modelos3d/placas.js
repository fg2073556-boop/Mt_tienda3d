/**
 * Tarjetas madre: E-ATX de gama extrema (disipadores masivos, cubierta I/O con pantalla)
 * y Micro-ATX de gama media. Medidas reales: E-ATX 30.5 × 27.7 cm, mATX 24.4 × 24.4 cm.
 */
import {
  THREE, M, caja, cil, emisivo, etiqueta, matEtiqueta, metalCepillado, pcbMat, plano, rcaja, repetir,
} from './base.js';

/** Socket con marco de retención */
function socket(g, tipo, x, z, top) {
  const s = new THREE.Group(); s.position.set(x, top, z); g.add(s);
  if (tipo === 'am4') {
    // ZIF de plástico blanco con palanca
    caja(4.4, .45, 4.8, M.plasticoBlanco, 0, .22, 0, s);
    const pos = []; for (let i = 0; i < 30; i++) for (let j = 0; j < 30; j++) if (Math.abs(i - 14.5) > 4 || Math.abs(j - 14.5) > 4) pos.push([-1.6 + i * .11, .455, -1.6 + j * .11]);
    repetir(new THREE.BoxGeometry(.05, .01, .05), M.plasticoGris, pos, s);
    cil(.05, .05, 4.6, M.niquel, 2.35, .3, 0, s).rotation.x = Math.PI / 2;
    // soportes del disipador
    [[-1, 1], [1, 1]].forEach(([lx]) => caja(.8, .5, 7.2, M.plastico, lx * 2.9, .25, 0, s));
  } else {
    const ancho = tipo === 'lga1851' ? 4.6 : 4.2, prof = tipo === 'lga1851' ? 5.2 : 4.2;
    caja(ancho + .8, .25, prof + .8, M.plastico, 0, .12, 0, s);
    caja(ancho, .05, prof, M.oro, 0, .26, 0, s);
    [[0, prof / 2 + .2, ancho + 1, .45], [0, -prof / 2 - .2, ancho + 1, .45], [ancho / 2 + .2, 0, .45, prof + .4], [-ancho / 2 - .2, 0, .45, prof + .4]]
      .forEach(([px, pz, w, d]) => caja(w, .32, d, M.niquel, px, .2, pz, s));
    cil(.07, .07, prof + .6, M.niquel, ancho / 2 + .7, .3, 0, s).rotation.x = Math.PI / 2;
    caja(1.6, .12, 1, M.negroMate, 0, .4, prof / 2 - .2, s); // tapa protectora del socket
  }
  return s;
}

/** Ranuras de memoria */
function ranurasRam(g, x, z, top, color, n = 4) {
  const r = new THREE.Group(); r.position.set(x, top, z); g.add(r);
  for (let i = 0; i < n; i++) {
    const px = i * .95;
    caja(.6, .75, 13.6, i % 2 ? color : M.plastico, px, .38, 0, r);
    caja(.62, .9, .55, M.plasticoGris, px, .45, 7.05, r); caja(.62, .9, .55, M.plasticoGris, px, .45, -7.05, r);
  }
  return r;
}

/** Ranura PCIe (con o sin blindaje metálico) */
function pcie(g, x, z, top, largo, metal) {
  const r = new THREE.Group(); r.position.set(x, top, z); g.add(r);
  caja(largo, .7, .7, M.plastico, 0, .35, 0, r);
  if (metal) caja(largo + .3, .76, .82, M.acero, 0, .36, 0, r);
  return r;
}

export function placaMadre({
  formato = 'atx', socket: tipoSocket = 'am5', chipset = 'B650', nombre = 'M&T SERIES', serie = '', colorPcb = '#101416',
  estilo = 'media', acento = '#36e39a', wifi = true,
} = {}) {
  const g = new THREE.Group(), partes = [];
  // x = profundidad desde el borde trasero (I/O); z = largo del borde trasero (de arriba hacia abajo)
  const W = formato === 'eatx' ? 27.7 : 24.4;
  const D = formato === 'matx' ? 24.4 : 30.5;
  caja(W, .16, D, pcbMat('pcbMb' + formato, colorPcb, [3, 2.6], 9), 0, 0, 0, g);
  const top = .08, x0 = -W / 2, z0 = -D / 2;
  const sx = x0 + (formato === 'eatx' ? 11 : 10), sz = z0 + 8;

  socket(g, tipoSocket, sx, sz, top);
  ranurasRam(g, sx + 4.8, sz, top, estilo === 'extrema' ? M.grafito : M.plasticoGris);
  rcaja(1.0, 1.0, 5.3, .05, M.plastico, x0 + W - 1.3, top + .5, sz + 1, g); // ATX 24 pines
  rcaja(1.0, .9, 2.0, .05, M.plastico, sx - 1, top + .45, z0 + .9, g).rotation.y = Math.PI / 2; // EPS 8 pines
  if (estilo === 'extrema') rcaja(1.0, .9, 2.0, .05, M.plastico, sx + 1.4, top + .45, z0 + .9, g).rotation.y = Math.PI / 2;

  // capacitores y bobinas de la etapa de poder alrededor del socket
  const caps = [], bobinas = [];
  const fases = estilo === 'extrema' ? 14 : 8;
  for (let i = 0; i < fases; i++) { caps.push([sx - 4.6 + i * .62, top + .4, z0 + 2.6]); bobinas.push([sx - 4.6 + i * .62, top + .3, z0 + 3.3]); }
  for (let i = 0; i < (estilo === 'extrema' ? 10 : 6); i++) { caps.push([x0 + 5.6, top + .4, sz - 3 + i * .62]); bobinas.push([x0 + 6.4, top + .3, sz - 3 + i * .62]); }
  repetir(new THREE.CylinderGeometry(.22, .22, .8, 18), M.aluminio, caps, g);
  repetir(new THREE.BoxGeometry(.5, .6, .5), M.grafito, bobinas, g);

  // disipadores de VRM
  const vrmMat = metalCepillado('vrm' + estilo, estilo === 'extrema' ? '#1d2024' : '#4a5057', .85, .38);
  const largoV1 = estilo === 'extrema' ? 10 : 7;
  const vrm1 = new THREE.Group(); vrm1.position.set(sx - .2, top, z0 + 3.4); g.add(vrm1);
  rcaja(largoV1, estilo === 'extrema' ? 2.2 : 1.3, 2.2, .15, vrmMat, 0, (estilo === 'extrema' ? 2.2 : 1.3) / 2 + .1, 0, vrm1);
  if (estilo !== 'extrema') repetir(new THREE.BoxGeometry(.08, .8, 2.2), M.grafito, Array.from({ length: 22 }, (_, i) => [-3.2 + i * .3, 1.6, 0]), vrm1);
  const vrm2 = new THREE.Group(); vrm2.position.set(x0 + 3.9, top, sz + .6); g.add(vrm2);
  rcaja(2.2, estilo === 'extrema' ? 2.2 : 1.3, estilo === 'extrema' ? 9 : 6, .15, vrmMat, 0, (estilo === 'extrema' ? 2.2 : 1.3) / 2 + .1, 0, vrm2);
  partes.push({ obj: vrm1, off: [0, 3, 0] }, { obj: vrm2, off: [0, 3, 0] });

  // cubierta de puertos traseros (en la extrema integra una pantalla)
  const ioTex = etiqueta('io:' + nombre, 256, 1024, estilo === 'extrema' ? '#14171a' : '#2a2f35', '#cfd6da', [[chipset, 52, 128, 110, '700', 'center']], (ctx) => {
    ctx.fillStyle = acento; ctx.fillRect(118, 200, 20, 640);
  });
  const altoIo = estilo === 'extrema' ? 4 : 3.2;
  const io = rcaja(2.6, altoIo, estilo === 'extrema' ? 12 : 8.5, .25, [vrmMat, vrmMat, matEtiqueta(ioTex, .4), vrmMat, vrmMat, vrmMat], x0 + 1.3, top + altoIo / 2, sz - .8, g);
  if (estilo === 'extrema') {
    // heatpipe en U que une los disipadores
    const curva = new THREE.CatmullRomCurve3([new THREE.Vector3(x0 + 3.9, top + 2.3, sz + 4), new THREE.Vector3(x0 + 3.9, top + 2.6, z0 + 3.4), new THREE.Vector3(sx + 4, top + 2.4, z0 + 3.4)]);
    const tubo = new THREE.Mesh(new THREE.TubeGeometry(curva, 40, .22, 10), M.niquel); tubo.castShadow = true; g.add(tubo);
    // pantalla de estado sobre la cubierta I/O
    const pantTex = etiqueta('pantalla:' + nombre, 512, 256, '#020406', '#e9edf0', [['92°', 120, 40, 110, '700'], ['CPU OK', 46, 300, 70, '600', 'left', acento], ['DDR5 OK', 46, 300, 150, '600', 'left', acento]]);
    const pantalla = plano(3, 1.6, new THREE.MeshBasicMaterial({ map: pantTex }), 0, altoIo / 2 + .01, -2.5, io);
    pantalla.rotation.x = -Math.PI / 2; pantalla.rotation.z = Math.PI / 2;
    partes.push({ obj: tubo, off: [0, 4, 0] });
  }
  partes.push({ obj: io, off: [0, 3.5, 0] });

  // ranuras PCIe
  const ranuras = formato === 'matx' ? [[7.8, 8.9, true], [10.3, 2.5, false], [14.3, 8.9, false]]
    : estilo === 'extrema' ? [[9.5, 8.9, true], [13.6, 8.9, true], [17.6, 8.9, false]] : [[9.5, 8.9, true], [13.6, 2.5, false], [17.6, 8.9, false]];
  ranuras.forEach(([dz, largo, metal]) => pcie(g, x0 + 4.5 + largo / 2, sz + dz, top, largo, metal));

  // cubiertas M.2 (la extrema tapa casi toda la mitad inferior)
  const m2Mat = metalCepillado('m2' + estilo, estilo === 'extrema' ? '#25292e' : '#575e66', .85, .35);
  const m2s = [];
  if (estilo === 'extrema') {
    // dos cubiertas M.2 entre las ranuras PCIe, con el nombre del modelo
    const anchoT = W - 12, cx = x0 + 4 + anchoT / 2;
    [11.55, 15.6].forEach((dz, i) => {
      const tapa = rcaja(anchoT, .45, 3.2, .2, m2Mat, cx, top + .9, sz + dz, g);
      if (i === 1) plano(anchoT - 1, 1.4, matEtiqueta(etiqueta('mx:' + nombre, 1024, 110, '#25292e', '#dfe4e8', [[nombre, 62, 512, 56, '800', 'center']]), .4), 0, .24, 0, tapa).rotation.x = -Math.PI / 2;
      m2s.push(tapa);
    });
    const vc = rcaja(8.5, 1.3, 2.6, .2, metalCepillado('vc', '#3a4047', .95, .3), sx + 1, top + .8, sz + 6.6, g); // disipador 3D VC del M.2 PCIe 5.0
    repetir(new THREE.BoxGeometry(.07, .7, 2.6), M.grafito, Array.from({ length: 24 }, (_, i) => [-3.9 + i * .34, .9, 0]), vc);
    m2s.push(vc);
  } else {
    const zs = formato === 'matx' ? [5.6, 12.3] : [6.8, 11.5];
    zs.forEach((dz) => m2s.push(rcaja(7.5, .35, 2.2, .1, m2Mat, x0 + 8, top + .2, sz + dz, g)));
  }
  m2s.forEach((m) => partes.push({ obj: m, off: [0, 3, 0] }));

  // chipset
  const chipTex = etiqueta('chip:' + chipset + nombre, 512, 512, estilo === 'extrema' ? '#1c2024' : '#3b4249', '#e3e8eb', [[chipset, 92, 256, 220, '700', 'center'], [serie, 34, 256, 300, '500', 'center', acento]]);
  const chip = rcaja(5, .8, 4.6, .25, [m2Mat, m2Mat, matEtiqueta(chipTex, .38), m2Mat, m2Mat, m2Mat], x0 + W - 5, top + .45, z0 + D - 6.5, g);
  partes.push({ obj: chip, off: [0, 3, 0] });

  // puertos SATA, cabezales y antena WiFi
  for (let i = 0; i < 4; i++) caja(.8, .6, .45, M.plastico, x0 + W - .8, top + .3, z0 + D - 11.5 + i * .7, g);
  repetir(new THREE.BoxGeometry(.9, .45, .4), M.plastico, Array.from({ length: 6 }, (_, i) => [x0 + 4 + i * 2.6, top + .22, z0 + D - .6]), g);
  if (wifi) {
    const ant = new THREE.Group(); ant.position.set(x0 - .6, top + 1.2, sz - 3.5); g.add(ant);
    cil(.25, .25, 1.1, M.plastico, 0, 0, 0, ant).rotation.z = Math.PI / 2;
  }
  // batería CMOS
  cil(1, 1, .3, M.niquel, x0 + W - 9, top + .15, z0 + D - 3, g);
  if (estilo === 'extrema') {
    // botones de encendido y Q-Code
    caja(.8, .4, .8, emisivo('#ff2d40', .8), x0 + W - 1, top + .2, z0 + D - 3, g);
    caja(1, .3, .6, emisivo(acento, .8), x0 + W - 1, top + .15, z0 + D - 4.6, g);
  }
  g.rotation.x = .25;
  return { g, partes };
}

export const PLACAS = {
  'mb-rog-maximus-z890-extreme': {
    nombre: 'ASUS ROG Maximus Z890 Extreme',
    crear: () => placaMadre({ formato: 'eatx', socket: 'lga1851', chipset: 'Z890', nombre: 'MAXIMUS Z890 EXTREME', serie: 'REPUBLIC OF GAMERS', colorPcb: '#0b0d0f', estilo: 'extrema', acento: '#ff2d40' }),
  },
  'mb-msi-b550m-pro-vdh-wifi': {
    nombre: 'MSI B550M PRO-VDH WiFi',
    crear: () => placaMadre({ formato: 'matx', socket: 'am4', chipset: 'B550', nombre: 'PRO B550M-VDH', serie: 'PRO SERIES', colorPcb: '#121517', estilo: 'media', acento: '#9aa6ad' }),
  },
  'mb-atx-b650': { nombre: 'Tarjeta madre ATX B650', crear: () => placaMadre({ formato: 'atx', socket: 'am5', chipset: 'B650', nombre: 'M&T B650', serie: 'M&T SERIES' }) },
};
