// A2 · La dueña entra por primera vez y despacha un pedido por paquetería (docs/PLAN-PRUEBAS.md §4.3: D1, D5;
// §7 prioridad 1). D1 era la prueba "M pendiente desde la Fase 2": aquí se hace en el navegador real,
// con el MFA resuelto con TOTP generado desde el secreto que muestra la pantalla de alta.
import { test, expect } from '../_apoyo.mjs';
import {
  sql, uno, stockDe, lenteCon, cuentaPanelNueva, entrarPanel, totp, totpEquivocado, abrirPedidoEnPanel,
  crearPedidoApi, pagarConTarjeta, pagoCuadra, rastreoEnvia, simuladoresAlcanzables, cerrarBd, API, PUB,
} from './_flujos.mjs';

test.afterAll(cerrarBd);
test.beforeEach(({ context }) => simuladoresAlcanzables(context));

/** La sesión que guardó supabase-js en el navegador (solo para comprobar qué deja ver la BD). */
const sesionDelNavegador = (page) => page.evaluate(() => {
  const k = Object.keys(localStorage).find((x) => /^sb-.*-auth-token$/.test(x));
  return k ? JSON.parse(localStorage.getItem(k)) : null;
});
async function filasVisibles(token, tabla) {
  const r = await fetch(`${API}/rest/v1/${tabla}?select=id&limit=5`, { headers: { apikey: PUB, Authorization: `Bearer ${token}` } });
  return { status: r.status, filas: r.ok ? await r.json() : [] };
}

// ------------------------------------------------------------------------------------------- D1
test('D1 · primer acceso: contraseña temporal → alta del MFA (con un código equivocado primero) → dentro; sin MFA no ve nada', async ({ page, vigia }) => {
  // Supabase Auth responde 4xx al código equivocado: es lo que se prueba.
  vigia.permitir(/HTTP 4\d\d: .*\/auth\/v1\/factors\/.*\/verify/);
  vigia.permitir(/consola: Failed to load resource: the server responded with a status of 4\d\d/);
  // Hay al menos un pedido en la BD, para que "no ve nada" signifique algo.
  await crearPedidoApi(await lenteCon());
  const cuenta = await cuentaPanelNueva('duena');

  await page.goto('/panel');
  await page.getByLabel('Correo').fill(cuenta.correo);
  await page.getByLabel('Contraseña').fill(cuenta.clave);
  await expect(page.getByRole('button', { name: 'Entrar al panel' })).toBeEnabled({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Entrar al panel' }).click();
  await expect(page.getByRole('heading', { name: 'Protege tu cuenta' })).toBeVisible();

  // Con solo la contraseña (aal1) la BD no le enseña nada, aunque llame directo a la API.
  const s1 = await sesionDelNavegador(page);
  expect(s1?.access_token, 'hay sesión de contraseña').toBeTruthy();
  for (const t of ['pedidos', 'clientas', 'pagos', 'perfiles_panel']) {
    const r = await filasVisibles(s1.access_token, t);
    expect(r.filas, `sin MFA no ve ${t}`).toEqual([]);
  }
  await expect(page.getByRole('heading', { name: /equipo AGO/ })).toHaveCount(0);

  await page.getByText('¿No puedes escanear? Escribe esta clave').click();
  await expect(page.getByRole('img', { name: 'Código QR para la app autenticadora' })).toBeVisible();
  const secreto = (await page.locator('.acceso-clave code').innerText()).trim();
  expect(secreto).toMatch(/^[A-Z2-7]{16,}$/);

  await page.getByLabel('Código de 6 dígitos').fill(totpEquivocado(secreto));
  await page.getByRole('button', { name: 'Activar y entrar' }).click();
  await expect(page.getByRole('alert')).toContainText('El código no es válido');
  await expect(page.getByRole('heading', { name: /equipo AGO/ })).toHaveCount(0);

  await page.getByLabel('Código de 6 dígitos').fill(totp(secreto));
  await page.getByRole('button', { name: 'Activar y entrar' }).click();
  await expect(page.getByRole('heading', { name: /equipo AGO/ })).toBeVisible();
  await expect(page.getByText(cuenta.correo)).toBeVisible();
  await expect(page.locator('.pn-side').getByText('Dueña')).toBeVisible();
  const s2 = await sesionDelNavegador(page);
  expect((await filasVisibles(s2.access_token, 'pedidos')).filas.length, 'con MFA sí ve los pedidos').toBeGreaterThan(0);

  // Salir y volver a entrar: ahora pide el código (no otra alta); uno equivocado no la deja pasar.
  await page.locator('.pn-side').getByRole('button', { name: 'Salir' }).click();
  await expect(page.getByRole('heading', { name: 'Hola de nuevo' })).toBeVisible();
  await page.getByLabel('Correo').fill(cuenta.correo);
  await page.getByLabel('Contraseña').fill(cuenta.clave);
  await expect(page.getByRole('button', { name: 'Entrar al panel' })).toBeEnabled({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Entrar al panel' }).click();
  await expect(page.getByRole('heading', { name: 'Tu código' })).toBeVisible();
  await page.getByLabel('Código de 6 dígitos').fill(totpEquivocado(secreto));
  await page.getByRole('button', { name: 'Verificar' }).click();
  await expect(page.getByRole('alert')).toContainText('El código no es válido');
  await page.getByLabel('Código de 6 dígitos').fill(totp(secreto));
  await page.getByRole('button', { name: 'Verificar' }).click();
  await expect(page.getByRole('heading', { name: /equipo AGO/ })).toBeVisible();

  // Una sola app autenticadora verificada (los intentos de alta no quedan colgados).
  const factores = await sql(`select status from auth.mfa_factors where user_id = $1`, [cuenta.id]);
  expect(factores.map((f) => f.status)).toEqual(['verified']);
});

test('D1 · contraseña equivocada: no entra y lo dice claro', async ({ page, vigia }) => {
  vigia.permitir(/HTTP 400: .*\/auth\/v1\/token/);
  vigia.permitir(/consola: Failed to load resource: the server responded with a status of 400/);
  const cuenta = await cuentaPanelNueva('duena');
  await page.goto('/panel');
  await page.getByLabel('Correo').fill(cuenta.correo);
  await page.getByLabel('Contraseña').fill(cuenta.clave + 'x');
  await expect(page.getByRole('button', { name: 'Entrar al panel' })).toBeEnabled({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Entrar al panel' }).click();
  await expect(page.getByRole('alert')).toHaveText('Correo o contraseña incorrectos.');
  await expect(page.getByRole('heading', { name: 'Protege tu cuenta' })).toHaveCount(0);
});

// ------------------------------------------------------------------------------------------- D5
test('D5 · pedido con tarjeta por paquetería: preparar → generar guía → descargar → enviado → entregado (una sola guía; I7)', async ({ page, context }) => {
  const lente = await lenteCon();
  const antes = await stockDe(lente.sku);
  const p = await crearPedidoApi(lente, { paqueteria: true });
  const id = await pagarConTarjeta(p.url_pago);
  await pagoCuadra(id);
  const estados = ['pagado'];
  const estado = async () => (await uno('select estado from public.pedidos where id = $1', [id])).estado;

  await entrarPanel(page, await cuentaPanelNueva('duena'));

  // 1) Marcar preparando
  let m = await abrirPedidoEnPanel(page, p.folio);
  await expect(m.locator('.pill-st', { hasText: 'Pagado · por enviar' })).toBeVisible();
  await m.getByRole('button', { name: 'Marcar preparando' }).click();
  await expect(page.locator('.toast')).toContainText('Listo.');
  await expect.poll(estado).toBe('preparando'); estados.push('preparando');

  // 2) Generar guía (abre la etiqueta en otra pestaña)
  m = await abrirPedidoEnPanel(page, p.folio);
  const etiqueta1 = context.waitForEvent('page');
  await m.getByRole('button', { name: 'Generar guía' }).click();
  await expect(page.locator('.toast')).toContainText(/Guía .+ lista\./);
  const pestaña1 = await etiqueta1;
  await expect.poll(() => pestaña1.url(), { message: 'abre la etiqueta de la guía' }).toMatch(/envia-simulado\/.+\.pdf$/);
  await pestaña1.close();
  const [g] = await sql(`select guia, estado from public.envios where pedido_id = $1 and proveedor = 'envia' and guia is not null`, [id]);
  expect(g, 'quedó una guía').toBeTruthy();

  // 3) Descargar guía: el botón "Generar" ya no aparece; descargar no crea otra
  m = await abrirPedidoEnPanel(page, p.folio);
  await expect(m.getByRole('button', { name: 'Generar guía' })).toHaveCount(0);
  await expect(m.getByText(g.guia)).toBeVisible();
  const etiqueta2 = context.waitForEvent('page');
  await m.getByRole('button', { name: 'Descargar guía' }).click();
  const pestaña2 = await etiqueta2;
  await expect.poll(() => pestaña2.url(), { message: 'descarga la etiqueta de esa guía' }).toContain(g.guia);
  await pestaña2.close();
  await m.getByRole('button', { name: 'Cerrar' }).click();

  // 4) La paquetería la recoge: el aviso de Envia lo pasa a "enviado"
  expect((await rastreoEnvia(g.guia, 'In transit')).aviso).toBe(200);
  await expect.poll(estado, { timeout: 15_000 }).toBe('enviado'); estados.push('enviado');
  // El aviso repetido no cambia nada (I6)
  expect((await rastreoEnvia(g.guia, 'In transit')).aviso).toBe(200);

  // 5) Marcar entregado desde el panel
  m = await abrirPedidoEnPanel(page, p.folio);
  await expect(m.locator('.pill-st', { hasText: 'En camino' })).toBeVisible();
  await m.getByRole('button', { name: 'Marcar entregado' }).click();
  await expect(page.locator('.toast')).toContainText('Listo.');
  await expect.poll(estado).toBe('entregado'); estados.push('entregado');

  expect(estados).toEqual(['pagado', 'preparando', 'enviado', 'entregado']);
  const guias = await sql(`select guia from public.envios where pedido_id = $1 and guia is not null`, [id]);
  expect(guias.length, 'una sola guía').toBe(1);
  const s = await stockDe(lente.sku);
  expect(s.stock, 'el stock bajó una sola vez (venta)').toBe(antes.stock - 1);
  expect(s.stock_reservado).toBe(antes.stock_reservado);
  await pagoCuadra(id);
});
