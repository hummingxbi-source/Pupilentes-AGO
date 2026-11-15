-- =============================================================================
-- Fase 8 · Alertas completas (ARQUITECTURA Fase 8, §2.2, §6.1 regla 13)
--
-- Ya existían (Fases 3–6): webhook fallido 3 veces, pago sin stock, contracargo, monto distinto,
-- tokens de ML/TikTok que no se pudieron refrescar, sincronización fallida y cron sin correr.
-- Se agregan, revisadas por cron-conciliar cada 10 min con public.revisar_salud():
--   · bd_grande            la BD pasa de 400 MB (§2.2: el plan Free da 500 MB; a ~400 MB se decide pasar a Pro)
--   · respaldo_atrasado    el último respaldo diario tiene más de 36 h (respaldo.yml deja un latido 'respaldo')
--   · conciliacion_fallida el paso de Mercado Libre o TikTok del cron falló (lo reporta cron-conciliar)
-- Una alerta del mismo tipo no se repite mientras haya otra sin atender de las últimas 24 h, para no
-- llenar "Hoy" ni el correo con la misma alerta cada 10 minutos.
-- =============================================================================

create function privado.alerta_unica(p_tipo text, p_detalle jsonb, p_horas integer default 24)
returns boolean
language plpgsql security definer set search_path = '' as
$$
begin
  if exists (select 1 from privado.alertas where tipo = p_tipo and not atendida
               and creado_en > now() - make_interval(hours => p_horas)) then
    return false;
  end if;
  insert into privado.alertas (tipo, detalle) values (p_tipo, p_detalle);
  return true;
end
$$;

-- Revisión periódica. Devuelve lo que midió (va al latido del cron).
create function public.revisar_salud(p_limite_mb integer default 400)
returns jsonb
language plpgsql security definer set search_path = '' as
$$
declare
  v_mb       numeric := round(pg_database_size(current_database()) / 1048576.0, 1);
  v_respaldo timestamptz := (select ultima_corrida from privado.latidos where nombre = 'respaldo');
  v_alertas  text[] := '{}';
begin
  if v_mb > p_limite_mb and privado.alerta_unica('bd_grande', jsonb_build_object('mb', v_mb, 'limite_mb', p_limite_mb)) then
    v_alertas := array_append(v_alertas, 'bd_grande');
  end if;
  -- Solo después del primer respaldo (antes de crear el proyecto en la nube no hay respaldos)
  if v_respaldo is not null and v_respaldo < now() - interval '36 hours'
     and privado.alerta_unica('respaldo_atrasado', jsonb_build_object('ultimo', v_respaldo)) then
    v_alertas := array_append(v_alertas, 'respaldo_atrasado');
  end if;
  return jsonb_build_object('bd_mb', v_mb, 'ultimo_respaldo', v_respaldo, 'alertas_nuevas', to_jsonb(v_alertas));
end
$$;

-- cron-conciliar avisa que un paso de canal falló (sin datos personales: solo canal y mensaje corto)
create function public.alerta_conciliacion(p_canal text, p_error text)
returns boolean
language plpgsql security definer set search_path = '' as
$$
begin
  if p_canal not in ('ml', 'tiktok') then raise exception 'canal_invalido' using errcode = 'P0001'; end if;
  return privado.alerta_unica('conciliacion_fallida', jsonb_build_object('canal', p_canal, 'error', left(coalesce(p_error, ''), 200)));
end
$$;

revoke execute on function privado.alerta_unica(text, jsonb, integer) from public, anon, authenticated, service_role;
revoke execute on function public.revisar_salud(integer), public.alerta_conciliacion(text, text) from public, anon, authenticated;
grant execute on function public.revisar_salud(integer), public.alerta_conciliacion(text, text) to service_role;
