/**
 * Tests unitarios de src/models/beneficiarios.model.js
 * Cubre ramas de ?? null/0 en los bind parameters de create y update.
 */
import { jest } from "@jest/globals";
import {
  mockExecute,
  mockClose,
  dbModuleMock,
  resetMocks,
} from "./helpers/mockDb.js";

jest.unstable_mockModule("../config/db.js", () => dbModuleMock);

const { create, update, deactivate, hardDelete } = await import(
  "../models/beneficiarios.model.js"
);

const CURP = "GAEJ900101HMNRRL09";

beforeEach(() => {
  resetMocks();
  mockExecute.mockResolvedValue({ rowsAffected: 1 });
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
    mockExecute.mockResolvedValueOnce({});

    const result = await hardDelete(CURP);

    expect(result).toBe(0);
  });
});
