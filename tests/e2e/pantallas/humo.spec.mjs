// Humo: cada ruta pública y el acceso al panel cargan sin errores (docs/PLAN-PRUEBAS.md §10.1).
// Necesita Supabase local arriba (la tienda lee el catálogo de la BD).
import { test, expect, sinScrollHorizontal, sinPalabrasProhibidas } from '../_apoyo.mjs';

const RUTAS = [
  { ruta: '/', nombre: 'landing' },
  { ruta: '/nosotros', nombre: 'nosotros' },
  { ruta: '/tienda', nombre: 'tienda' },
  { ruta: '/tono', nombre: 'test de tono' },
  { ruta: '/cuenta', nombre: 'cuenta' },
  { ruta: '/pedido', nombre: 'seguimiento' },
  { ruta: '/panel', nombre: 'acceso al panel' },
];

for (const { ruta, nombre } of RUTAS) {
  test(`${nombre} (${ruta}) carga sin errores`, async ({ page }) => {
    const r = await page.goto(ruta);
    expect(r?.status(), 'la ruta responde (BrowserRouter, sin 404)').toBeLessThan(400);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#root')).not.toBeEmpty();
    await sinScrollHorizontal(page);
    await sinPalabrasProhibidas(page);
  });
}

test('tienda: carga el catálogo desde la BD', async ({ page }) => {
  await page.goto('/tienda');
  await expect(page.getByText('Cargando catálogo…')).toBeHidden();
  await expect(page.getByText('No hay tonos con ese filtro.')).toBeHidden();
  await expect(page.getByRole('heading', { name: /Accesorios/ })).toBeVisible();
});
