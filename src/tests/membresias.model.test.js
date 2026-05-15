/**
 * Tests unitarios de src/models/membresias.model.js
 * Cubre las funciones sin tests directos:
 *   - findPagosRecientes   (líneas 41-63)
 *   - hasPeriodOverlap     (líneas 108-124)
 *   - setBeneficiarioBaja  (líneas 172-186)
 *   - syncEstados          (líneas 188-228)
 *   - create — error paths (líneas 301-308)
 */
import { jest } from "@jest/globals";
import {
  mockExecute, mockClose, mockCommit, mockRollback,
  dbModuleMock, resetMocks,
} from "./helpers/mockDb.js";

jest.unstable_mockModule("../config/db.js", () => dbModuleMock);

jest.unstable_mockModule("oracledb", () => ({
  default: {
    OUT_FORMAT_OBJECT: 2304,
    DB_TYPE_DATE:      2003,
    BIND_OUT:          3003,
    NUMBER:            2010,
  },
  OUT_FORMAT_OBJECT: 2304,
  DB_TYPE_DATE:      2003,
  BIND_OUT:          3003,
  NUMBER:            2010,
}));

const {
  findPagosRecientes,
  hasPeriodOverlap,
  setBeneficiarioBaja,
  syncEstados,
  create,
} = await import("../models/membresias.model.js");

const CURP = "GAEJ900101HMNRRL09";

beforeEach(() => resetMocks());

// ─── findPagosRecientes ───────────────────────────────────────────────────────

describe("findPagosRecientes", () => {
  it("retorna las filas de pagos recientes", async () => {
    const rows = [
      { ID_CREDENCIAL: 1, CURP, NOMBRE_COMPLETO: "Juan García", MONTO: 500 },
      { ID_CREDENCIAL: 2, CURP, NOMBRE_COMPLETO: "Ana Pérez",   MONTO: 300 },
    ];
    mockExecute.mockResolvedValueOnce({ rows });

    const result = await findPagosRecientes(10);

    expect(result).toEqual(rows);
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockClose).toHaveBeenCalledTimes(1);
    // Verifica que el bind lleva el limit correcto
    const binds = mockExecute.mock.calls[0][1];
    expect(binds.limit).toBe(10);
  });

  it("usa limit=20 por defecto cuando no se pasa argumento", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    await findPagosRecientes();

    const binds = mockExecute.mock.calls[0][1];
    expect(binds.limit).toBe(20);
  });

  it("retorna [] cuando no hay pagos", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const result = await findPagosRecientes();

    expect(result).toEqual([]);
  });

  it("cierra la conexión aunque execute lance error", async () => {
    mockExecute.mockRejectedValueOnce(new Error("ORA-01403"));

    await expect(findPagosRecientes()).rejects.toThrow("ORA-01403");

    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

// ─── hasPeriodOverlap ─────────────────────────────────────────────────────────

describe("hasPeriodOverlap", () => {
  it("retorna true cuando existe solapamiento (TOTAL > 0)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [{ TOTAL: 1 }] });

    const result = await hasPeriodOverlap(CURP, "2026-01-01", "2026-12-31");

    expect(result).toBe(true);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it("retorna false cuando no hay solapamiento (TOTAL = 0)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [{ TOTAL: 0 }] });

    const result = await hasPeriodOverlap(CURP, "2026-01-01", "2026-12-31");

    expect(result).toBe(false);
  });

  it("retorna false cuando rows está vacío (TOTAL undefined → 0)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const result = await hasPeriodOverlap(CURP, "2026-01-01", "2026-12-31");

    expect(result).toBe(false);
  });

  it("cierra la conexión aunque execute lance error", async () => {
    mockExecute.mockRejectedValueOnce(new Error("ORA-00942"));

    await expect(hasPeriodOverlap(CURP, "2026-01-01", "2026-12-31"))
      .rejects.toThrow("ORA-00942");

    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

// ─── setBeneficiarioBaja ──────────────────────────────────────────────────────

describe("setBeneficiarioBaja", () => {
  it("retorna rowsAffected cuando actualiza el beneficiario", async () => {
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const result = await setBeneficiarioBaja(CURP);

    expect(result).toBe(1);
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it("retorna 0 cuando el beneficiario ya estaba en Baja", async () => {
    mockExecute.mockResolvedValueOnce({ rowsAffected: 0 });

    const result = await setBeneficiarioBaja(CURP);

    expect(result).toBe(0);
  });

  it("retorna 0 cuando rowsAffected es undefined", async () => {
    mockExecute.mockResolvedValueOnce({});

    const result = await setBeneficiarioBaja(CURP);

    expect(result).toBe(0);
  });

  it("cierra la conexión aunque execute lance error", async () => {
    mockExecute.mockRejectedValueOnce(new Error("ORA-00942"));

    await expect(setBeneficiarioBaja(CURP)).rejects.toThrow("ORA-00942");

    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

// ─── syncEstados ──────────────────────────────────────────────────────────────

describe("syncEstados", () => {
  it("ejecuta dos UPDATE (Inactivo + Baja) en la misma conexión", async () => {
    mockExecute.mockResolvedValue({});

    await syncEstados();

    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it("cierra la conexión aunque el primer execute lance error", async () => {
    mockExecute.mockRejectedValueOnce(new Error("ORA-00060"));

    await expect(syncEstados()).rejects.toThrow("ORA-00060");

    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it("cierra la conexión aunque el segundo execute lance error", async () => {
    mockExecute
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("ORA-00060"));

    await expect(syncEstados()).rejects.toThrow("ORA-00060");

    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

// ─── create — rutas de error (catch block) ────────────────────────────────────

describe("create — error paths", () => {
  const payload = {
    curp:                CURP,
    numeroCredencial:    "CRED-001",
    fechaEmision:        "2026-01-01",
    fechaVigenciaInicio: "2026-01-01",
    fechaVigenciaFin:    "2027-01-01",
    fechaUltimoPago:     null,
    observaciones:       null,
    monto:               500,
    metodoPago:          "efectivo",
    referencia:          null,
  };

  it("errorNum 20003 → HttpError 403 BENEFICIARIO_BAJA", async () => {
    const err = new Error("ORA-20003");
    err.errorNum = 20003;
    mockExecute.mockRejectedValueOnce(err);

    await expect(create(payload)).rejects.toMatchObject({
      statusCode: 403,
      code:       "BENEFICIARIO_BAJA",
    });
    expect(mockRollback).toHaveBeenCalledTimes(1);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it("errorNum 20004 → HttpError 404 NOT_FOUND", async () => {
    const err = new Error("ORA-20004");
    err.errorNum = 20004;
    mockExecute.mockRejectedValueOnce(err);

    await expect(create(payload)).rejects.toMatchObject({
      statusCode: 404,
      code:       "NOT_FOUND",
    });
    expect(mockRollback).toHaveBeenCalledTimes(1);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it("cualquier otro error se relanza tal cual", async () => {
    const err = new Error("ORA-01017");
    err.errorNum = 1017;
    mockExecute.mockRejectedValueOnce(err);

    await expect(create(payload)).rejects.toThrow("ORA-01017");
    expect(mockRollback).toHaveBeenCalledTimes(1);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});
