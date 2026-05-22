import { test, expect, request } from '@playwright/test';
import { qase } from 'playwright-qase-reporter';

const BASE = 'http://localhost:3000';

test.skip(qase(27, 'TC-015: Refresh token válido retorna nuevo access + refresh token'), async () => {});
test.skip(qase(28, 'TC-016: Reuso de refresh token retorna 401 e invalida sesiones'), async () => {});
test.skip(qase(29, 'TC-017: POST /auth/logout limpia REFRESH_TOKEN_HASH'), async () => {});

test(qase(26, 'TC-014: Headers HTTP incluyen X-Frame-Options, nosniff y CSP'), async () => {
  const ctx = await request.newContext({ baseURL: BASE });
  const res = await ctx.get('/health');
  const headers = res.headers();
  // Documenta deuda técnica — se espera fallo si Helmet no está configurado
  expect(headers['x-frame-options']).toBeDefined();
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['content-security-policy']).toBeDefined();
  await ctx.dispose();
});

// Rate limiting — AL FINAL para no bloquear otros tests
test(qase(25, 'TC-013: 5 intentos fallidos bloquean IP con 429'), async () => {
  const ctx = await request.newContext({ baseURL: BASE });

  for (let i = 0; i < 5; i++) {
    await ctx.post('/auth/login', {
      data: { email: 'prueba@espina.com', password: 'wrong_password_e2e' },
    });
  }

  const res = await ctx.post('/auth/login', {
    data: { email: 'prueba@espina.com', password: 'wrong_password_e2e' },
  });
  expect(res.status()).toBe(429);
  await ctx.dispose();
});
