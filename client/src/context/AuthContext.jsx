import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, guardarToken, tokenGuardado } from '../lib/api.js';

/**
 * Usuario y rol compartidos en toda la app.
 * Roles: administrador (puede todo), vendedor (pedidos y existencias) y cliente (compra en la tienda).
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

  /** Crea una cuenta de cliente y deja la sesión iniciada */
  const registrar = useCallback(async (datos) => {
    const { token, usuario: u } = await api('/auth/registro', { method: 'POST', body: datos });
    guardarToken(token);
    setUsuario(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    guardarToken(null);
    setUsuario(null);
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, rol: usuario?.rol ?? null, esPersonal: esPersonal(usuario), cargando, login, registrar, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

/** Administrador y vendedor entran al panel; el cliente se queda en la tienda */
export const esPersonal = (u) => u?.rol === 'administrador' || u?.rol === 'vendedor';
