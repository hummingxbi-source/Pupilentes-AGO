// §4.2 Clienta con cuenta y puntos · casos que no cubre a4 (docs/PLAN-PRUEBAS.md: C1 vencido, C4, C5, C7, C8, C9, C10, C12, C13).
// Cada prueba usa un correo nuevo (el primer código sale al instante; el segundo esperaría 60 s).
import { test, expect } from '../_apoyo.mjs';
import {
  sql, uno, lenteCon, nuevoTel, nuevoCorreo, agregarDesdeFicha, esperarBoton, correosPrevios, codigoDeMailpit,
  entrarCuenta, compraPagadaDeInvitada, saldoDe, pagoCuadra, simuladoresAlcanzables, cerrarBd, correrCron,
  vencerApartado, cuentaPanelNueva, entrarPanel, PAGINA_MP, SIM_MP,
} from './_flujos.mjs';

test.afterAll(cerrarBd);
const perfilDe = (correo) => uno('select nombre, telefono, cumpleanos from public.clientas where lower(correo) = lower($1)', [correo]);
test.beforeEach(({ context }) => simuladoresAlcanzables(context));

/** Caja con la cuenta abierta: Metro, y en el paso de pago marca "usar puntos" si se pide. */
async function cajaConCuenta(page, lente, { puntos = false, tel = nuevoTel() } = {}) {
  await agregarDesdeFicha(page, lente.tono);
  await page.getByRole('button', { name: 'Elegir entrega' }).click();
  await expect(page.getByText(/Compras con tu cuenta/)).toBeVisible();
  const n = page.getByLabel('Nombre completo');
  if (!(await n.inputValue())) await n.fill('Clienta Con Cuenta');
  const t = page.getByLabel('WhatsApp (10 dígitos)');
  if (!(await t.inputValue())) await t.fill(tel);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: /Entrega en Metro/ }).click();
  await page.getByRole('button', { name: 'Ir al pago' }).click();
  if (puntos) await page.getByLabel('Usar mis puntos').check();
}

// ------------------------------------------------------------------------------------------- C1
test('C1 · código vencido (más de 10 min): no abre la sesión', async ({ page, vigia }) => {
  vigia.permitir(/HTTP 4\d\d: .*\/auth\/v1\/verify/);
  vigia.permitir(/consola: Failed to load resource: the server responded with a status of 4\d\d/);
  const correo = nuevoCorreo('vencido');
  await page.goto('/cuenta');
  await page.getByLabel('Tu correo').fill(correo);
  const previos = await correosPrevios(correo);
  await (await esperarBoton(page, /Enviarme el código/)).click();
  const codigo = await codigoDeMailpit(correo, previos);
  // Pasan 11 minutos (otp_expiry = 600 s en supabase/config.toml)
  await sql(`update auth.users set confirmation_sent_at = now() - interval '11 minutes', recovery_sent_at = now() - interval '11 minutes' where email = $1`, [correo]);
  await sql(`update auth.one_time_tokens set created_at = now() - interval '11 minutes' where user_id = (select id from auth.users where email = $1)`, [correo]).catch(() => {});
  await page.getByLabel('Código').fill(codigo);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('alert')).toHaveText('El código no es válido o ya venció. Pide uno nuevo.');
  await expect(page.getByRole('heading', { name: /Hola,/ })).toHaveCount(0);
});

// ------------------------------------------------------------------------------------------- C4
test('C4 · Inv-A2 (mismo teléfono que Inv-A, otro correo) crea cuenta y pone ese teléfono: no ve los pedidos de Inv-A', async ({ page }) => {
  const tel = nuevoTel();
  const a = await compraPagadaDeInvitada(nuevoCorreo('inv-a'), { tel });
  const correoA2 = nuevoCorreo('inv-a2');
  await entrarCuenta(page, correoA2);
  await expect(page.getByText('Aún no tienes pedidos.')).toBeVisible();
  await page.getByLabel('Nombre').fill('Ana Dos');
  await page.getByLabel(/WhatsApp/).fill(tel);
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect.poll(async () => (await perfilDe(correoA2))?.telefono).toBe(tel);
  await page.reload();
  await expect(page.getByRole('heading', { name: /Hola,/ })).toBeVisible();
  await expect(page.getByText('Aún no tienes pedidos.')).toBeVisible();
  await expect(page.getByText(a.folio)).toHaveCount(0);
  expect(await saldoDe(correoA2)).toBe(0);
});

// ------------------------------------------------------------------------------------------- C5
test('C5 · completar perfil sin compras: sin bono', async ({ page }) => {
  const correo = nuevoCorreo('perfil-sin');
  await entrarCuenta(page, correo);
  await page.getByLabel('Nombre').fill('Bere Sin Compras');
  await page.getByLabel('Cumpleaños').fill('1995-04-10');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect.poll(async () => (await perfilDe(correo))?.nombre).toBe('Bere Sin Compras');
  await expect(page.getByRole('heading', { name: /Hola, Bere/ })).toBeVisible();
  expect(await saldoDe(correo)).toBe(0);
});

test('C5 · completar perfil con una compra pagada: +50 una sola vez (la segunda vez no se repite)', async ({ page }) => {
  const correo = nuevoCorreo('perfil-con');
  const compra = await compraPagadaDeInvitada(correo);
  await entrarCuenta(page, correo);
  const s0 = await saldoDe(correo);
  expect(s0).toBe(Math.floor(compra.lente.precio / 10));
  await page.getByLabel('Nombre').fill('Bere Con Compra');
  await page.getByLabel('Cumpleaños').fill('1995-04-10');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect.poll(() => saldoDe(correo)).toBe(s0 + 50);
  await expect(page.locator('.club .pts')).toHaveText(String(s0 + 50));   // sin recargar (H7)
  await expect(page.getByLabel('Cumpleaños')).toBeDisabled();                     // el cumpleaños ya no se cambia
  await page.getByLabel('Nombre').fill('Bere Otra Vez');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect.poll(async () => (await perfilDe(correo))?.nombre).toBe('Bere Otra Vez');
  expect(await saldoDe(correo), 'el bono no se repite').toBe(s0 + 50);
  const bonos = await sql(`select 1 from public.puntos_movimientos m join public.clientas c on c.id = m.clienta_id where lower(c.correo) = lower($1) and m.motivo = 'bono_perfil'`, [correo]);
  expect(bonos.length).toBe(1);
});

// H7: al guardar, la clienta ve la confirmación y la tarjeta de puntos se actualiza sin recargar.
test('C5 · H7 · al guardar el perfil se ve "Guardado."; con compra, el aviso del bono y los puntos nuevos sin recargar', async ({ page }) => {
  test.setTimeout(90_000);
  await entrarCuenta(page, nuevoCorreo('perfil-aviso'));
  await page.getByLabel('Nombre').fill('Cami Aviso');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText(/^Guardado\.$/)).toBeVisible({ timeout: 5000 });

  await page.getByRole('button', { name: 'Salir' }).click();
  const correo = nuevoCorreo('perfil-bono');
  await compraPagadaDeInvitada(correo);
  await entrarCuenta(page, correo);
  const s0 = await saldoDe(correo);
  await expect(page.locator('.club .pts')).toHaveText(String(s0));
  await page.getByLabel('Nombre').fill('Cami Bono');
  await page.getByLabel('Cumpleaños').fill('1996-02-20');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText('¡Listo! Sumaste 50 puntos.')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('.club .pts')).toHaveText(String(s0 + 50), { timeout: 5000 });
});

// ------------------------------------------------------------------------------------------- C7
test('C7 · un pedido con puntos que se deja vencer: los puntos usados regresan', async ({ page }) => {
  const correo = nuevoCorreo('vence-pts');
  await compraPagadaDeInvitada(correo);
  await entrarCuenta(page, correo);
  const s0 = await saldoDe(correo);
  await cajaConCuenta(page, await lenteCon(), { puntos: true });
  await (await esperarBoton(page, /Pagar .* con Mercado Pago/)).click();
  await expect(page).toHaveURL(PAGINA_MP);
  const pref = new URL(page.url()).searchParams.get('pref');
  const p = await uno('select id, puntos_usados from public.pedidos where mp_preferencia_id = $1', [pref]);
  expect(p.puntos_usados).toBeGreaterThan(0);
  expect(await saldoDe(correo)).toBe(s0 - p.puntos_usados);
  await vencerApartado(p.id);
  await correrCron();
  expect((await uno('select estado from public.pedidos where id = $1', [p.id])).estado).toBe('expirado');
  expect(await saldoDe(correo), 'regresan los puntos').toBe(s0);
  const movs = await sql(`select motivo, delta from public.puntos_movimientos where pedido_id = $1 order by creado_en`, [p.id]);
  expect(movs.map((m) => m.motivo)).toEqual(['canje', 'canje_devuelto']);
});

// ------------------------------------------------------------------------------------------- C8
test('C8 · "Repetir" un pedido: con precio nuevo agrega al precio de hoy; agotado u oculto avisa qué no se pudo', async ({ page }) => {
  const correo = nuevoCorreo('repetir');
  const l1 = await lenteCon(2);
  const l2 = await lenteCon(1, [l1.sku]);
  const l3 = await lenteCon(1, [l1.sku, l2.sku]);
  const c1 = await compraPagadaDeInvitada(correo, { lente: l1 });
  const c2 = await compraPagadaDeInvitada(correo, { lente: l2 });
  const c3 = await compraPagadaDeInvitada(correo, { lente: l3 });
  const precioNuevo = l1.precio + 21;
  const t3 = await uno('select tono_id from public.variantes where sku = $1', [l3.sku]);
  const v2 = await uno('select id, stock, stock_reservado from public.variantes where sku = $1', [l2.sku]);
  try {
    await sql('update public.variantes set precio = $2 where sku = $1', [l1.sku, precioNuevo]);
    if (v2.stock - v2.stock_reservado > 0) await sql('select public.mover_stock($1, $2, $3, $4)', [v2.id, -(v2.stock - v2.stock_reservado), 'ajuste', `e2e:c8:${Date.now()}`]);
    await sql('update public.tonos set activo = false where id = $1', [t3.tono_id]);
    await page.goto('/tienda');
    await page.evaluate(() => localStorage.removeItem('ago-catalogo-v1'));
    await entrarCuenta(page, correo);
    await expect(page.getByText(/Encontramos 3 pedidos/)).toBeVisible();

    await page.locator('.ac-ped', { hasText: c1.folio }).getByRole('button', { name: 'Repetir' }).click();
    await expect(page.getByRole('dialog', { name: /Tu bolsa/ }).locator('.bag-item')).toContainText(`$${precioNuevo.toLocaleString('es-MX')}`);
    await page.keyboard.press('Escape');

    await page.locator('.ac-ped', { hasText: c2.folio }).getByRole('button', { name: 'Repetir' }).click();
    await expect(page.locator('.toast')).toHaveText(/Esas piezas no están disponibles ahorita/);
    await page.locator('.ac-ped', { hasText: c3.folio }).getByRole('button', { name: 'Repetir' }).click();
    await expect(page.locator('.toast')).toHaveText(/Esas piezas no están disponibles ahorita/);
  } finally {
    await sql('update public.variantes set precio = $2 where sku = $1', [l1.sku, l1.precio]);
    await sql('update public.tonos set activo = true where id = $1', [t3.tono_id]);
    const v = await uno('select id, stock from public.variantes where sku = $1', [l2.sku]);
    if (v.stock < v2.stock) await sql('select public.mover_stock($1, $2, $3, $4)', [v.id, v2.stock - v.stock, 'ajuste', `e2e:c8:regreso:${Date.now()}`]);
  }
});

// ------------------------------------------------------------------------------------------- C9
test('C9 · reusar una dirección anterior en la caja: se llena sola y cotiza bien', async ({ page }) => {
  test.setTimeout(90_000);
  // Las direcciones guardadas salen de pedidos hechos CON la cuenta abierta (los de invitada se ligan sin dirección: C3).
  const correo = nuevoCorreo('direccion');
  await entrarCuenta(page, correo);
  await agregarDesdeFicha(page, (await lenteCon()).tono);
  await page.getByRole('button', { name: 'Elegir entrega' }).click();
  await page.getByLabel('Nombre completo').fill('Dora Dirección');
  await page.getByLabel('WhatsApp (10 dígitos)').fill(nuevoTel());
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: /Paquetería a todo México/ }).click();
  await page.getByLabel('Calle').fill('Av. Reforma');
  await page.getByLabel(/Número/).fill('222');
  await page.getByLabel('Colonia').fill('Juárez');
  await page.getByLabel('Código postal').fill('06600');
  await page.getByLabel('Ciudad o municipio').fill('Cuauhtémoc');
  await page.getByLabel('Estado').fill('CDMX');
  await (await esperarBoton(page, 'Ver opciones de envío')).click();
  await page.locator('button.opt', { hasText: '·' }).filter({ hasText: '$' }).first().click();
  await page.getByRole('button', { name: 'Ir al pago' }).click();
  await (await esperarBoton(page, /Pagar .* con Mercado Pago/)).click();
  await page.getByRole('button', { name: 'Pagar con tarjeta (aprobado)' }).click();
  await expect(page.getByRole('heading', { name: 'Pago confirmado' })).toBeVisible({ timeout: 30_000 });
  await page.goto('/cuenta');
  await expect(page.locator('section', { hasText: 'Direcciones de tus envíos' })).toContainText('Av. Reforma 222');
  const lente = await lenteCon();
  await agregarDesdeFicha(page, lente.tono);
  await page.getByRole('button', { name: 'Elegir entrega' }).click();
  // El nombre y el WhatsApp no se recuerdan de la compra anterior (solo del perfil): se escriben otra vez.
  await page.getByLabel('Nombre completo').fill('Dora Dirección');
  await page.getByLabel('WhatsApp (10 dígitos)').fill(nuevoTel());
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: /Paquetería a todo México/ }).click();
  await page.getByRole('button', { name: /Usar Av. Reforma 222 · CP 06600/ }).click();
  await expect(page.getByLabel('Calle')).toHaveValue('Av. Reforma');
  await expect(page.getByLabel('Código postal')).toHaveValue('06600');
  await expect(page.getByLabel('Colonia')).toHaveValue('Juárez');
  await (await esperarBoton(page, 'Ver opciones de envío')).click();
  await expect(page.getByText('Elige la paquetería')).toBeVisible();
});

// ------------------------------------------------------------------------------------------ C10
test('C10 · la sesión vence a media caja: lo dice claro y puede terminar como invitada sin perder la bolsa', async ({ page, vigia }) => {
  vigia.permitir(/HTTP 401: .*(pedidos-crear|\/functions\/v1\/cuenta|\/auth\/v1\/)/);
  vigia.permitir(/HTTP 403: .*\/auth\/v1\/logout/);
  vigia.permitir(/consola: Failed to load resource: the server responded with a status of 40[13]/);
  const correo = nuevoCorreo('sesion');
  await compraPagadaDeInvitada(correo);
  await entrarCuenta(page, correo);
  await cajaConCuenta(page, await lenteCon(), { puntos: true });
  // El token de la sesión ya no sirve (venció). No se puede adelantar el reloj del servidor, así que se
  // reemplaza el access_token guardado por uno inválido (supabase-js no lo refresca: expires_at sigue en el futuro).
  // Nota: borrar la sesión en auth.sessions NO basta: el JWT sigue valiendo hasta su exp (comportamiento normal de Supabase).
  await page.evaluate(() => {
    const k = 'ago-cuenta-auth';   // storageKey de supabaseCuenta (src/lib/supabase.js)
    const s = JSON.parse(localStorage.getItem(k));
    s.access_token = s.access_token.split('.').slice(0, 2).join('.') + '.firma-invalida';
    localStorage.setItem(k, JSON.stringify(s));
  });
  await (await esperarBoton(page, /Pagar .* con Mercado Pago/)).click();
  await expect(page.getByRole('alert')).toContainText(/sesión venció/i);
  await expect(page.getByLabel('Usar mis puntos')).toHaveCount(0);
  // Sigue como invitada con la misma bolsa
  await (await esperarBoton(page, /Pagar .* con Mercado Pago/)).click();
  await expect(page).toHaveURL(PAGINA_MP);
  const pref = new URL(page.url()).searchParams.get('pref');
  const p = await uno('select cuenta_id, puntos_usados from public.pedidos where mp_preferencia_id = $1', [pref]);
  expect(p.cuenta_id).toBeNull();
  expect(p.puntos_usados).toBe(0);
});

// ------------------------------------------------------------------------------------------ C12
test('C12 · cerrar sesión en la tienda con el panel abierto en otra pestaña (y al revés): no se cierran entre sí', async ({ page, context }) => {
  const correo = nuevoCorreo('pestanas');
  await entrarCuenta(page, correo);
  const panel = await context.newPage();
  const duena = await cuentaPanelNueva('duena');
  const secreto = await entrarPanel(panel, duena);

  await page.getByRole('button', { name: 'Salir' }).click();
  await expect(page.getByLabel('Tu correo')).toBeVisible();
  await panel.reload();
  await expect(panel.getByRole('heading', { name: /equipo AGO/ })).toBeVisible();

  await entrarCuenta(page, nuevoCorreo('pestanas2'));
  await panel.locator('.pn-side').getByRole('button', { name: 'Salir' }).click();
  await expect(panel.getByRole('heading', { name: 'Hola de nuevo' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: /Hola,/ })).toBeVisible();
  void secreto;
});

// ------------------------------------------------------------------------------------------ C13
test('C13 · cambian las reglas de puntos con un pedido a medio pagar: conserva su descuento; el siguiente usa la regla nueva', async ({ page }) => {
  const correo = nuevoCorreo('reglas');
  await compraPagadaDeInvitada(correo);
  await compraPagadaDeInvitada(correo);
  await entrarCuenta(page, correo);
  const cfg = await uno('select puntos_valor from public.config_tienda limit 1');
  try {
    await cajaConCuenta(page, await lenteCon(), { puntos: true });
    await (await esperarBoton(page, /Pagar .* con Mercado Pago/)).click();
    await expect(page).toHaveURL(PAGINA_MP);
    const pref = new URL(page.url()).searchParams.get('pref');
    const p1 = await uno('select id, descuento, puntos_usados, total from public.pedidos where mp_preferencia_id = $1', [pref]);
    expect(Number(p1.descuento)).toBe(p1.puntos_usados * Number(cfg.puntos_valor));
    // La dueña cambia el valor del punto (no hay pantalla para config_tienda: se cambia en la BD; ver reporte D19)
    await sql('update public.config_tienda set puntos_valor = 1.00');
    await page.getByRole('button', { name: 'Pagar con tarjeta (aprobado)' }).click();
    await expect(page.getByRole('heading', { name: 'Pago confirmado' })).toBeVisible({ timeout: 30_000 });
    const p1b = await uno('select estado, descuento, total from public.pedidos where id = $1', [p1.id]);
    expect(p1b.estado).toBe('pagado');
    expect(Number(p1b.descuento), 'conserva su descuento').toBe(Number(p1.descuento));
    expect(Number(p1b.total)).toBe(Number(p1.total));
    await pagoCuadra(p1.id);

    await cajaConCuenta(page, await lenteCon(), { puntos: true });
    await (await esperarBoton(page, /Pagar .* con Mercado Pago/)).click();
    await expect(page).toHaveURL(PAGINA_MP);
    const p2 = await uno('select descuento, puntos_usados from public.pedidos where mp_preferencia_id = $1', [new URL(page.url()).searchParams.get('pref')]);
    expect(Number(p2.descuento), 'el siguiente usa la regla nueva').toBe(p2.puntos_usados * 1);
  } finally {
    await sql('update public.config_tienda set puntos_valor = $1', [cfg.puntos_valor]);
  }
});
