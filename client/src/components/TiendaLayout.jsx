import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { AvisoProvider } from './Aviso.jsx';

export default function TiendaLayout() {
  const { cuenta } = useCart();
  const { usuario } = useAuth();

  return (
    <AvisoProvider>
      <header className="barra">
        <Link to="/" className="logo">M<b>&amp;</b>T</Link>
        <NavLink to="/" end className="btn btn-nav">Tienda</NavLink>
        {usuario && <NavLink to="/panel" className="btn btn-nav">Panel</NavLink>}
        <NavLink to="/carrito" className="btn btn-mt">
          Carrito <span className="badge text-bg-dark ms-1">{cuenta}</span>
        </NavLink>
      </header>
      <Outlet />
      <footer className="pie">
        M&amp;T · Soluciones integrales de PC para estudiantes, ingenieros y empresas de la región. Reto COM-1.{' '}
        {!usuario && <Link to="/login">Acceso para el personal</Link>}
      </footer>
    </AvisoProvider>
  );
}
