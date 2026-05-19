/**
 * Tests unitarios de src/models/servicios.model.js
 * Cubre las ramas sin cobertura: findBeneficiarioActivo, findByCurpPaginated,
 * ramas de error en create / createWithInventarioTransaction,
 * createWithHistorialTransaction, y deleteById con consumos + rollback.
 * Mockea getConnection e inventario.model — sin Oracle real.
 */
import { jest } from '@jest/globals';
import {
  mockExecute, mockClose, mockCommit, mockRollback,
  dbModuleMock, resetMocks,
} from './helpers/mockDb.js';

jest.unstable_mockModule('../config/db.js', () => dbModuleMock);

const mockApplyMovimiento = jest.fn();

jest.unstable_mockModule('../models/inventario.model.js', () => ({
  applyMovimientoConConexion: mockApplyMovimiento,
}));

const ServiciosModel = await import('../models/servicios.model.js');

beforeEach(() => {
  resetMocks();
  mockApplyMovimiento.mockReset();
});

// ── findBeneficiarioActivo ────────────────────────────────────────────────────
// Líneas 49-59 — antes sin cobertura

describe('findBeneficiarioActivo', () => {
  it('retorna la fila cuando el beneficiario existe', async () => {
    const row = { ESTATUS: 'Activo', NOMBRES: 'Juan', APELLIDO_PATERNO: 'García' };
    mockExecute.mockResolvedValueOnce({ rows: [row] });

    const result = await ServiciosModel.findBeneficiarioActivo('GAEJ900101HMNRRL09');

    expect(result).toBe(row);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('retorna null cuando el beneficiario no existe', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const result = await ServiciosModel.findBeneficiarioActivo('CURP_NOEXISTE');

    expect(result).toBeNull();
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('cierra la conexión aunque execute lance', async () => {
    mockExecute.mockRejectedValueOnce(new Error('ORA-00942'));

    await expect(ServiciosModel.findBeneficiarioActivo('X')).rejects.toThrow('ORA-00942');

    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

// ── findByCurpPaginated ───────────────────────────────────────────────────────
// Líneas 104-118 — antes sin cobertura

describe('findByCurpPaginated', () => {
  it('calcula offset correctamente (page=2, limit=5 → offset=5)', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    await ServiciosModel.findByCurpPaginated('CURP123', 2, 5);

    const [, binds] = mockExecute.mock.calls[0];
    expect(binds.offset).toBe(5);
    expect(binds.limit).toBe(5);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('page=1 y límite por defecto producen offset=0, limit=10', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    await ServiciosModel.findByCurpPaginated('CURP123');

    const [, binds] = mockExecute.mock.calls[0];
    expect(binds.offset).toBe(0);
    expect(binds.limit).toBe(10);
  });

  it('retorna las filas del resultado', async () => {
    const rows = [{ ID_SERVICIO: 1 }, { ID_SERVICIO: 2 }];
    mockExecute.mockResolvedValueOnce({ rows });

    const result = await ServiciosModel.findByCurpPaginated('CURP123', 1, 10);

    expect(result).toEqual(rows);
  });
});

// ── create — rama idServicio inválido (línea 133) ─────────────────────────────

describe('create — rama idServicio inválido', () => {
  it('lanza Error y cierra conexión cuando la secuencia retorna 0', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [{ NEXT_ID: 0 }] });

    await expect(ServiciosModel.create({
      curp: 'X', idTipoServicio: 1, costo: 0, montoPagado: 0,
    })).rejects.toThrow('No se pudo generar ID_SERVICIO');

    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

// ── createWithInventarioTransaction — ramas de error (líneas 177, 213-214) ───

describe('createWithInventarioTransaction — ramas de error', () => {
  it('lanza Error y hace rollback cuando la secuencia retorna 0', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [{ NEXT_ID: 0 }] });

    await expect(ServiciosModel.createWithInventarioTransaction(
      { curp: 'X', idTipoServicio: 1, costo: 0, montoPagado: 0 },
      []
    )).rejects.toThrow('No se pudo generar ID_SERVICIO');

    expect(mockRollback).toHaveBeenCalledTimes(1);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('hace rollback cuando applyMovimiento falla', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [{ NEXT_ID: 99 }] }); // SEQ NEXTVAL
    mockExecute.mockResolvedValueOnce({});                           // INSERT SERVICIOS
    mockApplyMovimiento.mockRejectedValueOnce(new Error('Stock insuficiente'));

    await expect(ServiciosModel.createWithInventarioTransaction(
      { curp: 'X', idTipoServicio: 1, costo: 0, montoPagado: 0 },
      [{ idProducto: 1, cantidad: 2 }]
    )).rejects.toThrow('Stock insuficiente');

    expect(mockRollback).toHaveBeenCalledTimes(1);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('commit y retorna idServicio cuando todo sale bien', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [{ NEXT_ID: 77 }] }); // SEQ NEXTVAL
    mockExecute.mockResolvedValueOnce({});                           // INSERT SERVICIOS
    mockApplyMovimiento.mockResolvedValueOnce({ stockResultante: 10 });

    const result = await ServiciosModel.createWithInventarioTransaction(
      { curp: 'X', idTipoServicio: 1, costo: 50, montoPagado: 25 },
      [{ idProducto: 3, cantidad: 1 }]
    );

    expect(result).toEqual({ idServicio: 77 });
    expect(mockCommit).toHaveBeenCalledTimes(1);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

// ── createWithHistorialTransaction (líneas 329-333) ───────────────────────────

describe('createWithHistorialTransaction', () => {
  it('delega en create y retorna el idServicio generado', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [{ NEXT_ID: 55 }] }); // SEQ NEXTVAL
    mockExecute.mockResolvedValueOnce({});                           // INSERT SERVICIOS

    const result = await ServiciosModel.createWithHistorialTransaction({
      curp: 'X', idTipoServicio: 1, costo: 0, montoPagado: 0,
    });

    expect(result).toBe(55);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

// ── deleteById — con consumos (línea 385) y rollback (405-406) ────────────────

describe('deleteById — con consumos', () => {
  it('revierte inventario y elimina el servicio correctamente', async () => {
    mockExecute.mockResolvedValueOnce({        // SELECT SERVICIO_ARTICULOS
      rows: [{ ID_ARTICULO: 7, CANTIDAD: 3 }],
    });
    mockApplyMovimiento.mockResolvedValueOnce({});  // applyMovimiento ENTRADA
    mockExecute.mockResolvedValueOnce({});           // DELETE SERVICIO_ARTICULOS
    mockExecute.mockResolvedValueOnce({});           // DELETE SERVICIOS

    await ServiciosModel.deleteById(42);

    expect(mockApplyMovimiento).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ idArticulo: 7, tipo: 'ENTRADA', cantidad: 3 })
    );
    expect(mockCommit).toHaveBeenCalledTimes(1);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('revierte múltiples consumos correctamente', async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [
        { ID_ARTICULO: 1, CANTIDAD: 2 },
        { ID_ARTICULO: 5, CANTIDAD: 1 },
      ],
    });
    mockApplyMovimiento.mockResolvedValue({});
    mockExecute.mockResolvedValueOnce({});
    mockExecute.mockResolvedValueOnce({});

    await ServiciosModel.deleteById(10);

    expect(mockApplyMovimiento).toHaveBeenCalledTimes(2);
  });

  it('hace rollback cuando applyMovimiento falla en deleteById', async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [{ ID_ARTICULO: 1, CANTIDAD: 1 }],
    });
    mockApplyMovimiento.mockRejectedValueOnce(new Error('ORA-20002'));

    await expect(ServiciosModel.deleteById(5)).rejects.toThrow('ORA-20002');

    expect(mockRollback).toHaveBeenCalledTimes(1);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

// ── create — rows vacíos / NEXT_ID null → ?? 0 (L106) ────────────────────────

describe('create — idServicio ?? 0 (L106)', () => {
  it('rows?.[0]?.NEXT_ID null → ?? 0 → lanza error (L106)', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [{ NEXT_ID: null }] });

    await expect(ServiciosModel.create({
      curp: 'X', idTipoServicio: 1, costo: 0, montoPagado: 0,
    })).rejects.toThrow('No se pudo generar ID_SERVICIO');
  });

  it('rows vacío → rows?.[0] undefined → NEXT_ID undefined → ?? 0 (L106)', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    await expect(ServiciosModel.create({
      curp: 'X', idTipoServicio: 1, costo: 0, montoPagado: 0,
    })).rejects.toThrow('No se pudo generar ID_SERVICIO');
  });
});

// ── createWithInventarioTransaction — normalizeConsumoMotivo false (L138) ─────

describe('createWithInventarioTransaction — normalizeConsumoMotivo sin motivo (L138)', () => {
  it('consumo sin motivo → usa default "Consumo por servicio N" (L139)', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [{ NEXT_ID: 55 }] }); // SEQ
    mockExecute.mockResolvedValueOnce({});                           // INSERT SERVICIOS
    mockApplyMovimiento.mockResolvedValueOnce({ stockResultante: 5 });

    // consumo sin motivo → normalizeConsumoMotivo usa rama false → default
    const result = await ServiciosModel.createWithInventarioTransaction(
      { curp: 'X', idTipoServicio: 1, costo: 0, montoPagado: 0 },
      [{ idProducto: 1, cantidad: 1 /* sin motivo */ }]
    );

    expect(result.idServicio).toBe(55);
    const [, data] = mockApplyMovimiento.mock.calls[0];
    expect(data.motivo).toMatch(/Consumo por servicio/);
  });

  it('consumo con motivo → usa el motivo proporcionado (L138 true branch)', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [{ NEXT_ID: 66 }] }); // SEQ
    mockExecute.mockResolvedValueOnce({});                           // INSERT SERVICIOS
    mockApplyMovimiento.mockResolvedValueOnce({ stockResultante: 8 });

    const result = await ServiciosModel.createWithInventarioTransaction(
      { curp: 'X', idTipoServicio: 1, costo: 0, montoPagado: 0 },
      [{ idProducto: 1, cantidad: 1, motivo: 'Comodato #12' }]
    );

    expect(result.idServicio).toBe(66);
    const [, data] = mockApplyMovimiento.mock.calls[0];
    expect(data.motivo).toBe('Comodato #12');
  });

  it('createWithInventarioTransaction — NEXT_ID null → lanza (L149)', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [{ NEXT_ID: null }] });

    await expect(ServiciosModel.createWithInventarioTransaction(
      { curp: 'X', idTipoServicio: 1, costo: 0, montoPagado: 0 }, []
    )).rejects.toThrow('No se pudo generar ID_SERVICIO');
  });
});

// ── findDetailed — normalizeDetailedFilters + SQL (L194-294) ─────────────────

describe('findDetailed — normalizeDetailedFilters y SQL (L194-294)', () => {
  it('con filtros básicos vacíos → retorna data y total (L230-296)', async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [] })  // rowsResult
      .mockResolvedValueOnce({ rows: [{ TOTAL: 0 }] }); // totalResult

    const result = await ServiciosModel.findDetailed({});

    expect(result).toMatchObject({ page: 1, limit: 10, total: 0, data: [] });
    expect(mockExecute).toHaveBeenCalledTimes(2);
  });

  it('con filtros completos (curp, idTipoServicio, fechas, costos, montoPagado) (L201-227)', async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ ID_SERVICIO: 1 }] })
      .mockResolvedValueOnce({ rows: [{ TOTAL: 1 }] });

    const result = await ServiciosModel.findDetailed({
      curp: 'GAEJ900101HMNRRL09',
      idTipoServicio: 2,
      fechaDesde: '2026-01-01',
      fechaHasta: '2026-12-31',
      costoMin: 0,
      costoMax: 500,
      montoPagadoMin: 0,
      montoPagadoMax: 200,
      page: 2,
      limit: 5,
    });

    expect(result.page).toBe(2);
    expect(result.limit).toBe(5);
    expect(result.total).toBe(1);
  });

  it('page inválido → safePage = 1; limit inválido → safeLimit = 10 (L197-198)', async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ TOTAL: 0 }] });

    const result = await ServiciosModel.findDetailed({ page: -1, limit: 200 });

    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
  });

  it('totalResult.rows?.[0]?.TOTAL null → ?? 0 (L294)', async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ TOTAL: null }] });

    const result = await ServiciosModel.findDetailed({});

    expect(result.total).toBe(0);
  });

  it('normalizeDetailedFilters sin argumentos → usa default {} (L194)', async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ TOTAL: 0 }] });

    // findDetailed también tiene default {}
    const result = await ServiciosModel.findDetailed();

    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
  });
});
