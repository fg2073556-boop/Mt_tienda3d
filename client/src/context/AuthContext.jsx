import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, guardarToken, tokenGuardado } from '../lib/api.js';

/**
 * Usuario y rol compartidos en toda la app.
 * Roles: administrador (puede todo) y vendedor (pedidos y existencias).
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(Boolean(tokenGuardado()));

  // Si hay un token guardado, se confirma con el servidor al abrir la página
  useEffect(() => {
    if (!tokenGuardado()) return;
    api('/auth/yo')
      .then(setUsuario)
      .catch(() => guardarToken(null))
      .finally(() => setCargando(false));
  }, []);

  const login = useCallback(async (correo, password) => {
    const { token, usuario: u } = await api('/auth/login', { method: 'POST', body: { correo, password } });
    guardarToken(token);
    setUsuario(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    guardarToken(null);
    setUsuario(null);
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, rol: usuario?.rol ?? null, cargando, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
