// S9 · Texto con HTML o scripts en nombre, dirección, referencias, nota y perfil; verlo después en el panel
// (docs/PLAN-PRUEBAS.md §6.2). Esperado: se muestra como texto y no se ejecuta nada.
import { randomUUID } from 'node:crypto';
import { test, expect } from '../_apoyo.mjs';
import { fn, uno, lenteCon, nuevoTel, cuentaPanelNueva, entrarPanel, abrirPedidoEnPanel, simuladoresAlcanzables, cerrarBd, TURNSTILE } from './_flujos.mjs';

test.afterAll(cerrarBd);
test.beforeEach(({ context }) => simuladoresAlcanzables(context));

const NOMBRE = '<img src=x onerror="window.__xss=1">Ana';
const CALLE = '<script>window.__xss=2</script>Calle 5';
const REFS = '"><svg onload="window.__xss=3">';
const NOTA = '<b onmouseover="window.__xss=4">nota</b>';

test('S9 · HTML en los datos de la clienta y en la nota: el panel lo muestra como texto y no ejecuta nada', async ({ page }) => {
  const lente = await lenteCon();
  const t = await uno(`select zona, costo from public.entregas_publicas where tipo = 'didi' order by zona limit 1`);
  const r = await fn('pedidos-crear', {
    clave_idempotencia: randomUUID(), metodo_pago: 'transferencia', items: [{ sku: lente.sku, cantidad: 1 }],
    entrega: { tipo: 'didi', zona: t.zona, direccion: CALLE, referencias: REFS },
    contacto: { nombre: NOMBRE, telefono: nuevoTel(), correo: 's9@prueba.mx' },
    total_visto: lente.precio + Number(t.costo), turnstile: TURNSTILE,
  });
  expect(r.status, JSON.stringify(r.datos)).toBe(200);
  await page.addInitScript(() => { window.__xss = undefined; window.alert = () => { window.__xss = 'alert'; }; });
  await entrarPanel(page, await cuentaPanelNueva('duena'));
  // Hoy (pedidos recientes) y Pedidos
  await expect(page.getByText(NOMBRE, { exact: false }).first()).toBeVisible();
  const m = await abrirPedidoEnPanel(page, r.datos.folio);
  await expect(m.getByRole('heading', { name: NOMBRE })).toBeVisible();
  await expect(m).toContainText(CALLE);
  await expect(m).toContainText(REFS);
  // Nota con HTML: queda en la bitácora como texto
  await m.getByLabel(/Nota/).fill(NOTA);
  await m.getByRole('button', { name: 'Aprobar pago' }).click();
  await expect(page.locator('.toast')).toContainText('Listo.');
  // Clientas
  await page.goto('/panel/clientas');
  await expect(page.getByText(NOMBRE).first()).toBeVisible();
  // Ningún elemento inyectado existe en la página y no corrió ningún script
  expect(await page.locator('img[src="x"], svg[onload], b[onmouseover]').count()).toBe(0);
  expect(await page.evaluate(() => window.__xss)).toBeUndefined();
  // Y en la página pública del pedido
  await page.goto(`/pedido/${r.datos.token}`);
  await expect(page.getByText(/¡Listo,|Pago confirmado/).first()).toBeVisible();
  expect(await page.evaluate(() => window.__xss)).toBeUndefined();
});
