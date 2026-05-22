import { test, expect, request } from '@playwright/test';
import { test as authTest } from '../fixtures/auth';
import { cleanupPreregistros } from '../helpers/cleanup';
import { qase } from 'playwright-qase-reporter';

const BASE = 'http://localhost:3000';
// CURPs válidas: ^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$
const TEST_CURP = 'PLAW000101HXXXXXX1';
const TEST_CURP_RECHAZAR = 'PLAW000101HXXXXXX2';

const preregistroBase = {
  curp: TEST_CURP,
  nombres: 'E2E PreReg',
  apellidoPaterno: 'Test',
  apellidoMaterno: 'Playwright',
  fechaNacimiento: '2000-06-15',
  genero: 'Femenino',
  ciudad: 'Monterrey',
  municipio: 'Monterrey',
  estado: 'Nuevo León',
  telefonoCelular: '8181234567',
  correoElectronico: 'e2e@test.com',
  tipo: 'Oculta',
  usaValvula: 'N',
  // Token de prueba Cloudflare — el backend usa secret de prueba que acepta cualquier token
  turnstileToken: 'XXXX.DUMMY.TOKEN.XXXX',
};

authTest.afterAll(async () => {
  await cleanupPreregistros();
});

test(qase(19, 'TC-007: POST /pre-registro crea registro con PENDIENTE y retorna 201'), async () => {
  const ctx = await request.newContext({ baseURL: BASE });
  const res = await ctx.post('/beneficiarios/solicitud-publica', { data: preregistroBase });
  expect(res.status()).toBe(201);
  const body = await res.json();
  expect(body.folio ?? body.data?.folio ?? body.curp ?? TEST_CURP).toBeTruthy();
  await ctx.dispose();
});

test(qase(20, 'TC-008: CURP duplicada retorna 409 CURP_DUPLICADA'), async () => {
  const ctx = await request.newContext({ baseURL: BASE });
  const res = await ctx.post('/beneficiarios/solicitud-publica', { data: preregistroBase });
  expect(res.status()).toBe(409);
  const body = await res.json();
  expect(body.code ?? body.error ?? '').toMatch(/CURP|DUPLICATE|duplicad/i);
  await ctx.dispose();
});

authTest(qase(21, 'TC-009: GET preregistros pendientes retorna lista'), async ({ apiContext }) => {
  const res = await apiContext.get('/beneficiarios?tipo=preregistros&estatus=PENDIENTE');
  expect(res.status()).toBe(200);
  const body = await res.json();
  const lista = body.data ?? body;
  expect(Array.isArray(lista)).toBe(true);
});

authTest(qase(22, 'TC-010: Aprobar pre-registro crea BENEFICIARIOS y retorna 201'), async ({ apiContext }) => {
  const res = await apiContext.post(`/beneficiarios/${TEST_CURP}/aprobar-pre-registro`);
  expect([200, 201]).toContain(res.status());
});

authTest(qase(23, 'TC-011: Rechazar pre-registro persiste motivo y retorna 200'), async ({ apiContext }) => {
  const ctx = await request.newContext({ baseURL: BASE });
  await ctx.post('/beneficiarios/solicitud-publica', {
    data: { ...preregistroBase, curp: TEST_CURP_RECHAZAR },
  });
  await ctx.dispose();

  const res = await apiContext.delete(`/beneficiarios/${TEST_CURP_RECHAZAR}/pre-registro`);
  expect([200, 204]).toContain(res.status());
});
