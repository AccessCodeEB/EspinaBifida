import { request } from '@playwright/test';
import { test, expect } from '../fixtures/auth';
import { cleanupBeneficiarios } from '../helpers/cleanup';
import { qase } from 'playwright-qase-reporter';

const TEST_CURP = 'E2EX000000MXXXXX00';

test.beforeAll(async () => {
  const loginCtx = await request.newContext({ baseURL: 'http://localhost:3000' });
  const loginRes = await loginCtx.post('/auth/login', {
    data: { email: 'prueba@espina.com', password: '222222' },
  });
  const body = await loginRes.json();
  const token: string = body.token ?? body.data?.token ?? body.accessToken;
  await loginCtx.dispose();

  const ctx = await request.newContext({
    baseURL: 'http://localhost:3000',
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });

  await ctx.post('/beneficiarios', {
    data: {
      curp: TEST_CURP, nombres: 'E2E Prueba', apellidoPaterno: 'Test',
      apellidoMaterno: 'Playwright', fechaNacimiento: '2000-01-01',
      genero: 'Masculino', ciudad: 'Monterrey', municipio: 'Monterrey',
      estado: 'Nuevo León', estatus: 'Activo',
    },
  }).catch(() => {});

  await ctx.post('/membresias', {
    data: {
      curp: TEST_CURP,
      numeroCredencial: 'E2E-CRED-001',
      fechaVigenciaInicio: '2026-01-01',
      fechaVigenciaFin: '2026-12-31',
      fechaUltimoPago: '2026-01-01',
      monto: 500,
      metodoPago: 'Efectivo',
    },
  }).catch(() => {});

  await ctx.dispose();
});

test.afterAll(async () => {
  await cleanupBeneficiarios();
});

test(qase(4, 'Consultar membresía por CURP existente retorna 200'), async ({ apiContext }) => {
  const res = await apiContext.get(`/membresias/${TEST_CURP}`);
  expect(res.status()).toBe(200);
  const body = await res.json();
  const data = body.data ?? body;
  expect(data).toBeDefined();
});

test(qase(5, 'Rechazar consulta de membresía para CURP sin membresía retorna 404'), async ({ apiContext }) => {
  const res = await apiContext.get('/membresias/CURPSINMEMBRESIA00');
  expect(res.status()).toBe(404);
});

test(qase(3, 'Actualización manual de estado de membresía'), async ({ apiContext }) => {
  const resGet = await apiContext.get(`/membresias/${TEST_CURP}`);
  expect(resGet.status()).toBe(200);
  const body = await resGet.json();
  const membresia = body.data ?? body;
  const idCredencial = membresia.idCredencial ?? membresia.id_credencial ?? membresia[0]?.idCredencial;

  const resPut = await apiContext.put(`/membresias/${idCredencial ?? TEST_CURP}`, {
    data: { estatus: 'Inactivo' },
  });
  expect([200, 204]).toContain(resPut.status());
});
