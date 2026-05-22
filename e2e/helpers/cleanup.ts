import { APIRequestContext, request } from '@playwright/test';

async function authedContext(): Promise<APIRequestContext> {
  const ctx = await request.newContext({ baseURL: 'http://localhost:3000' });
  const loginRes = await ctx.post('/auth/login', {
    data: { email: 'prueba@espina.com', password: '222222' },
  });
  const body = await loginRes.json();
  const token: string = body.token ?? body.data?.token ?? body.accessToken;
  await ctx.dispose();
  return request.newContext({
    baseURL: 'http://localhost:3000',
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });
}

export async function cleanupBeneficiarios(ctx?: APIRequestContext): Promise<void> {
  const c = ctx ?? await authedContext();
  const res = await c.get('/beneficiarios?limit=200');
  if (!res.ok()) { if (!ctx) await c.dispose(); return; }
  const body = await res.json();
  const beneficiarios: Array<{ curp: string }> = body.data ?? body ?? [];
  for (const b of beneficiarios) {
    if (b.curp?.startsWith('E2EX')) {
      await c.delete(`/beneficiarios/${b.curp}`);
    }
  }
  if (!ctx) await c.dispose();
}

export async function cleanupPreregistros(ctx?: APIRequestContext): Promise<void> {
  const c = ctx ?? await authedContext();
  const res = await c.get('/beneficiarios/preregistros?limit=200');
  if (!res.ok()) { if (!ctx) await c.dispose(); return; }
  const body = await res.json();
  const registros: Array<{ id: number; curp: string }> = body.data ?? body ?? [];
  for (const r of registros) {
    if (r.curp?.startsWith('E2EX')) {
      await c.delete(`/beneficiarios/preregistros/${r.id}`).catch(() => {});
    }
  }
  if (!ctx) await c.dispose();
}
