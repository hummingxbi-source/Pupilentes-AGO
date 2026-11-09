# Pupilentes AGO

Tienda en línea de pupilentes de color (estéticos y graduados) + panel de administración, con pagos de Mercado Pago y stock sincronizado con Mercado Libre y TikTok Shop. Proyecto de **HummingX BI**.

## Documentos (léelos en este orden)
1. **Este README**: cómo empezar.
2. [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md): alcance, arquitectura, modelo de datos, **fases**, seguridad y pruebas. Es la guía de todo el proyecto.
3. [`docs/FRONTEND.md`](docs/FRONTEND.md): la demo como punto de partida del diseño (qué es fijo y qué es libre).
4. [`CLAUDE.md`](CLAUDE.md): reglas para trabajar con Claude.

## Ramas
| Rama | Qué es |
|---|---|
| `main` | **Proyecto real.** Se actualiza solo con PR. |
| `fase/N-nombre` | Tu trabajo. Sale de `main` y regresa con PR. |
| `demo` | La demo que vio la clienta, **congelada** (tag `demo-v1`). Solo de referencia. |

## Empezar

```bash
git clone https://github.com/hummingxbi-source/Pupilentes-AGO.git
cd Pupilentes-AGO
npm install
npm run dev          # http://localhost:5173
```

Para trabajar una fase:
```bash
git checkout main && git pull
git checkout -b fase/1-catalogo     # ejemplo
# ...trabajas y pruebas en local...
git push -u origin fase/1-catalogo  # y abres un PR a main en GitHub
```

### Backend local (desde la Fase 0)
Requiere [Docker](https://docs.docker.com/get-docker/) y la [CLI de Supabase](https://supabase.com/docs/guides/local-development/cli/getting-started).
```bash
supabase start              # Postgres + Auth locales
supabase functions serve    # Edge Functions locales
supabase test db            # pruebas de base de datos
```
Copia `.env.example` a `.env.local` y llena las variables (nunca subas `.env.local`).

## Stack
- **Frontend:** Vite + React 18, React Router, Zustand, GSAP → Cloudflare Pages
- **Backend:** Supabase Edge Functions (Deno/TS) + Supabase Cron
- **BD y Auth:** Supabase (Postgres + RLS)
- **Archivos:** Cloudflare R2
- **Pagos:** Mercado Pago Checkout Pro + transferencia · **Envíos:** Envia.com

## Estado
Ver el encabezado de [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md). Hoy el código es el de la demo (todo simulado en el navegador); las fases lo van haciendo real.
