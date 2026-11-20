// §4.3 Dueña y §4.4 Ayudante · casos que no cubre a2 (docs/PLAN-PRUEBAS.md: D2–D4, D6, D8, D10–D13, D17–D20, Y1–Y3).
// Cada prueba crea su propia cuenta de panel (como scripts/cuentas-panel.mjs) y entra por la pantalla con MFA.
import { readFileSync, existsSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, expect } from '../_apoyo.mjs';
import {
  sql, uno, stockDe, lenteCon, nuevoTel, cuentaPanelNueva, entrarPanel, abrirPedidoEnPanel, crearPedidoApi, pagarConTarjeta,
  pagoCuadra, simuladoresAlcanzables, cerrarBd, compraPagadaDeInvitada, nuevoCorreo, admin, API, PUB, SEC, totp,
} from './_flujos.mjs';

test.afterAll(cerrarBd);
test.beforeEach(({ context }) => simuladoresAlcanzables(context));
const estadoDe = async (id) => (await uno('select estado from public.pedidos where id = $1', [id])).estado;
const idDe = async (folio) => (await uno('select id from public.pedidos where folio = $1', [folio])).id;

// ------------------------------------------------------------------------------------------- D2
test('D2 · perdió su teléfono: reiniciar-mfa con el script, vuelve a dar de alta su app y queda auditado', async ({ page }) => {
  const cuenta = await cuentaPanelNueva('duena');
  const viejo = await entrarPanel(page, cuenta);
  await page.locator('.pn-side').getByRole('button', { name: 'Salir' }).click();
  execFileSync('node', ['scripts/cuentas-panel.mjs', 'reiniciar-mfa', '--correo', cuenta.correo], {
    env: { ...process.env, SUPABASE_URL: API, SUPABASE_SECRET_KEY: SEC }, encoding: 'utf8',
  });
  const nuevo = await entrarPanel(page, cuenta);   // sin secreto: le pide el alta otra vez
  expect(nuevo).not.toBe(viejo);
  const aud = await uno(`select despues from public.auditoria_panel where accion = 'reiniciar_mfa' and registro = $1`, [cuenta.id]);
  expect(aud, 'quedó en auditoria_panel').toBeTruthy();
  expect(aud.despues.factores_borrados).toBe(1);
});

// ------------------------------------------------------------------------------------------- D3
test('D3 · 30 min sin tocar el panel: se cierra la sesión con aviso', async ({ page }) => {
  await page.clock.install();
  await entrarPanel(page, await cuentaPanelNueva('duena'));
  await page.clock.fastForward('31:00');
  await expect(page.getByText('Cerramos tu sesión tras 30 minutos sin actividad.')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('heading', { name: 'Hola de nuevo' })).toBeVisible();
});

// ------------------------------------------------------------------------------------------- D4
test('D4 · Hoy: pagos por validar, por enviar, pedidos recientes y stock bajo coinciden con la BD', async ({ page }) => {
  await crearPedidoApi(await lenteCon(), { metodo: 'transferencia' });
  await entrarPanel(page, await cuentaPanelNueva('duena'));
  const n = async (estados) => Number((await uno(`select count(*) as n from public.pedidos where estado = any($1)`, [estados])).n);
  const porValidar = await n(['pendiente_validacion']);
  const porEnviar = await n(['pagado', 'preparando']);
  const enCamino = await n(['enviado']);
  const kpi = (l) => page.locator('button.kpi', { hasText: l }).locator('.n');
  await expect(kpi('Pagos por validar')).toHaveText(String(porValidar));
  await expect(kpi('Por enviar')).toHaveText(String(porEnviar));
  await expect(kpi('En camino')).toHaveText(String(enCamino));
  const recientes = await sql(`select folio from public.pedidos order by creado_en desc limit 6`);
  const cajaRecientes = page.locator('section', { hasText: 'Pedidos recientes' });
  for (const r of recientes) await expect(cajaRecientes.getByText(r.folio.slice(-4), { exact: true })).toBeVisible();
  const bajos = await uno(`select count(*)::int as n from public.variantes v join public.productos p on p.id = v.producto_id join public.tonos t on t.id = v.tono_id
     where v.activo and t.activo and p.tipo = 'lente' and v.stock - v.stock_reservado <= 1`);
  await expect(page.getByText(new RegExp(`${bajos.n} variantes con 1 par o menos`))).toBeVisible();
});

// ------------------------------------------------------------------------------------------- D6
test('D6 · pedido de Metro pagado: "Marcar entregado" sin guía', async ({ page }) => {
  const p = await crearPedidoApi(await lenteCon());
  const id = await pagarConTarjeta(p.url_pago);
  await entrarPanel(page, await cuentaPanelNueva('duena'));
  const m = await abrirPedidoEnPanel(page, p.folio);
  await expect(m.getByRole('button', { name: 'Generar guía' })).toHaveCount(0);
  await m.getByRole('button', { name: 'Marcar entregado' }).click();
  await expect(page.locator('.toast')).toContainText('Listo.');
  expect(await estadoDe(id)).toBe('entregado');
  expect(await sql('select 1 from public.envios where pedido_id = $1', [id])).toEqual([]);
});

// ------------------------------------------------------------------------------------------- D8
test('D8 · cancelar un pedido pendiente libera el apartado; uno ya pagado no se cancela (solo reembolso)', async ({ page }) => {
  const lente = await lenteCon();
  const antes = await stockDe(lente.sku);
  const pend = await crearPedidoApi(lente, { metodo: 'transferencia' });
  const pagado = await crearPedidoApi(await lenteCon(1, [lente.sku]));
  await pagarConTarjeta(pagado.url_pago);
  await entrarPanel(page, await cuentaPanelNueva('duena'));

  let m = await abrirPedidoEnPanel(page, pend.folio);
  await m.getByRole('button', { name: 'Cancelar pedido' }).click();
  await m.getByRole('alertdialog').getByRole('button', { name: 'Sí, cancelar pedido' }).click();
  await expect(page.locator('.toast')).toContainText('Listo.');
  expect(await estadoDe(await idDe(pend.folio))).toBe('cancelado');
  expect(await stockDe(lente.sku)).toEqual(antes);

  m = await abrirPedidoEnPanel(page, pagado.folio);
  await expect(m.getByRole('button', { name: 'Cancelar pedido' })).toHaveCount(0);
  await expect(m.getByRole('button', { name: 'Reembolsar en Mercado Pago' })).toBeVisible();
});

// ------------------------------------------------------------------------------------------- D9
test('D9 · reembolsar antes de enviar: reembolsado, las piezas vuelven solas, I4 deja de aplicar', async ({ page }) => {
  const lente = await lenteCon();
  const antes = await stockDe(lente.sku);
  const p = await crearPedidoApi(lente);
  const id = await pagarConTarjeta(p.url_pago);
  await entrarPanel(page, await cuentaPanelNueva('duena'));
  const m = await abrirPedidoEnPanel(page, p.folio);
  await m.getByRole('button', { name: 'Reembolsar en Mercado Pago' }).click();
  await expect(m.getByRole('alertdialog')).toContainText('las piezas regresan solas al inventario');
  await m.getByRole('alertdialog').getByRole('button', { name: /^Sí, reembolsar/ }).click();
  await expect(page.locator('.toast')).toContainText('Listo.');
  await expect.poll(() => estadoDe(id), { timeout: 15_000 }).toBe('reembolsado');
  expect((await stockDe(lente.sku)).stock).toBe(antes.stock);
});

// ------------------------------------------------------------------------------------------ D10
test('D10 · el reembolso falla porque Mercado Pago no responde: error claro, el pedido no queda a medias y reintentar no duplica', async ({ page, vigia }, testInfo) => {
  test.setTimeout(120_000);
  vigia.permitir(/HTTP (502|409): .*panel-pedidos/);
  vigia.permitir(/consola: Failed to load resource: the server responded with a status of (502|409)/);
  const pidArchivo = '.pruebas/mercadopago.pid';
  test.skip(!existsSync(pidArchivo), 'sin .pruebas/mercadopago.pid (correr con scripts/entorno-pruebas.sh)');
  const pid = Number(readFileSync(pidArchivo, 'utf8'));
  const lente = await lenteCon();
  const antes = await stockDe(lente.sku);
  const p = await crearPedidoApi(lente);
  const id = await pagarConTarjeta(p.url_pago);
  await entrarPanel(page, await cuentaPanelNueva('duena'));
  const m = await abrirPedidoEnPanel(page, p.folio);
  process.kill(pid, 'SIGSTOP');                       // Mercado Pago "caído": no contesta
  try {
    await m.getByRole('button', { name: 'Reembolsar en Mercado Pago' }).click();
    await m.getByRole('alertdialog').getByRole('button', { name: /^Sí, reembolsar/ }).click();
    await expect(m.getByRole('alert')).toContainText('Mercado Pago no aceptó el reembolso', { timeout: 30_000 });
    expect(await estadoDe(id), 'el pedido sigue pagado (no a medias)').toBe('pagado');
    expect((await stockDe(lente.sku)).stock).toBe(antes.stock - 1);
  } finally {
    process.kill(pid, 'SIGCONT');
  }
  // La petición que quedó en la cola del simulador puede procesarse al volver (como un MP lento).
  // Se reintenta desde el panel y se comprueba que haya un solo reembolso y el stock vuelva una sola vez.
  await page.waitForTimeout(2000);
  const trasVolver = await estadoDe(id);
  testInfo.annotations.push({ type: 'D10', description: `estado al volver MP (antes de reintentar): ${trasVolver}` });
  if (trasVolver === 'pagado') {
    await m.getByRole('button', { name: 'Reembolsar en Mercado Pago' }).click();
    await m.getByRole('alertdialog').getByRole('button', { name: /^Sí, reembolsar/ }).click();
  }
  await expect.poll(() => estadoDe(id), { timeout: 20_000 }).toBe('reembolsado');
  const movs = await sql(`select motivo, delta from public.movimientos_stock where pedido_id = $1 order by creado_en`, [id]);
  expect(movs.filter((x) => x.delta > 0).length, 'el stock regresó una sola vez').toBe(1);
  expect((await stockDe(lente.sku)).stock).toBe(antes.stock);
  const pagos = await sql(`select estado from public.pagos where pedido_id = $1`, [id]);
  expect(pagos.filter((x) => x.estado === 'refunded').length, 'un solo pago reembolsado').toBeLessThanOrEqual(1);
});

// ------------------------------------------------------------------------------------------ D11
test('D11 · ajuste de stock con motivo (movimiento + auditoría); por debajo de lo apartado se rechaza', async ({ page, vigia }) => {
  vigia.permitir(/HTTP 409: .*panel-stock/);
  vigia.permitir(/consola: Failed to load resource: the server responded with a status of 409/);
  const lente = await lenteCon(2);
  await crearPedidoApi(lente, { metodo: 'transferencia' });           // deja 1 par apartado
  const v = await uno('select id, stock, stock_reservado, duracion from public.variantes where sku = $1', [lente.sku]);
  const cuenta = await cuentaPanelNueva('duena');
  await entrarPanel(page, cuenta);
  await page.goto('/panel/inventario');
  await page.locator(`[title^="${lente.sku} "]`).first().click();
  const modal = page.getByRole('dialog');
  await expect(modal.getByText(lente.sku)).toBeVisible();
  // Por debajo de lo apartado → rechazado
  await modal.getByLabel('Pares contados').fill(String(v.stock_reservado - 1));
  await modal.getByRole('button', { name: 'Guardar ajuste' }).click();
  await expect(modal.getByRole('alert')).toBeVisible();
  expect((await stockDe(lente.sku)).stock).toBe(v.stock);
  // Ajuste válido con motivo y nota
  await modal.getByLabel('Pares contados').fill(String(v.stock + 2));
  await modal.getByLabel('Motivo').selectOption('ajuste');
  await modal.getByLabel('Nota (opcional)').fill('conteo e2e');
  await modal.getByRole('button', { name: 'Guardar ajuste' }).click();
  await expect(page.locator('.toast')).toContainText(`${lente.sku}: ${v.stock} → ${v.stock + 2}`);
  expect((await stockDe(lente.sku)).stock).toBe(v.stock + 2);
  const mov = await uno(`select delta, motivo from public.movimientos_stock where variante_id = $1 order by creado_en desc limit 1`, [v.id]);
  expect(mov).toEqual({ delta: 2, motivo: 'ajuste' });
  const aud = await sql(`select accion from public.auditoria_panel where usuario = $1`, [cuenta.id]);
  expect(aud.length, 'I8: quedó en auditoría').toBeGreaterThan(0);
  // Regresa el stock como estaba (para las demás pruebas)
  await sql('select public.mover_stock($1, $2, $3, $4)', [v.id, -2, 'ajuste', `e2e:d11:regreso:${Date.now()}`]);
});

// ------------------------------------------------------------------------------------------ D12
test('D12 · Excel de inventario: exportar, importar con errores (no aplica nada), importar bien, importar el mismo otra vez (no duplica)', async ({ page }) => {
  await entrarPanel(page, await cuentaPanelNueva('duena'));
  await page.goto('/panel/inventario');
  const descarga = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar Excel' }).click();
  const d = await descarga;
  expect(d.suggestedFilename()).toMatch(/^inventario-ago-\d{4}-\d{2}-\d{2}\.xlsx$/);

  const lente = await lenteCon(1);
  const v = await uno('select id, stock from public.variantes where sku = $1', [lente.sku]);
  const dir = mkdtempSync(join(tmpdir(), 'e2e-excel-'));
  const malo = join(dir, 'malo.csv'), bueno = join(dir, 'bueno.csv');
  writeFileSync(malo, `sku,stock\n${lente.sku},-3\nNO-EXISTE-SKU,4\n`);
  writeFileSync(bueno, `sku,stock\n${lente.sku},${v.stock + 1}\n`);

  await page.locator('input[type=file][accept=".xlsx,.csv"]').setInputFiles(malo);
  await expect(page.getByRole('dialog', { name: 'No se pudo usar el archivo' })).toContainText('no es un entero ≥ 0');
  await page.getByRole('dialog').getByRole('button', { name: 'Cerrar' }).click();
  expect((await stockDe(lente.sku)).stock).toBe(v.stock);

  await page.locator('input[type=file][accept=".xlsx,.csv"]').setInputFiles(bueno);
  const prev = page.getByRole('dialog', { name: /Vista previa/ });
  await expect(prev).toContainText('1 cambios');
  await prev.getByRole('button', { name: 'Aplicar 1 cambios' }).click();
  await expect(page.locator('.toast')).toContainText('Inventario actualizado: 1 variantes');
  expect((await stockDe(lente.sku)).stock).toBe(v.stock + 1);

  await page.locator('input[type=file][accept=".xlsx,.csv"]').setInputFiles(bueno);
  const prev2 = page.getByRole('dialog', { name: /Vista previa/ });
  await expect(prev2).toContainText('0 cambios');
  await expect(prev2.getByRole('button', { name: /Aplicar/ })).toBeDisabled();
  expect((await stockDe(lente.sku)).stock).toBe(v.stock + 1);
  await sql('select public.mover_stock($1, $2, $3, $4)', [v.id, -1, 'ajuste', `e2e:d12:regreso:${Date.now()}`]);
});

// ------------------------------------------------------------------------------------------ D13
test('D13 · catálogo: cambio de precio y ocultar/mostrar un tono; la tienda lo refleja y queda auditado (I8)', async ({ page, context }) => {
  const lente = await lenteCon();
  const t = await uno('select v.tono_id, v.duracion, t.nombre from public.variantes v join public.tonos t on t.id = v.tono_id where v.sku = $1', [lente.sku]);
  const cuenta = await cuentaPanelNueva('duena');
  await entrarPanel(page, cuenta);
  await page.goto('/panel/catalogo');
  const nuevo = lente.precio + 11;
  const nombreDur = { trimestral: 'Trimestral', semestral: 'Semestral', anual: 'Anual' }[t.duracion] || '';
  const campo = page.getByLabel(`Precio ${t.nombre} ${t.duracion || ''}`.trim(), { exact: true }).or(page.getByLabel(`Precio ${t.nombre} ${t.duracion || ''}`));
  try {
    await campo.first().fill(String(nuevo));
    await campo.first().press('Enter');
    await expect(page.locator('.toast')).toContainText(`${t.nombre}: $${nuevo.toLocaleString('es-MX')}`);
    expect(Number((await uno('select precio from public.variantes where sku = $1', [lente.sku])).precio)).toBe(nuevo);
    const aud = await uno(`select 1 as ok from public.auditoria_panel where usuario = $1 and tabla = 'variantes'`, [cuenta.id]);
    expect(aud, 'I8: el cambio de precio quedó auditado').toBeTruthy();

    await page.getByRole('button', { name: `Mostrar ${t.nombre} en la tienda` }).click();
    await expect(page.locator('.toast')).toContainText(`${t.nombre} oculto en la tienda`);
    const tienda = await context.newPage();
    await tienda.goto('/tienda');
    await tienda.evaluate(() => localStorage.removeItem('ago-catalogo-v1'));
    await tienda.reload();
    await expect(tienda.getByText('Cargando catálogo…')).toBeHidden();
    await expect(tienda.locator('button.card', { hasText: t.nombre })).toHaveCount(0);
    await page.getByRole('button', { name: `Mostrar ${t.nombre} en la tienda` }).click();
    await expect(page.locator('.toast')).toContainText(`${t.nombre} visible en la tienda`);
    await tienda.evaluate(() => localStorage.removeItem('ago-catalogo-v1'));
    await tienda.reload();
    await expect(tienda.locator('button.card', { hasText: t.nombre }).first()).toBeVisible();
    await expect(tienda.locator('button.card', { hasText: t.nombre }).first()).toBeVisible();
    void nombreDur;
  } finally {
    await sql('update public.variantes set precio = $2 where sku = $1', [lente.sku, lente.precio]);
    await sql('update public.tonos set activo = true where id = $1', [t.tono_id]);
  }
});

// ------------------------------------------------------------------------------------------ D17
test('D17 · Clientas: aparece con sus compras y el WhatsApp sale prellenado', async ({ page }) => {
  const correo = nuevoCorreo('d17');
  const tel = nuevoTel();
  await compraPagadaDeInvitada(correo, { tel });
  const c = await uno('select nombre from public.clientas where lower(correo) = lower($1)', [correo]);
  await entrarPanel(page, await cuentaPanelNueva('duena'));
  await page.goto('/panel/clientas');
  const fila = page.locator('.cl-row').filter({ has: page.locator(`a[href*="${tel}"]`) });
  await expect(fila).toHaveCount(1);
  await expect(fila).toContainText('1 compra');
  const href = await fila.getByRole('link', { name: 'WhatsApp' }).getAttribute('href');
  expect(href).toContain(`wa.me/52${tel}`);
  expect(decodeURIComponent(href)).toContain('Hola');
  void c;
});

// ------------------------------------------------------------------------------------------ D18
test('D18 · alerta de pago sin stock: aparece en Hoy, "Ya la atendí" la quita y no reaparece', async ({ page }) => {
  // Pago tardío sin stock: la última pieza se vende mientras el pedido ya expiró.
  const lente = await lenteCon();
  const p = await crearPedidoApi(lente);
  const id = await idDe(p.folio);
  await sql(`update public.pedidos set expira_reserva_en = now() - interval '1 minute' where id = $1`, [id]);
  await sql(`update public.reservas_stock set expira_en = now() - interval '1 minute' where pedido_id = $1`, [id]);
  await sql('select public.liberar_reservas_vencidas()');
  const v = await uno('select id, stock, stock_reservado from public.variantes where sku = $1', [lente.sku]);
  const quitar = v.stock - v.stock_reservado;
  await sql('select public.mover_stock($1, $2, $3, $4)', [v.id, -quitar, 'ajuste', `e2e:d18:${Date.now()}`]);
  try {
    const pref = new URL(p.url_pago).searchParams.get('pref');
    await fetch('http://127.0.0.1:8090/simular', { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pref, status: 'approved' }) });
    await expect.poll(() => estadoDe(id), { timeout: 20_000 }).toBe('pagado_sin_stock');
    await entrarPanel(page, await cuentaPanelNueva('duena'));
    const alertas = page.getByRole('region', { name: 'Alertas' });
    const fila = alertas.locator('.task', { hasText: p.folio });
    await expect(fila).toBeVisible();
    await fila.getByRole('button', { name: 'Ya la atendí' }).click();
    await expect(alertas.locator('.task', { hasText: p.folio })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('heading', { name: /equipo AGO/ })).toBeVisible();
    await expect(page.locator('.task', { hasText: p.folio }).filter({ hasText: /!/ })).toHaveCount(0);
  } finally {
    const v2 = await uno('select stock from public.variantes where id = $1', [v.id]);
    if (v2.stock < v.stock) await sql('select public.mover_stock($1, $2, $3, $4)', [v.id, v.stock - v2.stock, 'ajuste', `e2e:d18:regreso:${Date.now()}`]);
  }
});

// ------------------------------------------------------------------------------------------ D19
// No hay pantalla para config_tienda (hallazgo H8). Se prueba lo que sí existe: la dueña con MFA puede
// cambiarla por la API, la BD rechaza valores fuera de rango, la ayudante no puede y la tienda refleja el cambio.
test('D19 · config_tienda: valores válidos se guardan y la tienda los refleja; fuera de rango o desde la ayudante se rechaza', async ({ page }) => {
  const { createClient } = await import('@supabase/supabase-js');
  async function sesionPanel(rol) {
    const c = await cuentaPanelNueva(rol);
    const cli = createClient(API, PUB, { auth: { persistSession: false, autoRefreshToken: false } });
    await cli.auth.signInWithPassword({ email: c.correo, password: c.clave, options: { captchaToken: 'XXXX.DUMMY.TOKEN.XXXX' } });
    const { data: f } = await cli.auth.mfa.enroll({ factorType: 'totp' });
    await cli.auth.mfa.challengeAndVerify({ factorId: f.id, code: totp(f.totp.secret) });
    return { cli, id: c.id };
  }
  const antes = await uno('select id, whatsapp, reserva_transfer_min from public.config_tienda limit 1');
  const duena = await sesionPanel('duena');
  try {
    const nuevoWa = '5598765432';
    const ok = await duena.cli.from('config_tienda').update({ whatsapp: nuevoWa }).eq('id', antes.id).select();
    expect(ok.error).toBeNull();
    expect(ok.data[0].whatsapp).toBe(nuevoWa);
    const mal = await duena.cli.from('config_tienda').update({ reserva_transfer_min: 5 }).eq('id', antes.id).select();
    expect(mal.error, 'fuera de rango → rechazado').toBeTruthy();
    const mal2 = await duena.cli.from('config_tienda').update({ clabe: '123' }).eq('id', antes.id).select();
    expect(mal2.error, 'CLABE inválida → rechazada').toBeTruthy();
    const aud = await uno(`select 1 as ok from public.auditoria_panel where usuario = $1 and tabla = 'config_tienda'`, [duena.id]);
    expect(aud, 'I8: quedó auditado').toBeTruthy();
    const ayud = await sesionPanel('ayudante');
    const r = await ayud.cli.from('config_tienda').update({ whatsapp: '5511111111' }).eq('id', antes.id).select();
    expect(r.data ?? [], 'la ayudante no puede').toEqual([]);
    expect((await uno('select whatsapp from public.config_tienda limit 1')).whatsapp).toBe(nuevoWa);
    // La tienda lo refleja: el enlace de WhatsApp del pedido usa el número nuevo
    const ped = await crearPedidoApi(await lenteCon(), { metodo: 'transferencia' });
    await page.goto(`/pedido/${ped.token}`);
    await expect(page.getByRole('link', { name: 'Escríbenos por WhatsApp' })).toHaveAttribute('href', new RegExp(`wa.me/52${nuevoWa}`));
  } finally {
    await sql('update public.config_tienda set whatsapp = $1 where id = $2', [antes.whatsapp, antes.id]);
  }
});

// ------------------------------------------------------------------------------------------ D20
test.describe('D20 · panel desde el teléfono (360 px)', () => {
  test.use({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });
  test('Hoy → pedido → aprobar transferencia y marcar entregado, sin salirse de la pantalla', async ({ page }) => {
    const p = await crearPedidoApi(await lenteCon(), { metodo: 'transferencia' });
    await entrarPanel(page, await cuentaPanelNueva('duena'));
    const sobra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(sobra, 'Hoy no se sale a lo ancho').toBeLessThanOrEqual(1);
    await expect(page.locator('nav.pn-tabs')).toBeVisible();
    let m = await abrirPedidoEnPanel(page, p.folio);
    await m.getByRole('button', { name: 'Aprobar pago' }).click();
    await expect(page.locator('.toast')).toContainText('Listo.');
    m = await abrirPedidoEnPanel(page, p.folio);
    await m.getByRole('button', { name: 'Marcar entregado' }).click();
    await expect(page.locator('.toast')).toContainText('Listo.');
    expect(await estadoDe(await idDe(p.folio))).toBe('entregado');
  });
});

// ============================================================================== §4.4 Ayudante
test('Y1 · Y2 · la ayudante avanza entregas y ve inventario y canales; no ve botones de dinero, stock, precios ni sincronización', async ({ page }) => {
  const trans = await crearPedidoApi(await lenteCon(), { metodo: 'transferencia' });
  const pag = await crearPedidoApi(await lenteCon());
  const idPag = await pagarConTarjeta(pag.url_pago);
  await entrarPanel(page, await cuentaPanelNueva('ayudante'));
  await expect(page.locator('.pn-side').getByText('Ayudante')).toBeVisible();

  // Transferencia: no puede aprobar ni cancelar
  let m = await abrirPedidoEnPanel(page, trans.folio);
  for (const b of ['Aprobar pago', 'Rechazar pago', 'Cancelar pedido']) await expect(m.getByRole('button', { name: b })).toHaveCount(0);
  await m.getByRole('button', { name: 'Cerrar' }).click();
  // Pagado: avanza la entrega, sin reembolsar
  m = await abrirPedidoEnPanel(page, pag.folio);
  await expect(m.getByRole('button', { name: /Reembolsar/ })).toHaveCount(0);
  await m.getByRole('button', { name: 'Marcar preparando' }).click();
  await expect(page.locator('.toast')).toContainText('Listo.');
  expect(await estadoDe(idPag)).toBe('preparando');

  // Inventario: ve, no ajusta ni importa
  await page.goto('/panel/inventario');
  await expect(page.getByRole('button', { name: 'Exportar Excel' })).toBeVisible();
  await expect(page.getByText('Importar Excel')).toHaveCount(0);
  await page.locator('table.inv td button').first().click();
  await expect(page.getByRole('dialog').getByText('Solo la dueña puede ajustar el stock.')).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Guardar ajuste' })).toHaveCount(0);
  await page.getByRole('dialog').getByRole('button', { name: 'Cerrar' }).click();
  // Catálogo: precios y switches deshabilitados, sin plantilla
  await page.goto('/panel/catalogo');
  await expect(page.locator('input[aria-label^="Precio "]').first()).toBeDisabled();
  await expect(page.locator('button.switch').first()).toBeDisabled();
  await expect(page.getByText('Agregar o actualizar con plantilla')).toHaveCount(0);
  // Canales: ve el estado, sin encender sincronización
  await page.goto('/panel/canales');
  await expect(page.getByRole('heading', { name: 'Canales' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Encender|Apagar/ })).toHaveCount(0);
});

test('Y2 · la ayudante intenta por la API lo que la pantalla le oculta: 403', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  const c = await cuentaPanelNueva('ayudante');
  const cli = createClient(API, PUB, { auth: { persistSession: false, autoRefreshToken: false } });
  await cli.auth.signInWithPassword({ email: c.correo, password: c.clave, options: { captchaToken: 'XXXX.DUMMY.TOKEN.XXXX' } });
  const { data: f } = await cli.auth.mfa.enroll({ factorType: 'totp' });
  const { data: v } = await cli.auth.mfa.challengeAndVerify({ factorId: f.id, code: totp(f.totp.secret) });
  const token = v.access_token;
  const trans = await crearPedidoApi(await lenteCon(), { metodo: 'transferencia' });
  const pedido = await idDe(trans.folio);
  const llamar = (fn, cuerpo) => fetch(`${API}/functions/v1/${fn}`, { method: 'POST', headers: { apikey: PUB, Authorization: `Bearer ${token}`, 'content-type': 'application/json', Origin: 'http://localhost:5173' }, body: JSON.stringify(cuerpo) }).then((r) => r.status);
  expect(await llamar('panel-pedidos', { accion: 'validar_transferencia', pedido, aprobar: true })).toBe(403);
  expect(await llamar('panel-pedidos', { accion: 'cancelar', pedido })).toBe(403);
  expect(await llamar('panel-pedidos', { accion: 'reembolsar', pedido })).toBe(403);
  const lente = await lenteCon();
  const s = await uno('select stock from public.variantes where sku = $1', [lente.sku]);
  expect(await llamar('panel-stock', { accion: 'aplicar', lote: crypto.randomUUID(), filas: [{ sku: lente.sku, nuevo: s.stock + 5, esperado: s.stock }], motivo: 'ajuste' })).toBe(403);
  const precio = await cli.from('variantes').update({ precio: 1 }).eq('sku', lente.sku).select();
  expect(precio.data ?? []).toEqual([]);
  expect(Number((await uno('select precio from public.variantes where sku = $1', [lente.sku])).precio)).toBe(lente.precio);
  expect(await llamar('panel-ml', { accion: 'sincronizacion', activa: true })).toBe(403);
  expect(await llamar('panel-ml', { accion: 'conectar' })).toBe(403);
  void admin;
});

test('Y3 · la dueña le quita la cuenta a la ayudante con el panel abierto: su siguiente acción falla', async ({ page, vigia }) => {
  vigia.permitir(/HTTP 40[13]: .*(panel-pedidos|rest\/v1)/);
  vigia.permitir(/consola: Failed to load resource: the server responded with a status of 40[13]/);
  const pag = await crearPedidoApi(await lenteCon());
  const id = await pagarConTarjeta(pag.url_pago);
  const c = await cuentaPanelNueva('ayudante');
  await entrarPanel(page, c);
  const m = await abrirPedidoEnPanel(page, pag.folio);
  execFileSync('node', ['scripts/cuentas-panel.mjs', 'quitar', '--correo', c.correo], { env: { ...process.env, SUPABASE_URL: API, SUPABASE_SECRET_KEY: SEC }, encoding: 'utf8' });
  await m.getByRole('button', { name: 'Marcar preparando' }).click();
  await expect(m.getByRole('alert')).toBeVisible();
  expect(await estadoDe(id), 'no avanzó').toBe('pagado');
  await pagoCuadra(id);
});
