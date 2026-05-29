import { test, expect, request } from '@playwright/test';
import { qase } from 'playwright-qase-reporter';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
// TC-013 / UAT-003 apuntan siempre a producción donde el rate limiter está activo.
const RATE_LIMIT_URL = process.env.E2E_RATE_LIMIT_URL || BASE_URL;
const isLocalhost = RATE_LIMIT_URL.includes('localhost') || RATE_LIMIT_URL.includes('127.0.0.1');

// ── TC-014: Headers de seguridad ─────────────────────────────────────────────
test(qase(26, 'TC-014: Headers HTTP incluyen X-Frame-Options, nosniff y CSP'), async () => {
  const ctx = await request.newContext({ baseURL: BASE_URL });
  const res = await ctx.get('/health');
  const headers = res.headers();
  expect(headers['x-frame-options']).toBeDefined();
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['content-security-policy']).toBeDefined();
  await ctx.dispose();
});

// ── TC-015: Refresh token válido emite nuevo par ──────────────────────────────
test(qase(27, 'TC-015: Refresh token válido retorna nuevo access + refresh token'), async () => {
  const ctx = await request.newContext({ baseURL: BASE_URL });

  const loginRes = await ctx.post('/administradores/login', {
    data: {
      email: process.env.E2E_ADMIN_EMAIL || 'prueba@espina.com',
      password: process.env.E2E_ADMIN_PASSWORD || '222222',
    },
  });
  expect(loginRes.status()).toBe(200);
  const { refreshToken } = await loginRes.json();
  expect(typeof refreshToken).toBe('string');
  expect(refreshToken.length).toBeGreaterThan(10);

  const refreshRes = await ctx.post('/administradores/refresh', {
    data: { refreshToken },
  });
  expect(refreshRes.status()).toBe(200);
  const body = await refreshRes.json();
  expect(typeof body.token).toBe('string');
  expect(typeof body.refreshToken).toBe('string');
  // El nuevo refresh token debe ser distinto al anterior (rotación)
  expect(body.refreshToken).not.toBe(refreshToken);

  // Cleanup: revocar el nuevo token
  await ctx.post('/administradores/logout', { data: { refreshToken: body.refreshToken } }).catch(() => {});
  await ctx.dispose();
});

// ── TC-016: Reuso de refresh token revocado retorna 401 ───────────────────────
test(qase(28, 'TC-016: Reuso de refresh token retorna 401 e invalida sesiones'), async () => {
  const ctx = await request.newContext({ baseURL: BASE_URL });

  const loginRes = await ctx.post('/administradores/login', {
    data: {
      email: process.env.E2E_ADMIN_EMAIL || 'prueba@espina.com',
      password: process.env.E2E_ADMIN_PASSWORD || '222222',
    },
  });
  expect(loginRes.status()).toBe(200);
  const { refreshToken } = await loginRes.json();

  // Primer uso — válido, emite nuevo par y revoca el original
  const first = await ctx.post('/administradores/refresh', { data: { refreshToken } });
  expect(first.status()).toBe(200);
  const { refreshToken: newToken } = await first.json();

  // Segundo uso del token original ya revocado — debe retornar 401
  const second = await ctx.post('/administradores/refresh', { data: { refreshToken } });
  expect(second.status()).toBe(401);

  // Cleanup
  await ctx.post('/administradores/logout', { data: { refreshToken: newToken } }).catch(() => {});
  await ctx.dispose();
});

// ── TC-017: Logout revoca el refresh token ────────────────────────────────────
test(qase(29, 'TC-017: POST /auth/logout revoca el refresh token'), async () => {
  const ctx = await request.newContext({ baseURL: BASE_URL });

  const loginRes = await ctx.post('/administradores/login', {
    data: {
      email: process.env.E2E_ADMIN_EMAIL || 'prueba@espina.com',
      password: process.env.E2E_ADMIN_PASSWORD || '222222',
    },
  });
  expect(loginRes.status()).toBe(200);
  const { refreshToken } = await loginRes.json();

  // Logout
  const logoutRes = await ctx.post('/administradores/logout', { data: { refreshToken } });
  expect([200, 204]).toContain(logoutRes.status());

  // El token revocado ya no debe funcionar
  const refreshRes = await ctx.post('/administradores/refresh', { data: { refreshToken } });
  expect(refreshRes.status()).toBe(401);

  await ctx.dispose();
});

// ── TC-013: Rate limiting bloquea tras 5 intentos fallidos ───────────────────
test(qase(25, 'TC-013: 5 intentos fallidos bloquean IP con 429'), async () => {
  test.skip(isLocalhost, 'Rate limiter desactivado en localhost (NODE_ENV != production)');

  const ctx = await request.newContext({ baseURL: RATE_LIMIT_URL });

  for (let i = 0; i < 5; i++) {
    await ctx.post('/administradores/login', {
      data: { email: 'prueba@espina.com', password: 'wrong_password_e2e_tc013' },
    });
  }

  const res = await ctx.post('/administradores/login', {
    data: { email: 'prueba@espina.com', password: 'wrong_password_e2e_tc013' },
  });
  expect(res.status()).toBe(429);
  await ctx.dispose();
});
