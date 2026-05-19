/**
 * Tests unitarios de src/models/inventario.model.js
 * Cubre ramas de ?? [] en findInventarioActual y findMovimientos,
 * y la rama if (conn) false en applyMovimiento.
 */
import { jest } from "@jest/globals";
import {
  mockExecute, mockClose, mockCommit, mockRollback,
  dbModuleMock, resetMocks,
} from "./helpers/mockDb.js";

const mockGetConnection = jest.fn();

jest.unstable_mockModule("../config/db.js", () => ({
  ...dbModuleMock,
  getConnection: mockGetConnection,
}));

jest.unstable_mockModule("oracledb", () => ({
  default: {
    OUT_FORMAT_OBJECT: 2304,
    NUMBER:            2010,
    BIND_OUT:          3003,
  },
  OUT_FORMAT_OBJECT: 2304,
  NUMBER:            2010,
  BIND_OUT:          3003,
}));

const { findInventarioActual, findMovimientos, createMovimientoConTransaccion } = await import(
  "../models/inventario.model.js"
);

beforeEach(() => {
  resetMocks();
  // Por defecto getConnection retorna mockConn
  mockGetConnection.mockResolvedValue({
    execute: mockExecute,
    commit: mockCommit,
    rollback: mockRollback,
    close: mockClose,
  });
});

// ─── findInventarioActual — r?.rows ?? [] (L64) ───────────────────────────────

describe("findInventarioActual", () => {
  it("retorna filas cuando execute devuelve rows", async () => {
    const rows = [{ ID_ARTICULO: 1, DESCRIPCION: "Silla" }];
    mockExecute.mockResolvedValueOnce({ rows });

    const result = await findInventarioActual();

    expect(result).toEqual(rows);
  });

  it("retorna [] cuando execute devuelve null (L64 ?? [])", async () => {
    mockExecute.mockResolvedValueOnce(null);

    const result = await findInventarioActual();

    expect(result).toEqual([]);
  });

  it("retorna [] cuando rows es undefined (L64 r?.rows ?? [])", async () => {
    mockExecute.mockResolvedValueOnce({});

    const result = await findInventarioActual();

    expect(result).toEqual([]);
  });
});

// ─── findMovimientos — r?.rows ?? [] (L75) ────────────────────────────────────

describe("findMovimientos", () => {
  it("retorna filas cuando execute devuelve rows", async () => {
    const rows = [{ ID_MOVIMIENTO: 1, TIPO_MOVIMIENTO: "ENTRADA" }];
    mockExecute.mockResolvedValueOnce({ rows });

    const result = await findMovimientos();

    expect(result).toEqual(rows);
  });

  it("retorna [] cuando execute devuelve null (L75 ?? [])", async () => {
    mockExecute.mockResolvedValueOnce(null);

    const result = await findMovimientos();

    expect(result).toEqual([]);
  });

  it("retorna [] cuando rows es undefined (L75 r?.rows ?? [])", async () => {
    mockExecute.mockResolvedValueOnce({});

    const result = await findMovimientos();

    expect(result).toEqual([]);
  });
});

// ─── createMovimientoConTransaccion — if (conn) false branch (L51, L54) ───────

describe("createMovimientoConTransaccion — getConnection falla → conn undefined", () => {
  it("cuando getConnection lanza, conn es undefined → if (conn) = false (L51, L54)", async () => {
    const dbError = new Error("DB connection failed");
    mockGetConnection.mockRejectedValueOnce(dbError);

    await expect(createMovimientoConTransaccion({ idArticulo: 1, tipo: "ENTRADA", cantidad: 1 }))
      .rejects.toThrow("DB connection failed");

    // rollback y close NO deben haberse llamado (conn era undefined)
    expect(mockRollback).not.toHaveBeenCalled();
    expect(mockClose).not.toHaveBeenCalled();
  });
});
