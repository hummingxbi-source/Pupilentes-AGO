import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Pupilentes AGO · Vite + React con BrowserRouter (rutas sin #).
// Cloudflare Pages sirve index.html para cualquier ruta que no sea archivo cuando no hay 404.html,
// así que no hacen falta reglas de reescritura (ARQUITECTURA §Fase 0, [35]).
export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  base: '/',
  css: { postcss: {} },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: { vendor: ['react', 'react-dom', 'react-router-dom', 'zustand'], gsap: ['gsap', '@gsap/react'] },
      },
    },
  },
  test: { include: ['tests/unit/**/*.test.{js,jsx}'], environment: 'node' },
});
