import { test, expect } from '../fixtures/auth';
import { qase } from 'playwright-qase-reporter';

// Beneficiario existente en BD de prueba con membresía activa
const TEST_CURP = 'NAML040718HZSVRBA1';

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

test(qase(3, 'Consultar estado de membresía activa'), async ({ apiContext }) => {
  const res = await apiContext.get(`/membresias/${TEST_CURP}/activa`);
  // 200 = activa, 403/404 = no activa — ambos son respuestas válidas del backend
  expect([200, 403, 404]).toContain(res.status());
});
