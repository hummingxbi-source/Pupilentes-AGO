// Apoyo compartido de las pruebas de pantalla (docs/PLAN-PRUEBAS.md §10.1).
// Importa `test` y `expect` de aquí en lugar de '@playwright/test': cada prueba vigila sola
// los errores de JavaScript, la consola, la CSP y las peticiones fallidas.
import { test as base, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Palabras que nunca deben aparecer en la web pública (regla I9: el nombre de la dueña).
// Se pasan por variable de entorno para no escribir el nombre en el repo:
//   E2E_PROHIBIDO="Nombre Apellido,Otro"   (en el CI, como secret).
const PROHIBIDAS = (process.env.E2E_PROHIBIDO || '').split(',').map((s) => s.trim()).filter(Boolean);

export const test = base.extend({
  // Lo que pasó en la página durante la prueba. Una prueba que provoca un error a propósito
  // (p. ej. apagar un simulador) lo declara con `vigia.permitir(/patrón/)`.
  vigia: [async ({ page }, use, testInfo) => {
    const errores = [];
    const permitidos = [];
    page.on('pageerror', (e) => errores.push(`JS: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errores.push(`consola: ${m.text()}`); });
    page.on('response', (r) => {
      const u = r.url();
      if (r.status() >= 400 && !u.includes('/favicon')) errores.push(`HTTP ${r.status()}: ${u}`);
    });
    const vigia = { errores, permitir: (re) => permitidos.push(re) };
    await use(vigia);
    const reales = errores.filter((e) => !permitidos.some((re) => re.test(e)));
    if (reales.length) await testInfo.attach('errores', { body: reales.join('\n'), contentType: 'text/plain' });
    expect(reales, 'errores en la página (consola, JS, CSP o HTTP)').toEqual([]);
  }, { auto: true }],
});

export { expect };

// Nada se sale de la pantalla a lo ancho (§10.1).
export async function sinScrollHorizontal(page) {
  const sobra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(sobra, 'la página se sale a lo ancho').toBeLessThanOrEqual(1);
}

// Regla I9: ninguna palabra prohibida en el texto visible ni en el título.
export async function sinPalabrasProhibidas(page) {
  if (!PROHIBIDAS.length) return;
  const texto = `${await page.title()}\n${await page.locator('body').innerText()}`.toLowerCase();
  for (const p of PROHIBIDAS) expect(texto, 'aparece una palabra prohibida en la web pública').not.toContain(p.toLowerCase());
}

// Accesibilidad (§10.4): 0 violaciones "serious" o "critical".
export async function accesible(page, testInfo) {
  const r = await new AxeBuilder({ page }).analyze();
  const graves = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  if (graves.length) {
    await testInfo.attach('axe', { body: JSON.stringify(graves, null, 2), contentType: 'application/json' });
  }
  expect(graves.map((v) => `${v.id} (${v.nodes.length})`), 'violaciones de accesibilidad graves').toEqual([]);
}
