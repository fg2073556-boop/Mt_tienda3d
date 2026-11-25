import { HttpError } from '../errors.js';

/** ¿Hay llave de Gemini en server/.env? */
export const iaActiva = () => Boolean(process.env.GEMINI_API_KEY);
export const modeloIA = () => process.env.GEMINI_MODEL || 'gemini-3.8-flash';

/**
 * Llama a la API de Gemini y regresa el JSON que responde el modelo.
 * @param {Array<object>} partes  partes del mensaje: { text } o { inlineData: { mimeType, data } }
 */
export async function pedirJson(partes, { timeout = 30000 } = {}) {
  if (!iaActiva()) {
    throw new HttpError(503, 'La IA no está configurada: agrega GEMINI_API_KEY en server/.env y reinicia el servidor.');
  }

  let respuesta;
  try {
    respuesta = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modeloIA()}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: partes }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
        signal: AbortSignal.timeout(timeout),
      },
    );
  } catch (error) {
    throw new HttpError(502, `No se pudo conectar con Gemini (${error.name === 'TimeoutError' ? 'tardó demasiado' : 'sin conexión'}).`);
  }

  if (!respuesta.ok) {
    const detalle = await respuesta.json().catch(() => null);
    console.warn('Gemini respondió', respuesta.status, detalle?.error?.message);
    const msg = respuesta.status === 404
      ? `El modelo "${modeloIA()}" no existe para tu llave. Cambia GEMINI_MODEL en server/.env.`
      : respuesta.status === 429 ? 'Se acabó la cuota de Gemini por ahora. Intenta en un minuto.'
        : respuesta.status === 400 || respuesta.status === 403 ? 'Gemini rechazó la petición: revisa que la llave GEMINI_API_KEY sea correcta.'
          : `Gemini respondió con error ${respuesta.status}.`;
    throw new HttpError(502, msg);
  }

  const data = await respuesta.json();
  const texto = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  try {
    return JSON.parse(texto);
  } catch {
    throw new HttpError(502, 'Gemini respondió en un formato inesperado. Intenta de nuevo.');
  }
}
