import { jest } from "@jest/globals";
import {
  mockExecute, mockClose, mockCommit,
  dbModuleMock, resetMocks,
} from "./helpers/mockDb.js";

const mockGetConnection = jest.fn();

jest.unstable_mockModule("../config/db.js", () => ({
  ...dbModuleMock,
  getConnection: mockGetConnection,
}));

const { registrar } = await import("../models/auditoria.model.js");

beforeEach(() => {
  resetMocks();
  mockGetConnection.mockResolvedValue({
    execute: mockExecute,
    commit:  mockCommit,
    close:   mockClose,
  });
});

describe("registrar", () => {
  it("inserta registro con todos los parámetros y hace commit", async () => {
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    await registrar(1, "BAJA_LOGICA", "BENEFICIARIO", "GOCL900101HDFNRN09", { estatus: "Baja" });

    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO AUDITORIA_OPERACIONES"),
      expect.objectContaining({
        idAdmin:   1,
        operacion: "BAJA_LOGICA",
        entidad:   "BENEFICIARIO",
        entidadId: "GOCL900101HDFNRN09",
        detalle:   JSON.stringify({ estatus: "Baja" }),
      })
    );
    expect(mockCommit).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });

  it("convierte entidadId numérico a string", async () => {
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    await registrar(1, "DESACTIVAR_ADMIN", "ADMINISTRADOR", 42);

    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ entidadId: "42" })
    );
  });

  it("acepta parámetros opcionales sin especificar (null por defecto)", async () => {
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    await registrar(2, "ELIMINACION_PERMANENTE");

    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ entidad: null, entidadId: null, detalle: null })
    );
  });

  it("cierra la conexión y re-lanza el error si execute falla", async () => {
    mockExecute.mockRejectedValueOnce(new Error("ORA-00942: table does not exist"));

    await expect(
      registrar(1, "BAJA_LOGICA", "BENEFICIARIO", "CURP123")
    ).rejects.toThrow("ORA-00942");

    expect(mockClose).toHaveBeenCalled();
  });

  it("no intenta cerrar si getConnection lanza error", async () => {
    mockGetConnection.mockRejectedValueOnce(new Error("pool exhausted"));

    await expect(
      registrar(1, "BAJA_LOGICA")
    ).rejects.toThrow("pool exhausted");

    expect(mockClose).not.toHaveBeenCalled();
  });
});
