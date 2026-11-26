/**
 * Catálogo de modelos 3D hechos con código. Cada producto guarda su `modelo_codigo`
 * (por ejemplo "gpu-rtx-5060-ti") y aquí se busca la función que lo construye.
 */
import { THREE } from './base.js';
import { PROCESADORES } from './procesadores.js';
import { MEMORIAS } from './memorias.js';
import { PLACAS } from './placas.js';
import { COMPONENTES } from './componentes.js';
import { EQUIPOS } from './equipos.js';
import { GRUPOS_MODELOS } from './lista.js';

export const MODELOS = { ...PROCESADORES, ...MEMORIAS, ...PLACAS, ...COMPONENTES, ...EQUIPOS };
export { GRUPOS_MODELOS };

/** Construye el modelo, lo centra sobre el piso y ajusta reflejos de plásticos */
export function construirModelo(codigo) {
  const def = MODELOS[codigo];
  if (!def) return null;
  const m = def.crear();
  const caja = new THREE.Box3().setFromObject(m.g);
  const c = caja.getCenter(new THREE.Vector3());
  const raiz = new THREE.Group();
  m.g.position.sub(new THREE.Vector3(c.x, caja.min.y, c.z));
  raiz.add(m.g);
  m.partes.forEach((p) => { p.base = p.obj.position.clone(); p.offV = new THREE.Vector3(...p.off); });
  const giran = [];
  raiz.traverse((o) => {
    if (o.userData.gira) giran.push(o);
    if (!o.isMesh) return;
    [].concat(o.material).forEach((mat) => {
      if (mat.userData.ajustado) return;
      mat.userData.ajustado = true;
      mat.envMapIntensity = mat.emissiveMap ? 1 : mat.metalness >= .5 ? 1 : .32;
    });
  });
  const tam = caja.getSize(new THREE.Vector3());
  const modelo = { g: raiz, partes: m.partes, giran, radio: Math.max(tam.x, tam.y, tam.z) * .62, altura: tam.y, nombre: def.nombre, factor: 1 };
  // cuánto crece al desarmarse, para encogerlo y que no se salga del cuadro
  desarmar(modelo, 1);
  const tamX = new THREE.Box3().setFromObject(raiz).getSize(new THREE.Vector3());
  modelo.factor = Math.max(1, Math.max(tamX.x, tamX.y, tamX.z) / Math.max(tam.x, tam.y, tam.z));
  desarmar(modelo, 0);
  return modelo;
}

/** Separa las piezas: t = 0 (armado) a 1 (desarmado) */
export function desarmar(m, t) {
  m.partes.forEach((p) => p.obj.position.copy(p.base).addScaledVector(p.offV, t));
  m.g.scale.setScalar(1 / (1 + (m.factor - 1) * t * .85));
}

/** Libera la memoria de la GPU de un modelo que ya no se usa (las texturas compartidas se quedan) */
export function liberar(m) {
  m?.g.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
}
