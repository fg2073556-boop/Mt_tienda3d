/**
 * Miniaturas de los modelos para el catálogo: un solo renderer oculto dibuja cada pieza una vez
 * y guarda la imagen; las tarjetas reciben la imagen en lugar de abrir su propio WebGL.
 *
 * Es a prueba de fallas: si una pieza da error no detiene a las demás, y si el navegador
 * apaga el contexto de WebGL (pasa al abrir muchos visores), se crea uno nuevo y se reintenta.
 */
import { crearEscenario, crearRenderer } from './escenario.js';
import { liberar } from './index.js';

const listas = new Map(); // codigo -> Promise<string>
// Las imágenes se guardan en el navegador para que la próxima visita salgan al instante.
// Sube este número cuando cambies algún modelo para que se vuelvan a dibujar.
const VERSION = 3;
const CLAVE = `mt-miniaturas-v${VERSION}`;
let guardadas = {};
try { guardadas = JSON.parse(localStorage.getItem(CLAVE) || '{}'); } catch { guardadas = {}; }
function guardar(codigo, url) {
  guardadas[codigo] = url;
  try {
    localStorage.setItem(CLAVE, JSON.stringify(guardadas));
    Object.keys(localStorage).filter((k) => k.startsWith('mt-miniaturas-') && k !== CLAVE).forEach((k) => localStorage.removeItem(k));
  } catch { /* sin espacio o modo privado: se quedan solo en memoria */ }
}
let motor = null;
let cola = Promise.resolve();

function iniciar() {
  if (motor && !motor.perdido) return motor;
  if (motor?.R) { try { motor.R.dispose(); } catch { /* ya estaba perdido */ } }
  try {
    const R = crearRenderer({ preserveDrawingBuffer: true });
    R.setPixelRatio(1);
    R.setSize(440, 330, false);
    const esc = crearEscenario(R);
    esc.C.aspect = 4 / 3; esc.C.updateProjectionMatrix();
    const m = { R, esc, perdido: false };
    R.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); m.perdido = true; });
    motor = m;
  } catch {
    motor = { error: true };
  }
  return motor;
}

/** Dibuja una pieza y regresa su imagen; lanza error si algo falla */
function dibujar(codigo) {
  const m = iniciar();
  if (m.error) throw new Error('Sin WebGL');
  const modelo = m.esc.mostrar(codigo);
  if (!modelo) throw new Error('Modelo desconocido');
  try {
    m.esc.encuadrar(modelo, null, 4 / 3);
    m.R.render(m.esc.S, m.esc.C);
    if (m.perdido || m.R.getContext().isContextLost()) throw Object.assign(new Error('Contexto perdido'), { perdido: true });
    return m.R.domElement.toDataURL('image/webp', .85);
  } finally {
    liberar(modelo);
  }
}

const enUnMomentoLibre = () => new Promise((ok) => (window.requestIdleCallback || ((f) => setTimeout(f, 16)))(ok, { timeout: 400 }));

/** Devuelve (y recuerda) la imagen de un modelo. Rechaza si no se pudo dibujar. */
export function miniatura(codigo) {
  if (listas.has(codigo)) return listas.get(codigo);
  if (guardadas[codigo]) {
    const lista = Promise.resolve(guardadas[codigo]);
    listas.set(codigo, lista);
    return lista;
  }
  const p = cola.then(async () => {
    for (let intento = 1; ; intento++) {
      await enUnMomentoLibre();
      try {
        const url = dibujar(codigo);
        guardar(codigo, url);
        return url;
      } catch (error) {
        // si se perdió el contexto, se crea otro renderer y se intenta una vez más
        if (intento < 2 && (error.perdido || motor?.perdido)) { if (motor) motor.perdido = true; continue; }
        throw error;
      }
    }
  });
  cola = p.catch(() => {}); // una pieza con error no detiene a las siguientes
  listas.set(codigo, p);
  p.catch(() => listas.delete(codigo)); // la próxima vez se vuelve a intentar
  return p;
}
