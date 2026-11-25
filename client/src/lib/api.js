/**
 * Funciones para hablar con el backend. Agrega el token de sesión y convierte
 * los errores del servidor en excepciones con un mensaje en español.
 */
const TOKEN_KEY = 'mt_token';

export const tokenGuardado = () => localStorage.getItem(TOKEN_KEY);
export const guardarToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export async function api(ruta, { method = 'GET', body, form } = {}) {
  const headers = {};
  const token = tokenGuardado();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`/api${ruta}`, { method, headers, body: form ?? (body ? JSON.stringify(body) : undefined) });
  } catch {
    throw new Error('No hay conexión con el servidor. ¿Está corriendo el backend?');
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const error = new Error(data?.error || `Error ${res.status}`);
    error.status = res.status;
    error.detalles = data?.detalles;
    throw error;
  }
  return data;
}
