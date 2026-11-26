import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAviso } from '../../components/Aviso.jsx';
import Icono from '../../components/Icono.jsx';
import Miniatura3D from '../../components/Miniatura3D.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../lib/api.js';
import { fecha } from '../../lib/formato.js';

const FILTROS = [
  { id: 'faltan', texto: 'Por reponer' },
  { id: 'agotado', texto: 'Agotados' },
  { id: 'todos', texto: 'Todo el inventario' },
];
const ESTADO = { agotado: 'Agotado', bajo: 'Por acabarse', ok: 'Nivel sano' };

export default function Reposicion() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('faltan');
  const [q, setQ] = useState('');
  const [pedido, setPedido] = useState({}); // id → cantidad a pedir
  const [ocupado, setOcupado] = useState('');
  const avisar = useAviso();
  const { rol } = useAuth();

  const cargar = useCallback(() => api('/admin/reposicion').then(setDatos).catch((e) => setError(e.message)), []);
  useEffect(() => { cargar(); }, [cargar]);
  // Revisa cada 30 s para ver alertas nuevas y si ya salió el correo
  useEffect(() => { const t = setInterval(cargar, 30000); return () => clearInterval(t); }, [cargar]);

  const productos = datos?.productos ?? [];
  const cuenta = useMemo(() => ({
    agotado: productos.filter((p) => p.estado === 'agotado').length,
    bajo: productos.filter((p) => p.estado === 'bajo').length,
    ok: productos.filter((p) => p.estado === 'ok').length,
  }), [productos]);

  const visibles = productos.filter((p) => {
    if (filtro === 'faltan' && p.estado === 'ok') return false;
    if (filtro === 'agotado' && p.estado !== 'agotado') return false;
    const t = q.trim().toLowerCase();
    return !t || p.nombre.toLowerCase().includes(t) || p.categoria.toLowerCase().includes(t);
  });

  const elegidos = productos.filter((p) => pedido[p.id]);
  const alternar = (p) => setPedido((s) => {
    const n = { ...s };
    if (n[p.id]) delete n[p.id]; else n[p.id] = p.sugerido || 1;
    return n;
  });
  const todosVisibles = visibles.length > 0 && visibles.every((p) => pedido[p.id]);
  const alternarTodos = () => setPedido((s) => {
    const n = { ...s };
    visibles.forEach((p) => { if (todosVisibles) delete n[p.id]; else n[p.id] = n[p.id] || p.sugerido || 1; });
    return n;
  });
  const fijarCantidad = (id, v) => setPedido((s) => ({ ...s, [id]: Math.max(1, Math.min(1000, Number(v) || 1)) }));

  const trabajar = async (clave, fn) => {
    setOcupado(clave);
    try { await fn(); } catch (e) { avisar(e.message, 'error'); } finally { setOcupado(''); }
  };

  const reponer = (items, texto) => trabajar('reponer', async () => {
    await api('/admin/reposicion/reponer', { method: 'POST', body: { items } });
    avisar(texto);
    await cargar();
  });

  const cambiarMinimo = (p, valor) => {
    const minimo = Number(valor);
    if (!Number.isInteger(minimo) || minimo < 0 || minimo === p.stock_minimo) return;
    trabajar(`min-${p.id}`, async () => {
      await api(`/admin/reposicion/productos/${p.id}/minimo`, { method: 'PATCH', body: { stock_minimo: minimo } });
      avisar(`Mínimo de ${p.nombre}: ${minimo}`);
      await cargar();
    });
  };

  const mandarCorreo = () => trabajar('correo', async () => {
    const r = await api('/admin/reposicion/correo', { method: 'POST', body: {} });
    avisar(`Reporte enviado a ${r.para}`);
  });

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!datos) return <p className="text-body-secondary">Cargando…</p>;

  const { estado, ajuste } = datos;

  return (
    <div className="reposicion">
      <header className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-3">
        <div>
          <h1 className="h2 mb-1">Reposición</h1>
          <p className="text-body-secondary mb-0">Lo que se está acabando, el aviso por correo y el pedido al proveedor.</p>
        </div>
        <button type="button" className="btn btn-outline-dark" onClick={mandarCorreo} disabled={ocupado === 'correo' || !(cuenta.agotado + cuenta.bajo)}>
          {ocupado === 'correo' ? 'Enviando…' : 'Enviar reporte por correo'}
        </button>
      </header>

      <div className="rep-kpis">
        <Kpi tono="agotado" titulo="Agotados" valor={cuenta.agotado} nota="Ya no se pueden vender" />
        <Kpi tono="bajo" titulo="Por acabarse" valor={cuenta.bajo} nota="En su mínimo o debajo" />
        <Kpi tono="ok" titulo="Nivel sano" valor={cuenta.ok} nota={`de ${productos.length} productos`} />
        <EstadoAviso estado={estado} ajuste={ajuste} />
      </div>

      <div className="rep-rejilla">
        <section className="card rep-tabla">
          <div className="rep-barra">
            <div className="d-flex flex-wrap gap-2">
              {FILTROS.map((f) => (
                <button key={f.id} type="button" className={`btn-chip ${filtro === f.id ? 'activo' : ''}`} onClick={() => setFiltro(f.id)}>
                  {f.texto}
                  <span className="rep-conteo">{f.id === 'faltan' ? cuenta.agotado + cuenta.bajo : f.id === 'agotado' ? cuenta.agotado : productos.length}</span>
                </button>
              ))}
            </div>
            <input type="search" className="form-control rep-buscar" placeholder="Buscar producto o categoría" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>

          {!visibles.length ? (
            <div className="rep-vacio">
              <b>{filtro === 'todos' || q ? 'No hay productos que coincidan.' : '¡Todo el inventario está en niveles sanos!'}</b>
              {filtro !== 'todos' && !q && <span>Cuando algo llegue a su mínimo aparecerá aquí y se mandará el aviso.</span>}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}><input type="checkbox" className="form-check-input" checked={todosVisibles} onChange={alternarTodos} aria-label="Elegir todos" /></th>
                    <th>Producto</th>
                    <th style={{ minWidth: 170 }}>Existencias</th>
                    <th className="text-center">Mínimo</th>
                    <th className="text-center">Pedir</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((p) => (
                    <tr key={p.id} className={pedido[p.id] ? 'rep-elegido' : ''}>
                      <td><input type="checkbox" className="form-check-input" checked={Boolean(pedido[p.id])} onChange={() => alternar(p)} aria-label={`Elegir ${p.nombre}`} /></td>
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          <Foto p={p} />
                          <div className="min-w-0">
                            <div className="fw-semibold rep-nombre">{p.nombre}</div>
                            <div className="small text-body-secondary">{p.categoria}</div>
                          </div>
                        </div>
                      </td>
                      <td><Nivel p={p} /></td>
                      <td className="text-center">
                        <input type="number" min="0" max="10000" className="form-control form-control-sm rep-num" defaultValue={p.stock_minimo} key={`${p.id}-${p.stock_minimo}`}
                          disabled={ocupado === `min-${p.id}`} aria-label={`Mínimo de ${p.nombre}`}
                          onBlur={(e) => cambiarMinimo(p, e.target.value)} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
                      </td>
                      <td className="text-center">
                        <input type="number" min="1" max="1000" className="form-control form-control-sm rep-num" aria-label={`Cantidad a pedir de ${p.nombre}`}
                          value={pedido[p.id] ?? (p.sugerido || '')} placeholder="—"
                          onChange={(e) => fijarCantidad(p.id, e.target.value)} />
                      </td>
                      <td className="text-end">
                        <button type="button" className="btn btn-sm btn-outline-success text-nowrap" disabled={ocupado === 'reponer'}
                          onClick={() => { const c = pedido[p.id] || p.sugerido || 1; reponer([{ id: p.id, cantidad: c }], `+${c} de ${p.nombre}`); }}>
                          + Llegaron {pedido[p.id] || p.sugerido || 1}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="d-flex flex-column gap-3">
          <PedidoProveedor elegidos={elegidos} pedido={pedido} ajuste={ajuste} estado={estado}
            onQuitar={(id) => setPedido((s) => { const n = { ...s }; delete n[id]; return n; })}
            onLlego={() => reponer(elegidos.map((p) => ({ id: p.id, cantidad: pedido[p.id] })), `Se registró la llegada de ${elegidos.length} producto${elegidos.length === 1 ? '' : 's'}`).then(() => setPedido({}))}
            ocupado={ocupado} />
          <Ajustes ajuste={ajuste} estado={estado} editable={rol === 'administrador'} onGuardado={cargar} />
          <Historial historial={datos.historial} />
        </aside>
      </div>
    </div>
  );
}

function Kpi({ tono, titulo, valor, nota }) {
  return (
    <div className={`card card-body rep-kpi ${tono}`}>
      <span className="rep-kpi-titulo">{titulo}</span>
      <b>{valor}</b>
      <span className="small text-body-secondary">{nota}</span>
    </div>
  );
}

function canal({ activo, destino, listo, falta, error }) {
  if (!activo) return { tono: 'apagado', texto: 'Apagado' };
  if (!destino) return { tono: 'falta', texto: 'Falta el destino en Ajustes' };
  if (!listo) return { tono: 'falta', texto: falta };
  if (error) return { tono: 'falta', texto: error };
  return { tono: 'ok', texto: 'Activo' };
}

function EstadoAviso({ estado, ajuste }) {
  const correo = canal({ activo: ajuste.aviso_automatico, destino: ajuste.correo_destino, listo: estado.correo, falta: 'Falta SMTP_USER y SMTP_PASS en server/.env', error: estado.ultimo_error });
  const whats = canal({ activo: ajuste.whatsapp_automatico, destino: ajuste.proveedor_whatsapp, listo: estado.whatsapp, falta: estado.whatsapp_falta, error: estado.error_whatsapp });
  const tono = correo.tono === 'ok' || whats.tono === 'ok' ? 'ok' : correo.tono === 'falta' || whats.tono === 'falta' ? 'falta' : 'apagado';
  return (
    <div className={`card card-body rep-kpi aviso-${tono}`}>
      <span className="rep-kpi-titulo"><span className="rep-punto" />Avisos automáticos</span>
      <ul className="rep-canales">
        <li className={correo.tono} title={correo.texto}><b>Correo</b><span>{correo.texto}</span></li>
        <li className={whats.tono} title={whats.texto}><b>WhatsApp</b><span>{whats.texto}</span></li>
      </ul>
    </div>
  );
}

function Foto({ p }) {
  const respaldo = <span className="rep-icono"><Icono producto={{ pieza_3d: p.pieza_3d, categoria: { slug: p.categoria_slug } }} /></span>;
  return (
    <div className="rep-foto">
      {p.imagen ? <img src={`/uploads/${p.imagen}`} alt="" loading="lazy" />
        : p.modelo_codigo ? <Miniatura3D codigo={p.modelo_codigo} alt="" respaldo={respaldo} /> : respaldo}
    </div>
  );
}

/** Barra de existencias: se llena hasta el doble del mínimo (nivel sano) */
function Nivel({ p }) {
  const meta = Math.max(p.stock_minimo * 2, 1);
  const pct = Math.min(100, Math.round((p.existencias / meta) * 100));
  const marca = Math.min(100, Math.round((p.stock_minimo / meta) * 100));
  return (
    <div className={`rep-nivel ${p.estado}`}>
      <div className="d-flex justify-content-between small mb-1">
        <span className="fw-semibold">{p.existencias} {p.existencias === 1 ? 'pza' : 'pzas'}</span>
        <span className="text-body-secondary">{ESTADO[p.estado]}</span>
      </div>
      <div className="rep-barra-nivel" role="img" aria-label={`${p.existencias} de un nivel sano de ${meta}`}>
        <span style={{ width: `${pct}%` }} />
        <i style={{ left: `${marca}%` }} title={`Mínimo: ${p.stock_minimo}`} />
      </div>
    </div>
  );
}

function PedidoProveedor({ elegidos, pedido, ajuste, estado, onQuitar, onLlego, ocupado }) {
  const [borrador, setBorrador] = useState(null); // { mensaje, url, conIA, aviso }
  const [cargando, setCargando] = useState(false);
  const avisar = useAviso();
  const firma = elegidos.map((p) => `${p.id}:${pedido[p.id]}`).join(',');
  useEffect(() => { setBorrador(null); }, [firma]);

  const redactar = async (ia = true) => {
    setCargando(true);
    try {
      const r = await api('/admin/reposicion/mensaje', { method: 'POST', body: { items: elegidos.map((p) => ({ id: p.id, cantidad: pedido[p.id] })), ia } });
      setBorrador(r);
      if (r.aviso) avisar(r.aviso, 'error');
    } catch (e) { avisar(e.message, 'error'); } finally { setCargando(false); }
  };
  const [enviando, setEnviando] = useState(false);
  const enviarDirecto = async () => {
    setEnviando(true);
    try {
      await api('/admin/reposicion/whatsapp', { method: 'POST', body: { items: elegidos.map((p) => ({ id: p.id, cantidad: pedido[p.id] })), mensaje: borrador.mensaje } });
      avisar(`Pedido enviado por WhatsApp a ${ajuste.proveedor_nombre || 'el proveedor'}`);
    } catch (e) { avisar(e.message, 'error'); } finally { setEnviando(false); }
  };
  const telefono = ajuste.proveedor_whatsapp;
  const url = borrador ? `https://wa.me/${telefono || ''}?text=${encodeURIComponent(borrador.mensaje)}` : null;
  const copiar = async () => {
    try { await navigator.clipboard.writeText(borrador.mensaje); avisar('Mensaje copiado'); } catch { avisar('No se pudo copiar', 'error'); }
  };

  return (
    <section className="card card-body rep-pedido">
      <div className="d-flex justify-content-between align-items-start gap-2">
        <div>
          <h2 className="h5 mb-0">Pedido al proveedor</h2>
          <span className="small text-body-secondary">{ajuste.proveedor_nombre || 'Proveedor sin nombre'}{telefono ? ` · +${telefono}` : ' · sin WhatsApp guardado'}</span>
        </div>
        <span className="rep-whats" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.3-.4.8-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.2-.2-.5-.3Z" /></svg>
        </span>
      </div>

      {!elegidos.length ? (
        <p className="rep-ayuda">Marca en la tabla los productos que quieres pedir. La cantidad sugerida deja cada uno en el doble de su mínimo.</p>
      ) : (
        <>
          <ul className="rep-lista">
            {elegidos.map((p) => (
              <li key={p.id}>
                <b>{pedido[p.id]} ×</b> <span className="text-truncate">{p.nombre}</span>
                <button type="button" className="btn-close btn-sm ms-auto" aria-label={`Quitar ${p.nombre}`} onClick={() => onQuitar(p.id)} />
              </li>
            ))}
          </ul>

          {!borrador ? (
            <div className="d-grid gap-2">
              <button type="button" className="btn btn-mt" onClick={() => redactar(true)} disabled={cargando}>
                {cargando ? <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />Redactando…</> : estado.ia ? 'Redactar mensaje con Gemini' : 'Preparar mensaje'}
              </button>
              {!estado.ia && <span className="small text-body-secondary">Sin GEMINI_API_KEY se usa un mensaje base.</span>}
            </div>
          ) : (
            <div className="d-grid gap-2">
              <label className="small fw-semibold d-flex justify-content-between" htmlFor="rep-mensaje">
                Mensaje (puedes editarlo)
                <span className={`rep-etiqueta ${borrador.conIA ? 'ia' : ''}`}>{borrador.conIA ? 'Redactado con Gemini' : 'Mensaje base'}</span>
              </label>
              <textarea id="rep-mensaje" className="form-control rep-texto" rows={8} value={borrador.mensaje}
                onChange={(e) => setBorrador({ ...borrador, mensaje: e.target.value })} />
              {estado.whatsapp && telefono ? (
                <>
                  <button type="button" className="btn btn-whats" onClick={enviarDirecto} disabled={enviando}>
                    {enviando ? <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />Enviando…</> : 'Enviar por WhatsApp ahora'}
                  </button>
                  <a className="small text-center" href={url} target="_blank" rel="noopener noreferrer">o abrirlo en WhatsApp y enviarlo yo</a>
                </>
              ) : (
                <a className="btn btn-whats" href={url} target="_blank" rel="noopener noreferrer">
                  {telefono ? 'Abrir en WhatsApp' : 'Abrir WhatsApp y elegir contacto'}
                </a>
              )}
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-outline-secondary btn-sm flex-fill" onClick={copiar}>Copiar</button>
                <button type="button" className="btn btn-outline-secondary btn-sm flex-fill" onClick={() => redactar(true)} disabled={cargando}>{cargando ? 'Redactando…' : 'Otra versión'}</button>
              </div>
            </div>
          )}

          <button type="button" className="btn btn-outline-success btn-sm" onClick={onLlego} disabled={ocupado === 'reponer'}>
            Ya llegó: sumar al inventario
          </button>
        </>
      )}
    </section>
  );
}

function Ajustes({ ajuste, estado, editable, onGuardado }) {
  const [f, setF] = useState(ajuste);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const avisar = useAviso();
  useEffect(() => { setF(ajuste); }, [ajuste]);
  const cambio = (k) => (e) => { setError(''); setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }); };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await api('/admin/reposicion/ajuste', { method: 'PUT', body: f });
      avisar('Ajustes de avisos guardados');
      onGuardado();
    } catch (err) { setError(err.message); } finally { setGuardando(false); }
  };

  return (
    <form className="card card-body rep-ajustes" onSubmit={guardar}>
      <h2 className="h6 mb-2">Ajustes de avisos</h2>
      <fieldset disabled={!editable || guardando} className="d-grid gap-2">
        <div className="form-check form-switch">
          <input id="rep-auto" className="form-check-input" type="checkbox" role="switch" checked={Boolean(f.aviso_automatico)} onChange={cambio('aviso_automatico')} />
          <label className="form-check-label" htmlFor="rep-auto">Mandar correo cuando algo se esté acabando</label>
        </div>
        <label className="small fw-semibold">Correo(s) que reciben el aviso
          <input className="form-control form-control-sm mt-1" placeholder="compras@ejemplo.com, gerente@ejemplo.com" value={f.correo_destino ?? ''} onChange={cambio('correo_destino')} />
        </label>
        <label className="small fw-semibold">Proveedor
          <input className="form-control form-control-sm mt-1" placeholder="Nombre del proveedor" value={f.proveedor_nombre ?? ''} onChange={cambio('proveedor_nombre')} />
        </label>
        <label className="small fw-semibold">WhatsApp del proveedor
          <input className="form-control form-control-sm mt-1" inputMode="tel" placeholder="10 dígitos, p. ej. 2221234567" value={f.proveedor_whatsapp ?? ''} onChange={cambio('proveedor_whatsapp')} />
        </label>
        <div className="form-check form-switch">
          <input id="rep-whats-auto" className="form-check-input" type="checkbox" role="switch" checked={Boolean(f.whatsapp_automatico)} onChange={cambio('whatsapp_automatico')} />
          <label className="form-check-label" htmlFor="rep-whats-auto">Pedirle por WhatsApp al proveedor cuando algo se acabe</label>
        </div>
        {error && <div className="alert alert-danger py-2 small mb-0">{error}</div>}
        {editable && <button className="btn btn-dark btn-sm">{guardando ? 'Guardando…' : 'Guardar ajustes'}</button>}
      </fieldset>
      {!editable && <p className="small text-body-secondary mb-0 mt-2">Solo el administrador puede cambiar estos datos.</p>}
      {!estado.correo && (
        <p className="small rep-nota mb-0 mt-2">Para que salgan los correos, el servidor necesita <code>SMTP_USER</code> y <code>SMTP_PASS</code> en <code>server/.env</code>.</p>
      )}
      {!estado.whatsapp && (
        <p className="small rep-nota mb-0 mt-2">Para el WhatsApp automático: {estado.whatsapp_falta} Mientras tanto, el pedido se abre en WhatsApp para que tú lo envíes.</p>
      )}
    </form>
  );
}

function Historial({ historial }) {
  if (!historial.length) return null;
  return (
    <section className="card card-body">
      <h2 className="h6 mb-2">Últimas alertas</h2>
      <ul className="list-unstyled mb-0 rep-historial">
        {historial.map((a) => (
          <li key={a.id}>
            <span className={`insignia ${a.tipo === 'agotado' ? 'agotado' : 'bajo'}`}>{a.tipo === 'agotado' ? 'Agotado' : 'Bajo'}</span>
            <span className="flex-fill min-w-0">
              <span className="d-block text-truncate">{a.producto}</span>
              <span className="small text-body-secondary">{fecha(a.creada_en)} · {a.notificada_en ? 'avisado' : 'aviso pendiente'}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
