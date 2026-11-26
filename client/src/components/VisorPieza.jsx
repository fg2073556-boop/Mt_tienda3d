import { useEffect, useRef, useState } from 'react';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { crearEscenario, crearRenderer } from '../modelos3d/escenario.js';
import { desarmar, liberar } from '../modelos3d/index.js';

/**
 * Visor de un modelo 3D hecho con código: se gira con el mouse o el dedo,
 * se acerca con la rueda o pellizcando y se desarma con el control deslizante.
 */
export default function VisorPieza({ codigo, alto = 420 }) {
  const cajaRef = useRef(null);
  const canvasRef = useRef(null);
  const motor = useRef(null);
  const reducir = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [giro, setGiro] = useState(!reducir);
  const [separar, setSeparar] = useState(0);
  const [sinWebGL, setSinWebGL] = useState(false);
  const giroRef = useRef(giro);
  giroRef.current = giro;
  const sepRef = useRef(0);
  sepRef.current = separar;

  useEffect(() => {
    let R;
    try { R = crearRenderer({ canvas: canvasRef.current }); } catch { setSinWebGL(true); return undefined; }
    const esc = crearEscenario(R);
    const ctrl = new OrbitControls(esc.C, canvasRef.current);
    ctrl.enableDamping = true; ctrl.enablePan = false; ctrl.maxPolarAngle = Math.PI * .49;
    ctrl.addEventListener('start', () => setGiro(false));
    motor.current = { R, esc, ctrl, t: 0 };

    const ajustar = () => {
      const w = cajaRef.current.clientWidth, h = cajaRef.current.clientHeight;
      R.setSize(w, h, false); esc.C.aspect = w / h; esc.C.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(ajustar); ro.observe(cajaRef.current); ajustar();

    let id, antes = performance.now();
    const bucle = (ahora) => {
      const dt = Math.min(.05, (ahora - antes) / 1000); antes = ahora;
      const m = motor.current;
      // la separación se anima suavemente hacia el valor del control
      m.t += (sepRef.current - m.t) * Math.min(1, dt * 8);
      if (esc.actual) desarmar(esc.actual, m.t);
      if (giroRef.current) esc.actual?.g.rotateY(dt * .35);
      esc.animar(reducir ? 0 : dt);
      ctrl.update();
      R.render(esc.S, esc.C);
      id = requestAnimationFrame(bucle);
    };
    id = requestAnimationFrame(bucle);
    return () => { cancelAnimationFrame(id); ro.disconnect(); ctrl.dispose(); liberar(esc.actual); R.dispose(); motor.current = null; };
  }, [reducir]);

  // carga el modelo cuando cambia el código
  useEffect(() => {
    const m = motor.current;
    if (!m) return;
    liberar(m.esc.actual);
    const modelo = m.esc.mostrar(codigo);
    if (modelo) m.esc.encuadrar(modelo, m.ctrl, cajaRef.current.clientWidth / cajaRef.current.clientHeight);
    m.t = 0; setSeparar(0);
  }, [codigo]);

  if (sinWebGL) return <div className="visor-pieza vacio" style={{ height: alto }}>Tu navegador no puede mostrar 3D.</div>;
  return (
    <div className="visor-pieza">
      <div ref={cajaRef} className="visor-lienzo" style={{ height: alto }}>
        <canvas ref={canvasRef} aria-label="Modelo 3D. Arrastra para girarlo, usa la rueda para acercarlo." />
      </div>
      <div className="visor-controles">
        <label className="flex-grow-1 small">
          Desarmar pieza
          <input type="range" className="form-range" min="0" max="1" step="0.01" value={separar} onChange={(e) => setSeparar(Number(e.target.value))} />
        </label>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setGiro((g) => !g)} aria-pressed={giro}>
          {giro ? 'Pausar giro' : 'Girar solo'}
        </button>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => {
          const m = motor.current; if (!m?.esc.actual) return;
          m.esc.actual.g.rotation.set(0, 0, 0); m.esc.encuadrar(m.esc.actual, m.ctrl, cajaRef.current.clientWidth / cajaRef.current.clientHeight); setSeparar(0);
        }}>Centrar</button>
      </div>
    </div>
  );
}
