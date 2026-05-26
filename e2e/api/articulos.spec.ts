import { test, expect } from '../fixtures/auth';
import { qase } from 'playwright-qase-reporter';

test(qase(36, 'RT-014: POST /articulos crea artículo y retorna 201'), async ({ apiContext }) => {
  const res = await apiContext.post('/articulos', {
    data: {
      descripcion: `E2E Artículo de prueba ${Date.now()}`,
      unidad: 'Pieza',
      cuotaRecuperacion: 0,
      inventarioActual: 0,
      manejaInventario: 'S',
      stockMinimo: 0,
    },
  });
  expect(res.status()).toBe(201);
  const body = await res.json();
  expect(body.message ?? body.data?.descripcion ?? body.descripcion).toBeTruthy();

  // Limpiar el artículo creado para no dejar basura en la BD
  const id = body.data?.idArticulo ?? body.idArticulo;
  if (id) await apiContext.delete(`/articulos/${id}`);
});
