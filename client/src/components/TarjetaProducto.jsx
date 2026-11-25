import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { dinero } from '../lib/formato.js';
import { useAviso } from './Aviso.jsx';
import Icono from './Icono.jsx';
import Insignia from './Insignia.jsx';

export default function TarjetaProducto({ producto, onVer3D }) {
  const { agregar } = useCart();
  const avisar = useAviso();
  const agotado = producto.existencias <= 0;

  const alAgregar = () => {
    const error = agregar(producto);
    avisar(error || `Agregado: ${producto.nombre}`, error ? 'error' : 'ok');
  };

  return (
    <article className="card tarjeta h-100">
      <Link to={`/producto/${producto.slug}`} className="miniatura" tabIndex={-1} aria-hidden="true">
        {producto.imagen_url ? <img src={producto.imagen_url} alt="" loading="lazy" /> : <Icono producto={producto} />}
      </Link>
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
            <button type="button" className="btn btn-outline-secondary flex-fill" onClick={() => onVer3D(producto.pieza_3d)}>Ver en 3D</button>
          )}
          <button type="button" className="btn btn-mt flex-fill" disabled={agotado} onClick={alAgregar}>{agotado ? 'Agotado' : 'Agregar'}</button>
        </div>
      </div>
    </article>
  );
}
