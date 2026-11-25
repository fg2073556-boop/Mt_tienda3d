import { query } from '../db.js';

/**
 * Asesor de compra. Usa la API de Gemini si hay llave en .env;
 * si no hay llave o la API falla, recomienda con reglas simples.
 */
export async function recomendar(necesidad) {
  const { rows: catalogo } = await query(`
    SELECT p.id, p.nombre, p.slug, p.precio, p.existencias, p.pieza_3d, c.nombre AS categoria
    FROM producto p JOIN categoria c ON c.id = p.categoria_id
    WHERE p.activo AND p.eliminado_en IS NULL AND p.existencias > 0
    ORDER BY p.precio`);

  if (process.env.GEMINI_API_KEY) {
    try {
      return await preguntarAGemini(necesidad, catalogo);
    } catch (error) {
      console.warn('Gemini no respondió, se usan reglas locales:', error.message);
    }
  }
  return reglas(necesidad, catalogo);
}

async function preguntarAGemini(necesidad, catalogo) {
  const lista = catalogo
    .map((p) => `${p.id} | ${p.nombre} | ${p.categoria} | $${Math.round(p.precio)} MXN | ${p.existencias} en existencia`)
    .join('\n');

  const prompt = `Eres el asesor de ventas de M&T, una tienda de soluciones integrales de PC en Tepeaca, Puebla.
El cliente dice: "${necesidad}"

Recomienda una solución completa (equipo, software y mobiliario si aplica) usando SOLO productos de esta lista.
Formato de cada renglón: id | nombre | categoría | precio | existencias
${lista}

Responde solo con JSON con esta forma:
{"mensaje": "explicación breve en español de México, máximo 3 oraciones, tono amable", "ids": [ids recomendados]}`;

  const modelo = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const respuesta = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
      signal: AbortSignal.timeout(20000),
    },
  );
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);

  const data = await respuesta.json();
  const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  const json = JSON.parse(texto);
  const ids = new Set((json.ids || []).map(Number));
  const productos = catalogo.filter((p) => ids.has(p.id));
  if (!productos.length) throw new Error('Gemini no devolvió productos válidos');

  return { fuente: 'gemini', mensaje: String(json.mensaje || 'Esta es la solución que te recomiendo.'), productos };
}

function reglas(necesidad, catalogo) {
  const t = necesidad.toLowerCase();
  const perfiles = [
    { nombre: 'creador', palabras: ['jueg', 'gam', 'stream', 'video', 'edit', 'render', '3d', 'diseñ'], piezas: ['gab', 'monitor', 'kb'], extra: ['windows'],
      mensaje: 'Para juego, edición y render te conviene la PC Fénix con monitor de alta frecuencia.' },
    { nombre: 'ingeniero', palabras: ['ingen', 'cad', 'autocad', 'solid', 'civil', 'arquitec', 'program', 'simula'], piezas: ['gab', 'monitor'], extra: ['cad', 'windows'],
      mensaje: 'Para CAD y simulación necesitas buena tarjeta de video y pantalla grande.' },
    { nombre: 'empresa', palabras: ['empres', 'negocio', 'ofic', 'factur', 'tienda', 'caja', 'contab'], piezas: ['monitor', 'desk'], extra: ['pc oficina', 'oficina', 'antivirus'],
      mensaje: 'Para tu negocio, un puesto de trabajo confiable con software de oficina y antivirus.' },
  ];
  const estudiante = { piezas: ['kb', 'desk'], extra: ['pc oficina', 'oficina', 'windows'],
    mensaje: 'Para clases y tareas, un equipo de oficina con su escritorio es suficiente.' };

  const perfil = perfiles.find((p) => p.palabras.some((w) => t.includes(w))) || estudiante;
  const elegidos = catalogo.filter((p) => perfil.piezas.includes(p.pieza_3d));
  for (const palabra of perfil.extra) {
    const p = catalogo.find((x) => x.nombre.toLowerCase().includes(palabra) && !elegidos.includes(x));
    if (p) elegidos.push(p);
  }
  return { fuente: 'reglas', mensaje: perfil.mensaje, productos: elegidos };
}
