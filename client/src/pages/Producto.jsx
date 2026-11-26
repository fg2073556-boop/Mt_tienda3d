import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Icono from '../components/Icono.jsx';
import Insignia from '../components/Insignia.jsx';
import { useAviso } from '../components/Aviso.jsx';
import { useCart } from '../context/CartContext.jsx';
import { api } from '../lib/api.js';
import { dinero } from '../lib/formato.js';

const VisorPieza = lazy(() => import('../components/VisorPieza.jsx'));

// Visor 3D de Google con realidad aumentada; se carga solo si el producto tiene modelo
const MODEL_VIEWER = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js';
function cargarModelViewer() {
  if (document.querySelector(`script[src="${MODEL_VIEWER}"]`)) return;
  const s = document.createElement('script');
  s.type = 'module';
  s.src = MODEL_VIEWER;
  document.head.append(s);
}

export default function Producto() {
  const { slug } = useParams();
  const [producto, setProducto] = useState(null);
  const [error, setError] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [verFoto, setVerFoto] = useState(false);
  const { agregar } = useCart();
  const avisar = useAviso();

  useEffect(() => {
    setProducto(null);
    setError('');
    setVerFoto(false);
    api(`/productos/${slug}`)
      .then((p) => { setProducto(p); if (p.modelo_url) cargarModelViewer(); })
      .catch((e) => setError(e.message));
  }, [slug]);

  if (error) return <div className="contenedor banda"><div className="alert alert-warning">{error}</div><Link to="/">Volver a la tienda</Link></div>;
  if (!producto) return <div className="contenedor banda text-body-secondary">Cargando…</div>;

  const agotado = producto.existencias <= 0;
  return (
    <section className="banda">
      <div className="contenedor">
        <p className="small"><Link to="/">Tienda</Link> / {producto.categoria.nombre}</p>
        <div className="row g-4 align-items-start">
          <div className="col-md-6">
            {producto.modelo_codigo && !producto.modelo_url && !verFoto ? (
              <Suspense fallback={<div className="visor-pieza vacio" style={{ height: 420 }}>Cargando modelo 3D…</div>}>
                <VisorPieza codigo={producto.modelo_codigo} />
              </Suspense>
            ) : (
              <div className="foto-grande">
                {producto.modelo_url ? (
                  <model-viewer src={producto.modelo_url} alt={`Modelo 3D de ${producto.nombre}`} camera-controls="" auto-rotate="" ar="" ar-modes="webxr scene-viewer quick-look" shadow-intensity="1" />
                ) : producto.imagen_url ? <img src={producto.imagen_url} alt={producto.nombre} /> : <Icono producto={producto} />}
              </div>
            )}
            {producto.modelo_codigo && !producto.modelo_url && producto.imagen_url && (
              <div className="vista-foto" role="group" aria-label="Vista del producto">
                <button type="button" className={`btn btn-sm ${verFoto ? 'btn-outline-secondary' : 'btn-mt'}`} onClick={() => setVerFoto(false)} aria-pressed={!verFoto}>Modelo 3D</button>
                <button type="button" className={`btn btn-sm ${verFoto ? 'btn-mt' : 'btn-outline-secondary'}`} onClick={() => setVerFoto(true)} aria-pressed={verFoto}>Foto</button>
              </div>
            )}
            {producto.modelo_url && <p className="small text-body-secondary mt-2">Gira el modelo con el dedo o el mouse. En celular, toca el ícono de realidad aumentada para verlo en tu espacio.</p>}
            {producto.modelo_codigo && !producto.modelo_url && !verFoto && <p className="small text-body-secondary mt-2">Arrastra para girar, usa la rueda o pellizca para acercar y mueve el control para ver la pieza por dentro. Representación ilustrativa.</p>}
          </div>
          <div className="col-md-6 d-flex flex-column gap-3">
            <span className="text-body-secondary">{producto.categoria.nombre}</span>
            <h1 className="h2">{producto.nombre}</h1>
            <p className="text-body-secondary">{producto.descripcion}</p>
            <div className="d-flex align-items-center gap-3"><span className="precio grande">{dinero(producto.precio)}</span><Insignia producto={producto} /></div>
            <div className="d-flex gap-2 align-items-end flex-wrap">
              <label className="form-label mb-0">Cantidad
                <input type="number" className="form-control" style={{ width: 100 }} min={1} max={Math.max(1, producto.existencias)} value={cantidad}
                  disabled={agotado} onChange={(e) => setCantidad(Math.max(1, Number(e.target.value) || 1))} />
              </label>
              <button type="button" className="btn btn-mt" disabled={agotado}
                onClick={() => { const e = agregar(producto, cantidad); avisar(e || `Agregado: ${producto.nombre}`, e ? 'error' : 'ok'); }}>
                {agotado ? 'Agotado' : 'Agregar al carrito'}
              </button>
            </div>
            {producto.especificaciones?.length > 0 && (
              <div>
                <h2 className="h6 mt-2">Especificaciones</h2>
                <table className="table table-sm tabla-specs mb-0">
                  <tbody>{producto.especificaciones.map(([k, v]) => <tr key={k}><th scope="row">{k}</th><td>{v}</td></tr>)}</tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
