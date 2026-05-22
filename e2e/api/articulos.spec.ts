import { test, expect } from '../fixtures/auth';
import { qase } from 'playwright-qase-reporter';

test(qase(36, 'RT-014: POST /articulos crea artículo y retorna 201'), async ({ apiContext }) => {
  const res = await apiContext.post('/articulos', {
    data: {
      descripcion: 'E2E Artículo de prueba',
      unidad: 'Pieza',
      cuotaRecuperacion: 0,
      inventarioActual: 10,
      manejaInventario: 'S',
    },
  });
  expect(res.status()).toBe(201);
  const body = await res.json();
  expect(body.data?.descripcion ?? body.descripcion).toMatch(/E2E/i);
});
