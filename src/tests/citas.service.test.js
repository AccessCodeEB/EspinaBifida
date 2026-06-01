import { jest } from "@jest/globals";

// ─── Mocks del modelo ─────────────────────────────────────────────────────────
const mockFindAll    = jest.fn();
const mockFindById   = jest.fn();
const mockCreate     = jest.fn();
const mockUpdate     = jest.fn();
const mockRemove     = jest.fn();
const mockCountCitas = jest.fn();

jest.unstable_mockModule("../models/citas.model.js", () => ({
  findAll:           jest.fn(),
  findById:          mockFindById,
  countCitasByCurp:  mockCountCitas,
  create:            mockCreate,
  update:            mockUpdate,
  remove:            mockRemove,
  deleteE2ECitas:    jest.fn(),
}));

// Importaciones después de los mocks (ESM)
const Service = await import("../services/citas.service.js");

const CURP = "GAEJ900101HMNRRL09";

const citaBase = {
  ID_CITA: 1, CURP, ID_TIPO_SERVICIO: 1,
  ESPECIALISTA: "Dr. Test", FECHA: new Date("2026-06-01"),
  ESTATUS: "PROGRAMADA", NOTAS: null, COSTO: 350,
};

beforeEach(() => jest.clearAllMocks());

// ═══════════════════════════════════════════════════════════════════════════════
// Constantes exportadas
// ═══════════════════════════════════════════════════════════════════════════════

describe("constantes de costo", () => {
  test("COSTO_PRIMERA_CITA = 350", () => {
    expect(Service.COSTO_PRIMERA_CITA).toBe(350);
  });
  test("COSTO_SUBSECUENTE_CITA = 300", () => {
    expect(Service.COSTO_SUBSECUENTE_CITA).toBe(300);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// createCita — detección automática de costo
// ═══════════════════════════════════════════════════════════════════════════════

describe("createCita — costo auto-detectado", () => {
  const payload = {
    curp: CURP,
    idTipoServicio: 1,
    fecha: "2026-06-10",
    hora: "10:00",
  };

  test("sin citas previas → costo $350 (primera cita)", async () => {
    mockCountCitas.mockResolvedValue(0);
    mockCreate.mockResolvedValue({ rowsAffected: 1 });

    await Service.createCita(payload);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ costo: 350 })
    );
  });

  test("con citas previas → costo $300 (subsecuente)", async () => {
    mockCountCitas.mockResolvedValue(3);
    mockCreate.mockResolvedValue({ rowsAffected: 1 });

    await Service.createCita(payload);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ costo: 300 })
    );
  });

  test("costo explícito en payload → respeta el override", async () => {
    mockCountCitas.mockResolvedValue(0);
    mockCreate.mockResolvedValue({ rowsAffected: 1 });

    await Service.createCita({ ...payload, costo: 0 });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ costo: 0 })
    );
    // countCitasByCurp NO debe llamarse cuando hay override
    expect(mockCountCitas).not.toHaveBeenCalled();
  });

  test("costo negativo → BAD_REQUEST", async () => {
    await expect(
      Service.createCita({ ...payload, costo: -50 })
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// createCita — validaciones existentes
// ═══════════════════════════════════════════════════════════════════════════════

describe("createCita — validaciones", () => {
  test("sin curp → BAD_REQUEST", async () => {
    await expect(
      Service.createCita({ idTipoServicio: 1, fecha: "2026-06-01", hora: "09:00" })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test("sin idTipoServicio → BAD_REQUEST", async () => {
    await expect(
      Service.createCita({ curp: CURP, fecha: "2026-06-01", hora: "09:00" })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test("estatus inválido → BAD_REQUEST", async () => {
    mockCountCitas.mockResolvedValue(0);
    await expect(
      Service.createCita({ curp: CURP, idTipoServicio: 1, fecha: "2026-06-01", hora: "09:00", estatus: "INVALIDO" })
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getCitaById — notFound
// ═══════════════════════════════════════════════════════════════════════════════

describe("getCitaById", () => {
  test("cita no encontrada → notFound", async () => {
    mockFindById.mockResolvedValue(undefined);
    await expect(Service.getCitaById(999)).rejects.toMatchObject({ statusCode: 404 });
  });

  test("cita encontrada → retorna row", async () => {
    mockFindById.mockResolvedValue(citaBase);
    const result = await Service.getCitaById(1);
    expect(result).toEqual(citaBase);
  });
});
