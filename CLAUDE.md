# Pupilentes AGO — contexto para Claude

Tienda en línea de pupilentes de color (estéticos y graduados) + panel de la dueña. Proyecto de HummingX BI.

**Antes de trabajar, lee `docs/ARQUITECTURA.md`** (ramas, alcance, arquitectura, modelo de datos, fases, estado, decisiones pendientes ⚠️) y, si tocas UI, `docs/FRONTEND.md`.

## Ramas (importante)
- `main` = **proyecto real.** Se actualiza solo con PR.
- `fase/N-nombre` sale de `main` y regresa con PR a `main`.
- `demo` (+ tag `demo-v1`) = **la demo congelada.** No se modifica; solo se consulta o se trae código de ahí (p. ej. el chatbot).
- Mientras Vercel siga conectado al repo, **no subir código a `main`** (se publicaría en el link de la clienta). Ver ARQUITECTURA §0.2.

## Alcance en una línea
Funcionalidades de la demo hechas reales + Mercado Pago + sincronización de stock con Mercado Libre y TikTok Shop. El **chatbot está fuera de alcance** (fase futura): se oculta con `VITE_CHATBOT=false`.

## Frontend
La demo es **punto de partida, no diseño cerrado**: se conservan los componentes y se les cambia la fuente de datos (de `localStorage`/datos fijos a Supabase), una pantalla por fase. Lo visual se puede cambiar; las reglas de negocio de `docs/FRONTEND.md` §3 no.

## Stack
- Frontend: Vite + React 18, React Router, Zustand, GSAP → **Cloudflare Pages**.
- Backend: **Supabase Edge Functions** (Deno/TS, `supabase/functions`) + **Supabase Cron** (pg_cron + pg_net).
- BD/Auth: Supabase (Postgres + RLS + Auth). Login de clientas por código al correo (SMTP Resend).
- Archivos: **Cloudflare R2** (nunca Supabase Storage).
- Pagos: Mercado Pago Checkout Pro + transferencia. Envíos: Envia.com.

## Comandos
- `npm run dev` — frontend · `npm run build` — build a `dist/`
- (Fase 0+) `supabase start` · `supabase functions serve` · `supabase test db`

## Reglas
- Se trabaja y prueba **en local**; desplegar es una decisión aparte.
- Stock en **pares** (1 unidad = 1 caja). Solo se modifica con la función SQL `mover_stock`, llamada desde Edge Functions.
- Precios, totales, puntos y stock se calculan en el servidor; nunca confiar en el navegador.
- RLS en todas las tablas. La llave de servicio solo vive en los secrets de Supabase.
- Webhooks (`verify_jwt = false`): verificar firma + idempotencia por id de evento.
- Secretos nunca en el repo (documentar en `.env.example`).
- Datos de los que dependan decisiones (precios de servicios, límites) se citan con fuente.
- **Nunca mencionar el nombre de la dueña en la web pública.**
- Español en UI, comentarios y commits.
- Al terminar una tarea, marcar su casilla en `docs/ARQUITECTURA.md`; al cerrar una fase, actualizar el Estado y el Registro de cambios.
