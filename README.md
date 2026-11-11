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
Requiere [Docker](https://docs.docker.com/get-docker/), la [CLI de Supabase](https://supabase.com/docs/guides/local-development/cli/getting-started) y [Deno](https://docs.deno.com/runtime/getting_started/installation/) (para las pruebas de las funciones).
```bash
cp .env.example .env.local                                # frontend
cp supabase/functions/.env.example supabase/functions/.env  # funciones
supabase start              # Postgres + Auth locales; imprime la URL y la llave publicable
# pon esa URL y la llave sb_publishable_… en .env.local
supabase functions serve    # Edge Functions locales (otra terminal)
npm run dev                 # la consola del navegador debe decir "[AGO] Backend OK"
```
Nunca subas `.env.local` ni `supabase/functions/.env`.

### Catálogo
```bash
npm run semilla                                         # regenera supabase/seed.sql desde plantillas/catalogo-semilla.csv
node scripts/importar-catalogo.mjs archivo.xlsx --revisar   # valida una plantilla sin tocar nada
node scripts/importar-catalogo.mjs archivo.xlsx --fotos carpeta --aplicar   # carga en la BD local
```
Formato y detalles: [`plantillas/LEEME.md`](plantillas/LEEME.md).

### Pruebas (las mismas que corre el CI en cada push)
```bash
npm run lint                                   # ESLint
npm test                                       # Vitest (frontend)
deno test --allow-env tests/unit/funciones     # Edge Functions
supabase test db                               # pgTAP: permisos y funciones SQL
npm run test:concurrencia                      # última pieza comprada en paralelo (BD local)
npm audit --omit=dev --audit-level=high
```

## Stack
- **Frontend:** Vite + React 18, React Router, Zustand, GSAP → Cloudflare Pages
- **Backend:** Supabase Edge Functions (Deno/TS) + Supabase Cron
- **BD y Auth:** Supabase (Postgres + RLS)
- **Archivos:** Cloudflare R2
- **Pagos:** Mercado Pago Checkout Pro + transferencia · **Envíos:** Envia.com

## Estado
Ver el encabezado de [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md). La Fase 0 deja los cimientos (backend local, CI, seguridad base); las pantallas siguen con datos simulados hasta que cada fase las conecta a Supabase.
