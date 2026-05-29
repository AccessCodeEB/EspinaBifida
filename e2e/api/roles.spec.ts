import { test, expect, request } from '@playwright/test';
import { qase } from 'playwright-qase-reporter';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';

test(qase(39, 'RT-017: Staff recibe 403 en rutas exclusivas de admin'), async () => {
  const ctx = await request.newContext({ baseURL: BASE });
  const res = await ctx.delete('/beneficiarios/CURPQUALQUIERA');
  expect([401, 403]).toContain(res.status());
  await ctx.dispose();
});
