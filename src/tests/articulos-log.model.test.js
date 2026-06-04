import { jest } from "@jest/globals";
import { mockExecute, mockClose, mockCommit, dbModuleMock, resetMocks } from "./helpers/mockDb.js";

jest.unstable_mockModule("../config/db.js", () => dbModuleMock);

const Model = await import("../models/articulos-log.model.js");

beforeEach(() => resetMocks());

describe("articulos-log.model — findAll", () => {
  it("retorna lista vacía cuando no hay registros", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const result = await Model.findAll();

    expect(result).toEqual([]);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it("retorna registros mapeados a camelCase", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [
        {
          ID_LOG: 1,
          ID_ARTICULO: 5,
          DESCRIPCION_ARTICULO: "Silla de Ruedas",
          TIPO: "ALTA",
          MOTIVO: "Donación",
          FECHA: "2026-01-01",
        },
      ],
    });

    const result = await Model.findAll();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ idLog: 1, tipo: "ALTA", motivo: "Donación" });
  });

  it("filtra por tipo cuando se pasa como parámetro", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const result = await Model.findAll({ tipo: "BAJA" });

    expect(result).toEqual([]);
    const [sql] = mockExecute.mock.calls[0];
    expect(sql).toMatch(/TIPO/);
  });

  it("filtra por dias cuando se pasa como parámetro", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    await Model.findAll({ dias: 30 });

    const [sql] = mockExecute.mock.calls[0];
    expect(sql).toMatch(/FECHA/);
  });
});

describe("articulos-log.model — create", () => {
  it("inserta un registro de ALTA correctamente", async () => {
    mockExecute.mockResolvedValueOnce({});

    await Model.create({
      idArticulo: 3,
      descripcionArticulo: "Catéter",
      tipo: "ALTA",
      motivo: "Compra mensual",
    });

    expect(mockExecute).toHaveBeenCalledTimes(1);
    const [, binds] = mockExecute.mock.calls[0];
    expect(binds.tipo).toBe("ALTA");
    expect(binds.motivo).toBe("Compra mensual");
  });

  it("inserta un registro de BAJA con idArticulo nulo", async () => {
    mockExecute.mockResolvedValueOnce({});

    await Model.create({
      idArticulo: null,
      descripcionArticulo: "Artículo eliminado",
      tipo: "BAJA",
      motivo: null,
    });

    const [, binds] = mockExecute.mock.calls[0];
    expect(binds.idArticulo).toBeNull();
    expect(binds.tipo).toBe("BAJA");
  });
});
