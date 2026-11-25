import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../lib/api.js';
import { dinero, ESTADOS, fecha, METODOS_PAGO } from '../lib/formato.js';

const PASOS = ['pagado', 'preparacion', 'enviado', 'entregado'];

/** El cliente consulta el estado de su pedido con su folio y su correo */
export default function Seguimiento() {
  const inicial = useLocation().state?.folio || '';
  const [folio, setFolio] = useState(inicial);
  const [correo, setCorreo] = useState('');
  const [pedido, setPedido] = useState(null);
  const [error, setError] = useState('');
  const [buscando, setBuscando] = useState(false);

  const buscar = async (e) => {
    e.preventDefault();
    if (!folio.trim() || !correo.trim()) return setError('Escribe el folio y el correo que usaste al comprar.');
    setBuscando(true);
    setPedido(null);
    try {
      setPedido(await api('/pedidos/seguimiento', { method: 'POST', body: { folio, correo } }));
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBuscando(false);
    }
  };

  // "Pendiente" (pago en tienda o transferencia) cuenta como el primer paso
  const actual = pedido ? Math.max(0, PASOS.indexOf(pedido.estado === 'pendiente' ? 'pagado' : pedido.estado)) : -1;

  return (
    <section className="banda">
      <div className="contenedor" style={{ maxWidth: 760 }}>
        <h1 className="h2">Consulta tu pedido</h1>
        <form className="card card-body gap-3 mt-3" onSubmit={buscar} noValidate>
          <div className="row g-3">
            <div className="col-sm-5"><label className="form-label w-100">Folio<input className="form-control" placeholder="MT-00005" value={folio} onChange={(e) => { setFolio(e.target.value); setError(''); }} /></label></div>
            <div className="col-sm-7"><label className="form-label w-100">Correo con el que compraste<input type="email" className="form-control" autoComplete="email" value={correo} onChange={(e) => { setCorreo(e.target.value); setError(''); }} /></label></div>
          </div>
          {error && <div className="alert alert-warning mb-0">{error}</div>}
          <button className="btn btn-mt align-self-start" disabled={buscando}>{buscando ? 'Buscando…' : 'Consultar'}</button>
        </form>

        {pedido && (
          <div className="card card-body mt-3 gap-3">
            <div className="d-flex justify-content-between flex-wrap gap-2">
              <h2 className="h4 mb-0">Pedido {pedido.folio}</h2>
              <span className="text-body-secondary small">Comprado el {fecha(pedido.creado_en)}</span>
            </div>
            {pedido.estado === 'cancelado' ? (
              <div className="alert alert-danger mb-0">Este pedido fue cancelado. Si tienes dudas, comunícate con la tienda.</div>
            ) : (
              <ol className="pasos" aria-label="Avance del pedido">
                {PASOS.map((p, i) => (
                  <li key={p} className={i <= actual ? 'hecho' : ''} aria-current={i === actual ? 'step' : undefined}>
                    {p === 'pagado' && pedido.estado === 'pendiente' ? 'Pendiente de pago' : ESTADOS[p]}
                  </li>
                ))}
              </ol>
            )}
            <ul className="list-unstyled mb-0">
              {pedido.detalle.map((d) => (
                <li key={d.producto_nombre} className="d-flex justify-content-between gap-2 py-1 border-bottom">
                  <span>{d.cantidad} × {d.producto_nombre}</span><span className="text-nowrap">{dinero(d.subtotal)}</span>
                </li>
              ))}
            </ul>
            <div className="d-flex justify-content-between total"><span>Total</span><span>{dinero(pedido.total)}</span></div>
            <p className="small text-body-secondary mb-0">Forma de pago: {METODOS_PAGO[pedido.metodo_pago]} · Última actualización: {fecha(pedido.actualizado_en)}</p>
          </div>
        )}
      </div>
    </section>
  );
}
