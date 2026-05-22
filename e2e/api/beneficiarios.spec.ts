import { test, expect } from '../fixtures/auth';
import { cleanupBeneficiarios } from '../helpers/cleanup';
import { qase } from 'playwright-qase-reporter';

const TEST_CURP = 'E2EX000000MXXXXX00';

const beneficiarioBase = {
  curp: TEST_CURP,
  nombres: 'E2E Prueba',
  apellidoPaterno: 'Test',
  apellidoMaterno: 'Playwright',
  fechaNacimiento: '2000-01-01',
  genero: 'Masculino',
  ciudad: 'Monterrey',
  municipio: 'Monterrey',
  estado: 'Nuevo León',
  estatus: 'Activo',
};

test.afterAll(async () => {
  await cleanupBeneficiarios();
});

test(qase(1, 'Registrar beneficiario con datos válidos'), async ({ apiContext }) => {
  await apiContext.delete(`/beneficiarios/${TEST_CURP}`).catch(() => {});

  const res = await apiContext.post('/beneficiarios', { data: beneficiarioBase });
  expect(res.status()).toBe(201);
  const body = await res.json();
  expect(body.data?.curp ?? body.curp).toBe(TEST_CURP);
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
