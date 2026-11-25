import { Router } from 'express';
import multer from 'multer';
import { HttpError, handle } from '../errors.js';
import { permitir, requiereSesion } from '../middleware/auth.js';
import { iaActiva, modeloIA, pedirJson } from '../services/gemini.js';
import { text } from '../validate.js';

/**
 * Herramientas de IA para el panel (Gemini):
 *  - Crear contenido: redactar la descripción de un producto
 *  - Analizar: resumir la ficha técnica en PDF de un componente
 */
const router = Router();
router.use(requiereSesion, permitir('administrador'));

const pdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => (file.mimetype === 'application/pdf'
    ? cb(null, true)
    : cb(new HttpError(422, 'La ficha técnica debe ser un archivo PDF.'))),
}).single('ficha');

// GET /api/admin/ia/estado → si la IA está lista
router.get('/estado', (_req, res) => res.json({ activa: iaActiva(), modelo: modeloIA() }));

// POST /api/admin/ia/descripcion { nombre, categoria, notas }
router.post('/descripcion', handle(async (req, res) => {
  const nombre = text(req.body.nombre, 'nombre', { min: 3, max: 150 });
  const categoria = text(req.body.categoria, 'categoría', { max: 60, required: false });
  const notas = text(req.body.notas, 'notas', { max: 1000, required: false });

  const r = await pedirJson([{ text: `Eres redactor de M&T, una tienda de soluciones de PC en Tepeaca, Puebla, que vende a estudiantes, ingenieros y empresas.
Escribe la descripción de este producto para su ficha en la tienda en línea.
Producto: ${nombre}
${categoria ? `Categoría: ${categoria}\n` : ''}${notas ? `Datos que dio el vendedor: ${notas}\n` : ''}
Reglas: español de México, máximo 2 oraciones y 220 caracteres, tono claro y confiable, di para quién es útil.
No inventes especificaciones que no estén en el nombre o en los datos del vendedor. Sin emojis.
Responde solo con JSON: {"descripcion": "..."}` }]);

  const descripcion = String(r.descripcion || '').trim();
  if (!descripcion) throw new HttpError(502, 'Gemini no regresó una descripción. Intenta de nuevo.');
  res.json({ descripcion: descripcion.slice(0, 2000) });
}));

// POST /api/admin/ia/resumir-ficha  (multipart, campo "ficha" con el PDF)
router.post('/resumir-ficha', (req, res, next) => pdf(req, res, next), handle(async (req, res) => {
  if (!req.file) throw new HttpError(422, 'Sube la ficha técnica en PDF.');

  const r = await pedirJson([
    { inlineData: { mimeType: 'application/pdf', data: req.file.buffer.toString('base64') } },
    { text: `Esta es la ficha técnica de un componente o equipo de cómputo.
Explícala para un cliente que no es experto, en español de México.
Responde solo con JSON con esta forma:
{
  "producto": "nombre del producto según la ficha",
  "resumen": "3 a 4 oraciones: qué es, para qué sirve y para quién conviene",
  "descripcion_tienda": "máximo 2 oraciones y 220 caracteres para la ficha de la tienda",
  "especificaciones": [{"nombre": "dato clave", "valor": "valor con unidades"}]
}
Incluye de 4 a 8 especificaciones, solo las que aparecen en el documento. No inventes datos.` },
  ], { timeout: 60000 });

  res.json({
    producto: String(r.producto || ''),
    resumen: String(r.resumen || ''),
    descripcion_tienda: String(r.descripcion_tienda || '').slice(0, 2000),
    especificaciones: Array.isArray(r.especificaciones)
      ? r.especificaciones.slice(0, 12).map((e) => ({ nombre: String(e.nombre || ''), valor: String(e.valor || '') }))
      : [],
  });
}));

export default router;
