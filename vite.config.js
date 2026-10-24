import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo, sirve /api/chat con el mismo código que usa Vercel (api/chat.js),
// así `npm run dev` prueba el chatbot completo sin instalar la CLI de Vercel.
function apiLocal(env) {
  return {
    name: 'api-local',
    configureServer(server) {
      Object.assign(process.env, env); // variables de .env.local para el handler
      server.middlewares.use('/api/chat', async (req, res) => {
        try {
          const mod = await server.ssrLoadModule('/api/chat.js');
          const fn = mod[req.method];
          if (!fn) { res.statusCode = 405; return res.end(); }
          const chunks = []; for await (const c of req) chunks.push(c);
          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
          const request = new Request('http://localhost' + req.originalUrl, {
            method: req.method, headers, body: req.method === 'GET' ? undefined : Buffer.concat(chunks),
          });
          const out = await fn(request);
          res.statusCode = out.status;
          out.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(Buffer.from(await out.arrayBuffer()));
        } catch (e) {
          console.error(e); res.statusCode = 500; res.end(JSON.stringify({ error: 'dev' }));
        }
      });
    },
  };
}

// Pupilentes AGO · Vite + React (HashRouter: no requiere rewrites en Vercel)
export default defineConfig(({ mode }) => ({
  plugins: [react(), apiLocal(loadEnv(mode, process.cwd(), ''))],
  publicDir: 'public',
  base: './',
  css: { postcss: {} },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: { vendor: ['react', 'react-dom', 'react-router-dom', 'zustand'], gsap: ['gsap', '@gsap/react'] },
      },
    },
  },
}));
