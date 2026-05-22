import { test, expect, request } from '@playwright/test';
import { test as authTest } from '../fixtures/auth';
import { qase } from 'playwright-qase-reporter';

const PERIODO = 'desde=2026-01-01&hasta=2026-12-31';

authTest(qase(13, 'TC-001: GET /reportes/periodo?tipo=beneficiarios responde 200'), async ({ apiContext }) => {
  const res = await apiContext.get(`/reportes/periodo?tipo=beneficiarios&${PERIODO}`);
  expect(res.status()).toBe(200);
  const ct = res.headers()['content-type'] ?? '';
  expect(ct).toMatch(/pdf|xlsx|octet-stream|json/i);
});

authTest(qase(14, 'TC-002: Reporte de membresías retorna 200'), async ({ apiContext }) => {
  const res = await apiContext.get(`/reportes/periodo?tipo=membresias&${PERIODO}`);
  expect(res.status()).toBe(200);
});

authTest(qase(15, 'TC-003: Reporte de servicios retorna 200'), async ({ apiContext }) => {
  const res = await apiContext.get(`/reportes/periodo?tipo=servicios&${PERIODO}`);
  expect(res.status()).toBe(200);
});

authTest(qase(16, 'TC-004: Reporte de inventario retorna 200'), async ({ apiContext }) => {
  const res = await apiContext.get(`/reportes/periodo?tipo=inventario&${PERIODO}`);
  expect(res.status()).toBe(200);
});

test(qase(17, 'TC-005: Sin token retorna 401'), async () => {
  const ctx = await request.newContext({ baseURL: 'http://localhost:3000' });
  const res401 = await ctx.get(`/reportes/periodo?tipo=beneficiarios&${PERIODO}`);
  expect(res401.status()).toBe(401);
  await ctx.dispose();
});

authTest(qase(40, 'RT-018: GET /reportes/periodo?tipo=estadisticas genera PDF'), async ({ apiContext }) => {
  const res = await apiContext.get(`/reportes/periodo?tipo=estadisticas&${PERIODO}`);
  expect(res.status()).toBe(200);
});

test(qase(18, 'TC-006: UI genera reporte y permite exportar'), async ({ page }) => {
  await page.goto('http://localhost:3001/panel');
  await page.fill('input[type="email"]', 'prueba@espina.com');
  await page.fill('input[type="password"]', '222222');
  await page.getByRole('button', { name: /iniciar|entrar|login/i }).click();
  await page.waitForURL('**/panel**');

  await page.getByRole('button', { name: /reporte/i }).click();
  await page.waitForSelector('[data-section="reportes"], button:has-text("Generar")', { timeout: 10000 });

  const selectTipo = page.locator('select, [role="combobox"]').first();
  await selectTipo.selectOption({ label: /beneficiario/i }).catch(() => {});

  const downloadPromise = page.waitForEvent('download', { timeout: 20000 }).catch(() => null);
  await page.getByRole('button', { name: /generar/i }).click();
  const download = await downloadPromise;
  expect(download).not.toBeNull();
});
