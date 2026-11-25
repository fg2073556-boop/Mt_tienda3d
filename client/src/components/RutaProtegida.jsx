import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/** Deja pasar solo con sesión y, si se indica, solo a ciertos roles */
export default function RutaProtegida({ roles, children }) {
  const { usuario, cargando } = useAuth();
  const location = useLocation();

  if (cargando) return <p className="p-4 text-body-secondary">Cargando…</p>;
  if (!usuario) return <Navigate to="/login" replace state={{ desde: location.pathname }} />;
  if (roles && !roles.includes(usuario.rol)) {
    return <div className="alert alert-warning m-4">Tu rol ({usuario.rol}) no tiene acceso a esta sección.</div>;
  }
  return children;
}
