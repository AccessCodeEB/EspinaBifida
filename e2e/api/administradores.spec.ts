import { test, expect } from '../fixtures/auth';
import { qase } from 'playwright-qase-reporter';

const TEST_EMAIL    = 'e2e-admin-test@espina.com';
const TEST_PASSWORD = 'TestPass123!';

let testAdminId: number | null = null;

test.beforeAll(async ({ apiContext }) => {
  // Crear admin de prueba; si ya existe (409), buscarlo por email
  const createRes = await apiContext.post('/administradores', {
    data: {
      nombreCompleto: 'E2E Admin Test',
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      idRol: 2,
      activo: 1,
    },
  });

  if (createRes.ok()) {
    const body = await createRes.json();
    const data = body.data ?? body;
    testAdminId = data.idAdmin ?? data.ID_ADMIN ?? null;
  } else {
    // 409 u otro error: buscar en la lista
    const listRes = await apiContext.get('/administradores?limit=200');
    if (listRes.ok()) {
      const body = await listRes.json();
      const admins: Array<Record<string, unknown>> = body.data ?? body ?? [];
      const found = admins.find(a => (a.email ?? a.EMAIL) === TEST_EMAIL);
      if (found) testAdminId = (found.idAdmin ?? found.ID_ADMIN) as number;
    }
  }
});

test.afterAll(async ({ apiContext }) => {
  if (testAdminId) {
    await apiContext.delete(`/administradores/${testAdminId}`).catch(() => {});
  }
});

test(qase(49, 'GET /administradores retorna lista con paginación'), async ({ apiContext }) => {
  const res = await apiContext.get('/administradores');
  expect(res.status()).toBe(200);
  const body = await res.json();
  const list = body.data ?? body;
  expect(Array.isArray(list)).toBe(true);
  expect(list.length).toBeGreaterThan(0);
});

test(qase(50, 'GET /administradores/:id retorna datos del admin'), async ({ apiContext }) => {
  test.skip(!testAdminId, 'Requiere admin de prueba creado en beforeAll');
  const res = await apiContext.get(`/administradores/${testAdminId}`);
  expect(res.status()).toBe(200);
  const body = await res.json();
  const data = body.data ?? body;
  expect(data.email ?? data.EMAIL).toBe(TEST_EMAIL);
});

test(qase(51, 'PUT /administradores/:id actualiza datos del admin'), async ({ apiContext }) => {
  test.skip(!testAdminId, 'Requiere admin de prueba creado en beforeAll');
  const res = await apiContext.put(`/administradores/${testAdminId}`, {
    data: { nombreCompleto: 'E2E Admin Actualizado', idRol: 2 },
  });
  expect(res.status()).toBe(200);
  // El PUT retorna solo message; verificar con GET
  const getRes = await apiContext.get(`/administradores/${testAdminId}`);
  expect(getRes.status()).toBe(200);
  const body = await getRes.json();
  const data = body.data ?? body;
  expect(String(data.nombreCompleto ?? data.NOMBRE_COMPLETO ?? '').toLowerCase()).toContain('actualizado');
});

test(qase(52, 'Datos inválidos en POST /administradores retornan 400'), async ({ apiContext }) => {
  const res = await apiContext.post('/administradores', {
    data: { email: 'no-es-email', password: '123', idRol: 0 },
  });
  expect(res.status()).toBe(400);
  const body = await res.json();
  expect(body.errors ?? body.error).toBeTruthy();
});

test(qase(53, 'DELETE /administradores/:id desactiva el admin (baja lógica)'), async ({ apiContext }) => {
  test.skip(!testAdminId, 'Requiere admin de prueba creado en beforeAll');
  const res = await apiContext.delete(`/administradores/${testAdminId}`);
  expect(res.status()).toBe(200);
  // Verificar que el admin queda inactivo (ACTIVO=0), no eliminado
  const getRes = await apiContext.get(`/administradores/${testAdminId}`);
  expect(getRes.status()).toBe(200);
  const body = await getRes.json();
  const data = body.data ?? body;
  expect(data.activo ?? data.ACTIVO).toBe(0);
  // Limpiar flag para que afterAll no lo intente borrar de nuevo
  testAdminId = null;
});
