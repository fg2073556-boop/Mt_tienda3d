import { useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAviso } from '../components/Aviso.jsx';
import { esPersonal, useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

const Trazo = ({ children }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const ICONOS = {
  usuario: <Trazo><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Trazo>,
  correo: <Trazo><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></Trazo>,
  telefono: <Trazo><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></Trazo>,
  candado: <Trazo><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Trazo>,
  ojo: <Trazo><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></Trazo>,
  ojoNo: <Trazo><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></Trazo>,
  carrito: <Trazo><path d="M3 4h2l2.4 11h10.2L20 8H6.2" /><circle cx="9" cy="19.5" r="1.5" /><circle cx="17" cy="19.5" r="1.5" /></Trazo>,
  pedido: <Trazo><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17.5" cy="17.5" r="1.8" /></Trazo>,
  escudo: <Trazo><path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></Trazo>,
  alerta: <Trazo><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 16.5v.5" /></Trazo>,
};

const VENTAJAS = [
  { icono: 'carrito', titulo: 'Compra en minutos', texto: 'Tu carrito y tus datos de entrega quedan listos para la próxima vez.' },
  { icono: 'pedido', titulo: 'Sigue tus pedidos', texto: 'Ve el estado de cada compra, su envío y tus referencias de pago.' },
  { icono: 'escudo', titulo: 'Pagos seguros', texto: 'Tarjeta, transferencia SPEI o efectivo con Openpay.' },
];

function Campo({ id, etiqueta, icono, children }) {
  return (
    <>
      <label className="acceso-etiqueta" htmlFor={id}>{etiqueta}</label>
      <div className="acceso-campo">{ICONOS[icono]}{children}</div>
    </>
  );
}

/**
 * Un solo lugar para entrar: clientes, vendedores y administradores.
 * Si llegas desde "Agregar al carrito", abre en "Crear cuenta" y al terminar
 * te regresa a donde estabas con el producto ya en el carrito.
 */
export default function Ingresar({ modo: modoInicial }) {
  const { usuario, login, registrar } = useAuth();
  const { agregar } = useCart();
  const avisar = useAviso();
  const navigate = useNavigate();
  const estado = useLocation().state || {};
  const pendiente = estado.pendiente || [];
  const [modo, setModo] = useState(modoInicial || (pendiente.length ? 'registro' : 'entrar'));
  const [f, setF] = useState({ nombre: '', correo: '', telefono: '', password: '' });
  const [ver, setVer] = useState(false);
  const [mayusculas, setMayusculas] = useState(false);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const entrando = useRef(false); // mientras entra, la redirección la decide enviar()

  // Ya con sesión (por ejemplo, al volver con el botón Atrás)
  if (usuario && !entrando.current) return <Navigate to={esPersonal(usuario) ? '/panel' : '/'} replace />;

  const campo = (k) => ({ value: f[k], onChange: (e) => { setF({ ...f, [k]: e.target.value }); setError(''); } });
  const revisarMayusculas = (e) => setMayusculas(e.getModifierState?.('CapsLock') ?? false);
  const cambiarModo = (m) => { setModo(m); setError(''); };

  const enviar = async (e) => {
    e.preventDefault();
    if (modo === 'registro' && f.nombre.trim().length < 3) return setError('Escribe tu nombre completo.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.correo.trim())) return setError('Escribe un correo válido.');
    if (modo === 'registro' && f.password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    if (!f.password) return setError('Escribe tu contraseña.');

    setEnviando(true);
    entrando.current = true;
    try {
      const u = modo === 'registro'
        ? await registrar({ nombre: f.nombre.trim(), correo: f.correo.trim(), telefono: f.telefono.trim() || undefined, password: f.password })
        : await login(f.correo.trim(), f.password);

      // Lo que quería agregar antes de entrar
      const fallas = pendiente.map((p) => agregar(p.producto, p.cantidad)).filter(Boolean);
      if (pendiente.length) {
        avisar(fallas.length ? fallas.join(' ') : `¡Listo, ${u.nombre.split(' ')[0]}! ${pendiente.length === 1 ? `Agregamos ${pendiente[0].producto.nombre}` : 'Agregamos tus productos'} al carrito.`, fallas.length ? 'error' : 'ok');
      } else {
        avisar(modo === 'registro' ? `¡Bienvenido, ${u.nombre.split(' ')[0]}! Tu cuenta quedó lista.` : `Hola, ${u.nombre.split(' ')[0]}.`);
      }
      // El personal va al panel (salvo que viniera de una página del panel o con productos pendientes)
      const desde = estado.desde && !estado.desde.startsWith('/ingresar') ? estado.desde : null;
      const destino = esPersonal(u) && !pendiente.length ? (desde?.startsWith('/panel') ? desde : '/panel') : desde || '/';
      // Al regresar, la página vuelve a la altura donde estaba el producto
      navigate(destino, { replace: true, state: destino === estado.desde && estado.scrollY ? { volverA: estado.scrollY } : undefined });
    } catch (err) {
      entrando.current = false;
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const registro = modo === 'registro';
  return (
    <section className="acceso">
      <div className="acceso-tarjeta">
        <aside className="acceso-lado">
          <span className="acceso-insignia">Tu cuenta M&amp;T</span>
          <h1 className="acceso-titulo">{registro ? 'Crea tu cuenta y compra' : 'Qué gusto verte'}</h1>
          <p className="acceso-intro">Puedes ver toda la tienda sin cuenta. Para comprar, solo necesitas registrarte una vez.</p>
          <ul className="acceso-funciones">
            {VENTAJAS.map((v) => (
              <li key={v.icono}>
                <span className="acceso-icono">{ICONOS[v.icono]}</span>
                <span><b>{v.titulo}</b>{v.texto}</span>
              </li>
            ))}
          </ul>
          <p className="acceso-roles">¿Trabajas en M&amp;T? Entra aquí mismo con tu cuenta del equipo y te llevamos al panel.</p>
        </aside>

        <form className="acceso-form" onSubmit={enviar} noValidate>
          <div className="acceso-pestanas" role="tablist" aria-label="Entrar o crear cuenta">
            <button type="button" role="tab" aria-selected={!registro} className={!registro ? 'activa' : ''} onClick={() => cambiarModo('entrar')}>Iniciar sesión</button>
            <button type="button" role="tab" aria-selected={registro} className={registro ? 'activa' : ''} onClick={() => cambiarModo('registro')}>Crear cuenta</button>
          </div>

          {pendiente.length > 0 && (
            <div className="acceso-pendiente">
              {ICONOS.carrito}
              <span>
                {registro ? 'Crea tu cuenta' : 'Inicia sesión'} para agregar <b>{pendiente.length === 1 ? pendiente[0].producto.nombre : `${pendiente.length} productos`}</b> a tu carrito. Te regresamos a donde estabas.
              </span>
            </div>
          )}

          {registro && (
            <Campo id="acceso-nombre" etiqueta="Nombre completo" icono="usuario">
              <input id="acceso-nombre" autoComplete="name" placeholder="Como aparecerá en tus pedidos" {...campo('nombre')} />
            </Campo>
          )}
          <Campo id="acceso-correo" etiqueta="Correo" icono="correo">
            <input id="acceso-correo" type="email" autoComplete={registro ? 'email' : 'username'} placeholder="tu-correo@ejemplo.com" {...campo('correo')} />
          </Campo>
          {registro && (
            <Campo id="acceso-telefono" etiqueta="Teléfono (opcional)" icono="telefono">
              <input id="acceso-telefono" type="tel" autoComplete="tel" placeholder="Para avisarte de tu envío" {...campo('telefono')} />
            </Campo>
          )}
          <Campo id="acceso-clave" etiqueta="Contraseña" icono="candado">
            <input id="acceso-clave" type={ver ? 'text' : 'password'} autoComplete={registro ? 'new-password' : 'current-password'}
              placeholder={registro ? 'Mínimo 8 caracteres' : 'Tu contraseña'} {...campo('password')} onKeyUp={revisarMayusculas} onKeyDown={revisarMayusculas} />
            <button type="button" className="acceso-ver" onClick={() => setVer((v) => !v)}
              aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'} title={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
              {ver ? ICONOS.ojoNo : ICONOS.ojo}
            </button>
          </Campo>
          {mayusculas && <p className="acceso-aviso">Tienes activadas las mayúsculas.</p>}

          {error && <div className="acceso-error" role="alert">{ICONOS.alerta}<span>{error}</span></div>}

          <button className="btn btn-mt w-100 mt-4" disabled={enviando}>
            {enviando ? <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />{registro ? 'Creando tu cuenta…' : 'Entrando…'}</> : registro ? 'Crear cuenta' : 'Iniciar sesión'}
          </button>
          <p className="acceso-cambio">
            {registro ? '¿Ya tienes cuenta? ' : '¿Primera vez en M&T? '}
            <button type="button" className="btn btn-link p-0 align-baseline" onClick={() => cambiarModo(registro ? 'entrar' : 'registro')}>
              {registro ? 'Inicia sesión' : 'Crea tu cuenta gratis'}
            </button>
          </p>
          <Link to={estado.desde || '/'} className="acceso-volver">← Seguir viendo la tienda</Link>
        </form>
      </div>
    </section>
  );
}
