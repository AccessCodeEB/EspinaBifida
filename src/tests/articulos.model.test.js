import { jest } from "@jest/globals";
import {
  mockExecute,
  mockClose,
  dbModuleMock,
  resetMocks,
} from "./helpers/mockDb.js";

jest.unstable_mockModule("../config/db.js", () => dbModuleMock);

const { findAll, findById, create, update, deleteById } = await import(
  "../models/articulos.model.js"
);

beforeEach(() => {
  resetMocks();
});

// ─── findAll ────────────────────────────────────────────────────────────────

describe("findAll", () => {
  it("fallback when errorNum === 904 → uses query WITHOUT ACTIVO, returns rows", async () => {
    const ora904 = Object.assign(new Error("ORA-00904"), { errorNum: 904 });
    const fallbackRows = [{ ID_ARTICULO: 1, DESCRIPCION: "Silla" }];

    mockExecute
      .mockRejectedValueOnce(ora904)
      .mockResolvedValueOnce({ rows: fallbackRows });

    const result = await findAll();

    expect(result).toEqual(fallbackRows);
    expect(mockExecute).toHaveBeenCalledTimes(2);
    // Second call must NOT include ACTIVO
    const fallbackSql = mockExecute.mock.calls[1][0];
    expect(fallbackSql).not.toMatch(/ACTIVO/i);
  });

  it("fallback when message contains ORA-00904 (no errorNum) → uses fallback query", async () => {
    const msgErr = new Error("ORA-00904: invalid identifier");
    const fallbackRows = [{ ID_ARTICULO: 2, DESCRIPCION: "Crutch" }];

    mockExecute
      .mockRejectedValueOnce(msgErr)
      .mockResolvedValueOnce({ rows: fallbackRows });

    const result = await findAll();

    expect(result).toEqual(fallbackRows);
    expect(mockExecute).toHaveBeenCalledTimes(2);
  });

  it("re-throws error that is NOT ORA-00904 (e.g., errorNum 942)", async () => {
    const dbErr = Object.assign(new Error("ORA-00942: table not found"), {
      errorNum: 942,
    });

    mockExecute.mockRejectedValueOnce(dbErr);

    await expect(findAll()).rejects.toThrow("ORA-00942");
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it("error sin message ni errorNum → ?? '' branch en isInvalidIdentifierError (L4)", async () => {
    // err sin message → err?.message = undefined → ?? "" → string("") → no ORA-00904 → rethrows
    const errSinMsg = { errorNum: undefined }; // no es Error → err?.message undefined
    Object.setPrototypeOf(errSinMsg, null); // sin prototipo

    mockExecute.mockRejectedValueOnce(errSinMsg);

    await expect(findAll()).rejects.toBe(errSinMsg);
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });
});

// ─── findById ───────────────────────────────────────────────────────────────

describe("findById", () => {
  it("fallback when errorNum === 904 → uses fallback query, returns the row", async () => {
    const ora904 = Object.assign(new Error("ORA-00904"), { errorNum: 904 });
    const row = { ID_ARTICULO: 5, DESCRIPCION: "Baston" };

    mockExecute
      .mockRejectedValueOnce(ora904)
      .mockResolvedValueOnce({ rows: [row] });

    const result = await findById(5);

    expect(result).toEqual(row);
    expect(mockExecute).toHaveBeenCalledTimes(2);
    const fallbackSql = mockExecute.mock.calls[1][0];
    expect(fallbackSql).not.toMatch(/ACTIVO/i);
  });

  it("fallback returns null when fallback query returns empty rows (rows[0] ?? null)", async () => {
    const ora904 = Object.assign(new Error("ORA-00904"), { errorNum: 904 });

    mockExecute
      .mockRejectedValueOnce(ora904)
      .mockResolvedValueOnce({ rows: [] });

    const result = await findById(999);

    expect(result).toBeNull();
    expect(mockExecute).toHaveBeenCalledTimes(2);
  });

  it("re-throws error that is NOT ORA-00904", async () => {
    const dbErr = Object.assign(new Error("ORA-01031: insufficient privileges"), {
      errorNum: 1031,
    });

    mockExecute.mockRejectedValueOnce(dbErr);

    await expect(findById(1)).rejects.toThrow("ORA-01031");
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });
});

// ─── create ─────────────────────────────────────────────────────────────────

describe("create", () => {
  const data = {
    descripcion: "Silla", unidad: "PZA.", cuotaRecuperacion: 0,
    inventarioActual: 0, manejaInventario: "S", idCategoria: 1, stockMinimo: 5,
  };

  it("returns scalar ID when outBinds.newId is an array (RETURNING INTO normal form)", async () => {
    mockExecute.mockResolvedValueOnce({ outBinds: { newId: [999] } });

    const result = await create(data);

    expect(result).toBe(999);
    expect(mockExecute).toHaveBeenCalledTimes(1);
    const [sql] = mockExecute.mock.calls[0];
    expect(sql).toMatch(/RETURNING ID_ARTICULO INTO :newId/i);
  });

  it("returns scalar ID when outBinds.newId is already a number (non-array branch)", async () => {
    mockExecute.mockResolvedValueOnce({ outBinds: { newId: 888 } });

    const result = await create(data);

    expect(result).toBe(888);
  });
});

// ─── deleteById ─────────────────────────────────────────────────────────────

describe("deleteById", () => {
  it("fallback DELETE when UPDATE ACTIVO fails with ORA-00904", async () => {
    const ora904 = Object.assign(new Error("ORA-00904"), { errorNum: 904 });

    mockExecute
      .mockRejectedValueOnce(ora904)
      .mockResolvedValueOnce(undefined);

    await deleteById(7);

    expect(mockExecute).toHaveBeenCalledTimes(2);
    const deleteSql = mockExecute.mock.calls[1][0];
    expect(deleteSql).toMatch(/DELETE FROM ARTICULOS/i);
  });

  it("re-throws non-ORA-00904 error", async () => {
    const dbErr = Object.assign(new Error("ORA-01403: no data found"), {
      errorNum: 1403,
    });

    mockExecute.mockRejectedValueOnce(dbErr);

    await expect(deleteById(7)).rejects.toThrow("ORA-01403");
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });
});

// ─── update ─────────────────────────────────────────────────────────────────

describe("update", () => {
  it("returns undefined without calling execute when data is empty (setClause.length === 0)", async () => {
    // Only idArticulo, which gets destructured out
    const result = await update(1, { idArticulo: 1 });

    expect(result).toBeUndefined();
    expect(mockExecute).not.toHaveBeenCalled();
    // withConnection still calls mockClose in finally
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it("logs console.warn and returns undefined when all fields are unknown", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    const result = await update(1, { campoDesconocido: "foo", otroDesconocido: "bar" });

    expect(result).toBeUndefined();
    expect(mockExecute).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenCalledWith(
      "Campo desconocido en update: campoDesconocido"
    );
    expect(warnSpy).toHaveBeenCalledWith(
      "Campo desconocido en update: otroDesconocido"
    );

    warnSpy.mockRestore();
  });

  it("filters null/undefined values — only updates fields with real values", async () => {
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    await update(3, {
      descripcion: "Nueva desc",
      unidad: null,
      cuotaRecuperacion: undefined,
      stockMinimo: 5,
    });

    expect(mockExecute).toHaveBeenCalledTimes(1);
    const [sql, binds] = mockExecute.mock.calls[0];
    // Only descripcion and stockMinimo should appear in SET clause
    expect(sql).toMatch(/DESCRIPCION = :descripcion/);
    expect(sql).toMatch(/STOCK_MINIMO = :stockMinimo/);
    expect(sql).not.toMatch(/UNIDAD/);
    expect(sql).not.toMatch(/CUOTA_RECUPERACION/);
    // Bind params spread all updateData (including nulls) plus id
    expect(binds).toMatchObject({ descripcion: "Nueva desc", stockMinimo: 5, id: 3 });
  });
});
