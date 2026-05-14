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
