import { test, expect } from '../fixtures/auth';
import { qase } from 'playwright-qase-reporter';

const TEST_CURP = 'AUSD050124MDFGNYA8';

test.beforeAll(async ({ apiContext }) => {
  await apiContext.delete('/citas/e2e-cleanup').catch(() => {});
});

test.afterAll(async ({ apiContext }) => {
  await apiContext.delete('/citas/e2e-cleanup').catch(() => {});
});

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
      especialista: E2E_ESPECIALISTA,
      fecha: '2026-12-01',
      hora: '10:00',
      estatus: 'PROGRAMADA',
    },
  });
  expect([200, 201]).toContain(res.status());

  // Borrar inmediatamente después de verificar la creación
  const body = await res.json();
  const id = body.data?.idCita ?? body.data?.id_cita ?? body.idCita;
  if (id) await apiContext.delete(`/citas/${id}`).catch(() => {});
});
