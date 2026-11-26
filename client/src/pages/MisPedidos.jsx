import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AvancePedido, { mensajeDeEstado } from '../components/AvancePedido.jsx';
import DetalleEnvio, { envioDePedido } from '../components/DetalleEnvio.jsx';
import InstruccionesPago from '../components/InstruccionesPago.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';
import { dinero, ESTADOS, fecha, METODOS_PAGO } from '../lib/formato.js';

/** Los pedidos de la cuenta con sesión */
export default function MisPedidos() {
  const { usuario } = useAuth();
  const [pedidos, setPedidos] = useState(null);
  const [error, setError] = useState('');
  const [abierto, setAbierto] = useState(null);

  useEffect(() => {
    api('/mis-pedidos').then((p) => { setPedidos(p); setAbierto(p[0]?.folio ?? null); }).catch((e) => setError(e.message));
  }, []);

  return (
    <section className="banda">
      <div className="contenedor" style={{ maxWidth: 900 }}>
        <h1 className="h2 mb-1">Mis pedidos</h1>
        <p className="text-body-secondary">Hola, {usuario.nombre.split(' ')[0]}. Aquí ves el estado de tus compras, su envío y tus referencias de pago.</p>
        {error && <div className="alert alert-danger">{error}</div>}
        {!pedidos && !error && <p className="text-body-secondary">Cargando…</p>}
        {pedidos?.length === 0 && (
          <div className="card card-body text-center gap-2 py-5">
            <b>Todavía no tienes pedidos.</b>
            <span className="text-body-secondary">Cuando compres algo, aquí podrás seguirlo hasta tu casa.</span>
            <Link to="/" className="btn btn-mt align-self-center mt-2">Ir a la tienda</Link>
          </div>
        )}
        <div className="d-grid gap-3">
          {pedidos?.map((p) => {
            const abiertoAqui = abierto === p.folio;
            return (
              <article key={p.folio} className={`card mis-pedido ${abiertoAqui ? 'abierto' : ''}`}>
                <button type="button" className="mis-pedido-cabeza" aria-expanded={abiertoAqui} onClick={() => setAbierto(abiertoAqui ? null : p.folio)}>
                  <span>
                    <b>Pedido {p.folio}</b>
                    <small>{fecha(p.creado_en)} · {p.detalle.reduce((s, d) => s + d.cantidad, 0)} artículo(s)</small>
                  </span>
                  <span className={`insignia ${p.estado === 'cancelado' ? 'agotado' : p.estado === 'pendiente' ? 'bajo' : 'ok'}`}>
                    {p.estado === 'pendiente' ? 'Pendiente de pago' : ESTADOS[p.estado]}
                  </span>
                  <b className="precio">{dinero(p.total)}</b>
                </button>
                {abiertoAqui && (
                  <div className="card-body pt-0 d-grid gap-3">
                    {p.estado !== 'cancelado' && (
                      <div className="rastreo-avance">
                        <AvancePedido estado={p.estado} />
                        <p className={`rastreo-mensaje ${p.estado === 'pendiente' ? 'espera' : ''}`}>{mensajeDeEstado(p.estado)}</p>
                      </div>
                    )}
                    {p.estado !== 'cancelado' && p.pago_datos && (
                      <InstruccionesPago metodo={p.metodo_pago} estado={p.estado} total={p.total} pago={{ estado: p.pago_estado, datos: p.pago_datos }} />
                    )}
                    <ul className="list-unstyled mb-0">
                      {p.detalle.map((d) => (
                        <li key={d.producto_nombre} className="d-flex justify-content-between gap-2 py-1 border-bottom">
                          <span>{d.cantidad} × {d.producto_nombre}</span><span className="text-nowrap">{dinero(d.subtotal)}</span>
                        </li>
                      ))}
                    </ul>
                    <DetalleEnvio envio={envioDePedido(p)} />
                    <p className="small text-body-secondary mb-0">Forma de pago: {METODOS_PAGO[p.metodo_pago]} · Última actualización: {fecha(p.actualizado_en)}</p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
