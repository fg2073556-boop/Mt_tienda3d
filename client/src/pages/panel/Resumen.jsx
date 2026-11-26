import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Insignia from '../../components/Insignia.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../lib/api.js';
import { dinero, ESTADOS, fecha } from '../../lib/formato.js';

export default function Resumen() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const { rol } = useAuth();

  const cargar = useCallback(() => api('/admin/resumen').then(setDatos).catch((e) => setError(e.message)), []);
  useEffect(() => { cargar(); }, [cargar]);

  const leida = async (id) => { await api(`/admin/alertas/${id}/leida`, { method: 'PATCH' }); cargar(); };
  const todas = async () => { await api('/admin/alertas/leer-todas', { method: 'POST' }); cargar(); };

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!datos) return <p className="text-body-secondary">Cargando…</p>;

  return (
    <>
      <h1 className="h2">Panel del vendedor</h1>
      <div className="row g-3 my-2">
        <Kpi titulo="Ventas de hoy" valor={dinero(datos.ventas_hoy)} />
        <Kpi titulo="Pedidos por atender" valor={datos.pedidos_abiertos} />
        <Kpi titulo="Productos con poco stock" valor={datos.stock_bajo.length} />
        <Kpi titulo="Productos en catálogo" valor={datos.productos_total} />
      </div>

      <div className="row g-3">
        <div className="col-xl-7">
          <div className="card card-body">
            <div className="d-flex justify-content-between align-items-center mb-2"><h2 className="h5 mb-0">Pedidos recientes</h2><Link to="/panel/pedidos">Ver todos</Link></div>
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead><tr><th>Pedido</th><th>Cliente</th><th>Fecha</th><th className="text-end">Total</th><th>Estado</th></tr></thead>
                <tbody>
                  {datos.pedidos_recientes.map((p) => (
                    <tr key={p.id}>
                      <td><Link to={`/panel/pedidos/${p.id}`} className="fw-semibold">{p.folio}</Link></td>
                      <td>{p.cliente_nombre}</td>
                      <td className="text-nowrap">{fecha(p.creado_en)}</td>
                      <td className="text-end text-nowrap">{dinero(p.total)}</td>
                      <td>{ESTADOS[p.estado]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-xl-5 d-flex flex-column gap-3">
          <div className="card card-body">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h2 className="h5 mb-0">Alertas de existencias</h2>
              {datos.alertas.length > 0 && <button type="button" className="btn btn-outline-secondary btn-sm" onClick={todas}>Marcar todas</button>}
            </div>
            {!datos.alertas.length && <p className="text-body-secondary mb-0">No hay alertas nuevas.</p>}
            <ul className="list-unstyled mb-0">
              {datos.alertas.map((a) => (
                <li key={a.id} className="d-flex justify-content-between align-items-center gap-2 py-2 border-bottom">
                  <span>
                    <span className={`insignia ${a.tipo === 'agotado' ? 'agotado' : 'bajo'}`}>{a.tipo === 'agotado' ? 'Agotado' : 'Bajo'}</span>{' '}
                    {a.tipo === 'agotado' ? `Se agotó: ${a.producto}` : `Quedan ${a.existencias} de ${a.producto}`}
                    <div className="small text-body-secondary">{fecha(a.creada_en)}</div>
                  </span>
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => leida(a.id)}>Leída</button>
                </li>
              ))}
            </ul>
          </div>
          <div className="card card-body">
            <div className="d-flex justify-content-between align-items-center mb-2"><h2 className="h5 mb-0">Por reabastecer</h2><Link to="/panel/reposicion">Pedir reposición</Link></div>
            {!datos.stock_bajo.length && <p className="text-body-secondary mb-0">Todo el inventario está en niveles sanos.</p>}
            <ul className="list-unstyled mb-0">
              {datos.stock_bajo.map((p) => (
                <li key={p.id} className="d-flex justify-content-between align-items-center gap-2 py-1">
                  <span><Insignia producto={p} /> {p.nombre}</span>
                  {rol === 'administrador' && <Link to={`/panel/productos/${p.id}`}>Editar</Link>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

function Kpi({ titulo, valor }) {
  return (
    <div className="col-sm-6 col-xl-3">
      <div className="card card-body kpi"><span className="small text-body-secondary">{titulo}</span><b>{valor}</b></div>
    </div>
  );
}
