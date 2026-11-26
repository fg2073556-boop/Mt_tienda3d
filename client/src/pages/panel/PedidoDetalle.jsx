import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAviso } from '../../components/Aviso.jsx';
import DetalleEnvio, { envioDePedido } from '../../components/DetalleEnvio.jsx';
import { api } from '../../lib/api.js';
import { dinero, ESTADOS, fecha, METODOS_PAGO } from '../../lib/formato.js';

const ESTADO_PAGO = { completed: 'Pagado', in_progress: 'Esperando pago', cancelled: 'Vencido o cancelado', failed: 'Falló', refunded: 'Reembolsado', charge_pending: 'Pendiente' };

export default function PedidoDetalle() {
  const { id } = useParams();
  const [pedido, setPedido] = useState(null);
  const [estado, setEstado] = useState('');
  const [error, setError] = useState('');
  const avisar = useAviso();

  const cargar = useCallback(() => api(`/admin/pedidos/${id}`).then((p) => { setPedido(p); setEstado(p.estado); }).catch((e) => setError(e.message)), [id]);
  useEffect(() => { cargar(); }, [cargar]);

  const [revisando, setRevisando] = useState(false);
  const revisarPago = async () => {
    setRevisando(true);
    try {
      const r = await api(`/admin/pedidos/${id}/revisar-pago`, { method: 'POST' });
      avisar(r?.estado === 'pagado' ? `${pedido.folio}: pago confirmado` : `Openpay: el pago sigue ${r?.pago_estado === 'in_progress' ? 'pendiente' : r?.pago_estado}`);
      cargar();
    } catch (err) { avisar(err.message, 'error'); } finally { setRevisando(false); }
  };

  const guardar = async (e) => {
    e.preventDefault();
    try {
      await api(`/admin/pedidos/${id}/estado`, { method: 'PATCH', body: { estado } });
      avisar(`${pedido.folio}: ${ESTADOS[estado]}`);
      cargar();
    } catch (err) {
      avisar(err.message, 'error');
    }
  };

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!pedido) return <p className="text-body-secondary">Cargando…</p>;
  const cancelado = pedido.estado === 'cancelado';

  return (
    <>
      <p className="small"><Link to="/panel/pedidos">Pedidos</Link> / {pedido.folio}</p>
      <h1 className="h2">Pedido {pedido.folio}</h1>
      <div className="row g-3 mt-1">
        <div className="col-lg-7">
          <div className="card card-body">
            <h2 className="h5">Artículos</h2>
            <ul className="list-unstyled mb-2">
              {pedido.detalle.map((d) => (
                <li key={d.id} className="d-flex justify-content-between gap-2 py-2 border-bottom">
                  <span>{d.producto_nombre}<div className="small text-body-secondary">{d.cantidad} × {dinero(d.precio_unitario)}</div></span>
                  <b className="text-nowrap">{dinero(d.subtotal)}</b>
                </li>
              ))}
            </ul>
            <div className="my-2"><DetalleEnvio envio={envioDePedido(pedido)} /></div>
            <div className="d-flex justify-content-between total"><span>Total</span><span>{dinero(pedido.total)}</span></div>
          </div>
        </div>
        <div className="col-lg-5">
          <form className="card card-body gap-2" onSubmit={guardar}>
            <h2 className="h5">Estado</h2>
            <div className="d-flex gap-2">
              <select className="form-select" value={estado} disabled={cancelado} aria-label="Estado del pedido" onChange={(e) => setEstado(e.target.value)}>
                {Object.entries(ESTADOS).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
              </select>
              <button className="btn btn-mt" disabled={cancelado || estado === pedido.estado}>Guardar</button>
            </div>
            <p className="small text-body-secondary">Al cancelar, las piezas regresan al inventario.</p>
            <h2 className="h5 mt-2">Cliente</h2>
            <p className="mb-1">{pedido.cliente_nombre}<br />{pedido.cliente_correo}<br />{pedido.cliente_telefono}</p>
            <p className="small text-body-secondary mb-0">{pedido.direccion}</p>
            <p className="small text-body-secondary mb-0">Pago: {METODOS_PAGO[pedido.metodo_pago]} · {fecha(pedido.creado_en)}</p>
            {pedido.pago_id && (
              <div className="pago-panel">
                <div className="d-flex justify-content-between align-items-center gap-2">
                  <b>Openpay</b>
                  <span className={`insignia ${pedido.pago_estado === 'completed' ? 'ok' : pedido.pago_estado === 'in_progress' ? 'bajo' : 'agotado'}`}>{ESTADO_PAGO[pedido.pago_estado] || pedido.pago_estado}</span>
                </div>
                <div className="small text-body-secondary">Cargo {pedido.pago_id}{pedido.pagado_en ? ` · pagado el ${fecha(pedido.pagado_en)}` : ''}</div>
                {pedido.pago_datos?.tarjeta && <div className="small">Tarjeta {pedido.pago_datos.tarjeta.marca} terminación {pedido.pago_datos.tarjeta.ultimos4}{pedido.pago_datos.autorizacion ? ` · autorización ${pedido.pago_datos.autorizacion}` : ''}</div>}
                {pedido.pago_datos?.clabe && <div className="small">CLABE {pedido.pago_datos.clabe} · referencia {pedido.pago_datos.referencia}</div>}
                {!pedido.pago_datos?.clabe && pedido.pago_datos?.referencia && <div className="small">Referencia {pedido.pago_datos.referencia}</div>}
                {pedido.estado === 'pendiente' && (
                  <button type="button" className="btn btn-sm btn-outline-secondary mt-1" onClick={revisarPago} disabled={revisando}>{revisando ? 'Consultando…' : 'Revisar pago con Openpay'}</button>
                )}
              </div>
            )}
          </form>
        </div>
      </div>
    </>
  );
}
