import { test, expect, request } from '@playwright/test';
import { qase } from 'playwright-qase-reporter';

const PANEL_URL = 'http://localhost:3001/panel';
const API_BASE = 'http://localhost:3000';
// Valid 18-char CURP for female (M), matching names Test/UAT/Flujo, date 2000-03-10, estado NL
// Backend accepts 'M' or 'F' (M=Masculino per DB schema); form sends 'M' for Femenino Radix option
const UAT_CURP = 'UAFT000310MNLTLS03';

async function loginUI(page: import('@playwright/test').Page) {
  await page.goto(PANEL_URL);
  await page.fill('input[type="email"]', 'prueba@espina.com');
  await page.fill('input[type="password"]', '222222');
  // Button text is "Acceder al panel" (not "Iniciar sesión" which is the h1)
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/panel**', { timeout: 15000 });
}

test(qase(41, 'UAT-001: Flujo completo pre-registro y aprobación'), async ({ page }) => {
  test.setTimeout(120_000); // flujo completo: cleanup + form + Turnstile + aprobación
  // Cleanup: remove any prior UAT_CURP record (PENDIENTE or approved) so form always creates fresh
  const ctxBase = await request.newContext({ baseURL: API_BASE });
  const loginRes = await ctxBase.post('/administradores/login', {
    data: { email: 'prueba@espina.com', password: '222222' },
  });
  const { token } = await loginRes.json();
  await ctxBase.dispose();
  const ctx = await request.newContext({
    baseURL: API_BASE,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });
  // First try direct pre-reg delete (works for PENDIENTE)
  const delRes = await ctx.delete(`/beneficiarios/${UAT_CURP}/pre-registro`).catch(() => null);
  if (!delRes?.ok()) {
    // Force-delete approved beneficiary: PATCH estatus → PUT notas marker → DELETE pre-reg
    const getRes = await ctx.get(`/beneficiarios/${UAT_CURP}`).catch(() => null);
    if (getRes?.ok()) {
      const body = await getRes.json();
      const data = body.data ?? body;
      await ctx.patch(`/beneficiarios/${UAT_CURP}/estatus`, { data: { estatus: 'Inactivo' } }).catch(() => {});
      await ctx.put(`/beneficiarios/${UAT_CURP}`, {
        data: {
          nombres: data.nombres ?? 'Test',
          apellidoPaterno: data.apellidoPaterno ?? 'UAT',
          apellidoMaterno: data.apellidoMaterno ?? 'Flujo',
          fechaNacimiento: data.fechaNacimiento ?? '2000-03-10',
          genero: data.genero ?? 'M',
          ciudad: data.ciudad ?? 'Monterrey',
          municipio: data.municipio ?? 'Monterrey',
          estado: data.estado ?? 'Nuevo León',
          notas: '[SOLICITUD_PUBLICA_PRE_REG]',
        },
      }).catch(() => {});
      await ctx.delete(`/beneficiarios/${UAT_CURP}/pre-registro`).catch(() => {});
    }
  }
  await ctx.dispose();

  await page.goto('http://localhost:3001');
  await page.getByRole('button', { name: /iniciar pre-registro|llenar solicitud/i }).first().click();
  await page.waitForSelector('form', { timeout: 10000 });

  // Fill required fields — use names WITHOUT digits (errTextNoDigits validation)
  await page.fill('#prereg-nombres', 'Test').catch(() => {});
  await page.fill('#prereg-ap-pat', 'UAT').catch(() => {});
  await page.fill('#prereg-ap-mat', 'Flujo').catch(() => {});
  await page.fill('#prereg-fn', '2000-03-10').catch(() => {});

  // Género (Radix Select) — select first option (Femenino, value='M', accepted by backend)
  await page.locator('#prereg-genero').click().catch(() => {});
  await page.waitForTimeout(300);
  await page.getByRole('option').first().click().catch(() => {});
  await page.waitForTimeout(300);

  // Estado (Radix Select)
  await page.locator('#prereg-estado').click().catch(() => {});
  await page.waitForTimeout(300);
  await page.getByRole('option', { name: /nuevo le/i }).click().catch(() => {});
  await page.waitForTimeout(500);

  // Ciudad/Municipio
  await page.locator('#prereg-ciudad').click().catch(() => {});
  await page.waitForTimeout(300);
  await page.getByRole('option').first().click().catch(() => {});
  await page.waitForTimeout(300);

  // Teléfono y correo
  await page.fill('#prereg-tcel', '8181234567').catch(() => {});
  await page.fill('#prereg-mail', 'uat001@test.com').catch(() => {});

  // CURP — set explicitly AFTER auto-calculation, providing valid 18-char value
  await page.fill('#prereg-curp-homoclave', '03');

  // Válvula
  await page.locator('#prereg-valv').click().catch(() => {});
  await page.waitForTimeout(300);
  await page.getByRole('option', { name: /no/i }).first().click().catch(() => {});
  await page.waitForTimeout(300);

  // Tipo de espina bífida
  await page.locator('#prereg-tipo').click().catch(() => {});
  await page.waitForTimeout(300);
  await page.getByRole('option').first().click().catch(() => {});
  await page.waitForTimeout(300);

  // Wait for Turnstile auto-pass (site key 1x00000000000000000000AA); CI needs extra time
  await page.waitForTimeout(12000);

  await page.getByRole('button', { name: /enviar solicitud/i }).click();
  // Use heading-level check to avoid matching static page text (e.g. "Gracias a ellos es posible")
  await expect(
    page.getByRole('heading', { name: /solicitud enviada/i })
  ).toBeVisible({ timeout: 15000 });

  await loginUI(page);
  await page.getByRole('button', { name: /preregistro/i }).click();
  await page.waitForTimeout(3000); // wait for table to load

  // Find the row in the "Todas las solicitudes" table
  const filaE2E = page.locator('tr').filter({ hasText: 'Test UAT' }).first();
  await expect(filaE2E).toBeVisible({ timeout: 8000 });

  // Click "Revisar" to move item to quick review card
  await filaE2E.getByRole('button', { name: /revisar/i }).click();
  await page.waitForTimeout(500);

  // Click "Aprobar solicitud" in the quick review card (icon-only button with title)
  await page.getByRole('button', { name: /aprobar solicitud/i }).click();
  await page.waitForTimeout(500);

  // Confirm in the AlertDialog
  await page.getByRole('button', { name: /sí.*aprobar|aprobar expediente/i }).click();
  await page.waitForTimeout(1500);

  // Dismiss the "¿Completar información?" follow-up dialog
  await page.getByRole('button', { name: /más tarde/i }).click().catch(() => {});
  await page.waitForTimeout(500);

  // Navigate to Beneficiarios and search
  await page.getByRole('button', { name: /beneficiarios/i }).click();
  await page.waitForTimeout(2000);
  const searchBox = page.getByPlaceholder(/buscar/i).first();
  await searchBox.fill('Test UAT').catch(() => {});
  await page.waitForTimeout(1000);
  const beneficiarioVisible = await page.locator('text=Test UAT').isVisible().catch(() => false);
  expect(beneficiarioVisible).toBe(true);
});

test(qase(42, 'UAT-002: Generación y descarga de reporte de membresías en PDF'), async ({ page }) => {
  await loginUI(page);

  // Navigate to Reportes section via sidebar
  await page.getByRole('button', { name: /reportes/i }).click();
  await page.waitForTimeout(1500);

  // Select "Membresías" report type from left panel buttons (match on description to avoid sidebar ambiguity)
  await page.getByRole('button', { name: /activas.*vencer|membres.*activas/i }).click();
  await page.waitForTimeout(300);

  // Select "Personalizado" period from Radix Select (first combobox = Periodo)
  await page.locator('[role="combobox"]').first().click();
  await page.waitForTimeout(300);
  await page.getByRole('option', { name: /personalizado/i }).click();
  await page.waitForTimeout(300);

  // Fill custom date range inputs (Desde / Hasta)
  await page.locator('input[type="date"]').first().fill('2026-01-01');
  await page.locator('input[type="date"]').last().fill('2026-12-31');
  await page.waitForTimeout(1500); // wait for auto-preview to complete

  // Click download button and capture the file
  const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
  await page.getByRole('button', { name: /generar/i }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/pdf|xlsx/i);
});

// Rate limiting is disabled in dev mode (skip: isTest in rateLimiter.js), only active in production
test.skip(qase(43, 'UAT-003: Bloqueo por intentos fallidos de login'), async ({ page }) => {
  await page.goto(PANEL_URL);

  for (let i = 0; i < 5; i++) {
    await page.fill('input[type="email"]', 'prueba@espina.com');
    await page.fill('input[type="password"]', 'wrong_pass_uat_e2e');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(500);
  }

  await page.fill('input[type="email"]', 'prueba@espina.com');
  await page.fill('input[type="password"]', 'wrong_pass_uat_e2e');
  await page.locator('button[type="submit"]').click();

  await expect(
    page.locator('text=/demasiados|bloqueado|429|15 minuto|espera/i')
  ).toBeVisible({ timeout: 10000 });
});
