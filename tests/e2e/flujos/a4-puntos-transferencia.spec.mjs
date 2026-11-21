// A4 · Invitada paga por transferencia, la dueña la aprueba, la invitada crea su cuenta con el mismo correo
// y usa sus puntos (docs/PLAN-PRUEBAS.md §4.1–§4.3: U11, D7, C1, C2, C3, C6; §7 prioridad 1).
// Un solo recorrido en orden (cada paso depende del anterior). El código de acceso se lee de Mailpit.
import { test, expect, sinPalabrasProhibidas } from '../_apoyo.mjs';
import {
  sql, uno, stockDe, lenteCon, nuevoTel, nuevoCorreo, agregarDesdeFicha, llenarContacto, esperarBoton, pedidoDeLaUrl,
  cuentaPanelNueva, entrarPanel, abrirPedidoEnPanel, codigoDeMailpit, correosPrevios, pagoCuadra, simuladoresAlcanzables, cerrarBd, PAGINA_MP,
} from './_flujos.mjs';

test.describe.configure({ mode: 'serial' });
test.afterAll(cerrarBd);
test.beforeEach(async ({ context }) => {
  await simuladoresAlcanzables(context);
  // "Avisar por WhatsApp" abre wa.me en otra pestaña: no sale a internet, se responde aquí.
  await context.route(/^https:\/\/(wa\.me|api\.whatsapp\.com)\//, (r) => r.fulfill({ status: 200, contentType: 'text/plain', body: 'whatsapp simulado' }));
});

const correoA = nuevoCorreo('inv-a');
const telA = nuevoTel();
let folioA, lenteA, secretoDuena, cuentaDuena;
const saldoBd = async (correo) => Number((await uno(
  `select coalesce(sum(m.delta), 0) as s from public.puntos_movimientos m join public.clientas c on c.id = m.clienta_id where lower(c.correo) = lower($1)`, [correo]))?.s ?? 0);

test('U11 · invitada compra por transferencia: ve los datos bancarios, avisa por WhatsApp y queda por validar (apartado 24 h)', async ({ page, context }) => {
  lenteA = await lenteCon();
  const antes = await stockDe(lenteA.sku);
  await agregarDesdeFicha(page, lenteA.tono);
  await page.getByRole('button', { name: 'Elegir entrega' }).click();
  await llenarContacto(page, { nombre: 'Ana Invitada', telefono: telA, correo: correoA });
  await page.getByRole('button', { name: /Entrega en Metro/ }).click();
  await page.getByRole('button', { name: 'Ir al pago' }).click();
  await page.getByRole('button', { name: /Transferencia directa/ }).click();
  await (await esperarBoton(page, 'Apartar y ver datos de transferencia')).click();

  await expect(page.getByRole('heading', { name: /Tus piezas están apartadas/ })).toBeVisible();
  const ped = await pedidoDeLaUrl(page);
  folioA = ped.folio;
  const cfg = await uno('select banco, clabe, beneficiario from public.config_tienda limit 1');
  const banco = page.locator('.bank').first();
  await expect(banco).toContainText(cfg.banco);
  await expect(banco).toContainText(cfg.clabe.replace(/(\d{4})(?=\d)/g, '$1 '));
  await expect(banco).toContainText(`Concepto ${ped.folio}`);
  const p0 = await uno('select estado, expira_reserva_en, creado_en from public.pedidos where id = $1', [ped.id]);
  expect(p0.estado).toBe('pendiente_pago');
  const horas = (new Date(p0.expira_reserva_en) - new Date(p0.creado_en)) / 36e5;
  expect(horas, 'apartado de 24 h').toBeCloseTo(24, 1);
  expect((await stockDe(lenteA.sku)).stock_reservado).toBe(antes.stock_reservado + 1);

  // Avisar por WhatsApp: abre el chat con el folio y el monto, y el pedido pasa a "por validar".
  const wa = context.waitForEvent('page');
  await page.getByRole('button', { name: /Ya transferí: mandar comprobante por WhatsApp/ }).click();
  const chat = await wa;
  await expect.poll(() => chat.url()).toContain('wa.me/52');
  expect(decodeURIComponent(chat.url())).toContain(ped.folio);
  await chat.close();
  await expect(page.getByRole('heading', { name: 'Revisando tu transferencia' })).toBeVisible({ timeout: 15_000 });
  expect((await uno('select estado from public.pedidos where id = $1', [ped.id])).estado).toBe('pendiente_validacion');

  // I9: la CLABE solo aparece en la pantalla de transferencia
  for (const ruta of ['/', '/tienda', '/nosotros', '/pedido']) {
    await page.goto(ruta);
    await expect(page.locator('main').first()).toBeVisible();
    expect(await page.locator('body').innerText(), `la CLABE no sale en ${ruta}`).not.toContain(cfg.clabe);
    await sinPalabrasProhibidas(page);
  }
});

test('D7 · la dueña aprueba la transferencia con nota: pagado, stock −1, queda en la auditoría (I4, I8)', async ({ page }) => {
  cuentaDuena = await cuentaPanelNueva('duena');
  secretoDuena = await entrarPanel(page, cuentaDuena);
  await page.goto('/panel');
  await expect(page.getByText(/Tienes \d+ pagos? por validar/)).toBeVisible();
  const antes = await stockDe(lenteA.sku);
  const m = await abrirPedidoEnPanel(page, folioA);
  await expect(m.locator('.pill-st', { hasText: 'Pago por validar' })).toBeVisible();
  await m.getByLabel(/Nota/).fill('Transferencia vista en el banco (e2e)');
  await m.getByRole('button', { name: 'Aprobar pago' }).click();
  await expect(page.locator('.toast')).toContainText('Listo.');
  const p = await uno('select id, estado from public.pedidos where folio = $1', [folioA]);
  expect(p.estado).toBe('pagado');
  await pagoCuadra(p.id);
  const s = await stockDe(lenteA.sku);
  expect(s.stock).toBe(antes.stock - 1);
  expect(s.stock_reservado).toBe(antes.stock_reservado - 1);
  const a = await uno(`select usuario, despues from public.auditoria_panel where accion = 'aprobar_transferencia' and registro = $1`, [folioA]);
  expect(a, 'I8: la aprobación quedó en la auditoría').toBeTruthy();
  expect(a.usuario).toBe(cuentaDuena.id);
  expect(JSON.stringify(a.despues)).toContain('Transferencia vista en el banco');
});

test('D7 · la dueña rechaza otra transferencia (con confirmación): se libera el apartado y queda auditado', async ({ page }) => {
  const lente = await lenteCon(1, [lenteA.sku]);
  const antes = await stockDe(lente.sku);
  await agregarDesdeFicha(page, lente.tono);
  await page.getByRole('button', { name: 'Elegir entrega' }).click();
  await llenarContacto(page, { telefono: nuevoTel() });
  await page.getByRole('button', { name: /Entrega en Metro/ }).click();
  await page.getByRole('button', { name: 'Ir al pago' }).click();
  await page.getByRole('button', { name: /Transferencia directa/ }).click();
  await (await esperarBoton(page, 'Apartar y ver datos de transferencia')).click();
  const ped = await pedidoDeLaUrl(page);
  expect((await stockDe(lente.sku)).stock_reservado).toBe(antes.stock_reservado + 1);

  await entrarPanel(page, { ...cuentaDuena, secreto: secretoDuena });
  const m = await abrirPedidoEnPanel(page, ped.folio);
  await m.getByLabel(/Nota/).fill('No llegó la transferencia (e2e)');
  await m.getByRole('button', { name: 'Rechazar pago' }).click();
  const conf = m.getByRole('alertdialog', { name: 'Confirmar' });
  await expect(conf).toContainText('¿Seguro que quieres rechazar pago?');
  await conf.getByRole('button', { name: 'Sí, rechazar pago' }).click();
  await expect(page.locator('.toast')).toContainText('Listo.');
  const p = await uno('select estado from public.pedidos where id = $1', [ped.id]);
  expect(['cancelado', 'expirado']).toContain(p.estado);
  const s = await stockDe(lente.sku);
  expect(s.stock, 'no se vendió').toBe(antes.stock);
  expect(s.stock_reservado, 'apartado liberado').toBe(antes.stock_reservado);
  expect(await uno(`select 1 as ok from public.auditoria_panel where accion = 'rechazar_transferencia' and registro = $1`, [ped.folio]), 'I8').toBeTruthy();

  // La clienta lo ve cerrado en su enlace
  await page.goto(`/pedido/${ped.token_rastreo ?? (await uno('select token_rastreo from public.pedidos where id = $1', [ped.id])).token_rastreo}`);
  await expect(page.getByRole('heading', { name: /Pedido cancelado|El apartado venció/ })).toBeVisible();
});

test('C1 · C2 · C3 · C6 · Inv-A crea su cuenta con el mismo correo (mayúsculas y espacios), ve su pedido y sus puntos, y compra usándolos (máx. 50 %, envío completo; I5)', async ({ page, vigia }) => {
  test.setTimeout(180_000);
  vigia.permitir(/HTTP 4\d\d: .*\/auth\/v1\/(verify|otp)/);
  vigia.permitir(/consola: Failed to load resource: the server responded with a status of 4\d\d/);
  await page.goto('/cuenta');
  await expect(page.getByRole('heading', { name: /Tus puntos y tus pedidos/ })).toBeVisible();
  const desde = await correosPrevios(correoA);
  await page.getByLabel('Tu correo').fill(`  ${correoA.toUpperCase()}  `);
  await (await esperarBoton(page, /Enviarme el código/)).click();
  await expect(page.getByText(`Te mandamos un código de 6 dígitos a ${correoA}`)).toBeVisible();
  const codigo = await codigoDeMailpit(correoA, desde);

  // Código equivocado
  const malo = String((Number(codigo) + 1) % 1e6).padStart(6, '0');
  await page.getByLabel('Código').fill(malo);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('alert')).toHaveText('El código no es válido o ya venció. Pide uno nuevo.');

  // Pedir otro antes de 60 s: no lo manda
  await page.getByRole('button', { name: 'Cambiar correo o pedir otro código' }).click();
  await page.getByLabel('Tu correo').fill(correoA);
  await (await esperarBoton(page, /Enviarme el código/)).click();
  await expect(page.getByRole('alert')).toHaveText('Ya te mandamos un código hace poco. Espera un minuto y vuelve a intentarlo.');
  expect((await correosPrevios(correoA)).size, 'un solo correo enviado').toBe(1);

  // Pasado el minuto sí se puede pedir otro (la pantalla ya no deja volver al código anterior: ver reporte).
  const desde2 = await correosPrevios(correoA);
  await expect(async () => {
    await (await esperarBoton(page, /Enviarme el código/)).click();
    await expect(page.getByText(/^Te mandamos un código de 6 dígitos a /)).toBeVisible({ timeout: 3000 });
  }).toPass({ timeout: 80_000, intervals: [5000] });
  const codigo2 = await codigoDeMailpit(correoA, desde2);
  expect(codigo2).not.toBe(codigo);
  await page.getByLabel('Código').fill(codigo2);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: /Hola,/ })).toBeVisible();
  await expect(page.getByText('Encontramos 1 pedido que hiciste como invitada con este correo y los agregamos a tu cuenta.')).toBeVisible();
  const fila = page.locator('.ac-ped', { hasText: folioA });
  await expect(fila).toBeVisible();
  await expect(fila).toContainText('Pago confirmado');
  // Sin contacto ni dirección de la invitada en la cuenta
  const texto = await page.locator('main').innerText();
  expect(texto).not.toContain(telA);

  const saldo = await saldoBd(correoA);
  const ped = await uno('select subtotal from public.pedidos where folio = $1', [folioA]);
  expect(saldo, 'puntos de la compra de invitada: 1 por cada $10').toBe(Math.floor(Number(ped.subtotal) / 10));
  await expect(page.locator('.club .pts')).toHaveText(String(saldo), { timeout: 5000 });
  const c = await uno('select id from public.clientas where lower(correo) = lower($1)', [correoA]);
  const lig = await uno('select cuenta_ligada_por from public.pedidos where folio = $1', [folioA]);
  expect(lig.cuenta_ligada_por).toBe('correo');
  expect(c).toBeTruthy();

  // ------------------------------------------------------------------ C6 · compra con sus puntos (misma sesión)
  const saldo0 = await saldoBd(correoA);
  expect(saldo0).toBeGreaterThan(0);

  const lente = await lenteCon(1, [lenteA.sku]);
  await agregarDesdeFicha(page, lente.tono);
  await page.getByRole('button', { name: 'Elegir entrega' }).click();
  await expect(page.getByText(`Compras con tu cuenta ${correoA}`)).toBeVisible();
  await page.getByLabel('WhatsApp (10 dígitos)').fill(telA);
  await page.getByRole('button', { name: 'Continuar' }).click();
  // DiDi (envío con costo) para comprobar que los puntos no cubren el envío
  await page.getByRole('button', { name: /Envío por DiDi/ }).click();
  await page.getByLabel('Calle y número').fill('Calle 5 de Mayo 22');
  await page.getByLabel('Colonia').fill('Centro');
  await page.getByRole('button', { name: 'Ir al pago' }).click();

  const tope = Math.floor(Math.floor(lente.precio * 50) / 100 / 0.5);
  const usar = Math.min(saldo0, tope);
  await expect(page.getByText(`Usar ${usar} de mis ${saldo0} puntos`)).toBeVisible();
  await page.getByLabel('Usar mis puntos').check();
  await expect(page.locator('.cx-sum')).toContainText(`Puntos (${usar})`);
  await (await esperarBoton(page, /Pagar .* con Mercado Pago/)).click();
  await expect(page).toHaveURL(PAGINA_MP);
  await page.getByRole('button', { name: 'Pagar con tarjeta (aprobado)' }).click();
  await expect(page.getByRole('heading', { name: 'Pago confirmado' })).toBeVisible({ timeout: 30_000 });

  const ped2 = await pedidoDeLaUrl(page);
  const p = await uno('select id, subtotal, envio, descuento, puntos_usados, total, cuenta_id from public.pedidos where id = $1', [ped2.id]);
  expect(p.cuenta_id, 'el pedido quedó en su cuenta').toBeTruthy();
  expect(p.puntos_usados).toBe(usar);
  expect(Number(p.descuento)).toBe(usar * 0.5);
  expect(Number(p.descuento), 'descuento ≤ 50 % de los productos').toBeLessThanOrEqual(Number(p.subtotal) / 2);
  expect(Number(p.envio), 'DiDi cuesta').toBeGreaterThan(0);
  expect(Number(p.total), 'el envío se paga completo').toBe(Number(p.subtotal) - Number(p.descuento) + Number(p.envio));
  await pagoCuadra(p.id);

  // I5: saldo = suma de movimientos y nunca negativo
  const saldo1 = await saldoBd(correoA);
  expect(saldo1).toBeGreaterThanOrEqual(0);
  const movs = await sql(`select m.delta, m.motivo from public.puntos_movimientos m join public.clientas c on c.id = m.clienta_id
     where lower(c.correo) = lower($1) order by m.creado_en`, [correoA]);
  expect(movs.some((m) => m.motivo === 'canje' && m.delta === -usar), 'el canje quedó registrado').toBe(true);
  await page.goto('/cuenta');
  await expect(page.locator('.club .pts')).toHaveText(String(saldo1), { timeout: 5000 });
});
