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
      tipo: 'SALIDA',
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

  // Setup: asegurar stock suficiente
  await apiContext.post('/inventario/movimientos', {
    data: { idArticulo, tipo: 'ENTRADA', cantidad: 10, motivo: 'E2E setup' },
  });

  const res = await apiContext.post('/inventario/movimientos', {
    data: { idArticulo, tipo: 'SALIDA', cantidad: 1, motivo: 'E2E Test - descuento' },
  });
  expect([200, 201]).toContain(res.status());

  // Verificar: stock debe ser stockAntes + 10 - 1 = stockAntes + 9
  const artResPost = await apiContext.get('/inventario');
  const artBodyPost = await artResPost.json();
  const articuloPost = (artBodyPost.data ?? artBodyPost).find(
    (a: { idArticulo: number }) => a.idArticulo === idArticulo
  );
  const stockDespues = articuloPost?.inventarioActual ?? articuloPost?.inventario_actual ?? 0;
  expect(stockDespues).toBe(stockAntes + 9);

  // Cleanup: revertir los movimientos de setup (ENTRADA 10, SALIDA 1 → net +9 → revertir con SALIDA 9)
  await apiContext.post('/inventario/movimientos', {
    data: { idArticulo, tipo: 'SALIDA', cantidad: 9, motivo: 'E2E cleanup - revertir setup' },
  }).catch(() => {});
});
