import { Link, useLocation, useParams } from 'react-router-dom';
import { dinero, ESTADOS, METODOS_PAGO } from '../lib/formato.js';

export default function Gracias() {
  const { folio } = useParams();
  const pedido = useLocation().state?.pedido;

  return (
    <section className="banda">
      <div className="contenedor" style={{ maxWidth: 720 }}>
        {pedido && <span className="insignia ok">{ESTADOS[pedido.estado]}</span>}
        <h1 className="h2 mt-2">¡Gracias{pedido ? `, ${pedido.cliente_nombre}` : ''}!</h1>
        <p className="text-body-secondary">Tu pedido <b>{folio}</b> quedó registrado. Guarda este folio para dar seguimiento a tu compra.</p>
        {pedido && (
          <div className="card card-body">
            <ul className="list-unstyled mb-2">
              {pedido.detalle.map((d) => (
                <li key={d.producto_nombre} className="d-flex justify-content-between gap-2 py-1 border-bottom">
                  <span>{d.cantidad} × {d.producto_nombre}</span><span>{dinero(d.subtotal)}</span>
                </li>
              ))}
            </ul>
            <div className="d-flex justify-content-between total"><span>Total</span><span>{dinero(pedido.total)}</span></div>
            <p className="small text-body-secondary mb-0 mt-2">Forma de pago: {METODOS_PAGO[pedido.metodo_pago]}</p>
          </div>
        )}
        <Link to="/" className="btn btn-mt mt-3">Volver a la tienda</Link>
      </div>
    </section>
  );
}
