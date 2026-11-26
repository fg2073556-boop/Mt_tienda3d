import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const Trazo = ({ children }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const ICONOS = {
  correo: <Trazo><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></Trazo>,
  candado: <Trazo><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Trazo>,
  ojo: <Trazo><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></Trazo>,
  ojoNo: <Trazo><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></Trazo>,
  resumen: <Trazo><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></Trazo>,
  caja: <Trazo><path d="m3 7 9-4 9 4-9 4-9-4Z" /><path d="M3 7v10l9 4 9-4V7M12 11v10" /></Trazo>,
  pedido: <Trazo><path d="M6 2h9l5 5v15H6z" /><path d="M14 2v6h6M9 13h8M9 17h5" /></Trazo>,
  alerta: <Trazo><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 16.5v.5" /></Trazo>,
};

const FUNCIONES = [
  { icono: 'resumen', titulo: 'Resumen del día', texto: 'Ventas, pedidos recientes y alertas de stock bajo.' },
  { icono: 'caja', titulo: 'Productos y existencias', texto: 'Altas, fotos, modelos 3D y descripciones con Gemini.' },
  { icono: 'pedido', titulo: 'Pedidos', texto: 'Cambia el estado; si se cancela, las piezas regresan al inventario.' },
];

export default function Login() {
  const { usuario, login } = useAuth();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [ver, setVer] = useState(false);
  const [mayusculas, setMayusculas] = useState(false);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const navigate = useNavigate();
  const destino = useLocation().state?.desde || '/panel';

  if (usuario) return <Navigate to={destino} replace />;

  const entrar = async (e) => {
    e.preventDefault();
    if (!correo.trim() || !password) return setError('Escribe tu correo y tu contraseña.');
    setEnviando(true);
    try {
      await login(correo.trim(), password);
      navigate(destino, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };
  const revisarMayusculas = (e) => setMayusculas(e.getModifierState?.('CapsLock') ?? false);

  return (
    <section className="acceso">
      <div className="acceso-tarjeta">
        <aside className="acceso-lado">
          <span className="acceso-insignia">Solo personal de M&amp;T</span>
          <h1 className="acceso-titulo">Panel de la tienda</h1>
          <p className="acceso-intro">Desde aquí tu equipo atiende la tienda en línea sin tocar código.</p>
          <ul className="acceso-funciones">
            {FUNCIONES.map((f) => (
              <li key={f.icono}>
                <span className="acceso-icono">{ICONOS[f.icono]}</span>
                <span><b>{f.titulo}</b>{f.texto}</span>
              </li>
            ))}
          </ul>
          <p className="acceso-roles"><b>Administrador:</b> puede todo. <b>Vendedor:</b> pedidos y existencias.</p>
        </aside>

        <form className="acceso-form" onSubmit={entrar} noValidate>
          <h2 className="h3 mb-1">Inicia sesión</h2>
          <p className="text-body-secondary mb-4">Usa el correo y la contraseña de tu cuenta del panel.</p>

          <label className="acceso-etiqueta" htmlFor="acceso-correo">Correo</label>
          <div className="acceso-campo">
            {ICONOS.correo}
            <input id="acceso-correo" type="email" autoComplete="username" placeholder="tu-correo@ejemplo.com" autoFocus
              value={correo} onChange={(e) => { setCorreo(e.target.value); setError(''); }} />
          </div>

          <label className="acceso-etiqueta" htmlFor="acceso-clave">Contraseña</label>
          <div className="acceso-campo">
            {ICONOS.candado}
            <input id="acceso-clave" type={ver ? 'text' : 'password'} autoComplete="current-password" placeholder="Mínimo 8 caracteres"
              value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }}
              onKeyUp={revisarMayusculas} onKeyDown={revisarMayusculas} />
            <button type="button" className="acceso-ver" onClick={() => setVer((v) => !v)}
              aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'} title={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
              {ver ? ICONOS.ojoNo : ICONOS.ojo}
            </button>
          </div>
          {mayusculas && <p className="acceso-aviso">Tienes activadas las mayúsculas.</p>}

          {error && <div className="acceso-error" role="alert">{ICONOS.alerta}<span>{error}</span></div>}

          <button className="btn btn-mt w-100 mt-4" disabled={enviando}>
            {enviando ? <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />Entrando…</> : 'Entrar al panel'}
          </button>
          <Link to="/" className="acceso-volver">← Volver a la tienda</Link>
        </form>
      </div>
    </section>
  );
}
