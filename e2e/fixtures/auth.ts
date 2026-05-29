import { test as base, APIRequestContext, request } from '@playwright/test';

type AuthFixtures = {
  token: string;
  apiContext: APIRequestContext;
};

export const test = base.extend<{}, AuthFixtures>({
  token: [async ({}, use) => {
    const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';
    const ctx = await request.newContext({ baseURL });
    const res = await ctx.post('/administradores/login', {
      data: {
        email:    process.env.E2E_ADMIN_EMAIL    || 'prueba@espina.com',
        password: process.env.E2E_ADMIN_PASSWORD || '222222',
      },
    });
    if (!res.ok()) throw new Error(`Login falló: ${res.status()} ${await res.text()}`);
    const body = await res.json();
    const token: string = body.token ?? body.data?.token ?? body.accessToken;
    await ctx.dispose();
    await use(token);
  }, { scope: 'worker' }],

  apiContext: [async ({ token }, use) => {
    const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';
    const ctx = await request.newContext({
      baseURL,
      extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    });
    await use(ctx);
    await ctx.dispose();
  }, { scope: 'worker' }],
});

export { expect } from '@playwright/test';
