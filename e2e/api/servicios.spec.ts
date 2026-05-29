import { test, expect } from '../fixtures/auth';
import { qase } from 'playwright-qase-reporter';

const TEST_CURP = 'AUSD050124MDFGNYA8';
const createdServicioIds: number[] = [];

test.afterAll(async ({ apiContext }) => {
  for (const id of createdServicioIds) {
    await apiContext.delete(`/servicios/${id}`).catch(() => {});
  }
});

test(qase(6, 'Asignar servicio a beneficiario activo'), async ({ apiContext }) => {
  const catRes = await apiContext.get('/servicios-catalogo');
  expect(catRes.status()).toBe(200);
  const catBody = await catRes.json();
  const tipoServicio = (catBody.data ?? catBody)[0];
  expect(tipoServicio).toBeDefined();

  const res = await apiContext.post('/servicios', {
    data: {
      curp: TEST_CURP,
      idTipoServicio: tipoServicio.idTipoServicio ?? tipoServicio.id_tipo_servicio,
      fecha: new Date().toISOString(),
      costo: 0,
      montoPagado: 0,
    },
  });
  expect([200, 201]).toContain(res.status());
  const body = await res.json();
  const id = body.data?.idServicio ?? body.data?.id_servicio ?? body.idServicio;
  if (id) createdServicioIds.push(id);
});

test(qase(7, 'Registro de insumo y actualización de inventario'), async ({ apiContext }) => {
  const artRes = await apiContext.get('/inventario?limit=1');
  expect(artRes.status()).toBe(200);
  const artBody = await artRes.json();
  const articulo = (artBody.data ?? artBody)[0];
  expect(articulo).toBeDefined();

  const idArticulo = articulo.idArticulo ?? articulo.id_articulo;
  const stockAntes = articulo.inventarioActual ?? articulo.inventario_actual ?? 0;

  const res = await apiContext.post('/inventario/movimientos', {
    data: {
      idArticulo,
      tipo: 'ENTRADA',
      cantidad: 5,
      motivo: 'E2E Test - entrada de prueba',
    },
  });
  expect([200, 201]).toContain(res.status());

  // Verificar stock aumentó antes de limpiar
  const artResPost = await apiContext.get('/inventario');
  const artBodyPost = await artResPost.json();
  const articuloPost = (artBodyPost.data ?? artBodyPost).find(
    (a: { idArticulo: number }) => a.idArticulo === idArticulo
  );
  const stockDespues = articuloPost?.inventarioActual ?? articuloPost?.inventario_actual ?? 0;
  expect(stockDespues).toBe(stockAntes + 5);

  // Revertir la entrada para no dejar stock inflado en producción
  await apiContext.post('/inventario/movimientos', {
    data: {
      idArticulo,
      tipo: 'SALIDA',
      cantidad: 5,
      motivo: 'E2E cleanup - revertir entrada de prueba',
    },
  }).catch(() => {});
});
