import { test, expect } from '../fixtures/auth';
import { APIRequestContext } from '@playwright/test';
import { qase } from 'playwright-qase-reporter';

const TEST_CURP = 'AUSD050124MDFGNYA8';
const E2E_ESPECIALISTA = 'Dr. E2E Playwright';

async function cleanupCitasE2E(apiContext: APIRequestContext) {
  // Buscar todas las citas del CURP de prueba y borrar las del especialista E2E
  const res = await apiContext.get(`/citas?curp=${TEST_CURP}&limit=200`).catch(() => null);
  if (!res?.ok()) return;
  const body = await res.json();
  const citas: Array<Record<string, unknown>> = body.data ?? body ?? [];
  for (const cita of citas) {
    const especialista = String(cita.especialista ?? cita.ESPECIALISTA ?? '');
    if (especialista === E2E_ESPECIALISTA) {
      const id = cita.idCita ?? cita.ID_CITA ?? cita.id;
      if (id) await apiContext.delete(`/citas/${id}`).catch(() => {});
    }
  }
}

test.beforeAll(async ({ apiContext }) => {
  await cleanupCitasE2E(apiContext);
});

test.afterAll(async ({ apiContext }) => {
  await cleanupCitasE2E(apiContext);
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
