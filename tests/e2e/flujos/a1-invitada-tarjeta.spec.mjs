// A1 · Clienta invitada paga con tarjeta (docs/PLAN-PRUEBAS.md §4.1: U1, U4, U5, U13; §7 prioridad 1).
// Navegador real contra la tienda local; Mercado Pago y Envia son los simuladores de scripts/.
// Tras cada caso se revisan en la BD las reglas I1, I3 e I4 que tocan ese pedido.
import { test, expect, sinScrollHorizontal, sinPalabrasProhibidas } from '../_apoyo.mjs';
import {
  sql, uno, stockDe, pedidoPorToken, pagoCuadra, lenteCon, nuevoTel, agregarDesdeFicha, bolsaGuardada,
  llenarContacto, esperarBoton, pedidoDeLaUrl, cerrarBd, SIM_MP, PAGINA_MP, simuladoresAlcanzables,
} from './_flujos.mjs';

test.afterAll(cerrarBd);
test.beforeEach(({ context }) => simuladoresAlcanzables(context));

// ------------------------------------------------------------------------------------------- U1
test('U1 · recorrido de la visitante: landing → tienda → filtro → ficha → nosotros, y recargar cada ruta', async ({ page }) => {
  for (const ruta of ['/', '/tienda', '/nosotros']) {
    const r = await page.goto(ruta);
    expect(r.status(), `${ruta} responde`).toBe(200);
    await page.reload();
    await expect(page.locator('main').first()).toBeVisible();
    await sinScrollHorizontal(page);
    await sinPalabrasProhibidas(page);
  }

  await page.goto('/');
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Tienda' }).click();
  await expect(page).toHaveURL(/\/tienda$/);
  await expect(page.getByText('Cargando catálogo…')).toBeHidden();

  // La vista pública topa el disponible en 10 aunque haya 25 (variante preparada en entorno-pruebas.sh).
  const filas = await page.evaluate(() => JSON.parse(localStorage.getItem('ago-catalogo-v1')).filas);
  const disponibles = filas.flatMap((f) => f.variantes.map((v) => v.disponible));
  expect(Math.max(...disponibles), 'disponible máximo 10 en catalogo_publico').toBe(10);
  const conVeinticinco = await uno(`select sku from public.variantes where stock - stock_reservado = 25 limit 1`);
  if (conVeinticinco) {
    const v = filas.flatMap((f) => f.variantes).find((x) => x.sku === conVeinticinco.sku);
    expect(v?.disponible, `${conVeinticinco.sku} (25 en BD) se muestra con 10`).toBe(10);
  }

  // Filtro por graduación: lo que no hay en esa graduación queda atenuado y dice "Agotado en …".
  const grad = await page.locator('label.fsel', { hasText: 'Mi graduación' }).locator('select');
  const opciones = await grad.locator('option').allInnerTexts();
  const g = opciones.find((o) => /^-\d/.test(o));
  await grad.selectOption(g);
  await expect(page.locator('button.card').first()).toBeVisible();
  const textos = await page.locator('button.card .av').allInnerTexts();
  expect(textos.every((t) => t === `Hay en ${g}` || t === `Agotado en ${g}`), 'cada tarjeta dice si hay en esa graduación').toBe(true);
  // Las disponibles van primero (orden de la tienda)
  const primeraAgotada = textos.findIndex((t) => t.startsWith('Agotado'));
  if (primeraAgotada >= 0) expect(textos.slice(primeraAgotada).every((t) => t.startsWith('Agotado')), 'agotadas al final').toBe(true);

  // Agotado en la ficha: la variante preparada con stock 0 dice "Agotado" y no deja agregar.
  await grad.selectOption('');
  const cero = await uno(`select v.sku, t.nombre, v.duracion from public.variantes v join public.tonos t on t.id = v.tono_id
     where v.activo and v.graduacion is null and v.stock = 0 and v.duracion is not null order by v.sku limit 1`);
  await page.locator('button.card', { hasText: cero.nombre }).first().click();
  const ficha = page.getByRole('dialog');
  const nombres = { trimestral: 'Trimestral', semestral: 'Semestral', anual: 'Anual' };
  const seg = ficha.getByRole('button', { name: nombres[cero.duracion], exact: true });
  const sin = ficha.getByRole('button', { name: 'Sin graduación' });
  await expect(async () => {
    if (await seg.count()) { await seg.click(); await expect(seg).toHaveClass(/on/, { timeout: 1000 }); }
    if (await sin.isEnabled()) await sin.click();
    await expect(ficha.getByText('Agotado en esta graduación')).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 10_000 });
  await expect(ficha.getByRole('button', { name: 'Sin existencia en esa graduación' })).toBeDisabled();
  await page.keyboard.press('Escape');

  await page.goto('/nosotros');
  await expect(page.locator('main')).toBeVisible();
  await sinPalabrasProhibidas(page);
});

// ------------------------------------------------------------------------------------------- U4
test('U4 · invitada compra con tarjeta aprobada y envío por paquetería; U13 rastreo por enlace y por folio', async ({ page }) => {
  const lente = await lenteCon();
  const antes = await stockDe(lente.sku);
  const tel = nuevoTel();

  await agregarDesdeFicha(page, lente.tono);
  const bolsa = await bolsaGuardada(page);
  expect(bolsa.map((b) => b.sku), 'la bolsa tiene el SKU esperado').toEqual([lente.sku]);
  await page.getByRole('button', { name: 'Elegir entrega' }).click();
  await expect(page).toHaveURL(/\/checkout$/);

  await llenarContacto(page, { telefono: tel, correo: 'invitada.u4@prueba.mx' });
  await page.getByRole('button', { name: /Paquetería a todo México/ }).click();
  await page.getByLabel('Calle').fill('Av. Reforma');
  await page.getByLabel(/Número/).fill('222');
  await page.getByLabel('Colonia').fill('Juárez');
  await page.getByLabel('Código postal').fill('06600');
  await page.getByLabel('Ciudad o municipio').fill('Cuauhtémoc');
  await page.getByLabel('Estado').fill('CDMX');
  await (await esperarBoton(page, 'Ver opciones de envío')).click();
  const opcion = page.locator('button.opt', { hasText: '·' }).filter({ hasText: '$' }).first();
  await expect(opcion).toBeVisible();
  await opcion.click();
  await page.getByRole('button', { name: 'Ir al pago' }).click();

  const pagar = await esperarBoton(page, /Pagar .* con Mercado Pago/);
  const totalVisto = Number((await pagar.innerText()).replace(/[^\d.]/g, ''));
  await pagar.click();

  // Página del simulador de Mercado Pago
  await expect(page).toHaveURL(PAGINA_MP);
  const reservado = await stockDe(lente.sku);
  expect(reservado.stock_reservado, 'mientras paga, el par queda apartado').toBe(antes.stock_reservado + 1);
  await page.getByRole('button', { name: 'Pagar con tarjeta (aprobado)' }).click();

  // Regreso a la tienda: manda el webhook; la página consulta hasta ver "Pago confirmado".
  await expect(page).toHaveURL(/\/pedido\/[0-9a-f]{64}\?/);
  await expect(page.getByRole('heading', { name: 'Pago confirmado' })).toBeVisible({ timeout: 30_000 });
  const ped = await pedidoDeLaUrl(page);
  expect(ped.estado).toBe('pagado');
  // Total del servidor = precio de la BD + envío cotizado. (El botón redondea a pesos: hallazgo H4, prueba aparte.)
  const p = await uno('select subtotal, envio, descuento, total from public.pedidos where id = $1', [ped.id]);
  expect(Number(p.subtotal)).toBe(lente.precio);
  expect(Number(p.total)).toBe(Number(p.subtotal) + Number(p.envio) - Number(p.descuento));
  // El botón mostró ese total (a menos de un peso: hoy redondea; la exactitud la vigila la prueba de H4).
  expect(Math.abs(Number(ped.total) - totalVisto), 'el botón mostró el total').toBeLessThan(1);
  await pagoCuadra(ped.id);
  const despues = await stockDe(lente.sku);
  expect(despues.stock, 'stock −1').toBe(antes.stock - 1);
  expect(despues.stock_reservado, 'sin apartado colgado').toBe(antes.stock_reservado);
  const envio = await uno(`select entrega->>'tipo' as tipo from public.pedidos where id = $1`, [ped.id]);
  expect(envio.tipo).toBe('paqueteria');

  // Página del pedido: sin domicilio (U13) ni datos de otras clientas; I9
  const texto = await page.locator('main').innerText();
  expect(texto, 'el rastreo no muestra el domicilio').not.toContain('Reforma');
  await sinPalabrasProhibidas(page);

  // U13 · rastreo con el enlace (nueva visita sin parámetros)
  const enlace = new URL(page.url()).pathname;
  await page.goto(enlace);
  await expect(page.getByRole('heading', { name: 'Pago confirmado' })).toBeVisible();
  await expect(page.getByText(`Pedido ${ped.folio}`)).toBeVisible();

  // U13 · con folio + 4 dígitos
  await page.goto('/pedido');
  await page.getByLabel('Folio').fill(ped.folio);
  await page.getByLabel('Últimos 4 dígitos de tu WhatsApp').fill(tel.slice(-4));
  await (await esperarBoton(page, 'Buscar')).click();
  await expect(page.getByText(`Pedido ${ped.folio}`)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Pago confirmado' })).toBeVisible();
  expect(await page.locator('main').innerText()).not.toContain('Reforma');
});

test('U13 · un token inventado en /pedido/:clave no muestra nada', async ({ page, vigia }) => {
  vigia.permitir(/HTTP 404: .*pedidos-rastrear/);
  vigia.permitir(/consola: Failed to load resource: .*404/);
  await page.goto(`/pedido/${'ab'.repeat(32)}`);
  await expect(page.getByText('No encontramos ese pedido.')).toBeVisible();
  await expect(page.getByText(/Pedido AGO-/)).toHaveCount(0);
});

// ------------------------------------------------------------------------------------------- U5
// El estado del pedido lo decide el webhook, no la URL de regreso. Se crea cada pedido por la pantalla.
async function hastaMercadoPago(page, lente, tel) {
  await agregarDesdeFicha(page, lente.tono);
  await page.getByRole('button', { name: 'Elegir entrega' }).click();
  await llenarContacto(page, { telefono: tel });
  await page.getByRole('button', { name: /Entrega en Metro/ }).click();
  await page.getByRole('button', { name: 'Ir al pago' }).click();
  await (await esperarBoton(page, /Pagar .* con Mercado Pago/)).click();
  await expect(page).toHaveURL(PAGINA_MP);
  return new URL(page.url()).searchParams.get('pref');
}

test('U5 · regreso de Mercado Pago con pago rechazado: el pedido sigue esperando pago y la pieza apartada', async ({ page }) => {
  const lente = await lenteCon();
  const antes = await stockDe(lente.sku);
  await hastaMercadoPago(page, lente, nuevoTel());
  await page.getByRole('button', { name: 'Tarjeta rechazada' }).click();
  await expect(page.getByRole('heading', { name: 'Mercado Pago rechazó el pago' })).toBeVisible({ timeout: 20_000 });
  const ped = await pedidoDeLaUrl(page);
  expect(ped.estado).toBe('pendiente_pago');
  expect(ped.pago_estado).not.toBe('aprobado');
  const s = await stockDe(lente.sku);
  expect(s.stock, 'no se descontó').toBe(antes.stock);
  expect(s.stock_reservado, 'sigue apartada').toBe(antes.stock_reservado + 1);
});

test('U5 · regreso de Mercado Pago con SPEI pendiente: queda esperando pago, apartado extendido', async ({ page }) => {
  const lente = await lenteCon();
  const antes = await stockDe(lente.sku);
  await hastaMercadoPago(page, lente, nuevoTel());
  await page.getByRole('button', { name: 'SPEI (pendiente)' }).click();
  await expect(page.getByRole('heading', { name: 'Confirmando tu pago…' })).toBeVisible({ timeout: 20_000 });
  const ped = await pedidoDeLaUrl(page);
  const p = await uno('select estado, pago_estado, expira_reserva_en, creado_en from public.pedidos where id = $1', [ped.id]);
  expect(p.estado).toBe('pendiente_pago');
  const horas = (new Date(p.expira_reserva_en) - new Date(p.creado_en)) / 36e5;
  expect(horas, 'SPEI pendiente extiende el apartado más allá de 30 min').toBeGreaterThan(1);
  expect(horas, 'y nunca más del tope de 72 h').toBeLessThanOrEqual(72.01);
  expect((await stockDe(lente.sku)).stock_reservado).toBe(antes.stock_reservado + 1);
});

test('U5 · paga con tarjeta y cierra la pestaña sin regresar a la tienda: el webhook deja el pedido pagado', async ({ page, context }) => {
  const lente = await lenteCon();
  const antes = await stockDe(lente.sku);
  const pref = await hastaMercadoPago(page, lente, nuevoTel());
  const ext = await uno('select id, folio from public.pedidos where mp_preferencia_id = $1', [pref]);
  expect(ext, 'el pedido existe con esa preferencia').toBeTruthy();
  // La clienta paga y cierra: se manda el formulario del simulador sin seguir el regreso a la tienda.
  const r = await context.request.post(`${SIM_MP}/simular`, { form: { pref, status: 'approved' }, maxRedirects: 0 });
  expect(r.status(), 'el simulador responde con el regreso (que nadie sigue)').toBe(303);
  await page.close();
  await expect.poll(async () => (await uno('select estado from public.pedidos where id = $1', [ext.id])).estado, { timeout: 20_000 }).toBe('pagado');
  await pagoCuadra(ext.id);
  expect((await stockDe(lente.sku)).stock).toBe(antes.stock - 1);
  const visitas = await sql(`select 1 from public.pedidos where id = $1`, [ext.id]);
  expect(visitas.length).toBe(1);
});

test('U5 · el pago aprobado llega y la clienta vuelve con la URL de rechazo: manda el webhook', async ({ page, context }) => {
  // Alguien manipula la URL de regreso (status=rejected) de un pago que sí se aprobó.
  const lente = await lenteCon();
  const pref = await hastaMercadoPago(page, lente, nuevoTel());
  const r = await context.request.post(`${SIM_MP}/simular`, { form: { pref, status: 'approved' }, maxRedirects: 0 });
  const regreso = new URL(r.headers().location);
  regreso.searchParams.set('status', 'rejected');
  const token = regreso.pathname.split('/').pop();
  await expect.poll(async () => (await pedidoPorToken(token)).estado, { timeout: 20_000 }).toBe('pagado');
  await page.goto(`/pedido/${token}${regreso.search}`);
  await expect(page.getByRole('heading', { name: 'Pago confirmado' })).toBeVisible();
});

// ------------------------------------------------------------------------------- hallazgo H4
// Se espera que FALLE mientras H4 siga abierto (mxn() redondea a pesos). Cuando se arregle, Playwright
// avisará "expected to fail but passed" y hay que quitar el test.fail.
test('H4 · con envío con centavos, el botón y el resumen muestran el total exacto que se cobra', async ({ page }) => {
  test.fail(true, 'H4 abierto: mxn() redondea a pesos (src/lib/catalog.js)');
  const lente = await lenteCon();
  await agregarDesdeFicha(page, lente.tono);
  await page.getByRole('button', { name: 'Elegir entrega' }).click();
  await llenarContacto(page, { telefono: nuevoTel() });
  await page.getByRole('button', { name: /Paquetería a todo México/ }).click();
  await page.getByLabel('Calle').fill('Av. Reforma');
  await page.getByLabel('Colonia').fill('Juárez');
  await page.getByLabel('Código postal').fill('06600');
  await page.getByLabel('Ciudad o municipio').fill('Cuauhtémoc');
  await page.getByLabel('Estado').fill('CDMX');
  const cotizacion = page.waitForResponse((r) => r.url().includes('/envios-cotizar'));
  await (await esperarBoton(page, 'Ver opciones de envío')).click();
  // El simulador de Envia cotiza con centavos (p. ej. 122.50), como la API real.
  const { opciones } = await (await cotizacion).json();
  await page.locator('button.opt', { hasText: '·' }).filter({ hasText: '$' }).first().click();
  await page.getByRole('button', { name: 'Ir al pago' }).click();
  const precioEnvio = Number(opciones[0].precio);
  test.skip(Number.isInteger(precioEnvio), 'la cotización salió en pesos enteros');
  const exacto = (lente.precio + precioEnvio).toLocaleString('es-MX', { minimumFractionDigits: 2 });
  await expect(page.locator('.cx-sum .sum.t')).toContainText(exacto, { timeout: 2000 });
});
