import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import adminRoutes, { UPLOADS } from './routes/admin.js';
import asesorRoutes from './routes/asesor.js';
import authRoutes from './routes/auth.js';
import catalogoRoutes from './routes/catalogo.js';
import pedidosRoutes from './routes/pedidos.js';
import iaRoutes from './routes/ia.js';
import reposicionRoutes from './routes/reposicion.js';
import { HttpError } from './errors.js';

const FOTOS_CATALOGO = fileURLToPath(new URL('../../assets/imagenes/productos', import.meta.url));

/** Crea la aplicación Express (separada de index.js para poder probarla) */
export function crearApp() {
  for (const sub of ['productos', 'modelos']) fs.mkdirSync(path.join(UPLOADS, sub), { recursive: true });

  const app = express();
  app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
  app.use(express.json({ limit: '1mb' }));

  // Fotos del catálogo que vienen en el repositorio (assets/imagenes/productos)
  app.use('/uploads/catalogo', express.static(FOTOS_CATALOGO, { maxAge: '7d' }));
  // Fotos y modelos 3D subidos desde el panel
  app.use('/uploads', express.static(UPLOADS, { maxAge: '1d' }));

  app.get('/api/salud', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRoutes);
  app.use('/api', catalogoRoutes);
  app.use('/api', pedidosRoutes);
  app.use('/api', asesorRoutes);
  app.use('/api/admin/ia', iaRoutes);
  app.use('/api/admin/reposicion', reposicionRoutes);
  app.use('/api/admin', adminRoutes);

  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Esa ruta de la API no existe.')));

  // Manejador central de errores: siempre responde { error: "mensaje" }
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, ...(err.details && { detalles: err.details }) });
    if (err instanceof multer.MulterError) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'El archivo pesa demasiado (fotos y modelos: 20 MB, fichas PDF: 15 MB).' : 'No se pudo subir el archivo.';
      return res.status(422).json({ error: msg });
    }
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'La petición no es JSON válido.' });
    console.error(err);
    res.status(500).json({ error: 'Ocurrió un error en el servidor.' });
  });

  return app;
}
