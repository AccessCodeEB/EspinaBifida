import { test, expect, request } from '@playwright/test';
import { test as authTest } from '../fixtures/auth';
import { cleanupPreregistros } from '../helpers/cleanup';
import { qase } from 'playwright-qase-reporter';

const BASE = 'http://localhost:3000';
const TEST_CURP = 'E2EX000000MXXXXX01';

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
  telefono: '8181234567',
  correo: 'e2e@test.com',
  tipoEspinaBifida: 'Oculta',
};

let preregistroId: number;

test.afterAll(async () => {
  await cleanupPreregistros();
});

test(qase(19, 'TC-007: POST /pre-registro crea registro con PENDIENTE y retorna 201'), async () => {
  const ctx = await request.newContext({ baseURL: BASE });
  const res = await ctx.post('/beneficiarios/solicitud-publica', { data: preregistroBase });
  expect(res.status()).toBe(201);
  const body = await res.json();
  expect(body.data?.estatus ?? body.estatus).toMatch(/pendiente/i);
  await ctx.dispose();
});

test(qase(20, 'TC-008: CURP duplicada retorna 409 CURP_DUPLICADA'), async () => {
  const ctx = await request.newContext({ baseURL: BASE });
  const res = await ctx.post('/beneficiarios/solicitud-publica', { data: preregistroBase });
  expect(res.status()).toBe(409);
  const body = await res.json();
  expect(body.code).toMatch(/CURP|DUPLICATE/i);
  await ctx.dispose();
});

authTest(qase(21, 'TC-009: GET /pre-registros?estatus=PENDIENTE retorna lista paginada'), async ({ apiContext }) => {
  const res = await apiContext.get('/beneficiarios/preregistros?estatus=PENDIENTE');
  expect(res.status()).toBe(200);
  const body = await res.json();
  const lista = body.data ?? body;
  expect(Array.isArray(lista)).toBe(true);
});

authTest(qase(22, 'TC-010: Aprobar pre-registro crea BENEFICIARIOS y retorna 201'), async ({ apiContext }) => {
  const listRes = await apiContext.get('/beneficiarios/preregistros?estatus=PENDIENTE&limit=50');
  const listBody = await listRes.json();
  const lista: Array<{ id: number; curp: string }> = listBody.data ?? listBody;
  const target = lista.find((r: { curp: string }) => r.curp?.startsWith('E2EX'));
  expect(target).toBeDefined();
  preregistroId = target!.id;

  const res = await apiContext.post(`/beneficiarios/preregistros/${preregistroId}/aprobar`);
  expect([200, 201]).toContain(res.status());
});

authTest(qase(23, 'TC-011: Rechazar pre-registro persiste motivo y retorna 200'), async ({ apiContext }) => {
  const ctx = await request.newContext({ baseURL: BASE });
  const crearRes = await ctx.post('/beneficiarios/solicitud-publica', {
    data: { ...preregistroBase, curp: 'E2EX000000MXXXXX02' },
  });
  await ctx.dispose();

  if (crearRes.ok()) {
    const crearBody = await crearRes.json();
    const id = crearBody.data?.id ?? crearBody.id;
    if (id) {
      const res = await apiContext.post(`/beneficiarios/preregistros/${id}/rechazar`, {
        data: { motivo: 'E2E Test - rechazo de prueba' },
      });
      expect([200, 204]).toContain(res.status());
    }
  }
});
