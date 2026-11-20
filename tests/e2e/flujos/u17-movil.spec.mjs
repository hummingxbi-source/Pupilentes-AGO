// U17 · compra completa desde un teléfono, con red lenta (docs/PLAN-PRUEBAS.md §4.1).
// Solo corre en los perfiles "android" (Chromium, 360 px) e "iphone" (WebKit, 390 px):
//   npx playwright test tests/e2e/flujos/u17-movil.spec.mjs --project=android --project=iphone
// La red lenta (≈ 3G: 400 ms de latencia, 1.6 Mbps) se emula con CDP, que solo existe en Chromium;
// en el iPhone se prueba la compra con la red normal.
import { test, expect, sinScrollHorizontal } from '../_apoyo.mjs';
import {
  uno, stockDe, lenteCon, nuevoTel, agregarDesdeFicha, llenarContacto, esperarBoton, pedidoDeLaUrl, pagoCuadra,
  simuladoresAlcanzables, cerrarBd, PAGINA_MP,
} from './_flujos.mjs';

test.afterAll(cerrarBd);
test.beforeEach(async ({ context }, testInfo) => {
  test.skip(!['android', 'iphone'].includes(testInfo.project.name), 'solo en perfiles de teléfono');
  await simuladoresAlcanzables(context);
});

test('U17 · compra con tarjeta desde el teléfono (en Android con red lenta): sin cortes y Turnstile carga', async ({ page, context, browserName, vigia }, testInfo) => {
  test.setTimeout(120_000);
  // En WebKit, el iframe de Turnstile (blob:https://challenges.cloudflare.com/…) registra este error en la consola.
  // Es de Cloudflare, no de la tienda (comprobado en la traza del 19 nov; ver reporte F1). Solo se permite ese.
  if (browserName === 'webkit') vigia.permitir(/^consola: Failed to load resource: The operation couldn’t be completed\. \(WebKitBlobResource error 1\.\)$/);
  if (browserName === 'chromium') {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: 200_000, uploadThroughput: 100_000 });
    testInfo.annotations.push({ type: 'red', description: '3G lenta: 400 ms, 1.6 Mbps de bajada' });
  }
  const lente = await lenteCon();
  const antes = await stockDe(lente.sku);
  await page.goto('/');
  await sinScrollHorizontal(page);
  await agregarDesdeFicha(page, lente.tono);
  await sinScrollHorizontal(page);
  await page.getByRole('button', { name: 'Elegir entrega' }).click();
  await llenarContacto(page, { telefono: nuevoTel() });
  await sinScrollHorizontal(page);
  await page.getByRole('button', { name: /Entrega en Metro/ }).click();
  await page.getByRole('button', { name: 'Ir al pago' }).click();
  await (await esperarBoton(page, /Pagar .* con Mercado Pago/, 45_000)).click();   // Turnstile carga en red lenta
  await expect(page).toHaveURL(PAGINA_MP, { timeout: 30_000 });
  await page.getByRole('button', { name: 'Pagar con tarjeta (aprobado)' }).click();
  await expect(page.getByRole('heading', { name: 'Pago confirmado' })).toBeVisible({ timeout: 45_000 });
  await sinScrollHorizontal(page);
  const ped = await pedidoDeLaUrl(page);
  expect(ped.estado).toBe('pagado');
  await pagoCuadra(ped.id);
  expect((await stockDe(lente.sku)).stock).toBe(antes.stock - 1);
  void uno;
});
