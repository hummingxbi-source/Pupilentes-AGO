// Playwright · pruebas de pantalla y de flujo (docs/PLAN-PRUEBAS.md §7 y §10).
// Corre contra `npm run dev` + Supabase local (+ simuladores para los flujos de compra).
// Primera vez en tu compu: `npm run e2e:navegadores` (descarga Chromium, Firefox y WebKit).
import { defineConfig, devices } from '@playwright/test';

const URL = process.env.E2E_URL || 'http://127.0.0.1:5173';
const CI = !!process.env.CI;

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.mjs',
  // Una sola BD local compartida: los flujos mueven stock y pedidos, así que no corren en paralelo.
  fullyParallel: false,
  workers: 1,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
    // Comparación visual (§10.3): falla si cambia más del 0.2 % de los píxeles.
    toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: 'disabled' },
  },
  reporter: CI ? [['list'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'on-failure' }]],
  use: {
    baseURL: URL,
    locale: 'es-MX',
    timezoneId: 'America/Mexico_City',
    // Sin animaciones (GSAP/Lenis) para que las capturas no varíen (§10.3).
    contextOptions: { reducedMotion: 'reduce' },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  // Navegadores y anchos de §10.1.
  projects: [
    { name: 'escritorio-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'escritorio-firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 1280, height: 800 } } },
    { name: 'escritorio-webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 800 } } },
    { name: 'tableta', use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 }, hasTouch: true } },
    { name: 'iphone', use: { ...devices['iPhone 13'] } }, // WebKit, 390 px
    { name: 'android', use: { ...devices['Pixel 5'], viewport: { width: 360, height: 740 } } }, // Chromium, 360 px
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort',
    url: URL,
    reuseExistingServer: !CI,
    timeout: 120_000,
    env: { VITE_CHATBOT: 'false' },
  },
});
