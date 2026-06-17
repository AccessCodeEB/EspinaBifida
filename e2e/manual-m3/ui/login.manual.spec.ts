import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────
// Actividad M3 — Pruebas Regresión E2E Automatizadas (Enfoque Manual)
// Flujo: Login de administrador (funcionalidad del Sprint 1)
//
// TC-M-001 (positivo) y TC-M-002 (negativo) — ver definición completa en
// docs/actividad-m3-manual/reporte-manual.md
// ─────────────────────────────────────────────────────────────────────────

const PANEL_URL = 'http://localhost:3001/panel';
const ADMIN_EMAIL = 'prueba@espina.com';
const ADMIN_PASSWORD = '222222';

test.describe('Login administrador (enfoque manual)', () => {

  test('TC-M-001: Login exitoso con credenciales válidas redirige al panel', async ({ page }) => {
    await page.goto(PANEL_URL);
    await page.waitForSelector('#login-email');

    await page.locator('#login-email').fill(ADMIN_EMAIL);
    await page.locator('#login-password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Acceder al panel' }).click();

    await page.waitForURL('**/panel**', { timeout: 15000 });
    await expect(page).toHaveURL(/\/panel/);
  });

  test('TC-M-002: Login con contraseña incorrecta muestra error y no redirige', async ({ page }) => {
    await page.goto(PANEL_URL);
    await page.waitForSelector('#login-email');

    await page.locator('#login-email').fill(ADMIN_EMAIL);
    await page.locator('#login-password').fill('clave_incorrecta_123');
    await page.getByRole('button', { name: 'Acceder al panel' }).click();

    // Next.js renderiza su propio route-announcer con role="alert" (vacío), además
    // del alert real del formulario — hay que filtrar por texto para evitar
    // "strict mode violation" al resolver 2 elementos con el mismo rol.
    const errorAlert = page.getByRole('alert').filter({ hasText: /credenciales inválidas/i });
    await expect(errorAlert).toBeVisible({ timeout: 8000 });
    await expect(page).toHaveURL(PANEL_URL);
  });

});
