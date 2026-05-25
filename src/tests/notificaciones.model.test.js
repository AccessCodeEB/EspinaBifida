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
  findAll,
  findPendientes,
  countPendientes,
  markAsRead,
  markAllAsRead,
  syncStockBajoConsolidado,
  upsertMembresia,
} = await import("../models/notificaciones.model.js");

beforeEach(() => resetMocks());

// ── findArticulosConStockBajo ─────────────────────────────────────────────────

describe("findArticulosConStockBajo", () => {
  it("retorna filas de artículos con stock bajo", async () => {
    const rows = [{ ID_ARTICULO: 1, DESCRIPCION: "Silla", INVENTARIO_ACTUAL: 2, STOCK_MINIMO: 5 }];
    mockExecute.mockResolvedValueOnce({ rows });
    const result = await findArticulosConStockBajo();
    expect(result).toEqual(rows);
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockClose).toHaveBeenCalledTimes(1);
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
  it("limpia pendientes e inserta una notificación consolidada cuando hay mensaje", async () => {
    mockExecute.mockResolvedValueOnce({}); // UPDATE (clear)
    mockExecute.mockResolvedValueOnce({}); // INSERT
    await syncStockBajoConsolidado("3 artículos con stock bajo: Silla (1 uds), Mesa (0 uds).");
    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect(mockCommit).toHaveBeenCalledTimes(1);
  });

  it("solo limpia pendientes cuando mensaje es null", async () => {
    mockExecute.mockResolvedValueOnce({}); // UPDATE (clear)
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
