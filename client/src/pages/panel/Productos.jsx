import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Insignia from '../../components/Insignia.jsx';
import { useAviso } from '../../components/Aviso.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../lib/api.js';
import { dinero } from '../../lib/formato.js';

export default function Productos() {
  const [productos, setProductos] = useState([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [porBorrar, setPorBorrar] = useState(null);
  const { rol } = useAuth();
  const esAdmin = rol === 'administrador';
  const avisar = useAviso();

  const cargar = useCallback(() => {
    api(`/admin/productos${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`).then(setProductos).catch((e) => setError(e.message));
  }, [q]);
  useEffect(() => { const t = setTimeout(cargar, 250); return () => clearTimeout(t); }, [cargar]);

  const ajustar = async (p, delta) => {
    try {
      const r = await api(`/admin/productos/${p.id}/existencias`, { method: 'PATCH', body: { delta } });
      if (r.alerta === 'agotado') avisar(`Se agotó: ${p.nombre}`, 'error');
      else if (r.alerta === 'bajo') avisar(`Stock bajo: quedan ${r.existencias} de ${p.nombre}`, 'error');
      cargar();
    } catch (e) { avisar(e.message, 'error'); }
  };

  const borrar = async (p) => {
    try {
      await api(`/admin/productos/${p.id}`, { method: 'DELETE' });
      avisar(`Producto eliminado: ${p.nombre}`);
      setPorBorrar(null);
      cargar();
    } catch (e) { avisar(e.message, 'error'); }
  };

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h1 className="h2 mb-0">Productos</h1>
        <div className="d-flex gap-2">
          <input type="search" className="form-control" placeholder="Buscar producto" aria-label="Buscar producto" value={q} onChange={(e) => setQ(e.target.value)} />
          {esAdmin && <Link to="/panel/productos/nuevo" className="btn btn-mt text-nowrap">Dar de alta</Link>}
        </div>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="card">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead><tr><th>Producto</th><th>Categoría</th><th className="text-end">Precio</th><th>Existencias</th><th>Estado</th>{esAdmin && <th>Acciones</th>}</tr></thead>
            <tbody>
              {productos.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="fw-semibold">{p.nombre}</div>
                    {p.pieza_3d && <div className="small text-body-secondary">Pieza 3D: {p.pieza_nombre}{p.modelo_url ? ' · con modelo .glb' : ''}</div>}
                  </td>
                  <td>{p.categoria.nombre}</td>
                  <td className="text-end text-nowrap">{dinero(p.precio)}</td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <button type="button" className="btn btn-outline-secondary btn-sm" aria-label={`Restar una unidad a ${p.nombre}`} disabled={p.existencias <= 0} onClick={() => ajustar(p, -1)}>−</button>
                      <span className={`fw-semibold ${p.existencias <= 0 ? 'text-danger' : ''}`} style={{ minWidth: 28, textAlign: 'center' }}>{p.existencias}</span>
                      <button type="button" className="btn btn-outline-secondary btn-sm" aria-label={`Sumar una unidad a ${p.nombre}`} onClick={() => ajustar(p, 1)}>+</button>
                    </div>
                  </td>
                  <td>{p.activo ? <Insignia producto={p} /> : <span className="insignia agotado">Oculto</span>}</td>
                  {esAdmin && (
                    <td>
                      <div className="d-flex gap-2">
                        <Link to={`/panel/productos/${p.id}`} className="btn btn-outline-secondary btn-sm">Editar</Link>
                        {porBorrar === p.id ? (
                          <>
                            <button type="button" className="btn btn-danger btn-sm" onClick={() => borrar(p)}>Confirmar</button>
                            <button type="button" className="btn btn-link btn-sm" onClick={() => setPorBorrar(null)}>No</button>
                          </>
                        ) : (
                          <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setPorBorrar(p.id)}>Eliminar</button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {!esAdmin && <p className="small text-body-secondary mt-2">Como vendedor puedes ajustar existencias. El alta, edición y baja de productos las hace el administrador.</p>}
    </>
  );
}
