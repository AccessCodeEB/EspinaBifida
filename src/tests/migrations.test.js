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
const { runMigration002 } = await import("../migrations/002_reportes_generados.js");
const { runMigration003 } = await import("../migrations/003_administradores_foto_perfil_clob.js");
const { runMigration004 } = await import("../migrations/004_credenciales_pago_fields.js");
const { runMigration005 } = await import("../migrations/005_configuracion_especialistas.js");

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

// ═══════════════════════════════════════════════════════════════════════════════
// 8. result.rows ausente — rama ?? [] en el bucle
// ═══════════════════════════════════════════════════════════════════════════════

describe("runMigration001 — result.rows ausente (rama ?? [])", () => {
  test("trata rows como vacío: agrega CLOB y renombra (sin UPDATE/DROP porque FOTO_PERFIL_URL no está en cols)", async () => {
    // result sin propiedad rows → cols queda vacío
    // → !cols["FOTO_PERFIL_CLOB"] = true  → ADD CLOB
    // → cols["FOTO_PERFIL_URL"]   = falsy → salta UPDATE/COMMIT/DROP
    // → RENAME siempre se ejecuta
    mockExecute.mockResolvedValueOnce({}); // SELECT → sin rows
    mockExecute.mockResolvedValueOnce({ rowsAffected: 0 }); // ADD CLOB
    mockExecute.mockResolvedValueOnce({ rowsAffected: 0 }); // RENAME

    await runMigration001();

    expect(mockExecute).toHaveBeenCalledTimes(3);
    const calls = mockExecute.mock.calls.map((c) => c[0].trim());
    expect(calls[1]).toMatch(/ALTER TABLE BENEFICIARIOS ADD FOTO_PERFIL_CLOB CLOB/i);
    expect(calls[2]).toMatch(/RENAME COLUMN FOTO_PERFIL_CLOB TO FOTO_PERFIL_URL/i);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 9. Error sin .message — rama err?.message ?? err
// ═══════════════════════════════════════════════════════════════════════════════

describe("runMigration001 — error sin .message (rama ?? err)", () => {
  test("logea el objeto raw cuando el error no tiene .message", async () => {
    // Lanzar un string como error (sin .message)
    mockExecute.mockRejectedValueOnce("ORA-raw-string-error");

    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(runMigration001()).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[migration-001]"),
      "ORA-raw-string-error"
    );
    expect(mockClose).toHaveBeenCalledTimes(1);

    errorSpy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 10. connection.close() falla — rama catch(() => {}) en finally
// ═══════════════════════════════════════════════════════════════════════════════

describe("runMigration001 — connection.close() lanza (finally catch)", () => {
  test("silencia el error de close y no relanza", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [{ COLUMN_NAME: "FOTO_PERFIL_URL", DATA_TYPE: "CLOB" }],
    });
    mockClose.mockRejectedValueOnce(new Error("close failed"));

    await expect(runMigration001()).resolves.toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// runMigration002 — Crea tabla REPORTES_GENERADOS e índices de forma idempotente
// ═══════════════════════════════════════════════════════════════════════════════

/** Resultado simulado para SELECT COUNT(*) AS CNT */
function cntResult(n) {
  return { rows: [{ CNT: n }] };
}

describe("runMigration002 — todo ya existe (tabla + ambos índices)", () => {
  test("retorna sin ejecutar ningún DDL", async () => {
    mockExecute.mockResolvedValueOnce(cntResult(1)); // tabla existe
    mockExecute.mockResolvedValueOnce(cntResult(1)); // IDX_REPORTES_FECHA existe
    mockExecute.mockResolvedValueOnce(cntResult(1)); // IDX_SA_SERVICIO existe

    await runMigration002();

    expect(mockExecute).toHaveBeenCalledTimes(3);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

describe("runMigration002 — estado inicial (nada existe)", () => {
  test("crea tabla y ambos índices, cierra conexión", async () => {
    mockExecute.mockResolvedValueOnce(cntResult(0)); // tabla no existe
    mockExecute.mockResolvedValueOnce({});           // CREATE TABLE
    mockExecute.mockResolvedValueOnce(cntResult(0)); // IDX_REPORTES_FECHA no existe
    mockExecute.mockResolvedValueOnce({});           // CREATE INDEX FECHA
    mockExecute.mockResolvedValueOnce(cntResult(0)); // IDX_SA_SERVICIO no existe
    mockExecute.mockResolvedValueOnce({});           // CREATE INDEX SA_SERVICIO

    await runMigration002();

    expect(mockExecute).toHaveBeenCalledTimes(6);
    expect(mockClose).toHaveBeenCalledTimes(1);

    const calls = mockExecute.mock.calls.map((c) => c[0].trim ? c[0].trim() : c[0]);
    expect(calls[1]).toMatch(/CREATE TABLE REPORTES_GENERADOS/i);
    expect(calls[3]).toMatch(/CREATE INDEX IDX_REPORTES_FECHA/i);
    expect(calls[5]).toMatch(/CREATE INDEX IDX_SA_SERVICIO/i);
  });
});

describe("runMigration002 — tabla existe, ningún índice", () => {
  test("omite CREATE TABLE, crea ambos índices", async () => {
    mockExecute.mockResolvedValueOnce(cntResult(1)); // tabla existe
    mockExecute.mockResolvedValueOnce(cntResult(0)); // IDX_REPORTES_FECHA no existe
    mockExecute.mockResolvedValueOnce({});           // CREATE INDEX FECHA
    mockExecute.mockResolvedValueOnce(cntResult(0)); // IDX_SA_SERVICIO no existe
    mockExecute.mockResolvedValueOnce({});           // CREATE INDEX SA_SERVICIO

    await runMigration002();

    expect(mockExecute).toHaveBeenCalledTimes(5);
    const calls = mockExecute.mock.calls.map((c) => c[0].trim ? c[0].trim() : c[0]);
    expect(calls[1]).toMatch(/IDX_REPORTES_FECHA/i);
    expect(calls[3]).toMatch(/IDX_SA_SERVICIO/i);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

describe("runMigration002 — resultado con formato posicional [0]", () => {
  test("interpreta CNT desde el primer elemento del array", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [[1]] }); // tabla existe (posicional)
    mockExecute.mockResolvedValueOnce({ rows: [[1]] }); // IDX_REPORTES_FECHA
    mockExecute.mockResolvedValueOnce({ rows: [[1]] }); // IDX_SA_SERVICIO

    await runMigration002();

    expect(mockExecute).toHaveBeenCalledTimes(3);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

describe("runMigration002 — error durante SELECT inicial", () => {
  test("captura el error, logea y cierra conexión", async () => {
    mockExecute.mockRejectedValueOnce(new Error("ORA-00904: invalid identifier"));

    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(runMigration002()).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[migration-002]"),
      expect.any(String)
    );
    expect(mockClose).toHaveBeenCalledTimes(1);

    errorSpy.mockRestore();
  });
});

describe("runMigration002 — error durante CREATE TABLE", () => {
  test("captura el error y cierra conexión", async () => {
    mockExecute.mockResolvedValueOnce(cntResult(0));
    mockExecute.mockRejectedValueOnce(new Error("ORA-00955: name already used"));

    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(runMigration002()).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalledTimes(1);

    errorSpy.mockRestore();
  });
});

describe("runMigration002 — falla al obtener conexión", () => {
  test("captura el error sin intentar cerrar conexión nula", async () => {
    dbModuleMock.getConnection.mockRejectedValueOnce(
      new Error("ORA-12541: TNS:no listener")
    );

    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(runMigration002()).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalled();
    expect(mockClose).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});

describe("runMigration002 — connection.close() lanza (finally catch)", () => {
  test("silencia el error de close y no relanza", async () => {
    mockExecute.mockResolvedValueOnce(cntResult(1));
    mockExecute.mockResolvedValueOnce(cntResult(1));
    mockExecute.mockResolvedValueOnce(cntResult(1));
    mockClose.mockRejectedValueOnce(new Error("close failed"));

    await expect(runMigration002()).resolves.toBeUndefined();
  });
});

describe("runMigration002 — rows vacío en SELECT (rama ?? 0)", () => {
  test("interpreta CNT=0 cuando rows está vacío y crea todos los objetos", async () => {
    // rows vacío → tablas[0] undefined → ?? 0 → tablaExiste=false
    mockExecute.mockResolvedValueOnce({ rows: [] }); // tabla no existe
    mockExecute.mockResolvedValueOnce({});            // CREATE TABLE
    mockExecute.mockResolvedValueOnce({ rows: [] }); // idx1 no existe
    mockExecute.mockResolvedValueOnce({});            // CREATE INDEX FECHA
    mockExecute.mockResolvedValueOnce({ rows: [] }); // idx2 no existe
    mockExecute.mockResolvedValueOnce({});            // CREATE INDEX SA_SERVICIO

    await runMigration002();

    expect(mockExecute).toHaveBeenCalledTimes(6);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

describe("runMigration002 — error sin .message (rama ?? err)", () => {
  test("logea el objeto raw cuando el error no tiene .message", async () => {
    mockExecute.mockRejectedValueOnce("ORA-raw-string-error");

    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(runMigration002()).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[migration-002]"),
      "ORA-raw-string-error"
    );
    expect(mockClose).toHaveBeenCalledTimes(1);

    errorSpy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// runMigration003 — Convierte ADMINISTRADORES.FOTO_PERFIL_URL a CLOB
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Devuelve resultado SELECT ALL_TAB_COLUMNS para ADMINISTRADORES.
 * colMap: objeto { COLUMN_NAME: DATA_TYPE }
 */
function adminColResult(colMap) {
  return {
    rows: Object.entries(colMap).map(([name, type]) => ({
      COLUMN_NAME: name,
      DATA_TYPE: type,
    })),
  };
}

describe("runMigration003 — ya completada (FOTO_PERFIL_URL es CLOB)", () => {
  test("retorna sin ejecutar ningún DDL", async () => {
    mockExecute.mockResolvedValueOnce(
      adminColResult({ FOTO_PERFIL_URL: "CLOB" })
    );

    await runMigration003();

    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

describe("runMigration003 — estado inicial (FOTO_PERFIL_URL=VARCHAR2, sin columna CLOB)", () => {
  test("ejecuta los 4 pasos completos y cierra la conexión", async () => {
    mockExecute.mockResolvedValueOnce(
      adminColResult({ FOTO_PERFIL_URL: "VARCHAR2" })
    );
    mockExecute.mockResolvedValueOnce({ rowsAffected: 0 }); // ADD CLOB
    mockExecute.mockResolvedValueOnce({ rowsAffected: 3 }); // UPDATE
    mockExecute.mockResolvedValueOnce({});                  // COMMIT
    mockExecute.mockResolvedValueOnce({ rowsAffected: 0 }); // DROP
    mockExecute.mockResolvedValueOnce({ rowsAffected: 0 }); // RENAME

    await runMigration003();

    expect(mockExecute).toHaveBeenCalledTimes(6);
    expect(mockClose).toHaveBeenCalledTimes(1);

    const calls = mockExecute.mock.calls.map((c) => c[0].trim());
    expect(calls[1]).toMatch(/ALTER TABLE ADMINISTRADORES ADD FOTO_PERFIL_CLOB CLOB/i);
    expect(calls[2]).toMatch(/UPDATE ADMINISTRADORES SET FOTO_PERFIL_CLOB = FOTO_PERFIL_URL/i);
    expect(calls[3]).toMatch(/COMMIT/i);
    expect(calls[4]).toMatch(/ALTER TABLE ADMINISTRADORES DROP COLUMN FOTO_PERFIL_URL/i);
    expect(calls[5]).toMatch(/ALTER TABLE ADMINISTRADORES RENAME COLUMN FOTO_PERFIL_CLOB TO FOTO_PERFIL_URL/i);
  });
});

describe("runMigration003 — estado parcial: FOTO_PERFIL_CLOB ya existe", () => {
  test("omite el ADD y ejecuta UPDATE, COMMIT, DROP, RENAME", async () => {
    mockExecute.mockResolvedValueOnce(
      adminColResult({ FOTO_PERFIL_URL: "VARCHAR2", FOTO_PERFIL_CLOB: "CLOB" })
    );
    mockExecute.mockResolvedValueOnce({ rowsAffected: 2 }); // UPDATE
    mockExecute.mockResolvedValueOnce({});                  // COMMIT
    mockExecute.mockResolvedValueOnce({ rowsAffected: 0 }); // DROP
    mockExecute.mockResolvedValueOnce({ rowsAffected: 0 }); // RENAME

    await runMigration003();

    // SELECT + UPDATE + COMMIT + DROP + RENAME = 5 (sin ADD)
    expect(mockExecute).toHaveBeenCalledTimes(5);
    const calls = mockExecute.mock.calls.map((c) => c[0].trim());
    expect(calls[1]).toMatch(/UPDATE ADMINISTRADORES/i);
    expect(calls[4]).toMatch(/RENAME COLUMN/i);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

describe("runMigration003 — estado parcial: solo FOTO_PERFIL_CLOB existe (URL ya eliminada)", () => {
  test("omite ADD, UPDATE y COMMIT; solo ejecuta RENAME", async () => {
    mockExecute.mockResolvedValueOnce(
      adminColResult({ FOTO_PERFIL_CLOB: "CLOB" })
    );
    mockExecute.mockResolvedValueOnce({ rowsAffected: 0 }); // RENAME

    await runMigration003();

    expect(mockExecute).toHaveBeenCalledTimes(2);
    const calls = mockExecute.mock.calls.map((c) => c[0].trim());
    expect(calls[1]).toMatch(/RENAME COLUMN FOTO_PERFIL_CLOB TO FOTO_PERFIL_URL/i);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

describe("runMigration003 — resultado con índices posicionales [0], [1]", () => {
  test("interpreta correctamente filas como array posicional", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [["FOTO_PERFIL_URL", "CLOB"]],
    });

    await runMigration003();

    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

describe("runMigration003 — error durante el SELECT inicial", () => {
  test("captura el error, no lanza excepción y cierra la conexión", async () => {
    mockExecute.mockRejectedValueOnce(new Error("ORA-00942: table not found"));

    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(runMigration003()).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[migration-003]"),
      expect.any(String)
    );
    expect(mockClose).toHaveBeenCalledTimes(1);

    errorSpy.mockRestore();
  });
});

describe("runMigration003 — error durante el ALTER ADD (paso 1)", () => {
  test("captura el error y cierra la conexión", async () => {
    mockExecute.mockResolvedValueOnce(
      adminColResult({ FOTO_PERFIL_URL: "VARCHAR2" })
    );
    mockExecute.mockRejectedValueOnce(new Error("ORA-01430: column already exists"));

    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(runMigration003()).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalledTimes(1);

    errorSpy.mockRestore();
  });
});

describe("runMigration003 — falla al obtener conexión", () => {
  test("captura el error sin intentar cerrar conexión nula", async () => {
    dbModuleMock.getConnection.mockRejectedValueOnce(
      new Error("ORA-12541: TNS:no listener")
    );

    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(runMigration003()).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalled();
    expect(mockClose).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});

describe("runMigration003 — error sin .message (rama ?? err)", () => {
  test("logea el objeto raw cuando el error no tiene .message", async () => {
    mockExecute.mockRejectedValueOnce("ORA-raw-string-error");

    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(runMigration003()).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[migration-003]"),
      "ORA-raw-string-error"
    );
    expect(mockClose).toHaveBeenCalledTimes(1);

    errorSpy.mockRestore();
  });
});

describe("runMigration003 — connection.close() lanza (finally catch)", () => {
  test("silencia el error de close y no relanza", async () => {
    mockExecute.mockResolvedValueOnce(
      adminColResult({ FOTO_PERFIL_URL: "CLOB" })
    );
    mockClose.mockRejectedValueOnce(new Error("close failed"));

    await expect(runMigration003()).resolves.toBeUndefined();
  });
});

describe("runMigration003 — result.rows ausente (rama ?? [])", () => {
  test("trata rows como vacío: agrega CLOB y renombra (cols queda vacío)", async () => {
    // result sin propiedad rows → cols queda vacío
    // → !cols["FOTO_PERFIL_CLOB"] = true  → ADD CLOB
    // → cols["FOTO_PERFIL_URL"]   = falsy → salta UPDATE/COMMIT/DROP
    // → RENAME siempre se ejecuta
    mockExecute.mockResolvedValueOnce({}); // SELECT → sin rows
    mockExecute.mockResolvedValueOnce({ rowsAffected: 0 }); // ADD CLOB
    mockExecute.mockResolvedValueOnce({ rowsAffected: 0 }); // RENAME

    await runMigration003();

    expect(mockExecute).toHaveBeenCalledTimes(3);
    const calls = mockExecute.mock.calls.map((c) => c[0].trim());
    expect(calls[1]).toMatch(/ALTER TABLE ADMINISTRADORES ADD FOTO_PERFIL_CLOB CLOB/i);
    expect(calls[2]).toMatch(/RENAME COLUMN FOTO_PERFIL_CLOB TO FOTO_PERFIL_URL/i);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// runMigration004 — Agrega columnas de pago a CREDENCIALES y actualiza SP/Trigger
// ═══════════════════════════════════════════════════════════════════════════════

describe("runMigration004 — todas las columnas ya existen", () => {
  test("omite los ALTER y solo ejecuta SP + Trigger", async () => {
    mockExecute
      .mockResolvedValueOnce(cntResult(1)) // MONTO existe
      .mockResolvedValueOnce(cntResult(1)) // METODO_PAGO existe
      .mockResolvedValueOnce(cntResult(1)) // REFERENCIA existe
      .mockResolvedValueOnce({})           // CREATE OR REPLACE PROCEDURE
      .mockResolvedValueOnce({});          // CREATE OR REPLACE TRIGGER

    await runMigration004();

    expect(mockExecute).toHaveBeenCalledTimes(5);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

describe("runMigration004 — ninguna columna existe (estado inicial)", () => {
  test("ejecuta 3 ALTER + SP + Trigger y cierra conexión", async () => {
    mockExecute
      .mockResolvedValueOnce(cntResult(0)) // MONTO no existe
      .mockResolvedValueOnce({})           // ALTER ADD MONTO
      .mockResolvedValueOnce(cntResult(0)) // METODO_PAGO no existe
      .mockResolvedValueOnce({})           // ALTER ADD METODO_PAGO
      .mockResolvedValueOnce(cntResult(0)) // REFERENCIA no existe
      .mockResolvedValueOnce({})           // ALTER ADD REFERENCIA
      .mockResolvedValueOnce({})           // CREATE OR REPLACE PROCEDURE
      .mockResolvedValueOnce({});          // CREATE OR REPLACE TRIGGER

    await runMigration004();

    expect(mockExecute).toHaveBeenCalledTimes(8);
    const calls = mockExecute.mock.calls.map((c) => c[0].trim ? c[0].trim() : c[0]);
    expect(calls[1]).toMatch(/ALTER TABLE CREDENCIALES ADD MONTO/i);
    expect(calls[3]).toMatch(/ALTER TABLE CREDENCIALES ADD METODO_PAGO/i);
    expect(calls[5]).toMatch(/ALTER TABLE CREDENCIALES ADD REFERENCIA/i);
    expect(calls[6]).toMatch(/SP_REGISTRAR_MEMBRESIA/i);
    expect(calls[7]).toMatch(/TRG_CREDENCIALES_BI/i);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

describe("runMigration004 — estado parcial (MONTO existe, otras no)", () => {
  test("omite el ALTER de MONTO y ejecuta los demás + SP + Trigger", async () => {
    mockExecute
      .mockResolvedValueOnce(cntResult(1)) // MONTO existe
      .mockResolvedValueOnce(cntResult(0)) // METODO_PAGO no existe
      .mockResolvedValueOnce({})           // ALTER ADD METODO_PAGO
      .mockResolvedValueOnce(cntResult(0)) // REFERENCIA no existe
      .mockResolvedValueOnce({})           // ALTER ADD REFERENCIA
      .mockResolvedValueOnce({})           // SP
      .mockResolvedValueOnce({});          // Trigger

    await runMigration004();

    expect(mockExecute).toHaveBeenCalledTimes(7);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

describe("runMigration004 — CNT en formato posicional [0]", () => {
  test("interpreta el conteo desde el primer elemento del array (rama ?? r1[0]?.[0])", async () => {
    // formato posicional: r1[0] es un array, r1[0]?.[0] sería el valor CNT
    mockExecute
      .mockResolvedValueOnce({ rows: [[1]] }) // MONTO existe (posicional)
      .mockResolvedValueOnce({ rows: [[1]] }) // METODO_PAGO existe
      .mockResolvedValueOnce({ rows: [[1]] }) // REFERENCIA existe
      .mockResolvedValueOnce({})              // SP
      .mockResolvedValueOnce({});             // Trigger

    await runMigration004();

    expect(mockExecute).toHaveBeenCalledTimes(5);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

describe("runMigration004 — error durante la ejecución", () => {
  test("captura el error, logea y cierra conexión", async () => {
    mockExecute.mockRejectedValueOnce(new Error("ORA-01031: insufficient privileges"));

    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(runMigration004()).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[migration-004]"),
      expect.any(String)
    );
    expect(mockClose).toHaveBeenCalledTimes(1);

    errorSpy.mockRestore();
  });
});

describe("runMigration004 — falla al obtener conexión", () => {
  test("captura el error sin intentar cerrar conexión nula", async () => {
    dbModuleMock.getConnection.mockRejectedValueOnce(
      new Error("ORA-12541: TNS:no listener")
    );

    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(runMigration004()).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalled();
    expect(mockClose).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});

describe("runMigration004 — connection.close() lanza (finally catch)", () => {
  test("silencia el error de close y no relanza", async () => {
    mockExecute
      .mockResolvedValueOnce(cntResult(1))
      .mockResolvedValueOnce(cntResult(1))
      .mockResolvedValueOnce(cntResult(1))
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});
    mockClose.mockRejectedValueOnce(new Error("close failed"));

    await expect(runMigration004()).resolves.toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// runMigration005 — MONTO_SUGERIDO, tipos de servicio, ESPECIALISTAS, CONFIGURACION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Devuelve la secuencia de mocks para migration005 cuando TODO ya existe.
 * Orden: CHECK monto_sugerido, 4×UPDATE montos, 3×CHECK servicios, CHECK esp, CHECK config
 */
function mockMigration005AllExists() {
  // 1. MONTO_SUGERIDO existe
  mockExecute.mockResolvedValueOnce(cntResult(1));
  // 2-5. 4× UPDATE montos (always run)
  for (let i = 0; i < 4; i++) mockExecute.mockResolvedValueOnce({});
  // 6-8. 3× CHECK servicio → existe
  for (let i = 0; i < 3; i++) mockExecute.mockResolvedValueOnce(cntResult(1));
  // 9. ESPECIALISTAS existe
  mockExecute.mockResolvedValueOnce(cntResult(1));
  // 10. CONFIGURACION existe
  mockExecute.mockResolvedValueOnce(cntResult(1));
}

describe("runMigration005 — todo ya existe", () => {
  test("omite todos los DDL — solo ejecuta los 4 UPDATE de montos", async () => {
    mockMigration005AllExists();

    await runMigration005();

    // 1 SELECT monto_sugerido + 4 UPDATE + 3 SELECT servicios + 1 SELECT esp + 1 SELECT config = 10
    expect(mockExecute).toHaveBeenCalledTimes(10);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

describe("runMigration005 — estado inicial (nada existe)", () => {
  test("ejecuta toda la secuencia DDL completa", async () => {
    // 1. MONTO_SUGERIDO no existe → ALTER
    mockExecute
      .mockResolvedValueOnce(cntResult(0)) // CHECK MONTO_SUGERIDO
      .mockResolvedValueOnce({});           // ALTER ADD MONTO_SUGERIDO
    // 2-5. 4× UPDATE montos
    for (let i = 0; i < 4; i++) mockExecute.mockResolvedValueOnce({});
    // 6-11. 3× [CHECK (CNT=0) + INSERT]
    for (let i = 0; i < 3; i++) {
      mockExecute.mockResolvedValueOnce(cntResult(0)); // no existe
      mockExecute.mockResolvedValueOnce({});            // INSERT
    }
    // 12. CHECK ESPECIALISTAS → no existe
    mockExecute.mockResolvedValueOnce(cntResult(0));
    // 13. CREATE TABLE ESPECIALISTAS
    mockExecute.mockResolvedValueOnce({});
    // 14-17. 4× INSERT especialistas
    for (let i = 0; i < 4; i++) mockExecute.mockResolvedValueOnce({});
    // 18. CHECK CONFIGURACION → no existe
    mockExecute.mockResolvedValueOnce(cntResult(0));
    // 19. CREATE TABLE CONFIGURACION
    mockExecute.mockResolvedValueOnce({});
    // 20-24. 5× INSERT configs
    for (let i = 0; i < 5; i++) mockExecute.mockResolvedValueOnce({});

    await runMigration005();

    // 2 + 4 + 6 + 2 + 4 + 2 + 5 = 25 calls
    expect(mockExecute).toHaveBeenCalledTimes(25);
    const calls = mockExecute.mock.calls.map((c) => c[0].trim ? c[0].trim() : c[0]);
    // calls: 0=CHECK_MONTO, 1=ALTER, 2-5=4×UPDATE, 6-11=3×(CHECK+INSERT),
    //        12=CHECK_ESP, 13=CREATE_ESP, 14-17=4×INSERT_esp,
    //        18=CHECK_CONF, 19=CREATE_CONF, 20-24=5×INSERT_conf
    expect(calls[1]).toMatch(/ALTER TABLE SERVICIOS_CATALOGO ADD MONTO_SUGERIDO/i);
    expect(calls[2]).toMatch(/UPDATE SERVICIOS_CATALOGO SET MONTO_SUGERIDO/i);
    expect(calls[13]).toMatch(/CREATE TABLE ESPECIALISTAS/i);
    expect(calls[19]).toMatch(/CREATE TABLE CONFIGURACION/i);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

describe("runMigration005 — estado parcial: MONTO_SUGERIDO ya existe, tablas no", () => {
  test("omite ALTER de columna pero crea tablas ESPECIALISTAS y CONFIGURACION", async () => {
    // 1. MONTO_SUGERIDO existe → skip ALTER
    mockExecute.mockResolvedValueOnce(cntResult(1));
    // 2-5. 4× UPDATE montos
    for (let i = 0; i < 4; i++) mockExecute.mockResolvedValueOnce({});
    // 6-8. 3× CHECK servicios → todos existen
    for (let i = 0; i < 3; i++) mockExecute.mockResolvedValueOnce(cntResult(1));
    // 9. CHECK ESPECIALISTAS → no existe
    mockExecute.mockResolvedValueOnce(cntResult(0));
    // 10. CREATE TABLE ESPECIALISTAS
    mockExecute.mockResolvedValueOnce({});
    // 11-14. 4× INSERT especialistas
    for (let i = 0; i < 4; i++) mockExecute.mockResolvedValueOnce({});
    // 15. CHECK CONFIGURACION → no existe
    mockExecute.mockResolvedValueOnce(cntResult(0));
    // 16. CREATE TABLE CONFIGURACION
    mockExecute.mockResolvedValueOnce({});
    // 17-21. 5× INSERT configs
    for (let i = 0; i < 5; i++) mockExecute.mockResolvedValueOnce({});

    await runMigration005();

    // 1 + 4 + 3 + 1+1+4 + 1+1+5 = 21
    expect(mockExecute).toHaveBeenCalledTimes(21);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

describe("runMigration005 — error durante la ejecución", () => {
  test("captura el error, logea y cierra conexión", async () => {
    mockExecute.mockRejectedValueOnce(new Error("ORA-00942: table or view does not exist"));

    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(runMigration005()).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[migration-005]"),
      expect.any(String)
    );
    expect(mockClose).toHaveBeenCalledTimes(1);

    errorSpy.mockRestore();
  });
});

describe("runMigration005 — falla al obtener conexión", () => {
  test("captura el error sin intentar cerrar conexión nula", async () => {
    dbModuleMock.getConnection.mockRejectedValueOnce(
      new Error("ORA-12541: TNS:no listener")
    );

    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(runMigration005()).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalled();
    expect(mockClose).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});

describe("runMigration005 — connection.close() lanza (finally catch)", () => {
  test("silencia el error de close y no relanza", async () => {
    mockMigration005AllExists();
    mockClose.mockRejectedValueOnce(new Error("close failed"));

    await expect(runMigration005()).resolves.toBeUndefined();
  });
});
