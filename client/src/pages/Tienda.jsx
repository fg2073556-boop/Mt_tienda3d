import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Escena3D, { NOMBRES } from '../components/Escena3D.jsx';
import TarjetaProducto from '../components/TarjetaProducto.jsx';
import Insignia from '../components/Insignia.jsx';
import { useAviso } from '../components/Aviso.jsx';
import { useCart } from '../context/CartContext.jsx';
import { api } from '../lib/api.js';
import { dinero } from '../lib/formato.js';

export default function Tienda() {
  const [piezas, setPiezas] = useState({});
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [categoria, setCategoria] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [sel, setSel] = useState(null);
  const [error, setError] = useState('');
  const escenaRef = useRef(null);

  useEffect(() => {
    api('/piezas').then(setPiezas).catch((e) => setError(e.message));
    api('/categorias').then(setCategorias).catch(() => {});
  }, []);

  // Busca con una pequeña espera para no consultar en cada tecla
  useEffect(() => {
    const t = setTimeout(() => {
      const qs = new URLSearchParams({ ...(categoria && { categoria }), ...(busqueda.trim() && { q: busqueda.trim() }) });
      api(`/productos?${qs}`).then(setProductos).catch((e) => setError(e.message));
    }, 250);
    return () => clearTimeout(t);
  }, [categoria, busqueda]);

  const verEn3D = (pieza) => {
    setSel(pieza);
    escenaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <>
      <section className="banda escenario">
        <div className="contenedor">
          <h1>Ve tu PC por dentro antes de comprarla</h1>
          <p className="intro">Equipo, software y mobiliario para estudiantes, ingenieros y empresas de la región. Gira la escena, desarma la torre y toca cualquier pieza para ver precio y existencias.</p>
          {error && <div className="alert alert-danger mt-3">{error}</div>}
          <div className="rejilla-escena" ref={escenaRef}>
            <Escena3D piezas={piezas} seleccion={sel} onSeleccion={setSel} />
            <Ficha pieza={sel} producto={sel && piezas[sel]} disponibles={piezas} onElegir={setSel} />
          </div>
        </div>
      </section>

      <section className="banda" id="catalogo">
        <div className="contenedor">
          <h2>Catálogo</h2>
          <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center my-3">
            <div className="d-flex flex-wrap gap-2" role="group" aria-label="Categorías">
              <button type="button" className={`btn btn-chip${!categoria ? ' activo' : ''}`} onClick={() => setCategoria('')}>Todos</button>
              {categorias.map((c) => (
                <button key={c.id} type="button" className={`btn btn-chip${categoria === c.slug ? ' activo' : ''}`} onClick={() => setCategoria(c.slug)}>{c.nombre}</button>
              ))}
            </div>
            <input type="search" className="form-control buscador" placeholder="Buscar producto" aria-label="Buscar producto" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          <div className="rejilla-productos">
            {productos.map((p) => <TarjetaProducto key={p.id} producto={p} onVer3D={verEn3D} />)}
          </div>
          {!productos.length && !error && <p className="text-body-secondary">No hay productos con ese filtro.</p>}
        </div>
      </section>

      <Asesor />
    </>
  );
}

function Ficha({ pieza, producto, disponibles, onElegir }) {
  const { agregar } = useCart();
  const avisar = useAviso();
  const chips = (
    <div className="d-flex flex-wrap gap-1">
      {Object.keys(NOMBRES).filter((k) => disponibles[k]).map((k) => (
        <button key={k} type="button" className={`btn btn-chip oscuro${k === pieza ? ' activo' : ''}`} onClick={() => onElegir(k)}>{NOMBRES[k]}</button>
      ))}
    </div>
  );

  if (!producto) {
    return (
      <aside className="ficha" aria-live="polite">
        <span className="etiqueta">Showroom M&amp;T</span>
        <h3>{pieza ? 'Por ahora no está en el catálogo' : 'Toca una pieza'}</h3>
        {!pieza && <p>Cada parte de la escena es un producto del catálogo, con su precio y existencias al momento.</p>}
        {chips}
      </aside>
    );
  }

  const agotado = producto.existencias <= 0;
  return (
    <aside className="ficha" aria-live="polite">
      <span className="etiqueta">{producto.pieza_nombre}</span>
      <h3>{producto.nombre}</h3>
      <p>{producto.descripcion}</p>
      <div className="d-flex justify-content-between align-items-center"><span className="precio grande">{dinero(producto.precio)}</span><Insignia producto={producto} /></div>
      <button type="button" className="btn btn-mt" disabled={agotado} onClick={() => { const e = agregar(producto); avisar(e || `Agregado: ${producto.nombre}`, e ? 'error' : 'ok'); }}>
        {agotado ? 'Agotado' : 'Agregar al carrito'}
      </button>
      <Link to={`/producto/${producto.slug}`} className="link-menta">Ver ficha completa</Link>
      {chips}
    </aside>
  );
}

function Asesor() {
  const [necesidad, setNecesidad] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const { agregar } = useCart();
  const avisar = useAviso();

  const enviar = async (e) => {
    e.preventDefault();
    if (necesidad.trim().length < 4) return setError('Escribe para qué usarás el equipo.');
    setCargando(true);
    try {
      setResultado(await api('/asesor', { method: 'POST', body: { necesidad } }));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const agregarTodo = () => {
    const fallas = resultado.productos.map((p) => agregar(p)).filter(Boolean);
    avisar(fallas.length ? fallas.join(' ') : 'Se agregó la solución completa al carrito.', fallas.length ? 'error' : 'ok');
  };

  return (
    <section className="banda bg-body-tertiary border-top border-bottom">
      <div className="contenedor">
        <h2>Asesor M&amp;T</h2>
        <p className="text-body-secondary">Cuéntale para qué quieres la computadora y te arma la solución completa con lo que hay en existencia.</p>
        <div className="row g-3">
          <div className="col-lg-6">
            <form className="card card-body gap-2" onSubmit={enviar} noValidate>
              <div className="d-flex gap-2 flex-wrap">
                <input className="form-control flex-grow-1" style={{ minWidth: 220 }} maxLength={300} placeholder="Ej. estudio ingeniería civil y uso AutoCAD"
                  aria-label="Para qué usarás tu equipo" value={necesidad} onChange={(e) => { setNecesidad(e.target.value); setError(''); }} />
                <button className="btn btn-mt" disabled={cargando}>{cargando ? 'Pensando…' : 'Recomendar'}</button>
              </div>
              {error && <div className="text-danger small">{error}</div>}
            </form>
          </div>
          <div className="col-lg-6">
            <div className="card card-body gap-2" aria-live="polite">
              {!resultado ? <p className="text-body-secondary mb-0">La recomendación aparece aquí.</p> : (
                <>
                  <span className="small text-body-secondary">{resultado.fuente === 'gemini' ? 'Recomendación de Gemini' : 'Recomendación'}</span>
                  <div className="burbuja">{resultado.mensaje}</div>
                  <ul className="mb-1">
                    {resultado.productos.map((p) => <li key={p.id}><Link to={`/producto/${p.slug}`}>{p.nombre}</Link> · {dinero(p.precio)}</li>)}
                  </ul>
                  <div className="precio">Total aproximado: {dinero(resultado.total)}</div>
                  <button type="button" className="btn btn-mt align-self-start" onClick={agregarTodo}>Agregar todo al carrito</button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
