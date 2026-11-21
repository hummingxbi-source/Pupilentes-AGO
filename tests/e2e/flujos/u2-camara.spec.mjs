// U2 · probador con la cámara permitida (docs/PLAN-PRUEBAS.md §4.1). Va en su propio archivo porque la cámara
// falsa de Chromium se activa con argumentos del navegador (launchOptions), que Playwright solo acepta a nivel de archivo.
// No hay cara en la imagen de prueba: se comprueba que la cámara abre y se dibuja sin errores; el ajuste del iris
// sobre una cara real queda para la prueba a mano (M).
import { test, expect } from '../_apoyo.mjs';

test.use({ launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] }, permissions: ['camera'] });

test('U2 · con la cámara permitida: abre, quita el aviso y dibuja el video en el lienzo', async ({ page, browserName, vigia }) => {
  test.skip(browserName !== 'chromium', 'la cámara falsa solo existe en Chromium');
  // MediaPipe (tasks-vision) escribe este aviso informativo con console.error al usar la CPU. Es de la librería,
  // no un fallo; queda anotado en el reporte F1 para la revisión de consola de F4.
  vigia.permitir(/^consola: INFO: Created TensorFlow Lite XNNPACK delegate for CPU\.$/);
  await page.goto('/probador');
  await page.getByRole('button', { name: /Pruébalos en ti con la cámara/ }).click();
  const caja = page.getByRole('dialog');
  await expect(caja.getByText('Preparando cámara…')).toBeHidden({ timeout: 45_000 });
  await expect(caja.getByText(/No pudimos abrir la cámara/)).toHaveCount(0);
  const ancho = await caja.locator('canvas').evaluate((c) => c.width);
  expect(ancho, 'el lienzo tomó el tamaño del video').toBeGreaterThan(0);
});
