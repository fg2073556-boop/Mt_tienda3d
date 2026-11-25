import { Suspense } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AvisoProvider } from '../../components/Aviso.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

/** Opciones del menú lateral y qué roles las ven */
const MENU = [
  { to: '/panel', texto: 'Resumen', roles: ['administrador', 'vendedor'], end: true },
  { to: '/panel/productos', texto: 'Productos', roles: ['administrador', 'vendedor'] },
  { to: '/panel/productos/nuevo', texto: 'Dar de alta', roles: ['administrador'] },
  { to: '/panel/pedidos', texto: 'Pedidos', roles: ['administrador', 'vendedor'] },
];

export default function PanelLayout() {
  const { usuario, rol, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <AvisoProvider>
      <div className="panel">
        <aside className="menu-lateral">
          <Link to="/" className="logo">M<b>&amp;</b>T</Link>
          <div className="quien">
            <div className="fw-semibold">{usuario.nombre}</div>
            <span className="badge text-bg-secondary text-capitalize">{rol}</span>
          </div>
          <nav className="nav flex-column gap-1">
            {MENU.filter((m) => m.roles.includes(rol)).map((m) => (
              <NavLink key={m.to} to={m.to} end={m.end} className="nav-link">{m.texto}</NavLink>
            ))}
            <Link to="/" className="nav-link">Ver tienda</Link>
          </nav>
          <button type="button" className="btn btn-outline-light btn-sm mt-auto" onClick={() => { logout(); navigate('/'); }}>Cerrar sesión</button>
        </aside>
        <main className="contenido-panel">
          <Suspense fallback={<p className="text-body-secondary">Cargando…</p>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </AvisoProvider>
  );
}
