import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { dinero } from '../lib/formato.js';
import { useAgregar } from '../lib/useAgregar.js';
import Icono from './Icono.jsx';
import Insignia from './Insignia.jsx';
import Miniatura3D from './Miniatura3D.jsx';
import Vista3DModal from './Vista3DModal.jsx';

export default function TarjetaProducto({ producto, onVer3D }) {
  const agregar = useAgregar();
  const agotado = producto.existencias <= 0;
  const [ver3D, setVer3D] = useState(false);
  const cerrar3D = useCallback(() => setVer3D(false), []);

  const alAgregar = () => agregar(producto);

  return (
    <article className="card tarjeta h-100">
      {producto.modelo_codigo ? (
        // Foto (o miniatura 3D) como vista principal; al tocarla se abre el modelo 3D girando
        <button type="button" className={`miniatura con-3d ${producto.imagen_url ? 'con-foto' : ''}`} onClick={() => setVer3D(true)}
          aria-label={`Ver ${producto.nombre} en 3D`}>
          {producto.imagen_url ? <img src={producto.imagen_url} alt="" loading="lazy" />
            : <Miniatura3D codigo={producto.modelo_codigo} alt="" respaldo={<Icono producto={producto} />} />}
          <span className="chip-3d" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m12 12 8-4.5M12 12v9M12 12 4 7.5" /></svg>
            Ver en 3D
          </span>
        </button>
      ) : (
        <Link to={`/producto/${producto.slug}`} className={`miniatura ${producto.imagen_url ? 'con-foto' : ''}`} tabIndex={-1} aria-hidden="true">
          {producto.imagen_url ? <img src={producto.imagen_url} alt="" loading="lazy" /> : <Icono producto={producto} />}
        </Link>
      )}
      <div className="card-body d-flex flex-column gap-1">
        <span className="small text-body-secondary">{producto.categoria.nombre}</span>
        <h3 className="h6 mb-1"><Link to={`/producto/${producto.slug}`} className="link-body-emphasis text-decoration-none">{producto.nombre}</Link></h3>
        <p className="small text-body-secondary mb-2">{producto.descripcion}</p>
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-auto">
          <span className="precio">{dinero(producto.precio)}</span>
          <Insignia producto={producto} />
        </div>
        <div className="d-flex gap-2 mt-2">
          {producto.pieza_3d && onVer3D && (
            <button type="button" className="btn btn-outline-secondary flex-fill" onClick={() => onVer3D(producto.pieza_3d)} title="Mostrar dónde va en el escritorio 3D de arriba">Ubicar</button>
          )}
          <button type="button" className="btn btn-mt flex-fill" disabled={agotado} onClick={alAgregar}>{agotado ? 'Agotado' : 'Agregar'}</button>
        </div>
      </div>
      {ver3D && <Vista3DModal producto={producto} onCerrar={cerrar3D} onAgregar={alAgregar} />}
    </article>
  );
}
