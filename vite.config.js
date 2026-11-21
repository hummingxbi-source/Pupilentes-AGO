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
        // EXPERIMENTO F2b (Vite 8 / Rolldown solo acepta manualChunks como función): mismos dos grupos.
        manualChunks(id) {
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|zustand|scheduler)\//.test(id)) return 'vendor';
          if (/node_modules\/(gsap|@gsap\/react)\//.test(id)) return 'gsap';
          return undefined;
        },
      },
    },
  },
  test: { include: ['tests/unit/**/*.test.{js,jsx}'], environment: 'node' },
});
