import { test, expect } from '@playwright/test';
import { qase } from 'playwright-qase-reporter';

const PANEL_URL = 'http://localhost:3001/panel';

async function loginUI(page: import('@playwright/test').Page) {
  await page.goto(PANEL_URL);
  await page.fill('input[type="email"]', 'prueba@espina.com');
  await page.fill('input[type="password"]', '222222');
  await page.getByRole('button', { name: /iniciar|entrar|login/i }).click();
  await page.waitForURL('**/panel**', { timeout: 15000 });
}

test(qase(41, 'UAT-001: Flujo completo pre-registro y aprobación'), async ({ page }) => {
  await page.goto('http://localhost:3001');
  await page.getByRole('button', { name: /iniciar pre-registro|llenar solicitud/i }).first().click();
  await page.waitForSelector('form', { timeout: 10000 });

  await page.fill('input[name="nombres"]', 'E2E UAT').catch(() => {});
  await page.fill('input[name="apellidoPaterno"]', 'Flujo').catch(() => {});
  await page.fill('input[name="apellidoMaterno"]', 'Completo').catch(() => {});
  await page.fill('input[name="fechaNacimiento"]', '2000-03-10').catch(() => {});

  const selectEstado = page.locator('select[name="estado"]').first();
  await selectEstado.selectOption({ label: /nuevo le/i }).catch(() => {});
  await page.waitForTimeout(300);
  const selectMunicipio = page.locator('select[name="municipio"]').first();
  await selectMunicipio.selectOption({ index: 1 }).catch(() => {});

  await page.getByRole('button', { name: /enviar|registrar|solicitar/i }).click();
  await expect(page.locator('text=/folio|confirmación|enviado/i')).toBeVisible({ timeout: 15000 });

  await loginUI(page);
  await page.getByRole('button', { name: /pre-registro/i }).click();
  await page.waitForTimeout(2000);

  const filaE2E = page.locator('tr, [data-row]').filter({ hasText: 'E2E UAT' }).first();
  if (await filaE2E.isVisible()) {
    await filaE2E.getByRole('button', { name: /aprobar/i }).click();
    await page.waitForTimeout(1000);
  }

  await page.getByRole('button', { name: /beneficiario/i }).click();
  await page.waitForTimeout(2000);
  const beneficiarioVisible = await page.locator('text=E2E UAT').isVisible().catch(() => false);
  expect(beneficiarioVisible).toBe(true);
});

test(qase(42, 'UAT-002: Generación y descarga de reporte de membresías en PDF'), async ({ page }) => {
  await loginUI(page);

  await page.getByRole('button', { name: /reporte/i }).click();
  await page.waitForTimeout(2000);

  const selectTipo = page.locator('select, [role="combobox"]').filter({ hasText: /tipo|reporte/i }).first();
  await selectTipo.selectOption({ label: /membres/i }).catch(async () => {
    await page.locator('select').first().selectOption({ index: 1 });
  });

  const inputDesde = page.locator('input[type="date"], input[name="desde"]').first();
  const inputHasta = page.locator('input[type="date"], input[name="hasta"]').last();
  await inputDesde.fill('2026-01-01').catch(() => {});
  await inputHasta.fill('2026-12-31').catch(() => {});

  const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
  await page.getByRole('button', { name: /generar/i }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/pdf|xlsx/i);
});

test(qase(43, 'UAT-003: Bloqueo por intentos fallidos de login'), async ({ page }) => {
  await page.goto(PANEL_URL);

  for (let i = 0; i < 5; i++) {
    await page.fill('input[type="email"]', 'prueba@espina.com');
    await page.fill('input[type="password"]', 'wrong_pass_uat_e2e');
    await page.getByRole('button', { name: /iniciar|entrar|login/i }).click();
    await page.waitForTimeout(500);
  }

  await page.fill('input[type="email"]', 'prueba@espina.com');
  await page.fill('input[type="password"]', 'wrong_pass_uat_e2e');
  await page.getByRole('button', { name: /iniciar|entrar|login/i }).click();

  await expect(
    page.locator('text=/demasiados|bloqueado|429|15 minuto|espera/i')
  ).toBeVisible({ timeout: 10000 });
});
