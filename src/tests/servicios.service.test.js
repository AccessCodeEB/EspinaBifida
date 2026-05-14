/**
 * Tests unitarios de src/services/servicios.service.js
 * Cubre las ramas de validación de las funciones privadas (validateMontoReglas,
 * normalizeConsumos, parseAndValidateDate) y los flujos de createConValidacion,
 * update y getDetailed.
 * Mockea el modelo — sin Oracle real.
 */
import { jest } from '@jest/globals';

const mockFindAll         = jest.fn();
const mockFindByCurp      = jest.fn();
const mockFindById        = jest.fn();
const mockCreate          = jest.fn();
const mockCreateWithInv   = jest.fn();
const mockUpdate          = jest.fn();
const mockFindDetailed    = jest.fn();
const mockDeleteById      = jest.fn();
const mockFindBeneficiario = jest.fn();

jest.unstable_mockModule('../models/servicios.model.js', () => ({
  findAll:                           mockFindAll,
  findByCurp:                        mockFindByCurp,
  findById:                          mockFindById,
  create:                            mockCreate,
  createWithInventarioTransaction:   mockCreateWithInv,
  update:                            mockUpdate,
  findDetailed:                      mockFindDetailed,
  deleteById:                        mockDeleteById,
  findBeneficiarioActivoConMembresia: mockFindBeneficiario,
}));

const Service = await import('../services/servicios.service.js');

const CURP = 'GAEJ900101HMNRRL09';
const BENEFICIARIO_ACTIVO = {
  CURP, ESTATUS: 'Activo', NOMBRES: 'Juan', MEMBRESIA_ACTIVA: 1,
};

beforeEach(() => jest.resetAllMocks());

// ── createConValidacion — ramas de validateMontoReglas (líneas 10, 21, 25) ────

describe('createConValidacion — validateMontoReglas', () => {
  it('400 cuando costo es negativo', async () => {
    await expect(Service.createConValidacion({
      curp: CURP, idTipoServicio: 1, costo: -10, montoPagado: 0,
    })).rejects.toMatchObject({ statusCode: 400, message: /negativo/ });
  });

  it('400 cuando montoPagado es negativo', async () => {
    await expect(Service.createConValidacion({
      curp: CURP, idTipoServicio: 1, costo: 100, montoPagado: -5,
    })).rejects.toMatchObject({ statusCode: 400, message: /negativo/ });
  });

  it('400 cuando montoPagado > costo', async () => {
    await expect(Service.createConValidacion({
      curp: CURP, idTipoServicio: 1, costo: 50, montoPagado: 100,
    })).rejects.toMatchObject({ statusCode: 400, message: /mayor que costo/ });
  });
});

// ── createConValidacion — otras validaciones ──────────────────────────────────

describe('createConValidacion — validaciones de entrada', () => {
  it('400 cuando referenciaTipo existe pero falta referenciaId', async () => {
    mockFindBeneficiario.mockResolvedValueOnce(BENEFICIARIO_ACTIVO);
    await expect(Service.createConValidacion({
      curp: CURP, idTipoServicio: 1, costo: 0, referenciaTipo: 'COMODATO',
    })).rejects.toMatchObject({ statusCode: 400, message: /referenciaId/ });
  });

  it('acepta referenciaId numérico y lo parsea', async () => {
    mockFindBeneficiario.mockResolvedValueOnce(BENEFICIARIO_ACTIVO);
    mockCreate.mockResolvedValueOnce(99);

    const result = await Service.createConValidacion({
      curp: CURP, idTipoServicio: 1, costo: 0,
      referenciaId: '7', referenciaTipo: 'COMODATO',
    });

    expect(result.idServicio).toBe(99);
  });

  it('409 cuando beneficiario tiene estatus Inactivo', async () => {
    mockFindBeneficiario.mockResolvedValueOnce({ ...BENEFICIARIO_ACTIVO, ESTATUS: 'Inactivo' });
    await expect(Service.createConValidacion({
      curp: CURP, idTipoServicio: 1, costo: 0,
    })).rejects.toMatchObject({ statusCode: 409 });
  });

  it('usa createWithInventarioTransaction cuando hay consumos', async () => {
    mockFindBeneficiario.mockResolvedValueOnce(BENEFICIARIO_ACTIVO);
    mockCreateWithInv.mockResolvedValueOnce({ idServicio: 42 });

    const result = await Service.createConValidacion({
      curp: CURP, idTipoServicio: 1, costo: 100, montoPagado: 50,
      consumos: [{ idProducto: 3, cantidad: 2 }],
    });

    expect(mockCreateWithInv).toHaveBeenCalledTimes(1);
    expect(result.idServicio).toBe(42);
  });
});

// ── normalizeConsumos — ramas internas (líneas 37, 46, 54, 58) ────────────────

describe('createConValidacion — normalizeConsumos', () => {
  it('acepta consumos = null sin lanzar', async () => {
    mockFindBeneficiario.mockResolvedValueOnce(BENEFICIARIO_ACTIVO);
    mockCreate.mockResolvedValueOnce(1);

    await Service.createConValidacion({
      curp: CURP, idTipoServicio: 1, costo: 0, consumos: null,
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('400 cuando consumos no es array', async () => {
    mockFindBeneficiario.mockResolvedValueOnce(BENEFICIARIO_ACTIVO);
    await expect(Service.createConValidacion({
      curp: CURP, idTipoServicio: 1, costo: 0, consumos: 'invalido',
    })).rejects.toMatchObject({ statusCode: 400, message: /arreglo/ });
  });

  it('400 cuando idProducto es inválido en consumos', async () => {
    mockFindBeneficiario.mockResolvedValueOnce(BENEFICIARIO_ACTIVO);
    await expect(Service.createConValidacion({
      curp: CURP, idTipoServicio: 1, costo: 0,
      consumos: [{ idProducto: -1, cantidad: 2 }],
    })).rejects.toMatchObject({ statusCode: 400, message: /idProducto/ });
  });

  it('400 cuando cantidad es cero o negativa', async () => {
    mockFindBeneficiario.mockResolvedValueOnce(BENEFICIARIO_ACTIVO);
    await expect(Service.createConValidacion({
      curp: CURP, idTipoServicio: 1, costo: 0,
      consumos: [{ idProducto: 1, cantidad: 0 }],
    })).rejects.toMatchObject({ statusCode: 400, message: /cantidad/ });
  });

  it('normaliza motivo: string cuando existe, null cuando no existe', async () => {
    mockFindBeneficiario.mockResolvedValueOnce(BENEFICIARIO_ACTIVO);
    mockCreateWithInv.mockResolvedValueOnce({ idServicio: 5 });

    await Service.createConValidacion({
      curp: CURP, idTipoServicio: 1, costo: 0,
      consumos: [
        { idProducto: 1, cantidad: 1, motivo: '  urgente  ' },
        { idProducto: 2, cantidad: 1 },                         // sin motivo
      ],
    });

    const [, consumos] = mockCreateWithInv.mock.calls[0];
    expect(consumos[0].motivo).toBe('urgente');
    expect(consumos[1].motivo).toBeNull();
  });
});

// ── update — ramas de validación (línea 144) ──────────────────────────────────

describe('update', () => {
  const SERVICIO = { ID_SERVICIO: 1, COSTO: 200, MONTO_PAGADO: 50, NOTAS: null };

  it('404 cuando el servicio no existe', async () => {
    mockFindById.mockResolvedValueOnce(null);
    await expect(Service.update(1, {})).rejects.toMatchObject({ statusCode: 404 });
  });

  it('400 cuando montoPagado > costo en update', async () => {
    mockFindById.mockResolvedValueOnce(SERVICIO);
    await expect(Service.update(1, { montoPagado: 999 }))
      .rejects.toMatchObject({ statusCode: 400, message: /mayor que costo/ });
  });

  it('400 cuando montoPagado < 0 en update', async () => {
    mockFindById.mockResolvedValueOnce(SERVICIO);
    await expect(Service.update(1, { montoPagado: -1 }))
      .rejects.toMatchObject({ statusCode: 400, message: /negativo/ });
  });

  it('actualiza correctamente con montoPagado y notas válidos', async () => {
    mockFindById.mockResolvedValueOnce(SERVICIO);
    mockUpdate.mockResolvedValueOnce({});

    await Service.update(1, { montoPagado: 100, notas: 'pagado parcial' });

    const [, data] = mockUpdate.mock.calls[0];
    expect(data.montoPagado).toBe(100);
    expect(data.notas).toBe('pagado parcial');
  });

  it('conserva notas originales si no se pasan', async () => {
    mockFindById.mockResolvedValueOnce({ ...SERVICIO, NOTAS: 'nota original' });
    mockUpdate.mockResolvedValueOnce({});

    await Service.update(1, {});

    const [, data] = mockUpdate.mock.calls[0];
    expect(data.notas).toBe('nota original');
  });
});

// ── getDetailed — ramas de parseAndValidateDate y validaciones (líneas 25, 32, 206) ──

describe('getDetailed', () => {
  it('llama findDetailed con filtros normalizados', async () => {
    mockFindDetailed.mockResolvedValueOnce([]);

    await Service.getDetailed({ fechaDesde: '2026-01-01', fechaHasta: '2026-01-31' });

    expect(mockFindDetailed).toHaveBeenCalledTimes(1);
  });

  it('400 cuando fechaDesde > fechaHasta', async () => {
    await expect(Service.getDetailed({
      fechaDesde: '2026-02-01', fechaHasta: '2026-01-01',
    })).rejects.toMatchObject({ statusCode: 400, message: /fechaDesde/ });
  });

  it('400 cuando formato de fecha no es YYYY-MM-DD', async () => {
    await expect(Service.getDetailed({ fechaDesde: '01-01-2026' }))
      .rejects.toMatchObject({ statusCode: 400, message: /YYYY-MM-DD/ });
  });

  it('400 cuando dateStr no es string (rama typeof !== string)', async () => {
    await expect(Service.getDetailed({ fechaDesde: 20260101 }))
      .rejects.toMatchObject({ statusCode: 400, message: /YYYY-MM-DD/ });
  });

  it('400 cuando costoMin es negativo', async () => {
    await expect(Service.getDetailed({ costoMin: -10 }))
      .rejects.toMatchObject({ statusCode: 400, message: /costoMin/ });
  });

  it('400 cuando costoMin > costoMax', async () => {
    await expect(Service.getDetailed({ costoMin: 100, costoMax: 50 }))
      .rejects.toMatchObject({ statusCode: 400, message: /costoMin/ });
  });

  it('400 cuando page < 1', async () => {
    await expect(Service.getDetailed({ page: 0 }))
      .rejects.toMatchObject({ statusCode: 400, message: /page/ });
  });

  it('400 cuando limit > 100', async () => {
    await expect(Service.getDetailed({ limit: 101 }))
      .rejects.toMatchObject({ statusCode: 400, message: /limit/ });
  });
});
