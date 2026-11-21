-- pgTAP · Fase 8 · H13: cambiar el colchón encola las publicaciones del canal (si su sincronización está encendida)
begin;
select plan(5);

create temp table v as select id from public.variantes where sku = 'UL-MINT-GREEN-ANU-N';
insert into public.publicaciones_canal (variante_id, canal, id_externo_item, id_externo_variante, logistica, activo)
values ((select id from v), 'ml', 'MLM999001', null, 'propia', true),
       ((select id from v), 'tiktok', '1739990000000000001', '1739990000000000101', 'propia', true),
       ((select id from public.variantes where sku = 'UL-STORM-GRAY-ANU-N'), 'ml', 'MLM999002', null, 'full', true);
delete from privado.cola_sync;

-- Sincronización apagada: cambiar el colchón no encola nada
update public.config_tienda set ml_sync_activo = false, tt_sync_activo = false, ml_colchon = 2 where id;
select is((select count(*)::int from privado.cola_sync), 0, 'sincronización apagada → no se encola');

-- ML encendida: se encolan sus publicaciones propias (no las Full ni las de TikTok)
update public.config_tienda set ml_sync_activo = true where id;
delete from privado.cola_sync;
update public.config_tienda set ml_colchon = 3 where id;
select is((select count(*)::int from privado.cola_sync where canal = 'ml'), 1, 'cambiar ml_colchon encola las publicaciones propias de ML');
select is((select count(*)::int from privado.cola_sync where canal = 'tiktok'), 0, '…y no las de TikTok');
select is((select count(*)::int from privado.cola_sync c join public.variantes x on x.id = c.variante_id where x.sku = 'UL-STORM-GRAY-ANU-N'), 0, '…ni las Full');

-- TikTok encendida
update public.config_tienda set tt_sync_activo = true where id;
delete from privado.cola_sync;
update public.config_tienda set tt_colchon = 1 where id;
select is((select count(*)::int from privado.cola_sync where canal = 'tiktok'), 1, 'cambiar tt_colchon encola las de TikTok');

select * from finish();
rollback;
