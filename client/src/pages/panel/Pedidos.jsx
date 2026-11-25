import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAviso } from '../../components/Aviso.jsx';
import { api } from '../../lib/api.js';
import { dinero, ESTADOS, fecha } from '../../lib/formato.js';

export default function Pedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [estado, setEstado] = useState('');
  const [error, setError] = useState('');
  const avisar = useAviso();

  const cargar = useCallback(() => {
    api(`/admin/pedidos${estado ? `?estado=${estado}` : ''}`).then(setPedidos).catch((e) => setError(e.message));
  }, [estado]);
  useEffect(() => { cargar(); }, [cargar]);

  const cambiarEstado = async (p, nuevo) => {
    try {
      await api(`/admin/pedidos/${p.id}/estado`, { method: 'PATCH', body: { estado: nuevo } });
      avisar(`${p.folio}: ${ESTADOS[nuevo]}`);
    } catch (e) {
      avisar(e.message, 'error');
    }
    cargar();
  };

  return (
    <>
      <h1 className="h2">Pedidos</h1>
      <div className="d-flex flex-wrap gap-2 my-3" role="group" aria-label="Filtrar por estado">
        <button type="button" className={`btn btn-chip${!estado ? ' activo' : ''}`} onClick={() => setEstado('')}>Todos</button>
        {Object.entries(ESTADOS).map(([k, t]) => (
          <button key={k} type="button" className={`btn btn-chip${estado === k ? ' activo' : ''}`} onClick={() => setEstado(k)}>{t}</button>
        ))}
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="card">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead><tr><th>Pedido</th><th>Cliente</th><th>Fecha</th><th>Artículos</th><th className="text-end">Total</th><th>Estado</th></tr></thead>
            <tbody>
              {pedidos.map((p) => (
                <tr key={p.id}>
                  <td><Link to={`/panel/pedidos/${p.id}`} className="fw-semibold">{p.folio}</Link></td>
                  <td>{p.cliente_nombre}</td>
                  <td className="text-nowrap">{fecha(p.creado_en)}</td>
                  <td>{p.articulos}</td>
                  <td className="text-end text-nowrap">{dinero(p.total)}</td>
                  <td>
                    <select className="form-select form-select-sm" style={{ minWidth: 160 }} aria-label={`Estado de ${p.folio}`}
                      value={p.estado} disabled={p.estado === 'cancelado'} onChange={(e) => cambiarEstado(p, e.target.value)}>
                      {Object.entries(ESTADOS).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {!pedidos.length && <tr><td colSpan={6} className="text-body-secondary">No hay pedidos con ese estado.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <p className="small text-body-secondary mt-2">Al cancelar un pedido, las piezas regresan al inventario.</p>
    </>
  );
}
