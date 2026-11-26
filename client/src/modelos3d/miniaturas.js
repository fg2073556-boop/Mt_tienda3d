/**
 * Miniaturas de los modelos para el catálogo: un solo renderer oculto dibuja cada pieza una vez
 * y guarda la imagen; las tarjetas reciben la imagen en lugar de abrir su propio WebGL.
 */
import { crearEscenario, crearRenderer } from './escenario.js';
import { liberar } from './index.js';

const listas = new Map(); // codigo -> Promise<string>
let motor = null;
let cola = Promise.resolve();

function iniciar() {
  if (motor) return motor;
  try {
    const R = crearRenderer({ preserveDrawingBuffer: true });
    R.setPixelRatio(1);
    R.setSize(560, 420, false);
    const esc = crearEscenario(R);
    esc.C.aspect = 4 / 3; esc.C.updateProjectionMatrix();
    motor = { R, esc };
  } catch {
    motor = { error: true };
  }
  return motor;
}

/** Devuelve (y recuerda) la imagen de un modelo. Rechaza si el navegador no tiene WebGL. */
export function miniatura(codigo) {
  if (listas.has(codigo)) return listas.get(codigo);
  const p = cola.then(() => new Promise((ok, mal) => {
    // se dibuja en un momento libre para no trabar el desplazamiento
    const hacer = () => {
      const m = iniciar();
      if (m.error) return mal(new Error('Sin WebGL'));
      const modelo = m.esc.mostrar(codigo);
      if (!modelo) return mal(new Error('Modelo desconocido'));
      m.esc.encuadrar(modelo, null, 4 / 3);
      m.R.render(m.esc.S, m.esc.C);
      const url = m.R.domElement.toDataURL('image/webp', .9);
      liberar(modelo);
      ok(url);
    };
    (window.requestIdleCallback || ((f) => setTimeout(f, 16)))(hacer, { timeout: 400 });
  }));
  cola = p.catch(() => {});
  listas.set(codigo, p);
  return p;
}
