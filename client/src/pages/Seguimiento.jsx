import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import AvancePedido, { mensajeDeEstado } from '../components/AvancePedido.jsx';
import DetalleEnvio, { envioDePedido } from '../components/DetalleEnvio.jsx';
import InstruccionesPago from '../components/InstruccionesPago.jsx';
import MapaZonas from '../components/MapaZonas.jsx';
import { esPersonal, useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';
import { dinero, ESTADOS, fecha, METODOS_PAGO } from '../lib/formato.js';

const Trazo = ({ children }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const ICONOS = {
  folio: <Trazo><path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V7Z" /><path d="M10 5v12" strokeDasharray="2 2" /></Trazo>,
  correo: <Trazo><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></Trazo>,
  buscar: <Trazo><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Trazo>,
  cuenta: <Trazo><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Trazo>,
  panel: <Trazo><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></Trazo>,
  alerta: <Trazo><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 16.5v.5" /></Trazo>,
  cancelado: <Trazo><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6M15 9l-6 6" /></Trazo>,
  caja: <Trazo><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" /><path d="m3 8 9 5 9-5M12 13v8" /></Trazo>,
};

const claseEstado = (e) => (e === 'cancelado' ? 'agotado' : e === 'pendiente' ? 'bajo' : 'ok');

/** El cliente consulta el estado de su pedido con su folio y su correo */
export default function Seguimiento() {
  const { usuario } = useAuth();
  const inicial = useLocation().state?.folio || '';
  const personal = usuario && esPersonal(usuario);
  const [folio, setFolio] = useState(inicial);
  const [correo, setCorreo] = useState(usuario && !personal ? usuario.correo || '' : '');
  const [pedido, setPedido] = useState(null);
  const [error, setError] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [zonas, setZonas] = useState(null);
  const resultado = useRef(null);

  // Si la sesión termina de cargar después, propone el correo de la cuenta
  useEffect(() => {
    if (usuario && !esPersonal(usuario) && usuario.correo) setCorreo((c) => c || usuario.correo);
  }, [usuario]);
  // El mapa de la ruta solo se pide cuando el pedido tiene envío
  useEffect(() => {
    if (pedido?.envio_municipio && !zonas) api('/envios/zonas').then(setZonas).catch(() => {});
  }, [pedido, zonas]);
  // Al encontrarlo, baja hasta el resultado (útil en celular)
  useEffect(() => {
    if (pedido) resultado.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [pedido]);

  const buscar = async (e) => {
    e.preventDefault();
    if (!folio.trim() || !correo.trim()) return setError('Escribe el folio y el correo que usaste al comprar.');
    setBuscando(true);
    setPedido(null);
    try {
      setPedido(await api('/pedidos/seguimiento', { method: 'POST', body: { folio: folio.trim(), correo: correo.trim() } }));
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBuscando(false);
    }
  };

  const otraConsulta = () => {
    setPedido(null);
    setFolio('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const subtotal = pedido ? pedido.detalle.reduce((s, d) => s + Number(d.subtotal), 0) : 0;
  const envio = envioDePedido(pedido);
  const piezas = pedido ? pedido.detalle.reduce((s, d) => s + d.cantidad, 0) : 0;

  return (
    <div className="rastreo">
      <section className="rastreo-hero">
        <div className="contenedor rastreo-hero-in">
          <span className="acceso-insignia">Seguimiento</span>
          <h1 className="rastreo-titulo">Rastrea tu pedido</h1>
          <p className="rastreo-intro">Escribe el folio que te dimos al comprar y el correo que usaste. Te mostramos en qué paso va y por dónde viaja tu paquete.</p>
        </div>
      </section>

      <div className="contenedor rastreo-cuerpo">
        <form className="rastreo-form" onSubmit={buscar} noValidate>
          <div className="rastreo-campos">
            <div>
              <label className="acceso-etiqueta" htmlFor="r-folio">Folio</label>
              <div className="acceso-campo">
                {ICONOS.folio}
                <input id="r-folio" placeholder="MT-00005" autoCapitalize="characters" spellCheck={false} value={folio}
                  onChange={(e) => { setFolio(e.target.value.toUpperCase()); setError(''); }} />
              </div>
            </div>
            <div>
              <label className="acceso-etiqueta" htmlFor="r-correo">Correo con el que compraste</label>
              <div className="acceso-campo">
                {ICONOS.correo}
                <input id="r-correo" type="email" autoComplete="email" placeholder="tucorreo@ejemplo.com" value={correo}
                  onChange={(e) => { setCorreo(e.target.value); setError(''); }} />
              </div>
            </div>
            <button className="btn btn-mt rastreo-boton" disabled={buscando}>
              {buscando ? <span className="spinner-border spinner-border-sm" aria-hidden="true" /> : ICONOS.buscar}
              {buscando ? 'Buscando…' : 'Consultar'}
            </button>
          </div>
          {error && <div className="acceso-error" role="alert">{ICONOS.alerta}<span>{error}</span></div>}
        </form>

        {!pedido && (
          <div className="rastreo-ayuda">
            <div>
              <span className="rastreo-ayuda-icono">{ICONOS.folio}</span>
              <b>¿Dónde está mi folio?</b>
              <p>Aparece al terminar tu compra y empieza con <code>MT-</code>, por ejemplo <code>MT-00005</code>.</p>
            </div>
            <div>
              <span className="rastreo-ayuda-icono">{ICONOS.correo}</span>
              <b>Usa el mismo correo</b>
              <p>Pedimos el correo para que nadie más pueda ver tu pedido. Debe ser el que escribiste al pagar.</p>
            </div>
            {personal ? (
              <div>
                <span className="rastreo-ayuda-icono">{ICONOS.panel}</span>
                <b>¿Eres del personal?</b>
                <p>Todos los pedidos de la tienda están en el panel, sin necesidad de correo.</p>
                <Link to="/panel/pedidos" className="link-mt">Ir a Pedidos del panel →</Link>
              </div>
            ) : usuario ? (
              <div>
                <span className="rastreo-ayuda-icono">{ICONOS.cuenta}</span>
                <b>Tus compras con cuenta</b>
                <p>Los pedidos que hiciste con tu sesión ya están juntos en un solo lugar.</p>
                <Link to="/mis-pedidos" className="link-mt">Ver mis pedidos →</Link>
              </div>
            ) : (
              <div>
                <span className="rastreo-ayuda-icono">{ICONOS.cuenta}</span>
                <b>¿Tienes cuenta?</b>
                <p>Inicia sesión y verás todos tus pedidos sin escribir folios.</p>
                <Link to="/ingresar" state={{ desde: '/mis-pedidos' }} className="link-mt">Iniciar sesión →</Link>
              </div>
            )}
          </div>
        )}

        {pedido && (
          <article className="rastreo-resultado" ref={resultado}>
            <header className="rastreo-cabeza">
              <div>
                <span className="rastreo-etiqueta">Pedido</span>
                <h2 className="rastreo-folio">{pedido.folio}</h2>
                <span className="text-body-secondary small">Comprado el {fecha(pedido.creado_en)} · {piezas} artículo{piezas === 1 ? '' : 's'}</span>
              </div>
              <div className="text-sm-end">
                <span className={`insignia ${claseEstado(pedido.estado)}`}>{pedido.estado === 'pendiente' ? 'Pendiente de pago' : ESTADOS[pedido.estado]}</span>
                <div className="rastreo-total">{dinero(pedido.total)}</div>
              </div>
            </header>

            {pedido.estado === 'cancelado' ? (
              <div className="rastreo-cancelado">
                {ICONOS.cancelado}
                <span><b>Este pedido fue cancelado.</b> Si tienes dudas o ya habías pagado, comunícate con la tienda y con gusto te ayudamos.</span>
              </div>
            ) : (
              <div className="rastreo-avance">
                <AvancePedido estado={pedido.estado} />
                <p className={`rastreo-mensaje ${pedido.estado === 'pendiente' ? 'espera' : ''}`}>{mensajeDeEstado(pedido.estado)}</p>
              </div>
            )}

            {pedido.estado !== 'cancelado' && pedido.pago_datos && (
              <InstruccionesPago metodo={pedido.metodo_pago} estado={pedido.estado} total={pedido.total} pago={{ estado: pedido.pago_estado, datos: pedido.pago_datos }} />
            )}

            <div className="rastreo-rejilla">
              <section className="rastreo-bloque">
                <h3>{ICONOS.caja} Productos</h3>
                <ul className="rastreo-productos">
                  {pedido.detalle.map((d) => (
                    <li key={d.producto_nombre}>
                      <span className="rastreo-cantidad">{d.cantidad}×</span>
                      <span className="flex-grow-1">{d.producto_nombre}</span>
                      <span className="text-nowrap">{dinero(d.subtotal)}</span>
                    </li>
                  ))}
                </ul>
                <dl className="rastreo-suma">
                  <div><dt>Productos</dt><dd>{dinero(subtotal)}</dd></div>
                  <div><dt>Envío</dt><dd>{!envio ? 'Digital' : Number(envio.costo) === 0 ? 'Gratis' : dinero(envio.costo)}</dd></div>
                  <div className="total"><dt>Total</dt><dd>{dinero(pedido.total)}</dd></div>
                </dl>
              </section>

              <section className="rastreo-bloque">
                <h3><Trazo><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></Trazo> Entrega</h3>
                <DetalleEnvio envio={envio} />
                {pedido.envio_municipio && zonas && pedido.estado !== 'cancelado' && (
                  <div className="rastreo-mapa">
                    <MapaZonas datos={zonas} destino={zonas.municipios.find((m) => m.nombre === pedido.envio_municipio)?.cve_mun} alto={300} />
                    <p className="small text-body-secondary mb-0">
                      {pedido.estado === 'enviado' ? 'Tu paquete va en camino desde Tepeaca.' : pedido.estado === 'entregado' ? 'Tu paquete ya llegó.' : 'Tu paquete saldrá de nuestra tienda en Tepeaca.'}
                    </p>
                  </div>
                )}
              </section>
            </div>

            <footer className="rastreo-pie">
              <span className="small text-body-secondary">Forma de pago: <b>{METODOS_PAGO[pedido.metodo_pago]}</b> · Última actualización: {fecha(pedido.actualizado_en)}</span>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={otraConsulta}>Consultar otro pedido</button>
            </footer>
          </article>
        )}
      </div>
    </div>
  );
}
