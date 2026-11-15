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

### Cuentas del panel (no hay registro abierto)
```bash
export SUPABASE_SECRET_KEY=sb_secret_…          # la "Secret key" de `supabase status`
node scripts/cuentas-panel.mjs crear --correo dueña@ejemplo.mx --rol duena   # imprime una contraseña temporal
node scripts/cuentas-panel.mjs lista
node scripts/cuentas-panel.mjs reiniciar-mfa --correo dueña@ejemplo.mx        # perdió su teléfono (confirma identidad antes)
node scripts/cuentas-panel.mjs quitar --correo exayudante@ejemplo.mx
```
Al entrar a `/panel` por primera vez se da de alta la app autenticadora (Google o Microsoft Authenticator).

### Compras y pagos en local (Fase 3)
Sin cuenta de Mercado Pago se usa un **Mercado Pago simulado** que manda los avisos firmados igual que el real:
```bash
# 1) En supabase/functions/.env (además de lo de .env.example):
#    MP_ACCESS_TOKEN=TEST-local  MP_WEBHOOK_SECRET=<cualquier texto largo>
#    MP_API_URL=http://host.docker.internal:8090      (las funciones corren en Docker)
#    MP_NOTIFICATION_URL=http://127.0.0.1:55321/functions/v1/webhook-mercadopago
# 2) En otra terminal, con el MISMO secreto:
MP_SIM_HOST=0.0.0.0 MP_WEBHOOK_SECRET=<el mismo> MP_NOTIFICATION_URL=http://127.0.0.1:55321/functions/v1/webhook-mercadopago node scripts/mp-simulado.mjs
# 3) supabase functions serve  +  npm run dev  → compra en /checkout; MP simulado deja elegir aprobado, rechazado o SPEI.
#    Acreditar un SPEI pendiente: curl -X POST -d '{"status":"approved"}' http://127.0.0.1:8090/simular/pagos/<payment_id>
```
**Envíos (Fase 4)** sin cuenta de Envia: simulador local, igual que MP.
```bash
# supabase/functions/.env:  ENVIA_TOKEN=TEST-local  ENVIA_API_URL=http://host.docker.internal:8091  ENVIA_WEBHOOK_SECRET=<24+ caracteres>
MP_SIM_HOST=0.0.0.0 ENVIA_WEBHOOK_URL="http://127.0.0.1:55321/functions/v1/webhook-envia?s=<el mismo secreto>" node scripts/envia-simulado.mjs
# Mover una guía:  curl -X POST -d '{"trackingNumber":"SIM100001","status":"In transit"}' http://127.0.0.1:8091/simular/rastreo
```

**Mercado Libre (Fase 5)** sin la app de la clienta: simulador local (cuenta, 3 publicaciones de ejemplo, una con Full).
```bash
# supabase/functions/.env:  ML_APP_ID=123  ML_CLIENT_SECRET=local  ML_REDIRECT_URI=http://localhost:5173/panel/canales
#                           ML_API_URL=http://host.docker.internal:8092  ML_AUTH_URL=http://127.0.0.1:8092
MP_SIM_HOST=0.0.0.0 ML_APP_ID=123 ML_WEBHOOK_URL=http://127.0.0.1:55321/functions/v1/webhook-mercadolibre node scripts/ml-simulado.mjs
# Panel → Canales → Conectar. Simular una venta:  curl -X POST -d '{"item":"MLM100100","cantidad":1}' http://127.0.0.1:8092/simular/venta
```

**TikTok Shop (Fase 6)** sin app de Partner Center: simulador local (rechaza peticiones mal firmadas, como TikTok).
```bash
# supabase/functions/.env:  TT_APP_KEY=ttkey  TT_APP_SECRET=<cualquier texto>  TT_SERVICE_ID=999
#   TT_API_URL=http://host.docker.internal:8093  TT_AUTH_API_URL=http://host.docker.internal:8093  TT_AUTH_URL=http://127.0.0.1:8093/open/authorize
MP_SIM_HOST=0.0.0.0 TT_APP_KEY=ttkey TT_APP_SECRET=<el mismo> TT_WEBHOOK_URL=http://127.0.0.1:55321/functions/v1/webhook-tiktok node scripts/tiktok-simulado.mjs
# Simular una venta:  curl -X POST -d '{"producto":"1730000000000000001","sku":"1730000000000000101","cantidad":1}' http://127.0.0.1:8093/simular/venta
```

**Cuenta de clienta (Fase 7)** — código por correo, sin servicios externos: Supabase local manda el correo a
**Mailpit** (http://127.0.0.1:55324). En `/cuenta` escribe cualquier correo, abre Mailpit y copia el código de 6 dígitos.
- Supabase Auth exige **Turnstile** al pedir el código y al entrar al panel con contraseña (`[auth.captcha]` en `config.toml`,
  con la llave de prueba de Cloudflare). Necesitas `VITE_TURNSTILE_SITE_KEY` en `.env.local` y conexión a internet.
- El tope local es de **2 correos por hora** (`[auth.rate_limit] email_sent`): si pruebas mucho, espera o súbelo solo en tu copia.
- Para probar puntos sin comprar: `insert into public.puntos_movimientos (clienta_id, delta, motivo) select id, 200, 'ajuste' from public.clientas where correo = 'tu@correo';`

**En la nube (Fase 9), en el panel de Supabase → Authentication:** activar CAPTCHA con Turnstile y la llave secreta real;
"Confirm email" encendido; SMTP de **Resend** con el dominio verificado; pegar `supabase/templates/codigo.html` en las
plantillas *Confirm signup* y *Magic Link* (asunto: "Tu código para entrar a Pupilentes AGO"); OTP de 6 dígitos y 600 s.

Con credenciales de **prueba** reales de MP: deja `MP_API_URL` vacío, pon el access token de prueba y la clave secreta del webhook, y expón `webhook-mercadopago` con una URL https pública (MP no llama a `localhost`).

Con eso arriba también corren las pruebas de seguridad de las Fases 3 a 7 (las mismas del trabajo `integracion` del CI):
```bash
eval "$(supabase status -o env | sed 's/^/export /')"
SUPABASE_URL=$API_URL SUPABASE_PUBLISHABLE_KEY=$PUBLISHABLE_KEY SUPABASE_SECRET_KEY=$SECRET_KEY node --test --test-concurrency=1 "tests/seguridad/*.test.mjs"
```
Usan `TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA` (la de prueba de `.env.example`) y crean cuentas de panel de prueba con MFA real en tu BD local.

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
