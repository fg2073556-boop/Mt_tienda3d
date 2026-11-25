import fs from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El puerto de la API se lee de server/.env (PORT), así solo se cambia en un lugar
function puertoApi() {
  try {
    const env = fs.readFileSync(new URL('../server/.env', import.meta.url), 'utf8');
    return Number(env.match(/^PORT=(\d+)/m)?.[1]) || 3001;
  } catch {
    return 3001;
  }
}

const api = `http://localhost:${puertoApi()}`;
// En desarrollo, Vite manda /api y /uploads al backend de Express
const backend = { '/api': api, '/uploads': api };

export default defineConfig({
  plugins: [react()],
  // three.js (la escena 3D) pesa ~530 kB y ya se carga aparte, así que se sube el límite del aviso
  build: { chunkSizeWarningLimit: 600 },
  server: { port: 5173, proxy: backend },
  preview: { port: 4173, proxy: backend },
});
