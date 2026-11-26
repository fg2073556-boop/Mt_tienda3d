/**
 * Piezas básicas para modelar componentes en 3D solo con código:
 * texturas generadas con canvas, materiales realistas y ayudas de geometría.
 * Unidades: 1 = 1 centímetro.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export { THREE };

/* ================= Texturas generadas con canvas ================= */
const cache = new Map();

/** Crea (o reutiliza) una textura dibujando en un canvas */
export function canvasTex(clave, w, h, dibujar, { datos = false, repetir } = {}) {
  if (cache.has(clave)) return cache.get(clave);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  dibujar(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (!datos) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repetir) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repetir); }
  cache.set(clave, t);
  return t;
}

/** Números pseudoaleatorios repetibles (misma semilla = mismo dibujo) */
export function aleatorio(semilla) {
  let s = semilla;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Tarjeta de circuito: máscara de color, pistas, vías y serigrafía */
function texturasPcb(clave, color, semilla) {
  const w = 1024, h = 512;
  const pistas = (ctx, tono) => {
    const r = aleatorio(semilla);
    ctx.lineCap = 'round';
    for (let i = 0; i < 90; i++) {
      let x = r() * w, y = r() * h;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let k = 0; k < 4; k++) {
        const d = 20 + r() * 120, dir = Math.floor(r() * 8) * Math.PI / 4;
        x += Math.cos(dir) * d; y += Math.sin(dir) * d; ctx.lineTo(x, y);
      }
      ctx.lineWidth = 1 + r() * 2.5; ctx.strokeStyle = tono; ctx.stroke();
    }
    for (let i = 0; i < 260; i++) { ctx.beginPath(); ctx.arc(r() * w, r() * h, 1.5 + r() * 2, 0, 7); ctx.fillStyle = tono; ctx.fill(); }
  };
  const map = canvasTex(clave + ':m', w, h, (ctx) => {
    ctx.fillStyle = color; ctx.fillRect(0, 0, w, h);
    pistas(ctx, 'rgba(255,255,255,.07)');
    const r = aleatorio(semilla + 3);
    ctx.strokeStyle = 'rgba(235,240,235,.5)'; ctx.fillStyle = 'rgba(235,240,235,.55)'; ctx.font = '14px monospace'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 26; i++) {
      const x = r() * w, y = r() * h, bw = 14 + r() * 40, bh = 8 + r() * 24;
      ctx.strokeRect(x, y, bw, bh);
      if (r() > .6) ctx.fillText(['C', 'R', 'U', 'Q', 'L'][i % 5] + Math.floor(r() * 900), x, y - 3);
    }
  });
  const bump = canvasTex(clave + ':b', w, h, (ctx) => { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h); pistas(ctx, '#fff'); }, { datos: true });
  return { map, bump };
}

/** Aluminio cepillado */
export function cepillado(clave, base) {
  return canvasTex('cep:' + clave, 512, 512, (ctx, w, h) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    const r = aleatorio(11);
    for (let i = 0; i < 1400; i++) {
      ctx.fillStyle = `rgba(255,255,255,${r() * .06})`; ctx.fillRect(0, r() * h, w, 1);
      ctx.fillStyle = `rgba(0,0,0,${r() * .08})`; ctx.fillRect(0, r() * h, w, 1);
    }
  });
}

/**
 * Etiqueta con textos. lineas: [texto, tamaño, x, y, peso, alineación, color]
 * extra(ctx, w, h) dibuja fondos o adornos antes del texto.
 */
export function etiqueta(clave, w, h, fondo, tinta, lineas, extra) {
  return canvasTex('lbl:' + clave, w, h, (ctx) => {
    ctx.fillStyle = fondo; ctx.fillRect(0, 0, w, h);
    if (extra) extra(ctx, w, h);
    ctx.textBaseline = 'middle';
    lineas.forEach(([txt, size, x, y, peso = '700', alin = 'left', color]) => {
      ctx.font = `${peso} ${size}px "Space Grotesk", "Arial", sans-serif`;
      ctx.textAlign = alin; ctx.fillStyle = color || tinta; ctx.fillText(txt, x, y);
    });
  });
}

/** Degradado RGB compartido; el visor lo desplaza para animarlo */
export const rgbTex = canvasTex('rgb', 512, 8, (ctx, w) => {
  const g = ctx.createLinearGradient(0, 0, w, 0);
  ['#ff2d55', '#ffb020', '#36e39a', '#22d3ee', '#7c5cff', '#ff2d55'].forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c));
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, 8);
}, { repetir: [1, 1] });

/* ================= Materiales ================= */
const std = (o) => new THREE.MeshStandardMaterial(o);
export const M = {
  oro: std({ color: 0xe3b04b, metalness: 1, roughness: .28 }),
  cobre: std({ color: 0xc8733f, metalness: 1, roughness: .3 }),
  niquel: std({ color: 0xd9dde0, metalness: 1, roughness: .22 }),
  acero: std({ color: 0xa9b0b5, metalness: .9, roughness: .38 }),
  aluminio: std({ color: 0xc9ced3, metalness: .85, roughness: .32 }),
  titanio: std({ color: 0x8e959b, metalness: .95, roughness: .3 }),
  grafito: std({ color: 0x2b3136, metalness: .75, roughness: .38 }),
  negroMate: std({ color: 0x121416, metalness: .1, roughness: .7 }),
  plastico: std({ color: 0x101214, metalness: 0, roughness: .6 }),
  plasticoGris: std({ color: 0x3a4046, metalness: 0, roughness: .55 }),
  plasticoBlanco: std({ color: 0xd9dcde, metalness: 0, roughness: .5 }),
  goma: std({ color: 0x0b0c0d, metalness: 0, roughness: .9 }),
  chip: std({ color: 0x18191b, metalness: .2, roughness: .45 }),
  ceramica: std({ color: 0x8a6a45, metalness: .1, roughness: .5 }),
  tela: std({ color: 0x1e2226, metalness: 0, roughness: .95 }),
  madera: std({ color: 0x2c3c42, metalness: .1, roughness: .7 }),
  rgb: std({ color: 0xffffff, emissive: 0xffffff, emissiveMap: rgbTex, map: rgbTex, emissiveIntensity: 1.6, roughness: .4 }),
  aspaOscura: new THREE.MeshPhysicalMaterial({ color: 0x0b0d0f, metalness: 0, roughness: .32, clearcoat: .6, clearcoatRoughness: .2 }),
  aspa: new THREE.MeshPhysicalMaterial({ color: 0x14181c, metalness: 0, roughness: .3, transparent: true, opacity: .9, clearcoat: .5, clearcoatRoughness: .25 }),
  vidrio: new THREE.MeshPhysicalMaterial({ color: 0x9fdcff, metalness: 0, roughness: .05, transparent: true, opacity: .16, clearcoat: 1 }),
};
const colorPlano = (hex, rough = .5, metal = 0) => std({ color: hex, roughness: rough, metalness: metal });
export const color = (hex, rough, metal) => colorPlano(hex, rough, metal);
export const emisivo = (hex, intensidad = 1.4) => std({ color: hex, emissive: hex, emissiveIntensity: intensidad, roughness: .4 });

const matCache = new Map();
/** Material de PCB con relieve de pistas */
export function pcbMat(clave, colorHex, repetir = [1, 1], semilla = 7) {
  const k = `${clave}|${colorHex}|${repetir}`;
  if (matCache.has(k)) return matCache.get(k);
  const t = texturasPcb(clave, colorHex, semilla);
  [t.map, t.bump].forEach((x) => { x.wrapS = x.wrapT = THREE.RepeatWrapping; x.repeat.set(...repetir); });
  const m = new THREE.MeshPhysicalMaterial({ map: t.map, bumpMap: t.bump, bumpScale: .015, roughness: .5, metalness: .05, clearcoat: .25, clearcoatRoughness: .35 });
  matCache.set(k, m);
  return m;
}
export const metalCepillado = (clave, base, metal = .85, rough = .35) => std({ map: cepillado(clave, base), metalness: metal, roughness: rough });
export const matEtiqueta = (tex, rough = .55) => std({ map: tex, roughness: rough, metalness: .05 });

/* ================= Ayudas de geometría ================= */
const sombra = (m) => { m.castShadow = m.receiveShadow = true; return m; };
export function caja(w, h, d, mat, x = 0, y = 0, z = 0, padre) {
  const m = sombra(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat));
  m.position.set(x, y, z); padre && padre.add(m); return m;
}
export function rcaja(w, h, d, r, mat, x = 0, y = 0, z = 0, padre) {
  const m = sombra(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2) * .999), mat));
  m.position.set(x, y, z); padre && padre.add(m); return m;
}
export function cil(rt, rb, h, mat, x = 0, y = 0, z = 0, padre, seg = 32) {
  const m = sombra(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat));
  m.position.set(x, y, z); padre && padre.add(m); return m;
}
export function plano(w, h, mat, x = 0, y = 0, z = 0, padre) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.receiveShadow = true; m.position.set(x, y, z); padre && padre.add(m); return m;
}
/** Repite una pieza muchas veces con una sola malla. pos: [x, y, z, rx, ry, rz] */
export function repetir(geo, mat, pos, padre) {
  const im = sombra(new THREE.InstancedMesh(geo, mat, pos.length));
  const o = new THREE.Object3D();
  pos.forEach((p, i) => { o.position.set(p[0], p[1], p[2]); o.rotation.set(p[3] || 0, p[4] || 0, p[5] || 0); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
  padre && padre.add(im); return im;
}
export function rectRedondo(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
export function circulo(x, y, r) { const p = new THREE.Path(); p.absarc(x, y, r, 0, Math.PI * 2, true); return p; }
export function rectHueco(x, y, w, h) { const p = new THREE.Path(); p.moveTo(x, y); p.lineTo(x + w, y); p.lineTo(x + w, y + h); p.lineTo(x, y + h); p.closePath(); return p; }
/** Extruye una forma centrada en z */
export function extruir(forma, prof, mat, bisel = .04, segCurva = 40) {
  const g = new THREE.ExtrudeGeometry(forma, { depth: prof, bevelEnabled: bisel > 0, bevelThickness: bisel, bevelSize: bisel, bevelSegments: 3, curveSegments: segCurva });
  g.translate(0, 0, -prof / 2);
  return sombra(new THREE.Mesh(g, mat));
}
/** Ajusta las UV de la tapa de una extrusión para que la textura cubra w×h */
export function uvTapa(mesh, w, h) {
  const uv = mesh.geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / w + .5, uv.getY(i) / h + .5);
}

/** Ventilador: aspas curvas, centro con etiqueta y aro opcional (RGB o no). El rotor gira solo. */
export function ventilador(radio, { aro = true, rgb = false, aspas = 9, matAspa = M.aspa, centro = 'M&T' } = {}) {
  const g = new THREE.Group();
  const forma = new THREE.Shape();
  forma.moveTo(radio * .22, -radio * .05);
  forma.quadraticCurveTo(radio * .62, -radio * .32, radio * .93, -radio * .1);
  forma.quadraticCurveTo(radio * .8, radio * .2, radio * .26, radio * .14);
  forma.quadraticCurveTo(radio * .2, radio * .05, radio * .22, -radio * .05);
  const geo = new THREE.ExtrudeGeometry(forma, { depth: radio * .012, bevelEnabled: true, bevelThickness: radio * .006, bevelSize: radio * .006, bevelSegments: 2, curveSegments: 16 });
  const rotor = new THREE.Group();
  rotor.userData.gira = true;
  for (let i = 0; i < aspas; i++) {
    const m = new THREE.Mesh(geo, matAspa); m.castShadow = true;
    const piv = new THREE.Group(); piv.rotation.z = (i / aspas) * Math.PI * 2; m.rotation.x = .5; piv.add(m); rotor.add(piv); // aspa inclinada sobre su eje
  }
  const tex = etiqueta('hub:' + centro, 256, 256, '#121416', '#cfd6da', [[centro, centro.length > 4 ? 40 : 56, 128, 128, '700', 'center']], (ctx) => {
    ctx.strokeStyle = '#2c3237'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(128, 128, 112, 0, 7); ctx.stroke();
  });
  const hub = cil(radio * .25, radio * .25, radio * .16, [M.plastico, matEtiqueta(tex, .4), M.plastico], 0, 0, radio * .02, rotor);
  hub.rotation.x = Math.PI / 2;
  g.add(rotor);
  if (aro) g.add(sombra(new THREE.Mesh(new THREE.TorusGeometry(radio * 1.02, radio * .045, 16, 96), rgb ? M.rgb : M.plastico)));
  return g;
}

/** Contactos dorados de una tarjeta (PCIe, DIMM, M.2) en ambas caras */
export function contactos(n, paso, ancho, alto, x0, y, z, hueco = -1, extraHueco = .25, padre) {
  const pos = [];
  for (let i = 0; i < n; i++) {
    const x = x0 + i * paso + (hueco >= 0 && i >= hueco ? extraHueco : 0);
    pos.push([x, y, z], [x, y, -z]);
  }
  return repetir(new THREE.BoxGeometry(ancho, alto, .01), M.oro, pos, padre);
}
