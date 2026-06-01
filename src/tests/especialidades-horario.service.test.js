import { jest } from "@jest/globals";

// ─── Mocks del modelo ─────────────────────────────────────────────────────────
const mockFindAll             = jest.fn();
const mockFindById            = jest.fn();
const mockFindByNombre        = jest.fn();
const mockUpdate              = jest.fn();
const mockCountCitasActivas   = jest.fn();
const mockFindExcepciones     = jest.fn();
const mockFindExcepcionByFecha = jest.fn();
const mockCreateExcepcion     = jest.fn();
const mockDeleteExcepcion     = jest.fn();

jest.unstable_mockModule("../models/especialidades-horario.model.js", () => ({
  findAll:                  mockFindAll,
  findById:                 mockFindById,
  findByNombre:             mockFindByNombre,
  update:                   mockUpdate,
  countCitasActivasPorFecha: mockCountCitasActivas,
  findExcepciones:          mockFindExcepciones,
  findExcepcionByFecha:     mockFindExcepcionByFecha,
  createExcepcion:          mockCreateExcepcion,
  deleteExcepcion:          mockDeleteExcepcion,
}));

const Svc = await import("../services/especialidades-horario.service.js");

const ESP_PSICOLOGIA = {
  ID_ESPECIALIDAD: 3,
  NOMBRE: "Psicología",
  DIA_SEMANA: 5,           // Viernes
  HORA_INICIO: "10:00",
  HORA_FIN: "12:00",
  CAPACIDAD_MAX: 3,
  TIPO_FRECUENCIA: "SEMANAL",
  ACTIVO: 1,
  NOTAS: null,
};

const ESP_CIRUGIA = {
  ID_ESPECIALIDAD: 4,
  NOMBRE: "Cirugía",
  DIA_SEMANA: 3,           // Miércoles
  HORA_INICIO: "08:00",
  HORA_FIN: null,
  CAPACIDAD_MAX: null,
  TIPO_FRECUENCIA: "MENSUAL_PRIMER_DIA",
  ACTIVO: 1,
  NOTAS: "Dr. Lines",
};

beforeEach(() => jest.clearAllMocks());

// ═══════════════════════════════════════════════════════════════════════════════
// esFechaValida
// ═══════════════════════════════════════════════════════════════════════════════

describe("esFechaValida", () => {
  test("SEMANAL: viernes 2026-06-05 → válido para Psicología (dia 5)", () => {
    const fecha = new Date(2026, 5, 5); // 5 jun 2026 = viernes
    expect(Svc.esFechaValida(ESP_PSICOLOGIA, fecha)).toBe(true);
  });

  test("SEMANAL: jueves 2026-06-04 → inválido para Psicología", () => {
    const fecha = new Date(2026, 5, 4); // 4 jun 2026 = jueves
    expect(Svc.esFechaValida(ESP_PSICOLOGIA, fecha)).toBe(false);
  });

  test("MENSUAL_PRIMER_DIA: primer miércoles del mes (2026-06-03) → válido para Cirugía", () => {
    const fecha = new Date(2026, 5, 3); // 3 jun 2026 = miércoles, día 3 (<=7)
    expect(Svc.esFechaValida(ESP_CIRUGIA, fecha)).toBe(true);
  });

  test("MENSUAL_PRIMER_DIA: segundo miércoles del mes (2026-06-10) → inválido para Cirugía", () => {
    const fecha = new Date(2026, 5, 10); // 10 jun 2026 = miércoles, pero día 10 (>7)
    expect(Svc.esFechaValida(ESP_CIRUGIA, fecha)).toBe(false);
  });

  test("MENSUAL_PRIMER_DIA: viernes (2026-06-05) → inválido para Cirugía (día semana incorrecto)", () => {
    const fecha = new Date(2026, 5, 5); // viernes
    expect(Svc.esFechaValida(ESP_CIRUGIA, fecha)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// esDentroDeHorario
// ═══════════════════════════════════════════════════════════════════════════════

describe("esDentroDeHorario", () => {
  test("10:00 dentro de 10:00-12:00 → válido", () => {
    expect(Svc.esDentroDeHorario(ESP_PSICOLOGIA, "10:00")).toBe(true);
  });

  test("11:30 dentro de 10:00-12:00 → válido", () => {
    expect(Svc.esDentroDeHorario(ESP_PSICOLOGIA, "11:30")).toBe(true);
  });

  test("12:00 en el límite de 10:00-12:00 → válido (límite incluido)", () => {
    expect(Svc.esDentroDeHorario(ESP_PSICOLOGIA, "12:00")).toBe(true);
  });

  test("09:30 antes de 10:00 → inválido", () => {
    expect(Svc.esDentroDeHorario(ESP_PSICOLOGIA, "09:30")).toBe(false);
  });

  test("12:30 después de 12:00 → inválido", () => {
    expect(Svc.esDentroDeHorario(ESP_PSICOLOGIA, "12:30")).toBe(false);
  });

  test("sin hora fin (Cirugía): 08:00 >= 08:00 → válido", () => {
    expect(Svc.esDentroDeHorario(ESP_CIRUGIA, "08:00")).toBe(true);
  });

  test("sin hora fin (Cirugía): 17:00 → válido (sin límite superior)", () => {
    expect(Svc.esDentroDeHorario(ESP_CIRUGIA, "17:00")).toBe(true);
  });

  test("sin hora fin (Cirugía): 07:30 < 08:00 → inválido", () => {
    expect(Svc.esDentroDeHorario(ESP_CIRUGIA, "07:30")).toBe(false);
  });

  test("hora vacía → inválido", () => {
    expect(Svc.esDentroDeHorario(ESP_PSICOLOGIA, "")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// validarSlotEspecialidad
// ═══════════════════════════════════════════════════════════════════════════════

describe("validarSlotEspecialidad", () => {
  test("sin especialista (null) → no valida nada, no lanza", async () => {
    await expect(Svc.validarSlotEspecialidad(null, "2026-06-05", "10:00")).resolves.toBeUndefined();
    expect(mockFindByNombre).not.toHaveBeenCalled();
  });

  test("especialidad no registrada en BD → no lanza (libre)", async () => {
    mockFindByNombre.mockResolvedValue(null);
    await expect(Svc.validarSlotEspecialidad("Fonoaudiología", "2026-06-05", "10:00")).resolves.toBeUndefined();
  });

  test("especialidad inactiva → 400 ESPECIALIDAD_INACTIVA", async () => {
    mockFindByNombre.mockResolvedValue({ ...ESP_PSICOLOGIA, ACTIVO: 0 });
    await expect(
      Svc.validarSlotEspecialidad("Psicología", "2026-06-05", "10:00")
    ).rejects.toMatchObject({ statusCode: 400, code: "ESPECIALIDAD_INACTIVA" });
  });

  test("día incorrecto → 400 DIA_NO_PERMITIDO (Psicología en jueves)", async () => {
    mockFindByNombre.mockResolvedValue(ESP_PSICOLOGIA);
    // 2026-06-04 = jueves, Psicología es viernes
    await expect(
      Svc.validarSlotEspecialidad("Psicología", "2026-06-04", "10:00")
    ).rejects.toMatchObject({ statusCode: 400, code: "DIA_NO_PERMITIDO" });
  });

  test("horario fuera de rango → 400 HORARIO_NO_PERMITIDO", async () => {
    mockFindByNombre.mockResolvedValue(ESP_PSICOLOGIA);
    mockFindExcepcionByFecha.mockResolvedValue(null);
    mockCountCitasActivas.mockResolvedValue(0);
    // 2026-06-05 = viernes (correcto), pero hora 09:00 < 10:00
    await expect(
      Svc.validarSlotEspecialidad("Psicología", "2026-06-05", "09:00")
    ).rejects.toMatchObject({ statusCode: 400, code: "HORARIO_NO_PERMITIDO" });
  });

  test("fecha bloqueada por excepción → 400 FECHA_BLOQUEADA", async () => {
    mockFindByNombre.mockResolvedValue(ESP_PSICOLOGIA);
    mockFindExcepcionByFecha.mockResolvedValue({ ID_EXCEPCION: 1, MOTIVO: "Vacaciones" });
    // 2026-06-05 = viernes, hora válida
    await expect(
      Svc.validarSlotEspecialidad("Psicología", "2026-06-05", "10:00")
    ).rejects.toMatchObject({ statusCode: 400, code: "FECHA_BLOQUEADA" });
  });

  test("capacidad llena (3/3) → 400 CAPACIDAD_LLENA", async () => {
    mockFindByNombre.mockResolvedValue(ESP_PSICOLOGIA);
    mockFindExcepcionByFecha.mockResolvedValue(null);
    mockCountCitasActivas.mockResolvedValue(3); // ya llenas las 3 plazas
    await expect(
      Svc.validarSlotEspecialidad("Psicología", "2026-06-05", "10:00")
    ).rejects.toMatchObject({ statusCode: 400, code: "CAPACIDAD_LLENA" });
  });

  test("capacidad parcial (2/3) → válido", async () => {
    mockFindByNombre.mockResolvedValue(ESP_PSICOLOGIA);
    mockFindExcepcionByFecha.mockResolvedValue(null);
    mockCountCitasActivas.mockResolvedValue(2);
    await expect(
      Svc.validarSlotEspecialidad("Psicología", "2026-06-05", "10:00")
    ).resolves.toBeUndefined();
  });

  test("Cirugía en primer miércoles del mes → válido", async () => {
    mockFindByNombre.mockResolvedValue(ESP_CIRUGIA);
    mockFindExcepcionByFecha.mockResolvedValue(null);
    mockCountCitasActivas.mockResolvedValue(0);
    // 2026-06-03 = miércoles y día 3 (primer miércoles de junio 2026)
    await expect(
      Svc.validarSlotEspecialidad("Cirugía", "2026-06-03", "09:00")
    ).resolves.toBeUndefined();
  });

  test("Cirugía en segundo miércoles → 400 DIA_NO_PERMITIDO", async () => {
    mockFindByNombre.mockResolvedValue(ESP_CIRUGIA);
    // 2026-06-10 = miércoles pero día 10 (segundo miércoles)
    await expect(
      Svc.validarSlotEspecialidad("Cirugía", "2026-06-10", "09:00")
    ).rejects.toMatchObject({ statusCode: 400, code: "DIA_NO_PERMITIDO" });
  });

  test("Cirugía sin capacidad definida → no valida capacidad", async () => {
    mockFindByNombre.mockResolvedValue(ESP_CIRUGIA);
    mockFindExcepcionByFecha.mockResolvedValue(null);
    // countCitasActivas NO debe llamarse cuando CAPACIDAD_MAX es null
    await expect(
      Svc.validarSlotEspecialidad("Cirugía", "2026-06-03", "09:00")
    ).resolves.toBeUndefined();
    expect(mockCountCitasActivas).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Regresión ISSUE-001: updateEspecialidad debe persistir diaSemana correctamente
// ═══════════════════════════════════════════════════════════════════════════════

describe("regression ISSUE-001 — updateEspecialidad persiste diaSemana", () => {
  test("PATCH con diaSemana=1 debe llamar model.update con diaSemana=1 (no undefined)", async () => {
    mockFindById.mockResolvedValue(ESP_PSICOLOGIA);
    mockUpdate.mockResolvedValue(undefined);
    // Simular que findById después del update devuelve el objeto actualizado
    mockFindById.mockResolvedValueOnce(ESP_PSICOLOGIA).mockResolvedValueOnce({
      ...ESP_PSICOLOGIA, DIA_SEMANA: 1,
    });

    await Svc.updateEspecialidad(3, { diaSemana: 1 });

    // El primer argumento de la segunda llamada a update debe incluir diaSemana=1
    const [, payload] = mockUpdate.mock.calls[0];
    expect(payload.diaSemana).toBe(1);
  });

  test("PATCH sin diaSemana no debe pasar undefined al model (sino undefined/null controlado)", async () => {
    mockFindById.mockResolvedValue(ESP_PSICOLOGIA);
    mockUpdate.mockResolvedValue(undefined);
    mockFindById.mockResolvedValueOnce(ESP_PSICOLOGIA).mockResolvedValueOnce(ESP_PSICOLOGIA);

    await Svc.updateEspecialidad(3, { notas: "nueva nota" });

    const [, payload] = mockUpdate.mock.calls[0];
    // diaSemana debe llegar como undefined (NVL en Oracle mantendrá el valor actual)
    expect(payload.diaSemana).toBeUndefined();
  });
});
