import { lazy, Suspense, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { dinero } from '../lib/formato.js';
import Insignia from './Insignia.jsx';

const VisorPieza = lazy(() => import('./VisorPieza.jsx'));

/**
 * Ventana con el modelo 3D girando de un producto. Se abre al tocar la foto
 * en el catálogo. Se cierra con la X, con Esc o tocando fuera.
 */
export default function Vista3DModal({ producto, onCerrar, onAgregar }) {
  const cerrarRef = useRef(null);

  useEffect(() => {
    const antes = document.activeElement;
    cerrarRef.current?.focus();
    const tecla = (e) => { if (e.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', tecla);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', tecla);
      document.body.style.overflow = overflow;
      antes?.focus?.();
    };
  }, [onCerrar]);

  const agotado = producto.existencias <= 0;
  return (
    <div className="vista3d-fondo" onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div className="vista3d" role="dialog" aria-modal="true" aria-labelledby="vista3d-titulo">
        <header className="vista3d-cabeza">
          <div className="min-w-0">
            <span className="small text-body-secondary">{producto.categoria.nombre} · Vista 3D</span>
            <h2 id="vista3d-titulo" className="h5 mb-0 text-truncate">{producto.nombre}</h2>
          </div>
          <button ref={cerrarRef} type="button" className="btn-close" aria-label="Cerrar vista 3D" onClick={onCerrar} />
        </header>
        <Suspense fallback={<div className="visor-pieza vacio" style={{ height: 'min(60vh, 460px)' }}>Cargando modelo 3D…</div>}>
          <VisorPieza codigo={producto.modelo_codigo} alto="min(60vh, 460px)" />
        </Suspense>
        <footer className="vista3d-pie">
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <span className="precio">{dinero(producto.precio)}</span>
            <Insignia producto={producto} />
          </div>
          <div className="d-flex gap-2">
            <Link to={`/producto/${producto.slug}`} className="btn btn-outline-secondary">Ver detalles</Link>
            <button type="button" className="btn btn-mt" disabled={agotado} onClick={onAgregar}>{agotado ? 'Agotado' : 'Agregar'}</button>
          </div>
        </footer>
      </div>
    </div>
  );
}
