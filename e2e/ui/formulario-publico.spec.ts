import { test, expect } from '@playwright/test';
import { qase } from 'playwright-qase-reporter';

test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:3001');
  await page.getByRole('button', { name: /iniciar pre-registro|llenar solicitud/i }).first().click();
  // The form is on the same page (scroll), wait for it to be present
  await page.waitForSelector('form', { timeout: 10000 });
});

test(qase(30, 'TC-018: Dropdown de estado carga 32 estados INEGI'), async ({ page }) => {
  // Radix Select — click trigger to open listbox
  await page.locator('#prereg-estado').click();
  await page.waitForTimeout(500);
  const options = await page.getByRole('option').all();
  expect(options.length).toBeGreaterThanOrEqual(32);
  await page.keyboard.press('Escape');
});

test(qase(31, 'TC-019: Al seleccionar estado, municipios se actualiza'), async ({ page }) => {
  // Select estado
  await page.locator('#prereg-estado').click();
  await page.waitForTimeout(300);
  await page.getByRole('option', { name: /nuevo le/i }).click();
  await page.waitForTimeout(500);

  // Ciudad/Municipio select should now have options
  await page.locator('#prereg-ciudad').click();
  await page.waitForTimeout(300);
  const opciones = await page.getByRole('option').all();
  expect(opciones.length).toBeGreaterThan(1);

  const textos = await Promise.all(opciones.map(o => o.textContent()));
  expect(textos.some(t => /monterrey/i.test(t ?? ''))).toBe(true);
  await page.keyboard.press('Escape');
});

test(qase(32, 'TC-020: CURP se autocalcula al llenar nombre, apellidos, fecha, género y estado'), async ({ page }) => {
  // Fill text inputs using actual IDs
  await page.fill('#prereg-nombres', 'Juan');
  await page.fill('#prereg-ap-pat', 'García');
  await page.fill('#prereg-ap-mat', 'López');
  await page.fill('#prereg-fn', '2000-01-15');

  // Género (Radix Select)
  await page.locator('#prereg-genero').click();
  await page.waitForTimeout(300);
  await page.getByRole('option', { name: /masculino/i }).click();
  await page.waitForTimeout(300);

  // Estado (Radix Select)
  await page.locator('#prereg-estado').click();
  await page.waitForTimeout(300);
  await page.getByRole('option', { name: /nuevo le/i }).click();

  await page.waitForTimeout(700);
  const curpValue = await page.locator('#prereg-curp').inputValue();
  expect(curpValue.length).toBeGreaterThanOrEqual(10);
  expect(curpValue).toMatch(/^GAL/i);
});

test(qase(24, 'TC-012: Formulario público muestra folio al enviar'), async ({ page }) => {
  // Fill all required fields
  await page.fill('#prereg-nombres', 'E2E');
  await page.fill('#prereg-ap-pat', 'Test');
  await page.fill('#prereg-ap-mat', 'Playwright');
  await page.fill('#prereg-fn', '2000-06-15');

  // Género
  await page.locator('#prereg-genero').click();
  await page.waitForTimeout(300);
  await page.getByRole('option').first().click();
  await page.waitForTimeout(300);

  // Estado
  await page.locator('#prereg-estado').click();
  await page.waitForTimeout(300);
  await page.getByRole('option', { name: /nuevo le/i }).click();
  await page.waitForTimeout(500);

  // Ciudad
  await page.locator('#prereg-ciudad').click();
  await page.waitForTimeout(300);
  await page.getByRole('option').first().click();
  await page.waitForTimeout(300);

  // Teléfono y correo (required by backend)
  await page.fill('#prereg-tcel', '8181234567').catch(() => {});
  await page.fill('#prereg-mail', 'e2e@test.com').catch(() => {});

  // CURP — fill with a valid CURP (TC-012 uses a fixed test CURP)
  await page.fill('#prereg-curp', 'PLAW000201HXXXXXX3');

  // Válvula (required)
  await page.locator('#prereg-valv').click().catch(() => {});
  await page.waitForTimeout(300);
  await page.getByRole('option', { name: /no/i }).first().click().catch(() => {});
  await page.waitForTimeout(300);

  // Tipo de espina bífida (required)
  await page.locator('#prereg-tipo').click().catch(() => {});
  await page.waitForTimeout(300);
  await page.getByRole('option').first().click().catch(() => {});
  await page.waitForTimeout(300);

  // Wait for Turnstile auto-pass (site key 1x00000000000000000000AA = always passes instantly)
  await page.waitForTimeout(4000);

  await page.getByRole('button', { name: /enviar/i }).click();

  await expect(
    page.locator('text=/folio|confirmaci|enviad|registrad|solicitud enviada|gracias/i')
  ).toBeVisible({ timeout: 20000 });
});
