#!/usr/bin/env bash
# Fase 0 del plan de pruebas (docs/PLAN-PRUEBAS.md §1 y §3) en un solo comando, con la misma
# configuración que el CI (.github/workflows/ci.yml, trabajo `integracion`).
#
#   bash scripts/entorno-pruebas.sh                 todo: batería automática + entorno listo para probar a mano
#   bash scripts/entorno-pruebas.sh --sin-bateria   solo deja el entorno listo (no corre pruebas)
#   bash scripts/entorno-pruebas.sh --detener       apaga simuladores, funciones y Vite que levantó este script
#
# Necesita: Docker Desktop abierto, Supabase CLI, Node 22 y `npm install` hecho. Deno es opcional.
# BORRA la BD LOCAL (supabase db reset) para partir de la semilla. Nunca toca la nube.
# Todo lo que genera (secretos de prueba, registros, contraseñas temporales) queda en .pruebas/ (fuera del repo).
# No modifica tu supabase/functions/.env: las funciones se sirven con supabase/functions/.env.pruebas.
set -u
cd "$(dirname "$0")/.." || exit 1

DIR=.pruebas
LOGS=$DIR/logs
ENVF=supabase/functions/.env.pruebas
FUNC=http://127.0.0.1:55321/functions/v1
mkdir -p "$LOGS"

azul() { printf '\n\033[1;34m== %s\033[0m\n' "$*"; }
bien() { printf '   \033[32m✓\033[0m %s\n' "$*"; }
aviso() { printf '   \033[33m!\033[0m %s\n' "$*"; }
morir() { printf '\n\033[31m✗ %s\033[0m\n' "$*"; exit 1; }
escucha() { lsof -iTCP:"$1" -sTCP:LISTEN -t >/dev/null 2>&1; }
esperar() { # esperar <url> <segundos>
  local i=0; while [ "$i" -lt "$2" ]; do curl -s -o /dev/null "$1" && return 0; sleep 1; i=$((i + 1)); done; return 1
}
fondo() { # fondo <nombre> <comando...>: lo deja corriendo y guarda su PID
  local n=$1; shift
  nohup "$@" >"$LOGS/$n.log" 2>&1 &
  echo $! >"$DIR/$n.pid"
}

detener() {
  azul "Apagando lo que levantó este script"
  for f in "$DIR"/*.pid; do
    [ -f "$f" ] || continue
    kill "$(cat "$f")" 2>/dev/null && bien "$(basename "$f" .pid)"
    rm -f "$f"
  done
}

if [ "${1:-}" = "--detener" ]; then detener; exit 0; fi
BATERIA=1
[ "${1:-}" = "--sin-bateria" ] && BATERIA=0

# --- 1. Requisitos -----------------------------------------------------------------------------
azul "1/7 Requisitos"
docker info >/dev/null 2>&1 || morir "Docker no responde: abre Docker Desktop y vuelve a correr el script."
command -v supabase >/dev/null || morir "Falta la Supabase CLI (brew install supabase/tap/supabase)."
command -v node >/dev/null || morir "Falta Node 22."
[ -d node_modules/@playwright/test ] || morir "Falta 'npm install' (no está @playwright/test)."
bien "Docker, Supabase CLI y Node"
command -v deno >/dev/null && bien "Deno" || aviso "Sin Deno: se omiten las pruebas unitarias de las Edge Functions (las corre el CI)."
[ -f .env.local ] || morir "Falta .env.local (cp .env.example .env.local y pon la URL y la llave de 'supabase status')."

# --- 2. Supabase local -------------------------------------------------------------------------
azul "2/7 Supabase local"
supabase status >/dev/null 2>&1 || supabase start || morir "supabase start falló."
eval "$(supabase status -o env 2>/dev/null | sed 's/^/export /')"
export SUPABASE_URL="${API_URL:-http://127.0.0.1:55321}"
export SUPABASE_PUBLISHABLE_KEY="${PUBLISHABLE_KEY:-${ANON_KEY:-}}"
export SUPABASE_SECRET_KEY="${SECRET_KEY:-${SERVICE_ROLE_KEY:-}}"
[ -n "$SUPABASE_SECRET_KEY" ] || morir "No pude leer las llaves de 'supabase status -o env'."
bien "Arriba en $SUPABASE_URL"
grep -q "$SUPABASE_PUBLISHABLE_KEY" .env.local || aviso ".env.local no tiene la llave publicable de este Supabase local; la tienda podría no conectar."
supabase db reset >"$LOGS/db-reset.log" 2>&1 || morir "supabase db reset falló (ver $LOGS/db-reset.log)."
bien "BD reiniciada desde las migraciones y la semilla"

# --- 3. Secretos de prueba y configuración de las funciones -----------------------------------
azul "3/7 Configuración de prueba (igual que el CI)"
if [ ! -f "$DIR/secretos.env" ]; then
  {
    echo "MP_WEBHOOK_SECRET=$(openssl rand -hex 24)"
    echo "ENVIA_WEBHOOK_SECRET=$(openssl rand -hex 24)"
    echo "TT_APP_SECRET=$(openssl rand -hex 16)"
    echo "ML_CLIENT_SECRET=$(openssl rand -hex 16)"
  } >"$DIR/secretos.env"
fi
set -a; . "$DIR/secretos.env"; set +a
export CRON_SECRET=cron-local-solo-desarrollo   # igual a `secreto_cron` de Vault en seed.sql
export MP_NOTIFICATION_URL=$FUNC/webhook-mercadopago
cat >"$ENVF" <<EOF
# Generado por scripts/entorno-pruebas.sh: solo valores de PRUEBA y simuladores locales. No se sube al repo.
ORIGENES_PERMITIDOS=http://localhost:5173,http://127.0.0.1:5173
CRON_SECRET=$CRON_SECRET
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
SITIO_URL=http://localhost:5173
MP_ACCESS_TOKEN=TEST-local
MP_WEBHOOK_SECRET=$MP_WEBHOOK_SECRET
MP_NOTIFICATION_URL=$MP_NOTIFICATION_URL
MP_API_URL=http://host.docker.internal:8090
ENVIA_TOKEN=TEST-local
ENVIA_API_URL=http://host.docker.internal:8091
ENVIA_WEBHOOK_SECRET=$ENVIA_WEBHOOK_SECRET
ML_APP_ID=123
ML_CLIENT_SECRET=$ML_CLIENT_SECRET
ML_REDIRECT_URI=http://localhost:5173/panel/canales
ML_API_URL=http://host.docker.internal:8092
ML_AUTH_URL=http://127.0.0.1:8092
TT_APP_KEY=ttkey
TT_APP_SECRET=$TT_APP_SECRET
TT_SERVICE_ID=999
TT_API_URL=http://host.docker.internal:8093
TT_AUTH_API_URL=http://host.docker.internal:8093
TT_AUTH_URL=http://127.0.0.1:8093/open/authorize
EOF
bien "$ENVF (tu supabase/functions/.env queda igual)"

# --- 4. Simuladores, funciones y tienda --------------------------------------------------------
azul "4/7 Simuladores, Edge Functions y tienda"
detener >/dev/null 2>&1   # si quedaron de una corrida anterior
sim() { # sim <nombre> <puerto> <VAR=valor...> <script>
  local n=$1 p=$2; shift 2
  if escucha "$p"; then aviso "$n: el puerto $p ya está ocupado; uso el que está corriendo (debe tener los mismos secretos)"; return; fi
  fondo "$n" env MP_SIM_HOST=0.0.0.0 "$@"
  esperar "http://127.0.0.1:$p/" 20 && bien "$n en :$p" || morir "$n no arrancó (ver $LOGS/$n.log)."
}
sim mercadopago 8090 MP_WEBHOOK_SECRET="$MP_WEBHOOK_SECRET" MP_NOTIFICATION_URL="$MP_NOTIFICATION_URL" node scripts/mp-simulado.mjs
sim envia 8091 ENVIA_WEBHOOK_URL="$FUNC/webhook-envia?s=$ENVIA_WEBHOOK_SECRET" node scripts/envia-simulado.mjs
sim mercadolibre 8092 ML_APP_ID=123 ML_WEBHOOK_URL="$FUNC/webhook-mercadolibre" node scripts/ml-simulado.mjs
sim tiktok 8093 TT_APP_KEY=ttkey TT_APP_SECRET="$TT_APP_SECRET" TT_WEBHOOK_URL="$FUNC/webhook-tiktok" node scripts/tiktok-simulado.mjs

fondo funciones supabase functions serve --env-file "$ENVF"
seguidas=0; i=0
while [ "$i" -lt 120 ] && [ "$seguidas" -lt 3 ]; do   # el runtime puede reiniciarse una vez al cargar
  if curl -fs "$FUNC/salud" >/dev/null; then seguidas=$((seguidas + 1)); else seguidas=0; fi
  sleep 2; i=$((i + 1))
done
[ "$seguidas" -ge 3 ] && bien "Edge Functions en $FUNC" || morir "Las funciones no arrancaron (ver $LOGS/funciones.log). ¿Otro 'supabase functions serve' abierto? Ciérralo."

if escucha 5173; then aviso "Vite ya corre en :5173; lo reutilizo"
else fondo vite npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
  esperar http://127.0.0.1:5173/ 60 && bien "Tienda en http://localhost:5173" || morir "Vite no arrancó (ver $LOGS/vite.log)."
fi

# --- 5. Batería automática (la misma del CI) ---------------------------------------------------
NOMBRES=(); ESTADOS=()
correr() { # correr <nombre> <comando...>
  local n=$1; shift
  printf '   … %-28s' "$n"
  if "$@" >"$LOGS/bateria-$n.log" 2>&1; then printf '\r   \033[32m✓\033[0m %-28s\n' "$n"; ESTADOS+=("pasó")
  else printf '\r   \033[31m✗\033[0m %-28s → %s\n' "$n" "$LOGS/bateria-$n.log"; ESTADOS+=("FALLÓ"); fi
  NOMBRES+=("$n")
}
if [ "$BATERIA" = 1 ]; then
  azul "5/7 Batería automática"
  correr lint npm run lint
  correr unitarias npm test
  if command -v deno >/dev/null; then correr funciones deno test --allow-env tests/unit/funciones
  else NOMBRES+=("funciones"); ESTADOS+=("omitida (sin Deno)"); fi
  correr build npm run build
  correr audit npm run audit:ci
  correr pgtap supabase test db
  correr concurrencia npm run test:concurrencia
  correr seguridad node --test --test-concurrency=1 "tests/seguridad/*.test.mjs"
  correr humo npm run test:e2e:humo
  # Las pruebas dejan pedidos y cuentas en la BD: se reinicia para la prueba a mano.
  supabase db reset >"$LOGS/db-reset-2.log" 2>&1 && bien "BD reiniciada otra vez para probar a mano" || aviso "No se pudo reiniciar la BD tras la batería."
else
  azul "5/7 Batería automática (omitida con --sin-bateria)"
fi

# --- 6. Cuentas del panel y datos de prueba (§3 del plan) ---------------------------------------
azul "6/7 Cuentas del panel y datos de prueba"
: >"$DIR/cuentas.txt"
for par in "duena@prueba.mx duena" "ayudante@prueba.mx ayudante"; do
  set -- $par
  if node scripts/cuentas-panel.mjs crear --correo "$1" --rol "$2" >>"$DIR/cuentas.txt" 2>&1; then bien "$1 ($2)"
  else aviso "$1: no se pudo crear (ver $DIR/cuentas.txt)"; fi
done
cat >"$DIR/datos.mjs" <<'JS'
// Variantes de prueba (§3 del plan): stock 1 (última pieza), 0 (agotada) y 25 (tope de 10 en la tienda).
// Se mueve el stock con mover_stock, como el panel, para que la bitácora siga cuadrando (regla I2).
import pg from 'pg';
const c = new pg.Client(process.env.DB_URL || 'postgresql://postgres:postgres@127.0.0.1:55322/postgres');
await c.connect();
const { rows } = await c.query(`select v.id, v.sku, v.stock from public.variantes v join public.productos p on p.id = v.producto_id
  where v.activo and p.tipo = 'lente' and v.graduacion is null and v.stock_reservado = 0 order by v.sku limit 3`);
const metas = [1, 0, 25], ahora = Date.now();
for (const [i, v] of rows.entries()) {
  const delta = metas[i] - v.stock;
  if (delta) await c.query('select public.mover_stock($1, $2, $3, $4)', [v.id, delta, 'ajuste', `pruebas:fase0:${v.sku}:${ahora}`]);
  console.log(`   ✓ ${v.sku}: stock ${metas[i]}`);
}
await c.end();
JS
node "$DIR/datos.mjs" || aviso "No se pudieron preparar las variantes de prueba."

# --- 7. Resumen --------------------------------------------------------------------------------
azul "7/7 Listo"
FALLAS=0
if [ "$BATERIA" = 1 ]; then
  { echo "Batería del $(date '+%Y-%m-%d %H:%M') · commit $(git rev-parse --short HEAD)"
    for k in "${!NOMBRES[@]}"; do printf '%-14s %s\n' "${NOMBRES[$k]}" "${ESTADOS[$k]}"; done
  } | tee "$DIR/resultado.txt"
  for e in "${ESTADOS[@]}"; do [ "$e" = "FALLÓ" ] && FALLAS=$((FALLAS + 1)); done
fi
cat <<EOF

   Tienda ........ http://localhost:5173
   Panel ......... http://localhost:5173/panel   (cuentas y contraseñas temporales: $DIR/cuentas.txt)
   Correos ....... ${MAILPIT_URL:-http://127.0.0.1:55324}   (códigos de acceso de las clientas)
   Simuladores ... Mercado Pago :8090 · Envia :8091 · Mercado Libre :8092 · TikTok :8093
   Registros ..... $LOGS/

   Siguiente: enrolar el MFA de las dos cuentas y empezar la Fase 1 (docs/PLAN-PRUEBAS.md §4.1).
   Para apagar todo: bash scripts/entorno-pruebas.sh --detener
EOF
[ "$FALLAS" -eq 0 ] || { printf '\n\033[31m%s prueba(s) fallaron: no empieces la Fase 1 hasta revisarlas.\033[0m\n' "$FALLAS"; exit 1; }
