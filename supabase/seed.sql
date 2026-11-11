-- Semilla LOCAL (supabase db reset). No se aplica a proyectos en la nube.
-- El catálogo semilla llega en la Fase 1.

-- Secretos de Vault para que el cron local llame a `cron-conciliar` (ver migración *_cron.sql).
-- host.docker.internal llega a tu máquina desde el contenedor de Postgres en Docker Desktop (Mac/Windows).
-- El secreto debe ser igual a CRON_SECRET de supabase/functions/.env.
select vault.create_secret('http://host.docker.internal:55321', 'url_proyecto');
select vault.create_secret('cron-local-solo-desarrollo', 'secreto_cron');
