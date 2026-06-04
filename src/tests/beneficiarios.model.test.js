/**
 * Tests unitarios de src/models/beneficiarios.model.js
 * Cubre ramas de ?? null/0 en los bind parameters de create y update.
 */
import { jest } from "@jest/globals";
import {
  mockExecute,
  mockClose,
  mockCommit,
  mockRollback,
  dbModuleMock,
  resetMocks,
} from "./helpers/mockDb.js";

const mockGetConnection = jest.fn();

jest.unstable_mockModule("../config/db.js", () => ({
  ...dbModuleMock,
  getConnection: mockGetConnection,
}));

const { create, update, deactivate, hardDelete, deactivateConCancelacionMembresias } = await import(
  "../models/beneficiarios.model.js"
);

const CURP = "GAEJ900101HMNRRL09";

beforeEach(() => {
  resetMocks();
  mockExecute.mockResolvedValue({ rowsAffected: 1 });
  mockGetConnection.mockResolvedValue({
    execute:  mockExecute,
    commit:   mockCommit,
    rollback: mockRollback,
    close:    mockClose,
  });
});

// ─── create — ramas ?? null (L68-82) ──────────────────────────────────────────

describe("create — campos undefined → ?? null / default branch", () => {
  it("campos opcionales undefined → se usa null (L68-82)", async () => {
    // Solo CURP + nombres requeridos; todos los demás undefined → usa ?? null
    await create({
      curp: CURP,
      nombres: "Juan",
      apellidoPaterno: "García",
      apellidoMaterno: "López",
      // todos los opcionales omitidos → undefined → ?? null
    });

    expect(mockExecute).toHaveBeenCalledTimes(1);
    const [, binds] = mockExecute.mock.calls[0];
    expect(binds.nombres).toBe("Juan");
    expect(binds.genero).toBeNull();
    expect(binds.tipoSangre).toBeNull();
    expect(binds.notas).toBeNull();
    expect(binds.usaValvula).toBe("N"); // ?? "N"
    expect(binds.estatus).toBe("Activo"); // ?? "Activo"
  });

  it("nombres y apellidos undefined → ?? null (L68-69 null branch)", async () => {
    await create({ curp: CURP });

    const [, binds] = mockExecute.mock.calls[0];
    expect(binds.nombres).toBeNull();
    expect(binds.apellidoPaterno).toBeNull();
    expect(binds.apellidoMaterno).toBeNull();
  });

  it("usaValvula explícito 'S' → no usa fallback", async () => {
    await create({ curp: CURP, nombres: "Ana", apellidoPaterno: "P", apellidoMaterno: "M", usaValvula: "S" });

    const [, binds] = mockExecute.mock.calls[0];
    expect(binds.usaValvula).toBe("S");
  });

  it("estatus explícito 'Inactivo' → no usa fallback", async () => {
    await create({ curp: CURP, nombres: "X", apellidoPaterno: "Y", apellidoMaterno: "Z", estatus: "Inactivo" });

    const [, binds] = mockExecute.mock.calls[0];
    expect(binds.estatus).toBe("Inactivo");
  });
});

// ─── update — ramas ?? null (L114-130) ────────────────────────────────────────

describe("update — campos undefined → ?? null", () => {
  it("todos los campos del update undefined → ?? null (L114-130)", async () => {
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    await update(CURP, {}); // todos los campos undefined

    expect(mockExecute).toHaveBeenCalledTimes(1);
    const [, binds] = mockExecute.mock.calls[0];
    expect(binds.nombres).toBeNull();
    expect(binds.fechaNacimiento).toBeNull();
    expect(binds.genero).toBeNull();
    expect(binds.tipoSangre).toBeNull();
    expect(binds.notas).toBeNull();
    expect(binds.usaValvula).toBe("N"); // ?? "N"
    expect(binds.estatus).toBe("Activo"); // ?? "Activo"
  });

  it("rowsAffected undefined → retorna 0 (L130 ?? 0)", async () => {
    mockExecute.mockResolvedValueOnce({}); // sin rowsAffected

    const result = await update(CURP, { nombres: "Test", apellidoPaterno: "P", apellidoMaterno: "M" });

    expect(result).toBe(0);
  });
});

// ─── deactivate / hardDelete — rowsAffected ?? 0 (L163, L171) ─────────────────

describe("deactivate — rowsAffected ?? 0 (L163)", () => {
  it("rowsAffected undefined → retorna 0", async () => {
    mockExecute.mockResolvedValueOnce({});

    const result = await deactivate(CURP);

    expect(result).toBe(0);
  });
});

describe("hardDelete — rowsAffected ?? 0 (L171)", () => {
  it("rowsAffected undefined → retorna 0", async () => {
    // Primera llamada: DELETE FROM NOTIFICACIONES (sin rowsAffected relevante)
    mockExecute.mockResolvedValueOnce({});
    // Segunda llamada: DELETE FROM BENEFICIARIOS (rowsAffected undefined → 0)
    mockExecute.mockResolvedValueOnce({});

    const result = await hardDelete(CURP);

    expect(result).toBe(0);
  });
});

// ─── deactivateConCancelacionMembresias — transacción atómica ─────────────────

describe("deactivateConCancelacionMembresias", () => {
  it("ejecuta UPDATE BENEFICIARIOS y UPDATE CREDENCIALES y hace commit", async () => {
    await deactivateConCancelacionMembresias(CURP);

    expect(mockExecute).toHaveBeenCalledTimes(2);
    const [sql1] = mockExecute.mock.calls[0];
    const [sql2] = mockExecute.mock.calls[1];
    expect(sql1).toContain("UPDATE BENEFICIARIOS");
    expect(sql2).toContain("UPDATE CREDENCIALES");
    expect(mockCommit).toHaveBeenCalledTimes(1);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it("hace rollback y cierra la conexión si el primer UPDATE falla", async () => {
    mockExecute.mockRejectedValueOnce(new Error("ORA-00001"));

    await expect(deactivateConCancelacionMembresias(CURP)).rejects.toThrow("ORA-00001");

    expect(mockCommit).not.toHaveBeenCalled();
    expect(mockRollback).toHaveBeenCalledTimes(1);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it("hace rollback y cierra la conexión si el segundo UPDATE falla", async () => {
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 }); // primer UPDATE ok
    mockExecute.mockRejectedValueOnce(new Error("ORA-00942")); // segundo falla

    await expect(deactivateConCancelacionMembresias(CURP)).rejects.toThrow("ORA-00942");

    expect(mockCommit).not.toHaveBeenCalled();
    expect(mockRollback).toHaveBeenCalledTimes(1);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it("no intenta cerrar si getConnection falla", async () => {
    mockGetConnection.mockRejectedValueOnce(new Error("pool exhausted"));

    await expect(deactivateConCancelacionMembresias(CURP)).rejects.toThrow("pool exhausted");

    expect(mockClose).not.toHaveBeenCalled();
  });
});
