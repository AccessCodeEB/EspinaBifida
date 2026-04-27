import { jest } from "@jest/globals";
import {
  mockExecute,
  mockClose,
  dbModuleMock,
  resetMocks,
} from "./helpers/mockDb.js";

// ─── Mock de conexión Oracle ──────────────────────────────────────────────────
jest.unstable_mockModule("../config/db.js", () => dbModuleMock);

const { runMigration001 } = await import("../migrations/001_foto_perfil_clob.js");

beforeEach(() => { resetMocks(); });

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers de fixtures
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Devuelve el resultado simulado para el SELECT de ALL_TAB_COLUMNS.
 * colMap: objeto { COLUMN_NAME: DATA_TYPE }
 */
function colQueryResult(colMap) {
  return {
    rows: Object.entries(colMap).map(([name, type]) => ({
      COLUMN_NAME: name,
      DATA_TYPE: type,
    })),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Ya migrada — FOTO_PERFIL_URL ya es CLOB
// ═══════════════════════════════════════════════════════════════════════════════

describe("runMigration001 — ya completada (FOTO_PERFIL_URL es CLOB)", () => {
  test("retorna sin ejecutar ningún DDL", async () => {
    // SELECT ALL_TAB_COLUMNS → FOTO_PERFIL_URL=CLOB
    mockExecute.mockResolvedValueOnce(
      colQueryResult({ FOTO_PERFIL_URL: "CLOB" })
    );

    await runMigration001();

    // Solo se ejecutó el SELECT inicial; ningún ALTER/UPDATE
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Estado inicial — ninguna columna extra existe
// ═══════════════════════════════════════════════════════════════════════════════

describe("runMigration001 — estado inicial (FOTO_PERFIL_URL=VARCHAR2, sin columna CLOB)", () => {
  test("ejecuta los 4 pasos completos y cierra la conexión", async () => {
    // SELECT → FOTO_PERFIL_URL es VARCHAR2, no hay FOTO_PERFIL_CLOB
    mockExecute.mockResolvedValueOnce(
      colQueryResult({ FOTO_PERFIL_URL: "VARCHAR2" })
    );
    // ADD CLOB column
    mockExecute.mockResolvedValueOnce({ rowsAffected: 0 });
    // UPDATE BENEFICIARIOS SET FOTO_PERFIL_CLOB = FOTO_PERFIL_URL
    mockExecute.mockResolvedValueOnce({ rowsAffected: 5 });
    // COMMIT
    mockExecute.mockResolvedValueOnce({});
    // DROP COLUMN FOTO_PERFIL_URL
    mockExecute.mockResolvedValueOnce({ rowsAffected: 0 });
    // RENAME COLUMN
    mockExecute.mockResolvedValueOnce({ rowsAffected: 0 });

    await runMigration001();

    // SELECT + ADD + UPDATE + COMMIT + DROP + RENAME = 6 llamadas
    expect(mockExecute).toHaveBeenCalledTimes(6);
    expect(mockClose).toHaveBeenCalledTimes(1);

    // Verificar que los DDL correctos fueron emitidos (en orden)
    const calls = mockExecute.mock.calls.map((c) => c[0].trim());
    expect(calls[1]).toMatch(/ALTER TABLE BENEFICIARIOS ADD FOTO_PERFIL_CLOB CLOB/i);
    expect(calls[2]).toMatch(/UPDATE BENEFICIARIOS SET FOTO_PERFIL_CLOB = FOTO_PERFIL_URL/i);
    expect(calls[3]).toMatch(/COMMIT/i);
    expect(calls[4]).toMatch(/ALTER TABLE BENEFICIARIOS DROP COLUMN FOTO_PERFIL_URL/i);
    expect(calls[5]).toMatch(/ALTER TABLE BENEFICIARIOS RENAME COLUMN FOTO_PERFIL_CLOB TO FOTO_PERFIL_URL/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Estado parcial — columna CLOB temporal ya existe (paso 1 ya corrió)
// ═══════════════════════════════════════════════════════════════════════════════

describe("runMigration001 — estado parcial: FOTO_PERFIL_CLOB ya existe", () => {
  test("omite el ADD y ejecuta UPDATE, COMMIT, DROP, RENAME", async () => {
    // SELECT → ambas columnas presentes
    mockExecute.mockResolvedValueOnce(
      colQueryResult({ FOTO_PERFIL_URL: "VARCHAR2", FOTO_PERFIL_CLOB: "CLOB" })
    );
    // UPDATE
    mockExecute.mockResolvedValueOnce({ rowsAffected: 3 });
    // COMMIT
    mockExecute.mockResolvedValueOnce({});
    // DROP
    mockExecute.mockResolvedValueOnce({ rowsAffected: 0 });
    // RENAME
    mockExecute.mockResolvedValueOnce({ rowsAffected: 0 });

    await runMigration001();

    // SELECT + UPDATE + COMMIT + DROP + RENAME = 5 llamadas (sin ADD)
    expect(mockExecute).toHaveBeenCalledTimes(5);
    const calls = mockExecute.mock.calls.map((c) => c[0].trim());
    expect(calls[1]).toMatch(/UPDATE BENEFICIARIOS/i);
    expect(calls[4]).toMatch(/RENAME COLUMN/i);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Estado parcial — FOTO_PERFIL_URL ya fue eliminada (pasos 1-3 corrieron)
// ═══════════════════════════════════════════════════════════════════════════════

describe("runMigration001 — estado parcial: solo FOTO_PERFIL_CLOB existe (URL ya eliminada)", () => {
  test("omite ADD, UPDATE y COMMIT; solo ejecuta RENAME", async () => {
    // SELECT → solo FOTO_PERFIL_CLOB presente
    mockExecute.mockResolvedValueOnce(
      colQueryResult({ FOTO_PERFIL_CLOB: "CLOB" })
    );
    // RENAME
    mockExecute.mockResolvedValueOnce({ rowsAffected: 0 });

    await runMigration001();

    // SELECT + RENAME = 2 llamadas
    expect(mockExecute).toHaveBeenCalledTimes(2);
    const calls = mockExecute.mock.calls.map((c) => c[0].trim());
    expect(calls[1]).toMatch(/RENAME COLUMN FOTO_PERFIL_CLOB TO FOTO_PERFIL_URL/i);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Resultado de SELECT con índices posicionales (sin COLUMN_NAME/DATA_TYPE)
// ═══════════════════════════════════════════════════════════════════════════════

describe("runMigration001 — resultado con índices posicionales [0], [1]", () => {
  test("interpreta correctamente filas como array posicional", async () => {
    // oracledb a veces devuelve arrays en lugar de objetos
    mockExecute.mockResolvedValueOnce({
      rows: [["FOTO_PERFIL_URL", "CLOB"]],
    });

    await runMigration001();

    // Ya migrada → solo el SELECT
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. Error en la ejecución — la migración debe loguear el error y cerrar conexión
// ═══════════════════════════════════════════════════════════════════════════════

describe("runMigration001 — error durante el SELECT inicial", () => {
  test("captura el error, no lanza excepción y cierra la conexión", async () => {
    mockExecute.mockRejectedValueOnce(new Error("ORA-00942: table not found"));

    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(runMigration001()).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[migration-001]"),
      expect.stringContaining("ORA-00942")
    );
    expect(mockClose).toHaveBeenCalledTimes(1);

    errorSpy.mockRestore();
  });
});

describe("runMigration001 — error durante el ALTER (paso 1)", () => {
  test("captura el error y cierra la conexión", async () => {
    mockExecute.mockResolvedValueOnce(
      colQueryResult({ FOTO_PERFIL_URL: "VARCHAR2" })
    );
    mockExecute.mockRejectedValueOnce(new Error("ORA-01430: column already exists"));

    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(runMigration001()).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalledTimes(1);

    errorSpy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. getConnection falla — no hay conexión
// ═══════════════════════════════════════════════════════════════════════════════

describe("runMigration001 — falla al obtener conexión", () => {
  test("captura el error sin intentar cerrar conexión nula", async () => {
    dbModuleMock.getConnection.mockRejectedValueOnce(
      new Error("ORA-12541: TNS:no listener")
    );

    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(runMigration001()).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalled();
    // connection nunca se asignó → close NO debe llamarse
    expect(mockClose).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
