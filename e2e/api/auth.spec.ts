import { test, expect, request } from '@playwright/test';
import { qase } from 'playwright-qase-reporter';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';

test(qase(33, 'RT-001: Login con credenciales válidas retorna 200 con JWT'), async () => {
  const ctx = await request.newContext({ baseURL: BASE });
  const res = await ctx.post('/administradores/login', {
    data: { email: 'prueba@espina.com', password: '222222' },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  const token = body.token ?? body.data?.token ?? body.accessToken;
  expect(typeof token).toBe('string');
  expect(token.length).toBeGreaterThan(10);
  await ctx.dispose();
});

test(qase(34, 'RT-002: Login con credenciales inválidas retorna 401'), async () => {
  const ctx = await request.newContext({ baseURL: BASE });
  const res = await ctx.post('/administradores/login', {
    data: { email: 'prueba@espina.com', password: 'wrong_e2e_rt002_intentional' },
  });
  expect(res.status()).toBe(401);
  await ctx.dispose();
});

test(qase(35, 'RT-003: Token inválido o malformado retorna 401'), async () => {
  const ctx = await request.newContext({
    baseURL: BASE,
    extraHTTPHeaders: { Authorization: 'Bearer token.invalido.aqui' },
  });
  const res = await ctx.get('/beneficiarios');
  expect(res.status()).toBe(401);
  await ctx.dispose();
});
