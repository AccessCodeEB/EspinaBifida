/**
 * Tests unitarios de src/services/inventario.service.js
 * Cubre las funciones exportadas que no pasan por HTTP: assertArticuloSinMovimientos,
 * createMovimiento (con sus ramas de normalizeMovimientoData),
 * getInventarioActual y getMovimientos.
 */
import { jest } from '@jest/globals';

const mockCreateMovimientoConTransaccion = jest.fn();
const mockFindInventarioActual           = jest.fn();
const mockFindMovimientos                = jest.fn();
const mockCountMovimientosByArticulo     = jest.fn();
const mockApplyMovimiento                = jest.fn();

jest.unstable_mockModule('../models/inventario.model.js', () => ({
  createMovimientoConTransaccion: mockCreateMovimientoConTransaccion,
  findInventarioActual:           mockFindInventarioActual,
  findMovimientos:                mockFindMovimientos,
  countMovimientosByArticulo:     mockCountMovimientosByArticulo,
  applyMovimientoConConexion:     mockApplyMovimiento,
}));

const Service = await import('../services/inventario.service.js');

beforeEach(() => jest.resetAllMocks());

// ── normalizeMovimientoData — ramas de validación ─────────────────────────────

describe('createMovimiento — normalizeMovimientoData', () => {
  it('400 si idProducto no es numérico', async () => {
    await expect(Service.createMovimiento({ idProducto: 'abc', tipo: 'ENTRADA', cantidad: 1 }))
      .rejects.toMatchObject({ statusCode: 400, code: 'INVALID_ID' });
  });

  it('400 si tipo no es ENTRADA ni SALIDA', async () => {
    await expect(Service.createMovimiento({ idProducto: 1, tipo: 'AJUSTE', cantidad: 1 }))
      .rejects.toMatchObject({ statusCode: 400, code: 'INVALID_MOVIMIENTO_TIPO' });
  });

  it('400 si cantidad es cero', async () => {
    await expect(Service.createMovimiento({ idProducto: 1, tipo: 'ENTRADA', cantidad: 0 }))
      .rejects.toMatchObject({ statusCode: 400, code: 'INVALID_CANTIDAD' });
  });

  it('400 si cantidad no es entero', async () => {
    await expect(Service.createMovimiento({ idProducto: 1, tipo: 'ENTRADA', cantidad: 1.5 }))
      .rejects.toMatchObject({ statusCode: 400, code: 'INVALID_CANTIDAD' });
  });

  it('acepta motivo null → normaliza a null', async () => {
    mockCreateMovimientoConTransaccion.mockResolvedValueOnce({ stockActual: 5 });

    await Service.createMovimiento({ idProducto: 1, tipo: 'ENTRADA', cantidad: 2, motivo: null });

    const [normalized] = mockCreateMovimientoConTransaccion.mock.calls[0];
    expect(normalized.motivo).toBeNull();
  });

  it('acepta motivo string → normaliza con trim', async () => {
    mockCreateMovimientoConTransaccion.mockResolvedValueOnce({ stockActual: 5 });

    await Service.createMovimiento({ idProducto: 1, tipo: 'ENTRADA', cantidad: 2, motivo: '  donación  ' });

    const [normalized] = mockCreateMovimientoConTransaccion.mock.calls[0];
    expect(normalized.motivo).toBe('donación');
  });

  it('acepta idArticulo como alias de idProducto', async () => {
    mockCreateMovimientoConTransaccion.mockResolvedValueOnce({ stockActual: 5 });

    await Service.createMovimiento({ idArticulo: 5, tipo: 'SALIDA', cantidad: 3 });

    const [normalized] = mockCreateMovimientoConTransaccion.mock.calls[0];
    expect(normalized.idArticulo).toBe(5);
  });
});

// ── getInventarioActual ───────────────────────────────────────────────────────

describe('getInventarioActual', () => {
  it('mapea rows a objetos normalizados', async () => {
    mockFindInventarioActual.mockResolvedValueOnce([
      {
        ID_ARTICULO: 1, DESCRIPCION: 'Silla', UNIDAD: 'pieza',
        CUOTA_RECUPERACION: 100, INVENTARIO_ACTUAL: 5, STOCK_MINIMO: 3,
      },
    ]);

    const result = await Service.getInventarioActual();

    expect(result).toHaveLength(1);
    expect(result[0].idProducto).toBe(1);
    expect(result[0].stock).toBe(5);
    expect(result[0].minimo).toBe(3);
  });

  it('usa STOCK_MINIMO default = 5 cuando es null', async () => {
    mockFindInventarioActual.mockResolvedValueOnce([
      { ID_ARTICULO: 2, DESCRIPCION: 'Muleta', UNIDAD: 'par', CUOTA_RECUPERACION: 50, INVENTARIO_ACTUAL: 2, STOCK_MINIMO: null },
    ]);

    const result = await Service.getInventarioActual();

    expect(result[0].minimo).toBe(5);
  });

  it('INVENTARIO_ACTUAL null → stock = 0', async () => {
    mockFindInventarioActual.mockResolvedValueOnce([
      { ID_ARTICULO: 3, DESCRIPCION: 'Andadera', UNIDAD: 'pieza', CUOTA_RECUPERACION: 0, INVENTARIO_ACTUAL: null, STOCK_MINIMO: 2 },
    ]);

    const result = await Service.getInventarioActual();

    expect(result[0].stock).toBe(0);
  });
});

// ── getMovimientos ────────────────────────────────────────────────────────────

describe('getMovimientos', () => {
  it('mapea rows de movimientos', async () => {
    mockFindMovimientos.mockResolvedValueOnce([
      {
        ID_MOVIMIENTO: 1, ID_ARTICULO: 10, DESCRIPCION: 'Silla',
        TIPO_MOVIMIENTO: 'ENTRADA', CANTIDAD: 5, MOTIVO: 'Donación',
        FECHA: new Date(), STOCK_RESULTANTE: 15,
      },
    ]);

    const result = await Service.getMovimientos();

    expect(result).toHaveLength(1);
    expect(result[0].idMovimiento).toBe(1);
    expect(result[0].cantidad).toBe(5);
    expect(result[0].stockResultante).toBe(15);
  });

  it('CANTIDAD null → cantidad = 0', async () => {
    mockFindMovimientos.mockResolvedValueOnce([
      { ID_MOVIMIENTO: 2, ID_ARTICULO: 10, DESCRIPCION: 'Muleta',
        TIPO_MOVIMIENTO: 'SALIDA', CANTIDAD: null, MOTIVO: null, FECHA: null, STOCK_RESULTANTE: null },
    ]);

    const result = await Service.getMovimientos();

    expect(result[0].cantidad).toBe(0);
    expect(result[0].stockResultante).toBe(0);
  });
});

// ── assertArticuloSinMovimientos ──────────────────────────────────────────────

describe('assertArticuloSinMovimientos', () => {
  it('no lanza cuando total = 0', async () => {
    mockCountMovimientosByArticulo.mockResolvedValueOnce(0);

    await expect(Service.assertArticuloSinMovimientos(1)).resolves.toBeUndefined();
  });

  it('lanza 409 ARTICULO_HAS_MOVIMIENTOS cuando total > 0', async () => {
    mockCountMovimientosByArticulo.mockResolvedValueOnce(3);

    await expect(Service.assertArticuloSinMovimientos(1))
      .rejects.toMatchObject({ statusCode: 409, code: 'ARTICULO_HAS_MOVIMIENTOS' });
  });
});
