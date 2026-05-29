import { test, expect, request } from '@playwright/test';
import { qase } from 'playwright-qase-reporter';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
// TC-013 usa su propia URL para apuntar siempre a producción donde el rate limiter está activo.
// E2E_RATE_LIMIT_URL sobreescribe E2E_BASE_URL para este test.
const RATE_LIMIT_URL = process.env.E2E_RATE_LIMIT_URL || BASE_URL;
const isLocalhost = RATE_LIMIT_URL.includes('localhost') || RATE_LIMIT_URL.includes('127.0.0.1');

test.skip(qase(27, 'TC-015: Refresh token válido retorna nuevo access + refresh token'), async () => {});
test.skip(qase(28, 'TC-016: Reuso de refresh token retorna 401 e invalida sesiones'), async () => {});
test.skip(qase(29, 'TC-017: POST /auth/logout limpia REFRESH_TOKEN_HASH'), async () => {});

test.skip(qase(26, 'TC-014: Headers HTTP incluyen X-Frame-Options, nosniff y CSP'), async () => {
  const ctx = await request.newContext({ baseURL: BASE_URL });
  const res = await ctx.get('/health');
  const headers = res.headers();
  expect(headers['x-frame-options']).toBeDefined();
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['content-security-policy']).toBeDefined();
  await ctx.dispose();
});

// Rate limiting — activo solo en producción (NODE_ENV=production en Render).
// Se saltea automáticamente si E2E_BASE_URL apunta a localhost.
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
