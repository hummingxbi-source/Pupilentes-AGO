// §4.1 Visitante e invitada · casos que no cubre a1 (docs/PLAN-PRUEBAS.md: U2, U3, U6–U10, U12, U14–U16, U18).
// El paso del tiempo (30 min, 24 h, 72 h) se simula moviendo la fecha límite del apartado y corriendo el cron real.
import { test, expect } from '../_apoyo.mjs';
import {
  sql, uno, stockDe, lenteCon, nuevoTel, agregarDesdeFicha, bolsaGuardada, llenarContacto, esperarBoton, pedidoDeLaUrl,
  pagoCuadra, simuladoresAlcanzables, cerrarBd, correrCron, vencerApartado, cajaHastaMercadoPago, crearPedidoApi,
  PAGINA_MP, SIM_MP,
} from './_flujos.mjs';

test.afterAll(cerrarBd);
test.beforeEach(({ context }) => simuladoresAlcanzables(context));
const estadoDe = async (id) => (await uno('select estado from public.pedidos where id = $1', [id])).estado;

// ------------------------------------------------------------------------------------------- U2
test('U2 · test de tono completo hasta la recomendación y "Lo quiero" abre la ficha', async ({ page }) => {
  await page.goto('/tono');
  await expect(page.getByText('Pregunta 1 de 6')).toBeVisible();
  await page.locator('.tq-opt').first().click();                               // 1 ojos
  await expect(page.getByText('Pregunta 2 de 6')).toBeVisible();
  await page.getByRole('button', { name: 'Siguiente' }).click();               // 2 efecto
  await expect(page.getByText('Pregunta 3 de 6')).toBeVisible();
  await page.locator('.tq-opt').first().click();
  await page.getByRole('button', { name: 'Siguiente' }).click();               // 3 familia
  await expect(page.getByText('Pregunta 4 de 6')).toBeVisible();
  await page.locator('.tq-opt').first().click();                               // 4 ocasión
  await expect(page.getByText('Pregunta 5 de 6')).toBeVisible();
  await page.locator('.tq-opt').first().click();                               // 5 piel
  await expect(page.getByText('Pregunta 6 de 6')).toBeVisible();
  await page.getByRole('button', { name: /^No/ }).click();                     // 6 sin graduación
  const quiero = page.getByRole('button', { name: /Lo quiero/ });
  await expect(quiero).toBeVisible();
  await quiero.click();
  await expect(page.getByRole('dialog').getByRole('button', { name: /Agregar a la bolsa|Sin existencia/ })).toBeVisible();
});

test.describe('U2 · probador con cámara', () => {
  test('con la cámara negada: mensaje claro y la tienda sigue usable', async ({ page, context }) => {
    await context.clearPermissions();
    await page.goto('/probador');
    await page.getByRole('button', { name: /Pruébalos en ti con la cámara/ }).click();
    await expect(page.getByText('No pudimos abrir la cámara. Revisa los permisos del navegador.')).toBeVisible({ timeout: 30_000 });
    await page.getByRole('dialog').getByRole('button', { name: 'Cerrar' }).click();
    await page.getByRole('button', { name: /Lo quiero/ }).click();
    await expect(page.getByRole('dialog').getByRole('button', { name: /Agregar a la bolsa|Sin existencia/ })).toBeVisible();
  });
});

// ------------------------------------------------------------------------------------------- U3
test('U3 · bolsa: agregar, cambiar cantidad (tope 5), quitar y recargar: se conserva', async ({ page }) => {
  const lente = await lenteCon();
  await agregarDesdeFicha(page, lente.tono);
  const bolsa = page.getByRole('dialog', { name: /Tu bolsa/ });
  for (let i = 0; i < 6; i++) await bolsa.getByRole('button', { name: 'Más' }).click();
  await expect(bolsa.locator('.qty span')).toHaveText('5');                     // U14: tope de 5 por renglón en pantalla
  await bolsa.getByRole('button', { name: 'Menos' }).click();
  await expect(bolsa.locator('.qty span')).toHaveText('4');
  await page.keyboard.press('Escape');
  // Accesorio y quitarlo
  await page.getByRole('button', { name: 'Accesorios' }).click();
  await page.getByRole('button', { name: /^Agregar / }).first().click();
  await expect(bolsa.locator('.bag-item')).toHaveCount(2);
  await bolsa.locator('.bag-item').nth(1).getByRole('button', { name: 'Quitar' }).click();
  await expect(bolsa.locator('.bag-item')).toHaveCount(1);
  await page.reload();
  await page.getByRole('button', { name: /Bolsa, 4 piezas/ }).click();
  await expect(page.getByRole('dialog', { name: /Tu bolsa · 4/ })).toBeVisible();
  expect((await bolsaGuardada(page)).map((b) => [b.sku, b.cant])).toEqual([[lente.sku, 4]]);
});

// H5: al volver, la bolsa toma el precio de hoy y lo avisa.
test('U3 · H5 · si la dueña cambia el precio, la bolsa muestra el precio nuevo al volver y lo avisa', async ({ page }) => {
  const lente = await lenteCon();
  await agregarDesdeFicha(page, lente.tono);
  const nuevo = lente.precio + 37;
  await sql('update public.variantes set precio = $2 where sku = $1', [lente.sku, nuevo]);
  try {
    await page.evaluate(() => localStorage.removeItem('ago-catalogo-v1'));   // "al día siguiente": caché vencida
    await page.reload();
    await expect(page.locator('.toast')).toHaveText(/Actualizamos el precio de 1 pieza\./, { timeout: 10_000 });
    await page.getByRole('button', { name: /Bolsa, 1 piezas/ }).click();
    await expect(page.getByRole('dialog', { name: /Tu bolsa/ }).locator('.bag-item')).toContainText(`$${nuevo.toLocaleString('es-MX')}`, { timeout: 3000 });
    expect((await bolsaGuardada(page))[0].precio).toBe(nuevo);
  } finally {
    await sql('update public.variantes set precio = $2 where sku = $1', [lente.sku, lente.precio]);
  }
});

// ------------------------------------------------------------------------------------------ U15
test('U15 · el precio cambia mientras está en la caja: ve el total nuevo antes de pagar y paga ese', async ({ page, vigia }) => {
  vigia.permitir(/HTTP 409: .*pedidos-crear/);
  vigia.permitir(/consola: Failed to load resource: the server responded with a status of 409/);
  const lente = await lenteCon();
  const nuevo = lente.precio + 50;
  try {
    await agregarDesdeFicha(page, lente.tono);
    await page.getByRole('button', { name: 'Elegir entrega' }).click();
    await llenarContacto(page, { telefono: nuevoTel() });
    await page.getByRole('button', { name: /Entrega en Metro/ }).click();
    await page.getByRole('button', { name: 'Ir al pago' }).click();
    await sql('update public.variantes set precio = $2 where sku = $1', [lente.sku, nuevo]);
    await (await esperarBoton(page, /Pagar .* con Mercado Pago/)).click();
    await expect(page.getByRole('alert')).toContainText(`El total cambió a $${nuevo.toLocaleString('es-MX')}`);
    await expect(page.locator('.cx-sum .sum.t')).toContainText(`$${nuevo.toLocaleString('es-MX')}`);
    expect(await uno('select count(*)::int as n from public.pedidos where total = $1 and creado_en > now() - interval \'1 minute\'', [nuevo]))
      .toEqual({ n: 0 });
    await (await esperarBoton(page, new RegExp(`Pagar \\$${nuevo.toLocaleString('es-MX')} con Mercado Pago`))).click();
    await expect(page).toHaveURL(PAGINA_MP);
    const pref = new URL(page.url()).searchParams.get('pref');
    const p = await uno('select total from public.pedidos where mp_preferencia_id = $1', [pref]);
    expect(Number(p.total)).toBe(nuevo);
  } finally {
    await sql('update public.variantes set precio = $2 where sku = $1', [lente.sku, lente.precio]);
  }
});

// ------------------------------------------------------------------------------------------- U6
test('U6 · tarjeta rechazada y reintento con otra tarjeta en el mismo pedido: un solo pedido, pagado al segundo intento', async ({ page }) => {
  const lente = await lenteCon();
  const tel = nuevoTel();
  const pref = await cajaHastaMercadoPago(page, lente, tel);
  await page.getByRole('button', { name: 'Tarjeta rechazada' }).click();
  await expect(page.getByRole('heading', { name: 'Mercado Pago rechazó el pago' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/Puedes volver a intentarlo con otra tarjeta/)).toBeVisible();
  await page.goBack();                                                          // regresa a la página de Mercado Pago
  await expect(page).toHaveURL(PAGINA_MP);
  await page.getByRole('button', { name: 'Pagar con tarjeta (aprobado)' }).click();
  await expect(page.getByRole('heading', { name: 'Pago confirmado' })).toBeVisible({ timeout: 30_000 });
  const pedidos = await sql(`select id, estado from public.pedidos where contacto->>'telefono' = $1`, [tel]);
  expect(pedidos.length, 'un solo pedido').toBe(1);
  expect(pedidos[0].estado).toBe('pagado');
  const pagos = await sql('select estado from public.pagos where pedido_id = $1 order by creado_en', [pedidos[0].id]);
  expect(pagos.map((x) => x.estado)).toEqual(expect.arrayContaining(['rejected', 'approved']));
  await pagoCuadra(pedidos[0].id);
  void pref;
});

// ------------------------------------------------------------------------------------------- U7
test('U7 · pago abandonado: al vencer los 30 min el pedido expira, el stock vuelve y la clienta lo ve', async ({ page }) => {
  const lente = await lenteCon();
  const antes = await stockDe(lente.sku);
  const pref = await cajaHastaMercadoPago(page, lente, nuevoTel());
  const p = await uno('select id, token_rastreo, expira_reserva_en, creado_en from public.pedidos where mp_preferencia_id = $1', [pref]);
  expect((new Date(p.expira_reserva_en) - new Date(p.creado_en)) / 6e4, 'apartado de 30 min').toBeCloseTo(30, 0);
  await vencerApartado(p.id);
  await correrCron();
  expect(await estadoDe(p.id)).toBe('expirado');
  expect(await stockDe(lente.sku)).toEqual(antes);
  await page.goto(`http://127.0.0.1:5173/pedido/${p.token_rastreo}`);
  await expect(page.getByRole('heading', { name: 'El apartado venció' })).toBeVisible();
});

// ------------------------------------------------------------------------------------------- U8
test('U8 · SPEI pendiente que después se acredita: pasa a pagado', async ({ page }) => {
  const lente = await lenteCon();
  await cajaHastaMercadoPago(page, lente, nuevoTel());
  await page.getByRole('button', { name: 'SPEI (pendiente)' }).click();
  const ped = await pedidoDeLaUrl(page);
  expect(ped.estado).toBe('pendiente_pago');
  const pago = await uno(`select id_externo from public.pagos where pedido_id = $1 and estado = 'pending'`, [ped.id]);
  const r = await fetch(`${SIM_MP}/simular/pagos/${pago.id_externo}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'approved' }) });
  expect(r.ok).toBe(true);
  await expect.poll(() => estadoDe(ped.id), { timeout: 20_000 }).toBe('pagado');
  await pagoCuadra(ped.id);
  // La página que dejó abierta se actualiza sola (consulta cada 5 s)
  await expect(page.getByRole('heading', { name: 'Pago confirmado' })).toBeVisible({ timeout: 15_000 });
});

test('U8 · SPEI que nunca se paga: a las 72 h el pedido expira y el stock vuelve', async ({ page }) => {
  const lente = await lenteCon();
  const antes = await stockDe(lente.sku);
  await cajaHastaMercadoPago(page, lente, nuevoTel());
  await page.getByRole('button', { name: 'SPEI (pendiente)' }).click();
  const ped = await pedidoDeLaUrl(page);
  await vencerApartado(ped.id);
  await correrCron();
  expect(await estadoDe(ped.id)).toBe('expirado');
  expect(await stockDe(lente.sku)).toEqual(antes);
});

// ------------------------------------------------------------------------------------------- U9
test('U9 · el pago aprobado llega tarde (pedido ya expirado) y aún hay stock: se confirma', async ({ page }) => {
  const lente = await lenteCon();
  const antes = await stockDe(lente.sku);
  const pref = await cajaHastaMercadoPago(page, lente, nuevoTel());
  const p = await uno('select id from public.pedidos where mp_preferencia_id = $1', [pref]);
  await vencerApartado(p.id);
  await correrCron();
  expect(await estadoDe(p.id)).toBe('expirado');
  await page.getByRole('button', { name: 'Pagar con tarjeta (aprobado)' }).click();   // pagó en la pestaña que dejó abierta
  await expect.poll(() => estadoDe(p.id), { timeout: 20_000 }).toBe('pagado');
  await pagoCuadra(p.id);
  const s = await stockDe(lente.sku);
  expect(s.stock).toBe(antes.stock - 1);
  expect(s.stock_reservado).toBe(antes.stock_reservado);
});

// ------------------------------------------------------------------------------------------ U10
test('U10 · Metro (2 estaciones gratis, otra $60) y DiDi por alcaldía: costos del servidor, días sin domingo, 3 horarios', async ({ page }) => {
  const lente = await lenteCon();
  const tarifas = await sql(`select tipo, zona, costo from public.tarifas_entrega where activo order by tipo, zona`).catch(() => sql('select tipo, zona, costo from public.entregas_publicas'));
  await agregarDesdeFicha(page, lente.tono);
  await page.getByRole('button', { name: 'Elegir entrega' }).click();
  await llenarContacto(page, { telefono: nuevoTel() });

  await page.getByRole('button', { name: /Entrega en Metro/ }).click();
  for (const est of ['Pantitlán', 'Tepalcates']) {
    await page.getByRole('button', { name: `Metro ${est}`, exact: true }).click();
    await expect(page.locator('.cx-sum')).toContainText('Gratis');
  }
  const dias = await page.locator('.field', { hasText: 'Día' }).locator('button.chip').allInnerTexts();
  expect(dias.length).toBe(5);
  expect(dias.some((d) => /^dom/i.test(d)), 'sin domingos').toBe(false);
  expect(await page.locator('.field', { hasText: 'Hora' }).locator('button.chip').allInnerTexts()).toEqual(['12:00', '15:30', '18:00']);

  await page.getByRole('button', { name: /Otra estación de Metro/ }).click();
  const otra = tarifas.find((t) => t.tipo === 'metro_otra');
  await expect(page.locator('.cx-sum')).toContainText(`$${Number(otra.costo)}`);
  await expect(page.getByRole('button', { name: 'Ir al pago' })).toBeDisabled();       // falta la estación
  await page.getByLabel('¿Qué estación?').fill('Zaragoza');
  await expect(page.getByRole('button', { name: 'Ir al pago' })).toBeEnabled();

  await page.getByRole('button', { name: /Envío por DiDi/ }).click();
  const didi = tarifas.filter((t) => t.tipo === 'didi');
  expect(didi.length).toBeGreaterThanOrEqual(3);
  for (const t of didi.slice(0, 3)) {
    await page.getByLabel('Alcaldía o municipio').selectOption(t.zona);
    await expect(page.locator('.cx-sum')).toContainText(`$${Number(t.costo)}`);
  }
  // Se compra con la tercera alcaldía y el servidor cobra esa tarifa
  await page.getByLabel('Calle y número').fill('Calle 5 de Mayo 22');
  await page.getByLabel('Colonia').fill('Centro');
  await page.getByRole('button', { name: 'Ir al pago' }).click();
  await page.getByRole('button', { name: /Transferencia directa/ }).click();
  await (await esperarBoton(page, 'Apartar y ver datos de transferencia')).click();
  const ped = await pedidoDeLaUrl(page);
  const p = await uno(`select envio, entrega from public.pedidos where id = $1`, [ped.id]);
  expect(p.entrega.zona).toBe(didi[2].zona);
  expect(Number(p.envio)).toBe(Number(didi[2].costo));
});

// ------------------------------------------------------------------------------------------ U12
test('U12 · transferencia que nadie paga en 24 h: el pedido expira y el apartado se libera', async () => {
  const lente = await lenteCon();
  const antes = await stockDe(lente.sku);
  const r = await crearPedidoApi(lente, { metodo: 'transferencia' });
  const p = await uno('select id, expira_reserva_en, creado_en from public.pedidos where folio = $1', [r.folio]);
  expect((new Date(p.expira_reserva_en) - new Date(p.creado_en)) / 36e5).toBeCloseTo(24, 1);
  expect((await stockDe(lente.sku)).stock_reservado).toBe(antes.stock_reservado + 1);
  await vencerApartado(p.id);
  await correrCron();
  expect(await estadoDe(p.id)).toBe('expirado');
  expect(await stockDe(lente.sku)).toEqual(antes);
});

// ------------------------------------------------------------------------------------------ U14
test('U14 · más de 10 pares en el pedido: la caja lo rechaza con mensaje claro y no crea pedido', async ({ page, vigia }) => {
  vigia.permitir(/HTTP 400: .*pedidos-crear/);
  vigia.permitir(/consola: Failed to load resource: the server responded with a status of 400/);
  const a = await lenteCon();
  const b = await lenteCon(1, [a.sku]);
  const c = await lenteCon(1, [a.sku, b.sku]);
  const tel = nuevoTel();
  for (const l of [a, b, c]) {
    await agregarDesdeFicha(page, l.tono);
    const bolsa = page.getByRole('dialog', { name: /Tu bolsa/ });
    const fila = bolsa.locator('.bag-item', { hasText: l.tono });
    for (let i = 0; i < 4; i++) await fila.getByRole('button', { name: 'Más' }).click();
    if (l !== c) await page.keyboard.press('Escape');
  }
  await expect(page.getByRole('dialog', { name: 'Tu bolsa · 15' })).toBeVisible();
  await page.getByRole('button', { name: 'Elegir entrega' }).click();
  await llenarContacto(page, { telefono: tel });
  await page.getByRole('button', { name: /Entrega en Metro/ }).click();
  await page.getByRole('button', { name: 'Ir al pago' }).click();
  await (await esperarBoton(page, /Pagar .* con Mercado Pago/)).click();
  await expect(page.getByRole('alert')).toContainText(/10/);
  expect(await sql(`select 1 from public.pedidos where contacto->>'telefono' = $1`, [tel])).toEqual([]);
});

test('U14 · 4.º pedido sin pagar del mismo teléfono: la caja lo rechaza con mensaje claro', async ({ page, vigia }) => {
  vigia.permitir(/HTTP 4(09|29|00): .*pedidos-crear/);
  vigia.permitir(/consola: Failed to load resource: the server responded with a status of 4(09|29|00)/);
  // Los 3 pedidos pendientes pueden ser de piezas distintas: el tope es por teléfono.
  const tel = nuevoTel();
  const usados = [];
  for (let i = 0; i < 3; i++) { const l = await lenteCon(1, usados); usados.push(l.sku); await crearPedidoApi(l, { metodo: 'transferencia', tel }); }
  const lente = await lenteCon(1, usados);
  await agregarDesdeFicha(page, lente.tono);
  await page.getByRole('button', { name: 'Elegir entrega' }).click();
  await llenarContacto(page, { telefono: tel });
  await page.getByRole('button', { name: /Entrega en Metro/ }).click();
  await page.getByRole('button', { name: 'Ir al pago' }).click();
  await page.getByRole('button', { name: /Transferencia directa/ }).click();
  await (await esperarBoton(page, 'Apartar y ver datos de transferencia')).click();
  const alerta = page.getByRole('alert');
  await expect(alerta).toBeVisible();
  const texto = await alerta.innerText();
  expect(texto, 'menciona los pedidos pendientes').toMatch(/pedido/i);
  expect((await sql(`select 1 from public.pedidos where contacto->>'telefono' = $1`, [tel])).length).toBe(3);
});

// ------------------------------------------------------------------------------------------ U16
test('U16 · cotización de paquetería vencida (más de 30 min en la caja): se le pide cotizar otra vez', async ({ page, vigia }) => {
  vigia.permitir(/HTTP 4\d\d: .*pedidos-crear/);
  vigia.permitir(/consola: Failed to load resource: the server responded with a status of 4\d\d/);
  const lente = await lenteCon();
  const tel = nuevoTel();
  await agregarDesdeFicha(page, lente.tono);
  await page.getByRole('button', { name: 'Elegir entrega' }).click();
  await llenarContacto(page, { telefono: tel });
  await page.getByRole('button', { name: /Paquetería a todo México/ }).click();
  await page.getByLabel('Calle').fill('Av. Reforma');
  await page.getByLabel('Colonia').fill('Juárez');
  await page.getByLabel('Código postal').fill('06600');
  await page.getByLabel('Ciudad o municipio').fill('Cuauhtémoc');
  await page.getByLabel('Estado').fill('CDMX');
  const cot = page.waitForResponse((r) => r.url().includes('/envios-cotizar'));
  await (await esperarBoton(page, 'Ver opciones de envío')).click();
  const { opciones } = await (await cot).json();
  await page.locator('button.opt', { hasText: '·' }).filter({ hasText: '$' }).first().click();
  await page.getByRole('button', { name: 'Ir al pago' }).click();
  await sql(`update privado.cotizaciones_envio set expira_en = now() - interval '1 minute' where id = $1`, [opciones[0].id]);
  await (await esperarBoton(page, /Pagar .* con Mercado Pago/)).click();
  await expect(page.getByRole('heading', { name: /Cómo lo quieres/ })).toBeVisible();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ver opciones de envío' })).toBeVisible();
  expect(await sql(`select 1 from public.pedidos where contacto->>'telefono' = $1`, [tel])).toEqual([]);
});

// ------------------------------------------------------------------------------------------ U18
test('U18 · sin internet al pagar: mensaje claro y no se crea un pedido a medias', async ({ page, context, vigia }) => {
  vigia.permitir(/consola: Failed to load resource: net::ERR_INTERNET_DISCONNECTED/);
  const lente = await lenteCon();
  const tel = nuevoTel();
  await agregarDesdeFicha(page, lente.tono);
  await page.getByRole('button', { name: 'Elegir entrega' }).click();
  await llenarContacto(page, { telefono: tel });
  await page.getByRole('button', { name: /Entrega en Metro/ }).click();
  await page.getByRole('button', { name: 'Ir al pago' }).click();
  const pagar = await esperarBoton(page, /Pagar .* con Mercado Pago/);
  await context.setOffline(true);
  await pagar.click();
  await expect(page.getByRole('alert')).toBeVisible({ timeout: 30_000 });
  await context.setOffline(false);
  expect(await sql(`select 1 from public.pedidos where contacto->>'telefono' = $1`, [tel])).toEqual([]);
  // La bolsa sigue ahí para reintentar
  expect((await bolsaGuardada(page)).length).toBe(1);
});

test('U18 · H6 · Turnstile bloqueado (bloqueador de anuncios): la clienta ve un aviso y puede reintentar', async ({ page, context, vigia }) => {
  vigia.permitir(/consola: Failed to load resource: net::ERR_FAILED/);
  let bloqueado = true;
  await context.route(/challenges\.cloudflare\.com/, (r) => (bloqueado ? r.abort() : r.continue()));
  const lente = await lenteCon();
  await agregarDesdeFicha(page, lente.tono);
  await page.getByRole('button', { name: 'Elegir entrega' }).click();
  await llenarContacto(page, { telefono: nuevoTel() });
  await page.getByRole('button', { name: /Entrega en Metro/ }).click();
  await page.getByRole('button', { name: 'Ir al pago' }).click();
  await expect(page.getByRole('button', { name: /Pagar .* con Mercado Pago/ })).toBeDisabled();
  const aviso = page.getByRole('alert').filter({ hasText: 'No pudimos cargar la verificación de seguridad.' });
  await expect(aviso).toBeVisible({ timeout: 10_000 });
  await expect(aviso).toContainText('bloqueador de anuncios');
  // Quita el bloqueo y reintenta: la verificación carga y el botón se habilita.
  bloqueado = false;
  await aviso.getByRole('button', { name: 'Reintentar' }).click();
  await expect(aviso).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Pagar .* con Mercado Pago/ })).toBeEnabled({ timeout: 20_000 });
});
