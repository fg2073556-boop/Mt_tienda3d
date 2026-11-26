import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { esPersonal, useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { AvisoProvider } from './Aviso.jsx';

/** Menú de la cuenta: nombre, a dónde ir y cerrar sesión */
function MenuCuenta() {
  const { usuario, logout } = useAuth();
  const { vaciar } = useCart();
  const [abierto, setAbierto] = useState(false);
  const caja = useRef(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => { setAbierto(false); }, [pathname]);
  useEffect(() => {
    if (!abierto) return undefined;
    const fuera = (e) => { if (!caja.current?.contains(e.target)) setAbierto(false); };
    const esc = (e) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', esc); };
  }, [abierto]);

  const salir = () => {
    logout();
    vaciar(); // el carrito es de esta cuenta: no se queda para quien use la computadora después
    navigate('/');
  };
  const iniciales = usuario.nombre.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  const personal = esPersonal(usuario);

  return (
    <div className="menu-cuenta" ref={caja}>
      <button type="button" className="btn btn-nav cuenta-boton" aria-haspopup="menu" aria-expanded={abierto} onClick={() => setAbierto((a) => !a)}>
        <span className="cuenta-avatar" aria-hidden="true">{iniciales}</span>
        <span className="cuenta-nombre">{usuario.nombre.split(' ')[0]}</span>
      </button>
      {abierto && (
        <div className="cuenta-menu" role="menu">
          <div className="cuenta-quien">
            <b>{usuario.nombre}</b>
            <span>{usuario.correo}</span>
            {personal && <span className="badge text-bg-secondary text-capitalize align-self-start mt-1">{usuario.rol}</span>}
          </div>
          {personal
            ? <Link role="menuitem" to="/panel">Ir al panel</Link>
            : <Link role="menuitem" to="/mis-pedidos">Mis pedidos</Link>}
          <Link role="menuitem" to="/envios">Zonas de envío</Link>
          <button type="button" role="menuitem" onClick={salir}>Cerrar sesión</button>
        </div>
      )}
    </div>
  );
}

/** Al cambiar de página se empieza desde arriba; al volver de "Crear cuenta", desde donde estaba */
function useScrollAlNavegar() {
  const { pathname, state } = useLocation();
  useEffect(() => {
    const y = state?.volverA;
    if (!y) { window.scrollTo(0, 0); return undefined; }
    // El catálogo carga después: se reintenta hasta que la página sea lo bastante alta
    let intentos = 0;
    const t = setInterval(() => {
      intentos += 1;
      if (document.documentElement.scrollHeight >= y + window.innerHeight || intentos > 30) {
        window.scrollTo(0, y);
        clearInterval(t);
      }
    }, 100);
    return () => clearInterval(t);
  }, [pathname, state]);
}

export default function TiendaLayout() {
  const { cuenta } = useCart();
  const { usuario, cargando } = useAuth();
  const { pathname } = useLocation();
  useScrollAlNavegar();

  return (
    <AvisoProvider>
      <header className="barra">
        <Link to="/" className="logo">M<b>&amp;</b>T</Link>
        <NavLink to="/" end className="btn btn-nav">Tienda</NavLink>
        <NavLink to="/envios" className="btn btn-nav">Envíos</NavLink>
        {usuario && !esPersonal(usuario) && <NavLink to="/mis-pedidos" className="btn btn-nav">Mis pedidos</NavLink>}
        {usuario && esPersonal(usuario) && <NavLink to="/panel" className="btn btn-nav">Panel</NavLink>}
        {!cargando && (usuario
          ? <MenuCuenta />
          : <NavLink to="/ingresar" state={{ desde: pathname }} className="btn btn-nav btn-entrar">Iniciar sesión</NavLink>)}
        <NavLink to="/carrito" className="btn btn-mt">
          Carrito <span className="badge text-bg-dark ms-1">{cuenta}</span>
        </NavLink>
      </header>
      <Outlet />
      <footer className="pie">
        M&amp;T · Soluciones integrales de PC para estudiantes, ingenieros y empresas de la región. Reto COM-1.
      </footer>
    </AvisoProvider>
  );
}
