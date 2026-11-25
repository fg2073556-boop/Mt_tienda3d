import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo, Vite manda /api y /uploads al backend de Express
const backend = {
  '/api': 'http://localhost:3001',
  '/uploads': 'http://localhost:3001',
};

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: backend },
  preview: { port: 4173, proxy: backend },
});
