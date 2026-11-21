# Restaurar el respaldo de la BD

> Respaldo diario: `.github/workflows/respaldo.yml` (roles, esquema y datos con `supabase db dump`, comprimidos y cifrados
> con `age`, en el bucket privado de R2). Probado en local en la Fase 8 · F3 (S19, 20 nov 2026): la copia restaurada
> quedó **idéntica** (huellas md5 de `variantes` y `pedidos` iguales) y `scripts/revisar-reglas.mjs` en verde.
> **El respaldo NO trae los secretos de Vault ni los trabajos de `pg_cron`** (hallazgo H17): hay que recrearlos (paso 5).

## 1. Bajar y descifrar
```bash
aws s3 cp "s3://$R2_RESPALDO_BUCKET/bd/respaldo-AAAA-MM-DDTHHMMZ.tar.gz.age" . \
  --endpoint-url "https://$R2_CUENTA_ID.r2.cloudflarestorage.com"
age -d -i ~/llaves/respaldo-ago.txt -o respaldo.tar.gz respaldo-AAAA-MM-DDTHHMMZ.tar.gz.age   # llave PRIVADA de age (fuera de GitHub)
mkdir respaldo && tar -C respaldo -xzf respaldo.tar.gz      # roles.sql, esquema.sql, datos.sql
```

## 2. BD destino
Un proyecto de Supabase **nuevo** (o reiniciado), sin migraciones aplicadas. Necesita su servicio de Auth arrancado al
menos una vez: las tablas de `auth` las crea Supabase Auth, no Postgres (en la prueba local con una BD sin Auth, solo
fallaron los datos de `auth`, y el resto entró completo).

## 3. Restaurar (en este orden)
```bash
psql "$DESTINO_DB_URL" -v ON_ERROR_STOP=1 -f respaldo/roles.sql
psql "$DESTINO_DB_URL" -v ON_ERROR_STOP=1 -f respaldo/esquema.sql
psql "$DESTINO_DB_URL" -c "set session_replication_role = replica" -f respaldo/datos.sql   # sin disparar triggers
```

## 4. Revisar
```bash
DB_URL="$DESTINO_DB_URL" REGLAS_FOTO=/no-existe node scripts/revisar-reglas.mjs       # I1–I8b en verde
psql "$DESTINO_DB_URL" -Atc "select count(*) from public.pedidos; select count(*) from public.variantes; select count(*) from public.movimientos_stock"
```
Comparar los conteos con los del día del respaldo (los registra el latido `respaldo` en `privado.latidos`).

## 5. Lo que el respaldo no trae (H17): recrearlo
```sql
-- Secretos que usa el cron para llamar a las Edge Functions (mismos valores que en los secrets del proyecto)
select vault.create_secret('https://<ref>.supabase.co', 'url_proyecto');
select vault.create_secret('<CRON_SECRET>', 'secreto_cron');
-- El trabajo del cron (idéntico a supabase/migrations/20261111000100_cron.sql)
select cron.schedule('conciliar-cada-10-min', '*/10 * * * *', $$ select privado.llamar_funcion('cron-conciliar') $$);
```
- Mercado Libre y TikTok: sus tokens vivían en Vault → la dueña vuelve a **Conectar** cada canal en Panel → Canales
  (con H11 arreglado, reconectar la misma cuenta funciona). Los vínculos y la sincronización sí vienen en el respaldo.
- Comprobar: `select * from cron.job;` (1 fila) y, a los 10 min, `select * from privado.latidos where nombre = 'cron-conciliar'`.

## Prueba local (cómo se hizo en F3)
```bash
supabase db dump --local -f roles.sql --role-only
supabase db dump --local -f esquema.sql
supabase db dump --local -f datos.sql --use-copy --data-only
tar -czf respaldo.tar.gz roles.sql esquema.sql datos.sql
# (cifrar/descifrar con age: pendiente en esta Mac; age no estaba instalado)
docker run -d --name pruebas-restaurada -e POSTGRES_PASSWORD=postgres -p 55399:5432 public.ecr.aws/supabase/postgres:17.11.0.018
docker cp respaldo.tar.gz pruebas-restaurada:/tmp/ && docker exec pruebas-restaurada sh -c 'mkdir -p /tmp/r && tar -C /tmp/r -xzf /tmp/respaldo.tar.gz'
docker exec pruebas-restaurada psql -U postgres -h 127.0.0.1 -f /tmp/r/roles.sql
docker exec pruebas-restaurada psql -U postgres -h 127.0.0.1 -f /tmp/r/esquema.sql
docker exec pruebas-restaurada psql -U postgres -h 127.0.0.1 -c "set session_replication_role = replica" -f /tmp/r/datos.sql
DB_URL=postgresql://postgres:postgres@127.0.0.1:55399/postgres REGLAS_FOTO=/no-existe node scripts/revisar-reglas.mjs
docker rm -f pruebas-restaurada
```
