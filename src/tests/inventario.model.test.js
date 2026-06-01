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

const { findInventarioActual, findMovimientos, createMovimientoConTransaccion, deleteE2EMovimientos } = await import(
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

// ─── findInventarioActual — filtro ACTIVO + fallback ORA-00904 ────────────────

describe("findInventarioActual", () => {
  it("retorna filas cuando execute devuelve rows", async () => {
    const rows = [{ ID_ARTICULO: 1, DESCRIPCION: "Silla" }];
    mockExecute.mockResolvedValueOnce({ rows });

    const result = await findInventarioActual();

    expect(result).toEqual(rows);
  });

  it("retorna [] cuando execute devuelve null (r?.rows ?? [])", async () => {
    mockExecute.mockResolvedValueOnce(null);

    const result = await findInventarioActual();

    expect(result).toEqual([]);
  });

  it("retorna [] cuando rows es undefined (r?.rows ?? [])", async () => {
    mockExecute.mockResolvedValueOnce({});

    const result = await findInventarioActual();

    expect(result).toEqual([]);
  });

  it("fallback cuando columna ACTIVO no existe (ORA-00904) — retorna filas sin filtro", async () => {
    const ora904 = Object.assign(new Error("ORA-00904: ACTIVO invalid identifier"), { errorNum: 904 });
    const rows = [{ ID_ARTICULO: 2, DESCRIPCION: "Mesa" }];
    mockExecute
      .mockRejectedValueOnce(ora904)
      .mockResolvedValueOnce({ rows });

    const result = await findInventarioActual();

    expect(result).toEqual(rows);
  });

  it("fallback ORA-00904 retorna [] cuando el fallback devuelve sin rows", async () => {
    const ora904 = Object.assign(new Error("ORA-00904: ACTIVO invalid identifier"), { errorNum: 904 });
    mockExecute
      .mockRejectedValueOnce(ora904)
      .mockResolvedValueOnce({});

    const result = await findInventarioActual();

    expect(result).toEqual([]);
  });

  it("relanza errores que no son ORA-00904", async () => {
    const otherErr = Object.assign(new Error("ORA-00942: table or view does not exist"), { errorNum: 942 });
    mockExecute.mockRejectedValueOnce(otherErr);

    await expect(findInventarioActual()).rejects.toThrow("ORA-00942");
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

// ── deleteE2EMovimientos ──────────────────────────────────────────────────────

describe("deleteE2EMovimientos", () => {
  it("borra movimientos con MOTIVO LIKE '%E2E%' y hace commit", async () => {
    mockExecute.mockResolvedValueOnce({});
    await deleteE2EMovimientos();
    expect(mockExecute).toHaveBeenCalledTimes(1);
    const sql = mockExecute.mock.calls[0][0];
    expect(sql).toMatch(/E2E/i);
    expect(mockCommit).toHaveBeenCalledTimes(1);
  });
});
