/**
 * Escenario de estudio fotográfico: reflejos de un cuarto virtual, luz principal con sombra suave
 * y piso que solo muestra la sombra. Lo usan el visor y las miniaturas.
 */
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { THREE, rgbTex } from './base.js';
import { construirModelo } from './index.js';

export function crearRenderer(opciones = {}) {
  const R = new THREE.WebGLRenderer({ antialias: true, alpha: true, ...opciones });
  R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  R.outputColorSpace = THREE.SRGBColorSpace;
  R.toneMapping = THREE.ACESFilmicToneMapping;
  R.toneMappingExposure = 1.05;
  R.useLegacyLights = false;
  R.shadowMap.enabled = true;
  R.shadowMap.type = THREE.PCFSoftShadowMap;
  return R;
}

export function crearEscenario(R) {
  const S = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(R);
  S.environment = pm.fromScene(new RoomEnvironment(), .04).texture;
  pm.dispose();
  const C = new THREE.PerspectiveCamera(35, 1, .1, 500);
  const sol = new THREE.DirectionalLight(0xffffff, 2.2);
  sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048); sol.shadow.bias = -.0004; sol.shadow.radius = 4;
  S.add(sol, sol.target);
  const contra = new THREE.DirectionalLight(0x7fe9c0, .9); S.add(contra);
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: .35 }));
  piso.rotation.x = -Math.PI / 2; piso.receiveShadow = true; S.add(piso);
  let actual = null;

  /** Cambia el modelo que se muestra y ajusta sombra y piso a su tamaño */
  function mostrar(codigo) {
    if (actual) S.remove(actual.g);
    actual = construirModelo(codigo);
    if (!actual) return null;
    S.add(actual.g);
    const r = actual.radio * 1.6;
    Object.assign(sol.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: .1, far: r * 6 });
    sol.shadow.camera.updateProjectionMatrix();
    sol.position.set(actual.radio * .9, actual.radio * 2.2, actual.radio * 1.3);
    contra.position.set(-actual.radio * 1.3, actual.radio * .7, -actual.radio);
    piso.scale.setScalar(actual.radio * 12);
    return actual;
  }

  /** Coloca la cámara para que el modelo llene el cuadro */
  function encuadrar(m, ctrl, aspecto = 1) {
    const ajuste = aspecto < 1 ? 1 / aspecto : 1;
    const d = (m.radio / Math.sin((C.fov * Math.PI / 180) / 2)) * .95 * ajuste;
    C.position.set(d * .55, m.altura * .5 + d * .45, d * .75);
    C.near = d / 100; C.far = d * 20; C.updateProjectionMatrix();
    if (ctrl) {
      ctrl.target.set(0, m.altura * .45, 0); ctrl.minDistance = d * .3; ctrl.maxDistance = d * 2.2; ctrl.update();
    } else C.lookAt(0, m.altura * .45, 0);
  }

  /** Avanza las animaciones: aspas girando y luz RGB recorriendo el degradado */
  function animar(dt) {
    rgbTex.offset.x = (rgbTex.offset.x + dt * .15) % 1;
    actual?.giran.forEach((o) => { o.rotation.z -= dt * 6; });
  }

  return { S, C, mostrar, encuadrar, animar, get actual() { return actual; } };
}
