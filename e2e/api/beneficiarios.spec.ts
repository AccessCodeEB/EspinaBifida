import { test, expect } from '../fixtures/auth';
import { cleanupBeneficiarios } from '../helpers/cleanup';
import { qase } from 'playwright-qase-reporter';

// PLAW000201HXXXXXX0 cumple regex: ^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$
const TEST_CURP = 'PLAW000201HXXXXXX0';

const beneficiarioBase = {
  curp: TEST_CURP,
  nombres: 'E2E Prueba',
  apellidoPaterno: 'Test',
  apellidoMaterno: 'Playwright',
  fechaNacimiento: '2000-01-01',
  genero: 'M',
  ciudad: 'Monterrey',
  municipio: 'Monterrey',
  estado: 'Nuevo León',
  estatus: 'Activo',
};

test.beforeAll(async () => {
  await cleanupBeneficiarios();
});

test.afterAll(async () => {
  await cleanupBeneficiarios();
});

test(qase(1, 'Registrar beneficiario con datos válidos'), async ({ apiContext }) => {
  await apiContext.delete(`/beneficiarios/${TEST_CURP}`).catch(() => {});

  const res = await apiContext.post('/beneficiarios', { data: beneficiarioBase });
  expect(res.status()).toBe(201);
  const body = await res.json();
  expect(body.message ?? body.data?.curp ?? body.curp).toBeTruthy();
});

test(qase(2, 'Rechazar CURP inválida'), async ({ apiContext }) => {
  const res = await apiContext.post('/beneficiarios', {
    data: { ...beneficiarioBase, curp: 'CURP_INVALIDA_123' },
  });
  expect(res.status()).toBe(400);
});

test(qase(10, 'Rechazar CURP duplicada retorna 409'), async ({ apiContext }) => {
  await apiContext.post('/beneficiarios', { data: beneficiarioBase }).catch(() => {});

  const res = await apiContext.post('/beneficiarios', { data: beneficiarioBase });
  expect(res.status()).toBe(409);
  const body = await res.json();
  expect(body.code).toMatch(/CURP|DUPLICATE|CONFLICT/i);
});

// CURPs adicionales para tests de operaciones sensibles
const TEST_CURP_OPS  = 'PLAW000201HXXXXXX3'; // GET, PUT, PATCH estatus
const TEST_CURP_BAJA = 'PLAW000201HXXXXXX5'; // DELETE baja lógica
const TEST_CURP_HARD = 'PLAW000201HXXXXXX4'; // DELETE eliminación permanente

test(qase(44, 'GET /beneficiarios/:curp retorna datos del beneficiario'), async ({ apiContext }) => {
  await apiContext.post('/beneficiarios', { data: { ...beneficiarioBase, curp: TEST_CURP_OPS } }).catch(() => {});
  const res = await apiContext.get(`/beneficiarios/${TEST_CURP_OPS}`);
  expect(res.status()).toBe(200);
  const body = await res.json();
  const data = body.data ?? body;
  expect(data.curp ?? data.CURP).toBeTruthy();
});

test(qase(45, 'PUT /beneficiarios/:curp actualiza datos correctamente'), async ({ apiContext }) => {
  await apiContext.post('/beneficiarios', { data: { ...beneficiarioBase, curp: TEST_CURP_OPS } }).catch(() => {});
  const res = await apiContext.put(`/beneficiarios/${TEST_CURP_OPS}`, {
    data: { nombres: 'E2E Actualizado', apellidoPaterno: 'Test', apellidoMaterno: 'Playwright' },
  });
  expect(res.status()).toBe(200);
  // El PUT retorna solo message; verificar con GET
  const getRes = await apiContext.get(`/beneficiarios/${TEST_CURP_OPS}`);
  expect(getRes.status()).toBe(200);
  const body = await getRes.json();
  const data = body.data ?? body;
  expect(String(data.nombres ?? data.NOMBRES ?? '').toLowerCase()).toContain('actualizado');
});

test(qase(46, 'PATCH /beneficiarios/:curp/estatus cambia estatus a Inactivo'), async ({ apiContext }) => {
  await apiContext.post('/beneficiarios', { data: { ...beneficiarioBase, curp: TEST_CURP_OPS } }).catch(() => {});
  const res = await apiContext.patch(`/beneficiarios/${TEST_CURP_OPS}/estatus`, {
    data: { estatus: 'Inactivo' },
  });
  expect(res.status()).toBe(200);
});

test(qase(47, 'DELETE /beneficiarios/:curp aplica baja lógica (registro persiste con estatus Baja)'), async ({ apiContext }) => {
  await apiContext.post('/beneficiarios', { data: { ...beneficiarioBase, curp: TEST_CURP_BAJA } }).catch(() => {});
  const res = await apiContext.delete(`/beneficiarios/${TEST_CURP_BAJA}`);
  expect(res.status()).toBe(200);
  // El registro debe seguir existiendo
  const getRes = await apiContext.get(`/beneficiarios/${TEST_CURP_BAJA}`);
  expect(getRes.status()).toBe(200);
  const data = (await getRes.json()).data ?? await getRes.json();
  expect(data.estatus ?? data.ESTATUS).toBe('Baja');
});

test(qase(48, 'DELETE /beneficiarios/:curp/eliminar elimina el registro permanentemente'), async ({ apiContext }) => {
  await apiContext.post('/beneficiarios', { data: { ...beneficiarioBase, curp: TEST_CURP_HARD } }).catch(() => {});
  const res = await apiContext.delete(`/beneficiarios/${TEST_CURP_HARD}/eliminar`);
  expect(res.status()).toBe(200);
  // El registro no debe existir después del hard delete
  const getRes = await apiContext.get(`/beneficiarios/${TEST_CURP_HARD}`);
  expect(getRes.status()).toBe(404);
});
