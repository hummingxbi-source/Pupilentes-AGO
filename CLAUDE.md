# Pupilentes AGO — contexto para Claude

Tienda en línea de pupilentes de color (estéticos y graduados) + panel de la dueña. Proyecto de HummingX BI.

**Antes de trabajar, lee `docs/ARQUITECTURA.md`.** Ahí están las ramas, el alcance, la arquitectura, el modelo de datos, las fases, el estado actual y las decisiones pendientes (⚠️).

## Ramas (importante)
- `main` = **la demo que vio la clienta, congelada.** No hacer commits ni merges a `main` hasta el lanzamiento (Fase 9).
- `develop` = **todo el trabajo nuevo** (incluidos cambios a `docs/`).
- `fase/N-nombre` sale de `develop` y regresa con PR a `develop`.

## Alcance en una línea
Funcionalidades de la demo hechas reales + Mercado Pago + sincronización de stock con Mercado Libre y TikTok Shop. El **chatbot está fuera de alcance** (fase futura): se oculta con `VITE_CHATBOT=false`.

## Stack
- Frontend: Vite + React 18, React Router, Zustand, GSAP → **Cloudflare Pages**.
- Backend: **Supabase Edge Functions** (Deno/TS, `supabase/functions`) + **Supabase Cron** (pg_cron + pg_net).
- BD/Auth: Supabase (Postgres + RLS + Auth). Login de clientas por código al correo (SMTP Resend).
- Archivos: **Cloudflare R2** (nunca Supabase Storage).
- Pagos: Mercado Pago Checkout Pro + transferencia. Envíos: Envia.com.

## Comandos
- `npm run dev` — frontend
- `npm run build` — build a `dist/`
- (Fase 0+) `supabase start` — BD local · `supabase functions serve` — Edge Functions locales · `supabase test db` — pruebas pgTAP

## Reglas
- Stock en **pares** (1 unidad = 1 caja). Solo se modifica con la función SQL `mover_stock`, llamada desde Edge Functions.
- Precios, totales, puntos y stock se calculan en el servidor; nunca confiar en el navegador.
- RLS en todas las tablas. La llave de servicio solo vive en los secrets de Supabase.
- Webhooks (`verify_jwt = false`): verificar firma + idempotencia por id de evento.
- Secretos nunca en el repo (documentar en `.env.example`).
- Datos de los que dependan decisiones (precios de servicios, límites) se citan con fuente.
- **Nunca mencionar el nombre de la dueña en la web pública.**
- Español en UI, comentarios y commits.
- Al terminar una tarea, marcar su casilla en `docs/ARQUITECTURA.md`; al cerrar una fase, actualizar el Estado y el Registro de cambios.
