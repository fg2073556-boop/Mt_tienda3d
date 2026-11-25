import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAviso } from '../../components/Aviso.jsx';
import { api } from '../../lib/api.js';

const VACIO = { nombre: '', categoria_id: '', descripcion: '', precio: '', existencias: '0', stock_minimo: '2', pieza_3d: '', activo: true };

export default function ProductoForm() {
  const { id } = useParams();
  const editando = Boolean(id);
  const [datos, setDatos] = useState(VACIO);
  const [actual, setActual] = useState(null);
  const [catalogos, setCatalogos] = useState({ categorias: [], piezas: {} });
  const [imagen, setImagen] = useState(null);
  const [modelo, setModelo] = useState(null);
  const [quitar, setQuitar] = useState({ imagen: false, modelo: false });
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [ia, setIa] = useState({ activa: false, cargando: '', error: '', ficha: null, resultado: null });
  const navigate = useNavigate();
  const avisar = useAviso();

  useEffect(() => {
    api('/admin/ia/estado').then((e) => setIa((x) => ({ ...x, activa: e.activa }))).catch(() => {});
    api('/admin/catalogos').then((c) => {
      setCatalogos(c);
      if (!editando) setDatos((d) => ({ ...d, categoria_id: d.categoria_id || String(c.categorias[0]?.id || '') }));
    }).catch((e) => setError(e.message));
    if (editando) {
      api('/admin/productos').then((lista) => {
        const p = lista.find((x) => String(x.id) === id);
        if (!p) return setError('El producto no existe.');
        setActual(p);
        setDatos({
          nombre: p.nombre, categoria_id: String(p.categoria.id), descripcion: p.descripcion || '', precio: String(p.precio),
          existencias: String(p.existencias), stock_minimo: String(p.stock_minimo), pieza_3d: p.pieza_3d || '', activo: p.activo,
        });
      }).catch((e) => setError(e.message));
    }
  }, [id, editando]);

  const campo = (k) => ({ value: datos[k], onChange: (e) => { setDatos({ ...datos, [k]: e.target.value }); setError(''); } });

  /* ---------- IA: crear descripción y analizar ficha técnica ---------- */
  const categoriaNombre = () => catalogos.categorias.find((c) => String(c.id) === String(datos.categoria_id))?.nombre || '';

  const generarDescripcion = async () => {
    if (datos.nombre.trim().length < 3) return setIa({ ...ia, error: 'Escribe primero el nombre del producto.' });
    setIa({ ...ia, cargando: 'descripcion', error: '' });
    try {
      const r = await api('/admin/ia/descripcion', { method: 'POST', body: { nombre: datos.nombre, categoria: categoriaNombre(), notas: datos.descripcion } });
      setDatos((d) => ({ ...d, descripcion: r.descripcion }));
      setIa((x) => ({ ...x, cargando: '' }));
    } catch (err) {
      setIa((x) => ({ ...x, cargando: '', error: err.message }));
    }
  };

  const resumirFicha = async () => {
    if (!ia.ficha) return setIa({ ...ia, error: 'Elige primero el PDF de la ficha técnica.' });
    const form = new FormData();
    form.append('ficha', ia.ficha);
    setIa({ ...ia, cargando: 'ficha', error: '', resultado: null });
    try {
      const r = await api('/admin/ia/resumir-ficha', { method: 'POST', form });
      setIa((x) => ({ ...x, cargando: '', resultado: r }));
    } catch (err) {
      setIa((x) => ({ ...x, cargando: '', error: err.message }));
    }
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (datos.nombre.trim().length < 3) return setError('El nombre necesita al menos 3 letras.');
    if (!(Number(datos.precio) > 0)) return setError('Pon un precio mayor a cero.');
    if (!Number.isInteger(Number(datos.existencias)) || Number(datos.existencias) < 0 || datos.existencias === '') return setError('Las existencias deben ser un número entero desde 0.');

    // Se manda como FormData porque puede llevar foto y modelo 3D
    const form = new FormData();
    Object.entries(datos).forEach(([k, v]) => form.append(k, v));
    if (imagen) form.append('imagen', imagen);
    if (modelo) form.append('modelo', modelo);
    if (quitar.imagen) form.append('quitar_imagen', 'true');
    if (quitar.modelo) form.append('quitar_modelo', 'true');

    setGuardando(true);
    try {
      await api(editando ? `/admin/productos/${id}` : '/admin/productos', { method: editando ? 'PUT' : 'POST', form });
      avisar(editando ? `Producto actualizado: ${datos.nombre}` : `Producto dado de alta: ${datos.nombre}`);
      navigate('/panel/productos');
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <p className="small"><Link to="/panel/productos">Productos</Link> / {editando ? actual?.nombre || '…' : 'Nuevo'}</p>
      <h1 className="h2">{editando ? 'Editar producto' : 'Dar de alta un producto'}</h1>
      <form className="card card-body gap-3 mt-3" style={{ maxWidth: 880 }} onSubmit={guardar} noValidate>
        <div className="row g-3">
          <div className="col-12"><label className="form-label w-100">Nombre<input className="form-control" {...campo('nombre')} /></label></div>
          <div className="col-md-6">
            <label className="form-label w-100">Categoría
              <select className="form-select" {...campo('categoria_id')}>
                {catalogos.categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </label>
          </div>
          <div className="col-md-6"><label className="form-label w-100">Precio (MXN)<input type="number" min="1" step="0.01" className="form-control" {...campo('precio')} /></label></div>
          <div className="col-md-6"><label className="form-label w-100">Existencias<input type="number" min="0" step="1" className="form-control" {...campo('existencias')} /></label></div>
          <div className="col-md-6"><label className="form-label w-100">Avisar cuando queden<input type="number" min="0" step="1" className="form-control" {...campo('stock_minimo')} /></label></div>
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-end gap-2 flex-wrap">
              <label className="form-label mb-1" htmlFor="descripcion">Descripción</label>
              <button type="button" className="btn btn-outline-success btn-sm" disabled={!ia.activa || Boolean(ia.cargando)} onClick={generarDescripcion}
                title={ia.activa ? 'Redacta la descripción con Gemini usando el nombre y lo que ya escribiste' : 'Agrega GEMINI_API_KEY en server/.env'}>
                {ia.cargando === 'descripcion' ? 'Escribiendo…' : 'Redactar con IA'}
              </button>
            </div>
            <textarea id="descripcion" rows={3} className="form-control" {...campo('descripcion')} />
          </div>
          <div className="col-12">
            <div className="caja-ia">
              <div className="fw-semibold">Analizar ficha técnica con IA</div>
              <p className="small text-body-secondary mb-2">Sube el PDF del fabricante y Gemini lo explica en lenguaje sencillo, con sus especificaciones clave.</p>
              <div className="d-flex gap-2 flex-wrap">
                <input type="file" accept="application/pdf" className="form-control" style={{ maxWidth: 360 }} aria-label="Ficha técnica en PDF"
                  onChange={(e) => setIa({ ...ia, ficha: e.target.files[0] || null, error: '' })} />
                <button type="button" className="btn btn-outline-success" disabled={!ia.activa || Boolean(ia.cargando)} onClick={resumirFicha}>
                  {ia.cargando === 'ficha' ? 'Analizando…' : 'Analizar PDF'}
                </button>
              </div>
              {!ia.activa && <p className="small text-body-secondary mt-2 mb-0">Para usar la IA, agrega tu llave en <code>GEMINI_API_KEY</code> dentro de <code>server/.env</code> y reinicia el servidor.</p>}
              {ia.error && <div className="text-danger small mt-2">{ia.error}</div>}
              {ia.resultado && (
                <div className="mt-3">
                  {ia.resultado.producto && <div className="small text-body-secondary">{ia.resultado.producto}</div>}
                  <p className="mb-2">{ia.resultado.resumen}</p>
                  {ia.resultado.especificaciones.length > 0 && (
                    <table className="table table-sm mb-2">
                      <tbody>{ia.resultado.especificaciones.map((e) => <tr key={e.nombre}><th className="fw-normal text-body-secondary">{e.nombre}</th><td>{e.valor}</td></tr>)}</tbody>
                    </table>
                  )}
                  <button type="button" className="btn btn-mt btn-sm" onClick={() => setDatos((d) => ({ ...d, descripcion: ia.resultado.descripcion_tienda || ia.resultado.resumen }))}>
                    Usar como descripción
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="col-md-6">
            <label className="form-label w-100">Foto<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="form-control" onChange={(e) => setImagen(e.target.files[0] || null)} /></label>
            {actual?.imagen_url && (
              <div className="d-flex align-items-center gap-2 mt-2">
                <img src={actual.imagen_url} alt="" style={{ width: 96, height: 72, objectFit: 'cover', borderRadius: 8 }} />
                <label className="form-check"><input type="checkbox" className="form-check-input" checked={quitar.imagen} onChange={(e) => setQuitar({ ...quitar, imagen: e.target.checked })} /> Quitar foto</label>
              </div>
            )}
          </div>
          <div className="col-md-6">
            <label className="form-label w-100">Pieza en la escena 3D
              <select className="form-select" {...campo('pieza_3d')}>
                <option value="">Ninguna</option>
                {Object.entries(catalogos.piezas).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
              </select>
            </label>
          </div>
          <div className="col-md-6">
            <label className="form-label w-100">Modelo 3D (.glb, máximo 20 MB)<input type="file" accept=".glb" className="form-control" onChange={(e) => setModelo(e.target.files[0] || null)} /></label>
            {actual?.modelo_url && (
              <label className="form-check mt-2"><input type="checkbox" className="form-check-input" checked={quitar.modelo} onChange={(e) => setQuitar({ ...quitar, modelo: e.target.checked })} /> Quitar el modelo 3D actual</label>
            )}
          </div>
          <div className="col-12">
            <label className="form-check"><input type="checkbox" className="form-check-input" checked={datos.activo} onChange={(e) => setDatos({ ...datos, activo: e.target.checked })} /> Visible en la tienda</label>
          </div>
        </div>
        <p className="small text-body-secondary mb-0">Si eliges una pieza 3D y subes un modelo .glb, la escena de la tienda muestra ese modelo en lugar de la pieza dibujada, y la ficha del producto permite verlo en realidad aumentada.</p>
        {error && <div className="alert alert-danger mb-0">{error}</div>}
        <div className="d-flex gap-2">
          <button className="btn btn-mt" disabled={guardando}>{guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Dar de alta'}</button>
          <Link to="/panel/productos" className="btn btn-outline-secondary">Cancelar</Link>
        </div>
      </form>
    </>
  );
}
