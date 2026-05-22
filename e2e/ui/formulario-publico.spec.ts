import { test, expect } from '@playwright/test';
import { qase } from 'playwright-qase-reporter';

test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:3001');
  await page.getByRole('button', { name: /iniciar pre-registro|llenar solicitud/i }).first().click();
  await page.waitForSelector('form, [data-section="registro"]', { timeout: 10000 });
});

test(qase(30, 'TC-018: Dropdown de estado carga 32 estados INEGI'), async ({ page }) => {
  const selectEstado = page.locator('select[name="estado"], [data-field="estado"]').first();
  await selectEstado.waitFor({ timeout: 5000 });
  const options = await selectEstado.locator('option').all();
  expect(options.length).toBeGreaterThanOrEqual(32);
});

test(qase(31, 'TC-019: Al seleccionar estado, municipios se actualiza'), async ({ page }) => {
  const selectEstado = page.locator('select[name="estado"], [data-field="estado"]').first();
  await selectEstado.selectOption({ label: /nuevo le/i });

  const selectMunicipio = page.locator('select[name="municipio"], [data-field="municipio"]').first();
  await selectMunicipio.waitFor({ timeout: 5000 });
  const opciones = await selectMunicipio.locator('option').all();
  expect(opciones.length).toBeGreaterThan(1);

  const textos = await Promise.all(opciones.map(o => o.textContent()));
  expect(textos.some(t => /monterrey/i.test(t ?? ''))).toBe(true);
});

test(qase(32, 'TC-020: CURP se autocalcula al llenar nombre, apellidos, fecha, género y estado'), async ({ page }) => {
  await page.fill('input[name="nombres"], [data-field="nombres"]', 'Juan');
  await page.fill('input[name="apellidoPaterno"], [data-field="apellidoPaterno"]', 'García');
  await page.fill('input[name="apellidoMaterno"], [data-field="apellidoMaterno"]', 'López');
  await page.fill('input[name="fechaNacimiento"], [data-field="fechaNacimiento"]', '2000-01-15');

  const selectGenero = page.locator('select[name="genero"], [data-field="genero"]').first();
  await selectGenero.selectOption({ label: /masculino|hombre/i }).catch(async () => {
    await page.getByRole('radio', { name: /masculino/i }).click().catch(() => {});
  });

  const selectEstado = page.locator('select[name="estado"], [data-field="estado"]').first();
  await selectEstado.selectOption({ label: /nuevo le/i });

  await page.waitForTimeout(500);
  const curpInput = page.locator('input[name="curp"], [data-field="curp"]').first();
  const curpValue = await curpInput.inputValue();
  expect(curpValue.length).toBeGreaterThanOrEqual(10);
  expect(curpValue).toMatch(/^GAR/i);
});

test(qase(24, 'TC-012: Formulario público muestra folio al enviar'), async ({ page }) => {
  await page.fill('input[name="nombres"]', 'E2E').catch(() => {});
  await page.fill('input[name="apellidoPaterno"]', 'Test').catch(() => {});
  await page.fill('input[name="apellidoMaterno"]', 'Playwright').catch(() => {});
  await page.fill('input[name="fechaNacimiento"]', '2000-06-15').catch(() => {});

  const selectEstado = page.locator('select[name="estado"]').first();
  await selectEstado.selectOption({ index: 1 }).catch(() => {});
  await page.waitForTimeout(300);
  const selectMunicipio = page.locator('select[name="municipio"]').first();
  await selectMunicipio.selectOption({ index: 1 }).catch(() => {});

  await page.getByRole('button', { name: /enviar|registrar|solicitar/i }).click();

  await expect(
    page.locator('text=/folio|confirmación|enviado|registrado/i')
  ).toBeVisible({ timeout: 15000 });
});
