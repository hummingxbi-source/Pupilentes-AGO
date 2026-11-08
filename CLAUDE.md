# Pupilentes AGO — contexto para Claude

Tienda en línea de pupilentes de color (estéticos y graduados) + panel de la dueña. Proyecto de HummingX BI.

**Antes de trabajar, lee `docs/ARQUITECTURA.md`.** Ahí están la arquitectura, el modelo de datos, las fases y el estado actual.

## Stack
- Frontend: Vite + React 18, React Router, Zustand, GSAP. Estilos en `src/styles.css`.
- Hosting: Cloudflare Pages (migrando desde Vercel en la Fase 0). API en `functions/` (Pages Functions).
- BD/Auth: Supabase (Postgres + RLS). Imágenes en Cloudflare R2.
- Pagos: Mercado Pago Checkout Pro + transferencia.

## Comandos
- `npm run dev` — desarrollo (sirve también `/api/chat` local)
- `npm run build` — build a `dist/`

## Reglas
- Ramas: `fase/N-nombre` → PR a `develop` → PR a `main`. Nunca commit directo a `main`.
- Stock en **pares** (1 unidad = 1 caja). Solo se modifica con la función SQL `mover_stock`.
- Precios, totales, puntos y stock se calculan en el servidor; nunca confiar en el navegador.
- RLS en todas las tablas. La llave `service_role` solo vive en variables de entorno del servidor.
- Webhooks: verificar firma + idempotencia por id de evento.
- Secretos nunca en el repo (`.env.local` está ignorado; documentar en `.env.example`).
- **Nunca mencionar el nombre de la dueña en la web pública.**
- Español en UI, comentarios y commits.
- Al terminar una tarea de una fase, marcar su casilla en `docs/ARQUITECTURA.md`.
