import { APIRequestContext, request } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

async function authedContext(): Promise<APIRequestContext> {
  const ctx = await request.newContext({ baseURL: BASE_URL });
  const loginRes = await ctx.post('/administradores/login', {
    data: {
      email: process.env.E2E_ADMIN_EMAIL || 'prueba@espina.com',
      password: process.env.E2E_ADMIN_PASSWORD || '222222',
    },
  });
  const body = await loginRes.json();
  const token: string = body.token ?? body.data?.token ?? body.accessToken;
  await ctx.dispose();
  return request.newContext({
    baseURL: BASE_URL,
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
    if (b.curp?.startsWith('PLAW')) {
      await forceDeletePlaw(c, b.curp);
    }
  }
  if (!ctx) await c.dispose();
}

async function forceDeletePlaw(c: APIRequestContext, curp: string): Promise<void> {
  // Hard delete primero (más limpio para datos de prueba)
  const hard = await c.delete(`/beneficiarios/${curp}/eliminar`).catch(() => null);
  if (hard?.ok()) return;

  // Fallback: pre-registro delete (funciona si está en estado PENDIENTE)
  const direct = await c.delete(`/beneficiarios/${curp}/pre-registro`).catch(() => null);
  if (direct?.ok()) return;

  // If already approved (ACTIVO), restore PENDIENTE state then delete:
  // 1. Get current data
  const getRes = await c.get(`/beneficiarios/${curp}`).catch(() => null);
  if (!getRes?.ok()) return;
  const ben = await getRes.json();
  const data = ben.data ?? ben;

  // 2. Set status back to Inactivo
  await c.patch(`/beneficiarios/${curp}/estatus`, { data: { estatus: 'Inactivo' } }).catch(() => {});

  // 3. Restore the PENDIENTE marker in NOTAS via PUT (requires all mandatory fields)
  await c.put(`/beneficiarios/${curp}`, {
    data: {
      nombres: data.nombres ?? data.NOMBRES ?? 'E2E',
      apellidoPaterno: data.apellidoPaterno ?? data.APELLIDO_PATERNO ?? 'Test',
      apellidoMaterno: data.apellidoMaterno ?? data.APELLIDO_MATERNO ?? 'Playwright',
      fechaNacimiento: data.fechaNacimiento ?? data.FECHA_NACIMIENTO ?? '2000-01-01',
      genero: data.genero ?? data.GENERO ?? 'M',
      ciudad: data.ciudad ?? data.CIUDAD ?? 'Monterrey',
      municipio: data.municipio ?? data.MUNICIPIO ?? 'Monterrey',
      estado: data.estado ?? data.ESTADO ?? 'Nuevo León',
      notas: '[SOLICITUD_PUBLICA_PRE_REG]',
    },
  }).catch(() => {});

  // 4. Now delete
  await c.delete(`/beneficiarios/${curp}/pre-registro`).catch(() => {});
}

export async function cleanupMovimientosInventario(ctx?: APIRequestContext): Promise<void> {
  const c = ctx ?? await authedContext();
  await c.delete('/inventario/e2e-cleanup').catch(() => {});
  if (!ctx) await c.dispose();
}

export async function cleanupNotificaciones(ctx?: APIRequestContext): Promise<void> {
  const c = ctx ?? await authedContext();
  await c.delete('/notificaciones/e2e-cleanup').catch(() => {});
  if (!ctx) await c.dispose();
}

export async function cleanupPreregistros(ctx?: APIRequestContext): Promise<void> {
  const c = ctx ?? await authedContext();

  // Clean up from preregistros list (PENDIENTE state)
  const res = await c.get('/beneficiarios?tipo=preregistros&limit=200');
  if (res.ok()) {
    const body = await res.json();
    const registros: Array<{ folio: string; curp: string }> = body.data ?? body ?? [];
    for (const r of registros) {
      const curp = r.curp ?? r.folio;
      if (curp?.startsWith('PLAW')) {
        await forceDeletePlaw(c, curp);
      }
    }
  }

  // Also clean up PLAW test CURPs that may have been approved (ACTIVO state)
  const allRes = await c.get('/beneficiarios?limit=200');
  if (allRes.ok()) {
    const allBody = await allRes.json();
    const allBens: Array<{ curp: string }> = allBody.data ?? allBody ?? [];
    for (const b of allBens) {
      if (b.curp?.startsWith('PLAW')) {
        await forceDeletePlaw(c, b.curp);
      }
    }
  }

  if (!ctx) await c.dispose();
}
