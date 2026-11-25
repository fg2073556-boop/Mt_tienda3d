import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { usuario, login } = useAuth();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const navigate = useNavigate();
  const destino = useLocation().state?.desde || '/panel';

  if (usuario) return <Navigate to={destino} replace />;

  const entrar = async (e) => {
    e.preventDefault();
    if (!correo || !password) return setError('Escribe tu correo y contraseña.');
    setEnviando(true);
    try {
      await login(correo, password);
      navigate(destino, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="banda">
      <div className="contenedor" style={{ maxWidth: 440 }}>
        <h1 className="h2">Acceso para el personal</h1>
        <form className="card card-body gap-3 mt-3" onSubmit={entrar} noValidate>
          <label className="form-label mb-0">Correo
            <input type="email" className="form-control" autoComplete="username" value={correo} onChange={(e) => { setCorreo(e.target.value); setError(''); }} />
          </label>
          <label className="form-label mb-0">Contraseña
            <input type="password" className="form-control" autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} />
          </label>
          {error && <div className="alert alert-danger mb-0">{error}</div>}
          <button className="btn btn-mt" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar al panel'}</button>
        </form>
      </div>
    </section>
  );
}
