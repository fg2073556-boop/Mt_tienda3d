import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { dinero } from '../lib/formato.js';

export default function Carrito() {
  const { items, cambiar, quitar, total } = useCart();

  return (
    <section className="banda">
      <div className="contenedor">
        <h1 className="h2">Tu carrito</h1>
        {!items.length ? (
          <div className="card card-body mt-3 gap-3 align-items-start">
            <p className="mb-0">Tu carrito está vacío. Toca una pieza en la escena 3D o agrega productos desde el catálogo.</p>
            <Link to="/" className="btn btn-mt">Ir a la tienda</Link>
          </div>
        ) : (
          <div className="row g-3 mt-1">
            <div className="col-lg-8">
              <div className="card">
                <ul className="list-group list-group-flush">
                  {items.map((i) => (
                    <li key={i.id} className="list-group-item d-flex flex-wrap gap-3 align-items-center">
                      <div className="flex-grow-1">
                        <Link to={`/producto/${i.slug}`} className="fw-semibold">{i.nombre}</Link>
                        <div className="small text-body-secondary">{dinero(i.precio)} c/u · {i.existencias} en existencia</div>
                      </div>
                      <input type="number" className="form-control" style={{ width: 90 }} min={0} max={i.existencias} value={i.cantidad}
                        aria-label={`Cantidad de ${i.nombre}`} onChange={(e) => cambiar(i.id, Number(e.target.value) || 0)} />
                      <span className="precio text-end" style={{ minWidth: 100 }}>{dinero(i.precio * i.cantidad)}</span>
                      <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => quitar(i.id)}>Quitar</button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="card card-body gap-2">
                <div className="d-flex justify-content-between total"><span>Total</span><span>{dinero(total)}</span></div>
                <p className="small text-body-secondary mb-1">IVA incluido · Envío gratis en Tepeaca y alrededores</p>
                <Link to="/pagar" className="btn btn-mt">Continuar al pago</Link>
                <Link to="/" className="btn btn-outline-secondary">Seguir comprando</Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
