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

// Mock de validación de horario para no depender de la DB en tests de citas
const mockValidarSlot = jest.fn().mockResolvedValue(undefined); // por defecto: sin error
jest.unstable_mockModule("../services/especialidades-horario.service.js", () => ({
  validarSlotEspecialidad: mockValidarSlot,
  esFechaValida:           jest.fn().mockReturnValue(true),
  esDentroDeHorario:       jest.fn().mockReturnValue(true),
  getEspecialidadesHorario: jest.fn().mockResolvedValue([]),
  getEspecialidadById:     jest.fn(),
  getEspecialidadByNombre: jest.fn(),
  updateEspecialidad:      jest.fn(),
  getExcepciones:          jest.fn(),
  createExcepcion:         jest.fn(),
  deleteExcepcion:         jest.fn(),
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

// ═══════════════════════════════════════════════════════════════════════════════
// createCita — bloqueo por horario de especialidad
// ═══════════════════════════════════════════════════════════════════════════════

describe("createCita — validación de horario de especialidad", () => {
  const basePayload = {
    curp: CURP,
    idTipoServicio: 1,
    fecha: "2026-06-12",
    hora: "10:00",
    especialista: "Psicología",
  };

  beforeEach(() => {
    mockValidarSlot.mockResolvedValue(undefined); // Sin error por defecto
    mockCountCitas.mockResolvedValue(0);
    mockCreate.mockResolvedValue({ rowsAffected: 1 });
  });

  test("especialidad con horario válido → crea la cita", async () => {
    await Service.createCita(basePayload);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  test("validarSlotEspecialidad es llamado con nombre, fecha y hora", async () => {
    await Service.createCita(basePayload);
    expect(mockValidarSlot).toHaveBeenCalledWith("Psicología", "2026-06-12", "10:00");
  });

  test("día no permitido → BAD_REQUEST 400 (bloqueo duro)", async () => {
    mockValidarSlot.mockRejectedValue({ statusCode: 400, message: "Psicología solo atiende los viernes", code: "DIA_NO_PERMITIDO" });
    await expect(Service.createCita(basePayload)).rejects.toMatchObject({ statusCode: 400, code: "DIA_NO_PERMITIDO" });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  test("horario fuera de rango → BAD_REQUEST 400", async () => {
    mockValidarSlot.mockRejectedValue({ statusCode: 400, message: "Horario fuera de rango", code: "HORARIO_NO_PERMITIDO" });
    await expect(Service.createCita(basePayload)).rejects.toMatchObject({ statusCode: 400, code: "HORARIO_NO_PERMITIDO" });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  test("fecha bloqueada por excepción → BAD_REQUEST 400", async () => {
    mockValidarSlot.mockRejectedValue({ statusCode: 400, message: "Psicología no atiende ese día", code: "FECHA_BLOQUEADA" });
    await expect(Service.createCita(basePayload)).rejects.toMatchObject({ statusCode: 400, code: "FECHA_BLOQUEADA" });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  test("capacidad llena → BAD_REQUEST 400", async () => {
    mockValidarSlot.mockRejectedValue({ statusCode: 400, message: "Capacidad máxima alcanzada", code: "CAPACIDAD_LLENA" });
    await expect(Service.createCita(basePayload)).rejects.toMatchObject({ statusCode: 400, code: "CAPACIDAD_LLENA" });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  test("sin especialista (null) → validarSlot llamado con null y no bloquea", async () => {
    mockValidarSlot.mockResolvedValue(undefined);
    await Service.createCita({ ...basePayload, especialista: undefined });
    expect(mockValidarSlot).toHaveBeenCalledWith(null, "2026-06-12", "10:00");
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Regresión ISSUE-003: updateCita debe re-validar slot al cambiar fecha/hora/especialista
// ═══════════════════════════════════════════════════════════════════════════════

describe("regression ISSUE-003 — updateCita re-valida slot al editar cita", () => {
  beforeEach(() => {
    mockFindById.mockResolvedValue(citaBase);
    mockUpdate.mockResolvedValue({ rowsAffected: 1 });
    mockValidarSlot.mockResolvedValue(undefined);
  });

  test("PATCH con nueva fecha → llama validarSlotEspecialidad", async () => {
    await Service.updateCita(1, { fecha: "2026-06-19", hora: "10:00" });
    expect(mockValidarSlot).toHaveBeenCalledTimes(1);
    expect(mockValidarSlot).toHaveBeenCalledWith(
      citaBase.ESPECIALISTA, "2026-06-19", "10:00"
    );
  });

  test("PATCH con nuevo especialista → llama validarSlotEspecialidad", async () => {
    await Service.updateCita(1, { especialista: "Psicología" });
    expect(mockValidarSlot).toHaveBeenCalledTimes(1);
  });

  test("PATCH sin cambios de horario (solo estatus) → NO llama validarSlotEspecialidad", async () => {
    await Service.updateCita(1, { estatus: "CONFIRMADA" });
    expect(mockValidarSlot).not.toHaveBeenCalled();
  });

  test("PATCH con fecha bloqueada → lanza error y NO actualiza la cita", async () => {
    mockValidarSlot.mockRejectedValue({ statusCode: 400, code: "FECHA_BLOQUEADA" });
    await expect(Service.updateCita(1, { fecha: "2026-06-19", hora: "10:00" }))
      .rejects.toMatchObject({ statusCode: 400, code: "FECHA_BLOQUEADA" });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  test("cita inexistente en PATCH → 404 sin llamar validarSlot", async () => {
    mockFindById.mockResolvedValue(undefined);
    await expect(Service.updateCita(999, { fecha: "2026-06-19" }))
      .rejects.toMatchObject({ statusCode: 404 });
    expect(mockValidarSlot).not.toHaveBeenCalled();
  });
});
