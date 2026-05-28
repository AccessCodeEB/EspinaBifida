import { jest } from "@jest/globals";
import {
  mockExecute,
  mockClose,
  mockCommit,
  dbModuleMock,
  resetMocks,
} from "./helpers/mockDb.js";

jest.unstable_mockModule("../config/db.js", () => dbModuleMock);

const {
  findArticulosConStockBajo,
  findMembresiasProximas,
  findMembresiasVencidas,
  findCitasHoyProgramadas,
  findAll,
  findPendientes,
  countPendientes,
  markAsRead,
  markAllAsRead,
  syncStockBajoConsolidado,
  syncCitasHoyConsolidado,
  upsertMembresia,
  insertPreregistroNuevo,
  insertBeneficiarioBaja,
  insertReporteGenerado,
} = await import("../models/notificaciones.model.js");

beforeEach(() => resetMocks());

// ── findArticulosConStockBajo ─────────────────────────────────────────────────

describe("findArticulosConStockBajo", () => {
  it("primary query includes ACTIVO filter and returns rows", async () => {
    const rows = [{ ID_ARTICULO: 1, DESCRIPCION: "Silla", INVENTARIO_ACTUAL: 2, STOCK_MINIMO: 5 }];
    mockExecute.mockResolvedValueOnce({ rows });
    const result = await findArticulosConStockBajo();
    expect(result).toEqual(rows);
    expect(mockExecute).toHaveBeenCalledTimes(1);
    const [sql] = mockExecute.mock.calls[0];
    expect(sql).toMatch(/NVL\(ACTIVO/i);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it("fallback when ORA-00904 (ACTIVO column missing) — returns rows without ACTIVO filter", async () => {
    const ora904 = Object.assign(new Error("ORA-00904"), { errorNum: 904 });
    const fallbackRows = [{ ID_ARTICULO: 2, DESCRIPCION: "Crutch", INVENTARIO_ACTUAL: 0, STOCK_MINIMO: 3 }];
    mockExecute.mockRejectedValueOnce(ora904).mockResolvedValueOnce({ rows: fallbackRows });
    const result = await findArticulosConStockBajo();
    expect(result).toEqual(fallbackRows);
    expect(mockExecute).toHaveBeenCalledTimes(2);
    const [fallbackSql] = mockExecute.mock.calls[1];
    expect(fallbackSql).not.toMatch(/NVL\(ACTIVO/i);
  });

  it("re-throws non-ORA-00904 error", async () => {
    const dbErr = Object.assign(new Error("ORA-00942: table not found"), { errorNum: 942 });
    mockExecute.mockRejectedValueOnce(dbErr);
    await expect(findArticulosConStockBajo()).rejects.toThrow("ORA-00942");
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });
});

// ── findMembresiasProximas ───────────────────────────────────────────────────

describe("findMembresiasProximas", () => {
  it("retorna filas de membresías próximas a vencer", async () => {
    const rows = [{ CURP: "ABCD000000XXXXXX00", NOMBRE: "Juan", DIAS_RESTANTES: 5 }];
    mockExecute.mockResolvedValueOnce({ rows });
    const result = await findMembresiasProximas();
    expect(result).toEqual(rows);
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

// ── findMembresiasVencidas ───────────────────────────────────────────────────

describe("findMembresiasVencidas", () => {
  it("retorna filas de membresías ya vencidas", async () => {
    const rows = [{ CURP: "ZZZZ000000XXXXXX00", NOMBRE: "María" }];
    mockExecute.mockResolvedValueOnce({ rows });
    const result = await findMembresiasVencidas();
    expect(result).toEqual(rows);
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

// ── findAll ──────────────────────────────────────────────────────────────────

describe("findAll", () => {
  it("retorna notificaciones con límite por defecto", async () => {
    const rows = [{ ID_NOTIFICACION: 1, TIPO: "STOCK_BAJO" }];
    mockExecute.mockResolvedValueOnce({ rows });
    const result = await findAll();
    expect(result).toEqual(rows);
    expect(mockExecute).toHaveBeenCalledWith(expect.any(String), { limit: 100 });
  });

  it("respeta el límite personalizado", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });
    await findAll(50);
    expect(mockExecute).toHaveBeenCalledWith(expect.any(String), { limit: 50 });
  });
});

// ── findPendientes ───────────────────────────────────────────────────────────

describe("findPendientes", () => {
  it("retorna notificaciones con ESTATUS PENDIENTE", async () => {
    const rows = [{ ID_NOTIFICACION: 2, ESTATUS: "PENDIENTE" }];
    mockExecute.mockResolvedValueOnce({ rows });
    const result = await findPendientes();
    expect(result).toEqual(rows);
  });
});

// ── countPendientes ──────────────────────────────────────────────────────────

describe("countPendientes", () => {
  it("retorna el conteo como número", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [{ TOTAL: 7 }] });
    const result = await countPendientes();
    expect(result).toBe(7);
  });
});

// ── markAsRead ───────────────────────────────────────────────────────────────

describe("markAsRead", () => {
  it("marca la notificación como leída cuando existe", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [{ ID_NOTIFICACION: 5 }] }); // SELECT
    mockExecute.mockResolvedValueOnce({});                                   // UPDATE
    await markAsRead(5);
    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect(mockCommit).toHaveBeenCalledTimes(1);
  });

  it("lanza notFound cuando no existe", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] }); // SELECT sin resultados
    await expect(markAsRead(999)).rejects.toThrow();
    expect(mockCommit).not.toHaveBeenCalled();
  });
});

// ── syncStockBajoConsolidado ─────────────────────────────────────────────────

describe("syncStockBajoConsolidado", () => {
  it("inserta nueva notificación cuando no hay pendiente y hay mensaje", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] }); // SELECT — sin pendiente
    mockExecute.mockResolvedValueOnce({});           // INSERT
    await syncStockBajoConsolidado("3 artículos con stock bajo.");
    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect(mockCommit).toHaveBeenCalledTimes(1);
  });

  it("actualiza la existente en lugar de insertar duplicado cuando ya hay pendiente", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [{ ID_NOTIFICACION: 5 }] }); // SELECT — hay pendiente
    mockExecute.mockResolvedValueOnce({});                                  // UPDATE mensaje
    await syncStockBajoConsolidado("Silla (1 uds).");
    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect(mockCommit).toHaveBeenCalledTimes(1);
  });

  it("cierra la pendiente existente cuando mensaje es null", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [{ ID_NOTIFICACION: 5 }] }); // SELECT — hay pendiente
    mockExecute.mockResolvedValueOnce({});                                  // UPDATE a LEIDA
    await syncStockBajoConsolidado(null);
    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect(mockCommit).toHaveBeenCalledTimes(1);
  });

  it("no hace nada cuando no hay pendiente y mensaje es null", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] }); // SELECT — sin pendiente
    await syncStockBajoConsolidado(null);
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockCommit).toHaveBeenCalledTimes(1);
  });
});

// ── markAllAsRead ─────────────────────────────────────────────────────────────

describe("markAllAsRead", () => {
  it("marca todas las notificaciones pendientes como leídas", async () => {
    mockExecute.mockResolvedValueOnce({});
    await markAllAsRead();
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockCommit).toHaveBeenCalledTimes(1);
    expect(mockExecute).toHaveBeenCalledWith(expect.stringContaining("ESTATUS = 'PENDIENTE'"));
  });
});

// ── insertPreregistroNuevo ───────────────────────────────────────────────────

describe("insertPreregistroNuevo", () => {
  it("inserta una notificación PREREGISTRO_NUEVO con la CURP y nombre", async () => {
    mockExecute.mockResolvedValueOnce({});
    await insertPreregistroNuevo("ABCD900101HXYZRL01", "Juan García");
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining("PREREGISTRO_NUEVO"),
      expect.objectContaining({ curp: "ABCD900101HXYZRL01" })
    );
    expect(mockCommit).toHaveBeenCalledTimes(1);
  });
});

// ── insertBeneficiarioBaja ───────────────────────────────────────────────────

describe("insertBeneficiarioBaja", () => {
  it("inserta una notificación BENEFICIARIO_BAJA con la CURP y nombre", async () => {
    mockExecute.mockResolvedValueOnce({});
    await insertBeneficiarioBaja("ABCD900101HXYZRL01", "Juan García");
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining("BENEFICIARIO_BAJA"),
      expect.objectContaining({ curp: "ABCD900101HXYZRL01" })
    );
    expect(mockCommit).toHaveBeenCalledTimes(1);
  });
});

// ── findCitasHoyProgramadas ──────────────────────────────────────────────────

describe("findCitasHoyProgramadas", () => {
  it("retorna filas de la query", async () => {
    const fila = { ID_CITA: 1, ESPECIALISTA: "Dr. X", NOMBRE: "Juan García", HORA: "10:00" };
    mockExecute.mockResolvedValueOnce({ rows: [fila] });
    const result = await findCitasHoyProgramadas();
    expect(result).toEqual([fila]);
    expect(mockExecute).toHaveBeenCalledWith(expect.stringContaining("PROGRAMADA"));
  });
});

// ── syncCitasHoyConsolidado ──────────────────────────────────────────────────

describe("syncCitasHoyConsolidado", () => {
  it("limpia pendientes e inserta notificación cuando hay mensaje", async () => {
    mockExecute.mockResolvedValueOnce({}); // UPDATE
    mockExecute.mockResolvedValueOnce({}); // INSERT
    await syncCitasHoyConsolidado("2 citas de hoy sin confirmar.");
    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect(mockCommit).toHaveBeenCalledTimes(1);
  });

  it("solo limpia pendientes cuando mensaje es null", async () => {
    mockExecute.mockResolvedValueOnce({});
    await syncCitasHoyConsolidado(null);
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockCommit).toHaveBeenCalledTimes(1);
  });
});

// ── upsertMembresia ──────────────────────────────────────────────────────────

describe("upsertMembresia", () => {
  it("inserta cuando no existe notificación pendiente del mismo tipo para esa CURP", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [{ CNT: 0 }] }); // CHECK
    mockExecute.mockResolvedValueOnce({});                       // INSERT
    await upsertMembresia("ABCD000000XXXXXX00", "MEMBRESIA_PROXIMA", "Su membresía vence pronto");
    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect(mockCommit).toHaveBeenCalledTimes(1);
  });

  it("no inserta si ya existe una pendiente del mismo tipo", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [{ CNT: 1 }] }); // CHECK
    await upsertMembresia("ABCD000000XXXXXX00", "MEMBRESIA_PROXIMA", "mensaje");
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockCommit).not.toHaveBeenCalled();
  });
});

// ── insertReporteGenerado ─────────────────────────────────────────────────────

describe("insertReporteGenerado", () => {
  it.each([
    ["MENSUAL",   "mensual"],
    ["SEMESTRAL", "semestral"],
    ["ANUAL",     "anual"],
  ])("inserta notificación REPORTE_GENERADO para tipo %s", async (tipo, label) => {
    mockExecute.mockResolvedValueOnce({});
    await insertReporteGenerado(tipo, "2025-01-01", "2025-01-31");
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining("REPORTE_GENERADO"),
      expect.objectContaining({ msg: expect.stringContaining(label) })
    );
    expect(mockCommit).toHaveBeenCalledTimes(1);
  });
});
