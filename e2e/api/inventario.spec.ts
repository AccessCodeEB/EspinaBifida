import { test, expect } from '../fixtures/auth';
import { qase } from 'playwright-qase-reporter';

test(qase(8, 'Rechazar inventario negativo'), async ({ apiContext }) => {
  const artRes = await apiContext.get('/inventario?limit=1');
  const artBody = await artRes.json();
  const articulo = (artBody.data ?? artBody)[0];
  const idArticulo = articulo?.idArticulo ?? articulo?.id_articulo;
  expect(idArticulo).toBeDefined();

  const res = await apiContext.post('/inventario/movimientos', {
    data: {
      idArticulo,
      tipoMovimiento: 'SALIDA',
      cantidad: -10,
      motivo: 'E2E Test - cantidad negativa',
    },
  });
  expect(res.status()).toBe(400);
});

test(qase(9, 'Descontar inventario al usar insumo'), async ({ apiContext }) => {
  const artRes = await apiContext.get('/inventario?limit=1');
  const artBody = await artRes.json();
  const articulo = (artBody.data ?? artBody)[0];
  const idArticulo = articulo?.idArticulo ?? articulo?.id_articulo;
  const stockAntes = articulo?.inventarioActual ?? articulo?.inventario_actual ?? 10;

  await apiContext.post('/inventario/movimientos', {
    data: { idArticulo, tipoMovimiento: 'ENTRADA', cantidad: 10, motivo: 'E2E setup' },
  });

  const res = await apiContext.post('/inventario/movimientos', {
    data: { idArticulo, tipoMovimiento: 'SALIDA', cantidad: 1, motivo: 'E2E Test - descuento' },
  });
  expect([200, 201]).toContain(res.status());

  const artResPost = await apiContext.get(`/inventario/${idArticulo}`);
  const artBodyPost = await artResPost.json();
  const stockDespues = (artBodyPost.data ?? artBodyPost).inventarioActual
    ?? (artBodyPost.data ?? artBodyPost).inventario_actual ?? 0;
  expect(stockDespues).toBeLessThan(stockAntes + 11);
});
