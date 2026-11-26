/**
 * Procesadores: Intel LGA1851 (Core Ultra serie 2), AMD AM5 (IHS "pulpo") y AMD AM4 (pines PGA).
 * Representaciones a escala; los textos grabados son el nombre del modelo, sin logotipos.
 */
import {
  THREE, M, aleatorio, caja, etiqueta, extruir, pcbMat, rectRedondo, repetir, uvTapa,
} from './base.js';

/** Textura del IHS niquelado con texto grabado y un leve granulado */
function texIhs(clave, w, h, lineas) {
  return etiqueta('ihs:' + clave, 1024, Math.round(1024 * h / w), '#c9cdd1', '#868d93', lineas, (ctx, cw, ch) => {
    const r = aleatorio(5);
    for (let i = 0; i < 1400; i++) { ctx.fillStyle = `rgba(255,255,255,${r() * .05})`; ctx.fillRect(r() * cw, r() * ch, 2, 2); }
    const g = ctx.createLinearGradient(0, 0, cw, ch); g.addColorStop(0, 'rgba(255,255,255,.08)'); g.addColorStop(1, 'rgba(0,0,0,.06)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
  });
}

/** Coloca el IHS (forma extruida) con su textura ajustada */
function ihs(forma, w, h, tex, alto = .22) {
  const m = extruir(forma, alto, new THREE.MeshStandardMaterial({ map: tex, metalness: .72, roughness: .26 }), .04);
  m.rotation.x = -Math.PI / 2;
  uvTapa(m, w, h);
  return m;
}

/** Contactos planos (LGA) por debajo del sustrato */
function padsLga(g, w, d, paso, y) {
  const pos = [];
  for (let x = -w / 2 + paso; x < w / 2 - paso / 2; x += paso) for (let z = -d / 2 + paso; z < d / 2 - paso / 2; z += paso) {
    if (Math.abs(x) < w * .16 && Math.abs(z) < d * .16) continue; // centro sin contactos, como en los reales
    pos.push([x, y, z]);
  }
  return repetir(new THREE.CylinderGeometry(paso * .32, paso * .32, .01, 8), M.oro, pos, g);
}

/**
 * opciones: tipo 'lga1851' | 'am5' | 'am4', marca, linea, modelo, codigo
 */
export function procesador({ tipo = 'am5', linea = 'RYZEN 7', modelo = '7700', codigo = '' } = {}) {
  const g = new THREE.Group(), partes = [];

  if (tipo === 'lga1851') {
    // Intel: sustrato rectangular de 45 × 37.5 mm con muescas laterales de orientación
    const W = 4.5, D = 3.75;
    caja(W, .12, D, pcbMat('cpuIntel', '#1d5a3a', [1, 1], 23), 0, 0, 0, g);
    // muescas de orientación en los bordes
    [-1, 1].forEach((lado) => caja(.18, .125, .34, M.negroMate, lado * (W / 2 - .08), 0, -.6, g));
    // capacitores a los lados del IHS
    const smd = []; const r = aleatorio(3);
    for (let i = 0; i < 26; i++) smd.push([(i % 2 ? 1 : -1) * (1.95 + r() * .1), .08, -1.5 + Math.floor(i / 2) * .25, 0, Math.PI / 2 * (r() > .5 ? 1 : 0), 0]);
    repetir(new THREE.BoxGeometry(.1, .05, .06), M.ceramica, smd, g);
    // IHS rectangular con "alas" (forma típica de Arrow Lake)
    const f = new THREE.Shape();
    const iw = 3.3, id = 2.9;
    f.moveTo(-iw / 2, -id / 2 + .35); f.lineTo(-iw / 2 + .2, -id / 2 + .35); f.lineTo(-iw / 2 + .2, -id / 2); f.lineTo(iw / 2 - .2, -id / 2);
    f.lineTo(iw / 2 - .2, -id / 2 + .35); f.lineTo(iw / 2, -id / 2 + .35); f.lineTo(iw / 2, id / 2 - .35); f.lineTo(iw / 2 - .2, id / 2 - .35);
    f.lineTo(iw / 2 - .2, id / 2); f.lineTo(-iw / 2 + .2, id / 2); f.lineTo(-iw / 2 + .2, id / 2 - .35); f.lineTo(-iw / 2, id / 2 - .35); f.closePath();
    const tex = texIhs(linea + modelo, iw, id, [
      ['intel', 74, 512, 230, '700', 'center', '#7b8288'], [linea, 92, 512, 410, '700', 'center'], [modelo, 120, 512, 560, '700', 'center'], [codigo, 40, 512, 700, '500', 'center'],
    ]);
    const tapa = ihs(f, iw, id, tex); tapa.position.y = .27; g.add(tapa);
    // triángulo de orientación
    const tri = new THREE.Shape(); tri.moveTo(0, 0); tri.lineTo(.3, 0); tri.lineTo(0, .3); tri.closePath();
    const t = new THREE.Mesh(new THREE.ShapeGeometry(tri), M.oro); t.rotation.x = -Math.PI / 2; t.position.set(-W / 2 + .1, .066, D / 2 - .1); g.add(t);
    const pads = padsLga(g, W - .3, D - .3, .09, -.066);
    partes.push({ obj: tapa, off: [0, 1.8, 0] }, { obj: pads, off: [0, -1, 0] });
  } else if (tipo === 'am5') {
    // AMD AM5: 40 × 40 mm, IHS con recortes laterales donde quedan los capacitores
    const W = 4;
    caja(W, .12, W, pcbMat('cpuAm5', '#16503a', [1, 1], 21), 0, 0, 0, g);
    const iw = 3.4;
    const f = new THREE.Shape(); const h = iw / 2, n = .42;
    f.moveTo(-h, -h); f.lineTo(h, -h);
    [[h, -.95], [h - n, -.95], [h - n, -.25], [h, -.25], [h, .25], [h - n, .25], [h - n, .95], [h, .95], [h, h], [-h, h],
      [-h, .95], [-h + n, .95], [-h + n, .25], [-h, .25], [-h, -.25], [-h + n, -.25], [-h + n, -.95], [-h, -.95]].forEach(([x, y]) => f.lineTo(x, y));
    f.closePath();
    const tex = texIhs(linea + modelo, iw, iw, [
      ['AMD', 80, 512, 300, '700', 'center', '#7b8288'], [linea, 100, 512, 460, '700', 'center'], [modelo, 120, 512, 600, '700', 'center'], [codigo, 40, 512, 740, '500', 'center'],
    ]);
    const tapa = ihs(f, iw, iw, tex); tapa.position.y = .27; g.add(tapa);
    // capacitores visibles en los recortes
    const smd = [];
    [-1, 1].forEach((lado) => [-.6, .6].forEach((z) => { for (let k = 0; k < 4; k++) smd.push([lado * (h - n / 2 + .02), .085, z - .18 + k * .12]); }));
    repetir(new THREE.BoxGeometry(.14, .05, .07), M.ceramica, smd, g);
    const tri = new THREE.Shape(); tri.moveTo(0, 0); tri.lineTo(.3, 0); tri.lineTo(0, .3); tri.closePath();
    const t = new THREE.Mesh(new THREE.ShapeGeometry(tri), M.oro); t.rotation.x = -Math.PI / 2; t.position.set(-1.9, .066, 1.9); g.add(t);
    const pads = padsLga(g, W - .3, W - .3, .1, -.066);
    partes.push({ obj: tapa, off: [0, 1.8, 0] }, { obj: pads, off: [0, -1, 0] });
  } else {
    // AMD AM4: 40 × 40 mm con pines dorados por debajo (PGA)
    const W = 4;
    caja(W, .12, W, pcbMat('cpuAm4', '#2a6b3e', [1, 1], 19), 0, 0, 0, g);
    const iw = 3.5;
    const tex = texIhs(linea + modelo, iw, iw, [
      ['AMD', 80, 512, 300, '700', 'center', '#7b8288'], [linea, 100, 512, 460, '700', 'center'], [modelo, 120, 512, 600, '700', 'center'], [codigo, 40, 512, 740, '500', 'center'],
    ]);
    const tapa = ihs(rectRedondo(iw, iw, .2), iw, iw, tex, .25); tapa.position.y = .28; g.add(tapa);
    const pines = new THREE.Group(); g.add(pines);
    const pos = []; const paso = .1;
    for (let i = 0; i < 37; i++) for (let j = 0; j < 37; j++) {
      const x = -1.8 + i * paso, z = -1.8 + j * paso;
      if (Math.abs(x) < .55 && Math.abs(z) < .55) continue;
      if (i === 0 && j === 36) continue; // esquina de orientación sin pin
      pos.push([x, -.11, z]);
    }
    repetir(new THREE.CylinderGeometry(.012, .012, .2, 5), M.oro, pos, pines);
    const tri = new THREE.Shape(); tri.moveTo(0, 0); tri.lineTo(.3, 0); tri.lineTo(0, .3); tri.closePath();
    const t = new THREE.Mesh(new THREE.ShapeGeometry(tri), M.oro); t.rotation.x = -Math.PI / 2; t.position.set(-1.9, .066, 1.9); g.add(t);
    partes.push({ obj: tapa, off: [0, 1.8, 0] }, { obj: pines, off: [0, -1, 0] });
  }

  g.rotation.x = .35;
  return { g, partes };
}

/** Conjunto de modelos de procesador del catálogo */
export const PROCESADORES = {
  'cpu-core-ultra-9-285k': { nombre: 'Intel Core Ultra 9 285K', crear: () => procesador({ tipo: 'lga1851', linea: 'CORE ULTRA 9', modelo: '285K', codigo: 'LGA1851 · 24 núcleos' }) },
  'cpu-core-ultra-7-265k': { nombre: 'Intel Core Ultra 7 265K', crear: () => procesador({ tipo: 'lga1851', linea: 'CORE ULTRA 7', modelo: '265K', codigo: 'LGA1851 · 20 núcleos' }) },
  'cpu-ryzen-9-9950x3d': { nombre: 'AMD Ryzen 9 9950X3D', crear: () => procesador({ tipo: 'am5', linea: 'RYZEN 9', modelo: '9950X3D', codigo: 'AM5 · 16 núcleos' }) },
  'cpu-ryzen-5-5600g': { nombre: 'AMD Ryzen 5 5600G', crear: () => procesador({ tipo: 'am4', linea: 'RYZEN 5', modelo: '5600G', codigo: 'AM4 · 6 núcleos' }) },
  'cpu-ryzen-7-7700': { nombre: 'AMD Ryzen 7 7700', crear: () => procesador({ tipo: 'am5', linea: 'RYZEN 7', modelo: '7700', codigo: 'AM5 · 8 núcleos' }) },
};
