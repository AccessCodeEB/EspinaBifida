import { test, expect } from '../fixtures/auth';
import { qase } from 'playwright-qase-reporter';

const TEST_CURP = 'E2EX000000MXXXXX00';

test(qase(37, 'RT-015: GET /citas retorna citas con paginación'), async ({ apiContext }) => {
  const res = await apiContext.get('/citas?page=1&limit=10');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.data ?? body).toBeDefined();
});

test(qase(38, 'RT-016: POST /citas crea cita con datos válidos'), async ({ apiContext }) => {
  const catRes = await apiContext.get('/servicios-catalogo');
  const catBody = await catRes.json();
  const tipo = (catBody.data ?? catBody)[0];

  const res = await apiContext.post('/citas', {
    data: {
      curp: TEST_CURP,
      idTipoServicio: tipo.idTipoServicio ?? tipo.id_tipo_servicio,
      especialista: 'Dr. E2E Playwright',
      fecha: '2026-12-01T10:00:00',
      estatus: 'Pendiente',
    },
  });
  expect([200, 201]).toContain(res.status());
});
