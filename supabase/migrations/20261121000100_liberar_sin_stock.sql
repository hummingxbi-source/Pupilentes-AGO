-- =============================================================================
-- Hallazgo H14 (Fase 8 · F2, X2): un pago tardío de una pieza que ya se vendió en ML/TikTok cae bien en
-- "pagado_sin_stock", pero su apartado seguía activo hasta vencer (stock 0 y apartado 1 → regla I1 rota
-- hasta 30 min, y una pieza repuesta en ese rato quedaba bloqueada). Ahora se libera en ese momento.
-- Mismo cuerpo que en 20261114000000_pedidos.sql + liberar_reserva en la rama de "sin stock".
-- =============================================================================
create or replace function privado.confirmar_pago(p_pedido uuid, p_usuario uuid default null)
returns text
language plpgsql security definer set search_path = '' as
$$
declare v_estado text;
begin
  select estado into v_estado from public.pedidos where id = p_pedido for update;
  if v_estado in ('pagado', 'preparando', 'enviado', 'entregado', 'pagado_sin_stock', 'reembolsado', 'contracargo') then
    return v_estado;                                   -- ya procesado (idempotente)
  end if;
  begin
    if not exists (select 1 from public.reservas_stock where pedido_id = p_pedido and estado = 'activa') then
      perform public.reservar_stock(p_pedido, 30);     -- pago tardío: ¿todavía hay?
    end if;
    perform public.confirmar_venta(p_pedido);
    perform public.cambiar_estado_pedido(p_pedido, 'pagado', p_usuario);
    update public.pedidos set pago_estado = 'aprobado', actualizado_en = now() where id = p_pedido;
    return 'pagado';
  exception when sqlstate 'P0001' then
    -- Solo los errores de stock se convierten en "pagado sin stock"; cualquier otro se propaga
    if sqlerrm not in ('sin_stock', 'sin_stock_fisico', 'reserva_no_activa') then raise; end if;
    -- El dinero entró pero la pieza ya no está: el apartado ya no sirve (H14)
    perform public.liberar_reserva(p_pedido);
    perform public.cambiar_estado_pedido(p_pedido, 'pagado_sin_stock', p_usuario);
    update public.pedidos set pago_estado = 'aprobado', actualizado_en = now() where id = p_pedido;
    insert into privado.alertas (tipo, detalle, pedido_id)
    values ('pagado_sin_stock', jsonb_build_object('folio', (select folio from public.pedidos where id = p_pedido), 'motivo', sqlerrm), p_pedido);
    return 'pagado_sin_stock';
  end;
end
$$;
