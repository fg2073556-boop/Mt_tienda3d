import { lazy, Suspense, useState } from 'react';
import Miniatura3D from '../components/Miniatura3D.jsx';
import { GRUPOS_MODELOS } from '../modelos3d/lista.js';

const VisorPieza = lazy(() => import('../components/VisorPieza.jsx'));

/** Todas las piezas 3D hechas con código, para explorarlas o presentarlas en la demo */
export default function Galeria3D() {
  const [codigo, setCodigo] = useState(GRUPOS_MODELOS[0][1][0][0]);
  const nombre = GRUPOS_MODELOS.flatMap(([, l]) => l).find(([c]) => c === codigo)?.[1];

  return (
    <section className="banda">
      <div className="contenedor">
        <h1 className="h3">Galería de piezas en 3D</h1>
        <p className="text-body-secondary">Cada pieza está construida con código (three.js), sin archivos de modelo. Gírala, acércala y desármala.</p>
        <div className="row g-4">
          <div className="col-lg-7 order-lg-2">
            <div className="visor-fijo">
              <h2 className="h5">{nombre}</h2>
              <Suspense fallback={<div className="visor-pieza vacio" style={{ height: 460 }}>Cargando visor…</div>}>
                <VisorPieza codigo={codigo} alto={460} />
              </Suspense>
            </div>
          </div>
          <div className="col-lg-5 order-lg-1">
            {GRUPOS_MODELOS.map(([grupo, lista]) => (
              <div key={grupo} className="mb-3">
                <h2 className="h6 text-body-secondary">{grupo}</h2>
                <div className="rejilla-galeria">
                  {lista.map(([c, n]) => (
                    <button key={c} type="button" className={`pieza-galeria${c === codigo ? ' activa' : ''}`} onClick={() => setCodigo(c)} aria-pressed={c === codigo}>
                      <Miniatura3D codigo={c} alt="" respaldo={<span className="small">3D</span>} />
                      <span>{n}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
