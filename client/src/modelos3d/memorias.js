/**
 * Memorias RAM DDR4 y DDR5 (kit de 2 módulos) con distintos estilos de disipador.
 * estilo: 'fury' (perfil bajo negro), 'spectrix' (barra RGB angular), 'dominator' (alto, aluminio, LEDs individuales)
 */
import {
  THREE, M, caja, contactos, emisivo, etiqueta, extruir, matEtiqueta, metalCepillado, pcbMat, plano, rcaja, repetir,
} from './base.js';

const LARGO = 13.33;

/** Silueta del disipador (vista frontal) según el estilo */
function silueta(estilo, alto) {
  const s = new THREE.Shape(), w = LARGO - .2, x0 = -w / 2, x1 = w / 2;
  if (estilo === 'fury') {
    // borde superior con cortes en ángulo
    s.moveTo(x0, 0); s.lineTo(x1, 0); s.lineTo(x1, alto - .5); s.lineTo(x1 - .8, alto); s.lineTo(1.6, alto);
    s.lineTo(1.0, alto - .35); s.lineTo(-3.4, alto - .35); s.lineTo(-4, alto); s.lineTo(x0 + .5, alto); s.lineTo(x0, alto - .5);
  } else if (estilo === 'spectrix') {
    s.moveTo(x0, 0); s.lineTo(x1, 0); s.lineTo(x1, alto - .3); s.lineTo(x1 - 1.2, alto); s.lineTo(x0 + 2.2, alto); s.lineTo(x0 + 1.4, alto - .55); s.lineTo(x0, alto - .55);
  } else {
    s.moveTo(x0, 0); s.lineTo(x1, 0); s.lineTo(x1, alto); s.lineTo(x0, alto);
  }
  s.closePath();
  return s;
}

/**
 * opciones: ddr 4|5, estilo, color del disipador, marca y textos de etiqueta, rgb
 */
export function memoria({ ddr = 5, estilo = 'fury', base = '#1b1e22', acento = '#e8432f', marca = 'FURY', linea = 'BEAST', detalle = 'DDR5-6000 · 16 GB', rgb = false } = {}) {
  const g = new THREE.Group(), partes = [];
  const alto = estilo === 'dominator' ? 4.6 : estilo === 'spectrix' ? 3.6 : 3.1;
  const pcbM = pcbMat('pcbRam' + ddr, ddr === 5 ? '#123a2b' : '#0f3424', [2, .5], ddr * 3);
  const dis = metalCepillado('ram' + estilo + base, base, estilo === 'dominator' ? .9 : .6, estilo === 'dominator' ? .3 : .45);
  const lbl = etiqueta(`ram:${estilo}:${marca}:${linea}:${detalle}`, 1024, 200, 'rgba(0,0,0,0)', '#e9edf0', [
    [marca, 70, 30, 66, '800'], [linea, 70, 30 + marca.length * 46, 66, '400', 'left', acento], [detalle, 34, 30, 150, '500', 'left', '#9aa6ad'],
  ]);
  lbl.premultiplyAlpha = false;
  const lblMat = new THREE.MeshStandardMaterial({ map: lbl, transparent: true, roughness: .45, metalness: .3 });
  // DDR4: muesca más hacia un lado; DDR5: casi al centro
  const hueco = ddr === 5 ? 37 : 40, n = ddr === 5 ? 72 : 76;

  [-0.62, 0.62].forEach((z) => {
    const mod = new THREE.Group(); mod.position.z = z; g.add(mod);
    caja(LARGO, 3.1, .1, pcbM, 0, -.2, 0, mod);
    contactos(n, .168, .1, .42, -6.3, -1.55, .056, hueco, .3, mod);
    for (let i = 0; i < 4; i++) caja(1.0, .62, .06, M.chip, -4.6 + i * 3.05, -1.02, .08, mod);
    if (ddr === 5) caja(.6, .4, .06, M.chip, 0, -1.05, -.08, mod); // PMIC propio de DDR5

    // disipador: dos placas extruidas con su silueta
    const s = silueta(estilo, alto);
    const placas = [];
    [1, -1].forEach((lado) => {
      const p = extruir(s, .1, dis, .03); p.position.set(0, -1.15, lado * .14); mod.add(p); placas.push(p);
    });
    // etiqueta con el nombre sobre la placa frontal
    plano(9.5, 1.85, lblMat, -.9, 1.25, .1, placas[0]);
    // franja de color de la marca
    if (estilo === 'fury') caja(4.4, .12, .02, emisivo(acento, .25), -1.2, alto - .52, .07, placas[0]);
    if (estilo === 'spectrix') caja(LARGO - 1.6, .08, .02, M.niquel, .2, .35, .07, placas[0]);

    let luz = null;
    if (estilo === 'dominator') {
      // barra superior de aluminio con LEDs individuales y aletas laterales
      const tapa = rcaja(LARGO - .1, .55, .6, .08, metalCepillado('domTop', '#9aa0a6', .95, .28), 0, alto - 1.1 + .25, 0, mod);
      repetir(new THREE.BoxGeometry(.06, .35, .62), M.grafito, Array.from({ length: 40 }, (_, i) => [-6.3 + i * .32, alto - 1.42, 0]), mod);
      luz = new THREE.Group(); luz.position.y = alto - .55; mod.add(luz);
      caja(LARGO - .6, .18, .38, M.vidrio, 0, 0, 0, luz);
      repetir(new THREE.BoxGeometry(.52, .12, .28), M.rgb, Array.from({ length: 11 }, (_, i) => [-5.6 + i * 1.12, 0, 0]), luz);
      partes.push({ obj: tapa, off: [0, 1.6, 0] }, { obj: luz, off: [0, 2.8, 0] });
    } else if (rgb) {
      // difusor RGB superior
      const forma = estilo === 'spectrix' ? [LARGO - 2.2, .55, .34, .5] : [LARGO - .8, .38, .3, 0];
      luz = rcaja(forma[0], forma[1], forma[2], .1, M.rgb, forma[3], alto - 1.15 + forma[1] / 2 + .02, 0, mod);
      partes.push({ obj: luz, off: [0, 2.2, 0] });
    } else {
      caja(LARGO - .3, .12, .34, M.negroMate, 0, alto - 1.12, 0, mod);
    }
    partes.push({ obj: placas[0], off: [0, 0, 1.4] }, { obj: placas[1], off: [0, 0, -1.4] });
  });
  g.rotation.x = -.05;
  return { g, partes };
}

export const MEMORIAS = {
  'ram-fury-beast-ddr4': { nombre: 'Kingston FURY Beast DDR4', crear: () => memoria({ ddr: 4, estilo: 'fury', base: '#16181b', acento: '#e8432f', marca: 'FURY', linea: ' BEAST', detalle: 'DDR4-3200 · 16 GB · CL16' }) },
  'ram-xpg-spectrix-d35g': { nombre: 'ADATA XPG Spectrix D35G DDR4', crear: () => memoria({ ddr: 4, estilo: 'spectrix', base: '#202429', acento: '#d8dde1', marca: 'XPG', linea: ' SPECTRIX D35G', detalle: 'DDR4-3600 · 16 GB · RGB', rgb: true }) },
  'ram-fury-beast-ddr5': { nombre: 'Kingston FURY Beast DDR5', crear: () => memoria({ ddr: 5, estilo: 'fury', base: '#16181b', acento: '#e8432f', marca: 'FURY', linea: ' BEAST', detalle: 'DDR5-6000 · 16 GB · CL30' }) },
  'ram-dominator-titanium': { nombre: 'Corsair Dominator Titanium RGB DDR5', crear: () => memoria({ ddr: 5, estilo: 'dominator', acento: '#e9edf0', marca: 'DOMINATOR', linea: ' TITANIUM', detalle: 'DDR5-6600 · 16 GB · RGB', base: '#5c636a' }) },
  'ram-ddr5-rgb': { nombre: 'Memoria DDR5 RGB', crear: () => memoria({ ddr: 5, estilo: 'fury', base: '#2b3036', acento: '#36e39a', marca: 'M&T', linea: ' VANGUARD', detalle: 'DDR5-6000 · 16 GB · RGB', rgb: true }) },
};
