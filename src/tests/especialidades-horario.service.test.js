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

// ═══════════════════════════════════════════════════════════════════════════════
// esFechaValida — rama faltante: tipo desconocido
// ═══════════════════════════════════════════════════════════════════════════════

describe("esFechaValida — tipo desconocido", () => {
  test("TIPO_FRECUENCIA desconocido → false", () => {
    expect(Svc.esFechaValida({ TIPO_FRECUENCIA: "QUINCENAL", DIA_SEMANA: 5 }, new Date(2026, 5, 5))).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getEspecialidadesHorario
// ═══════════════════════════════════════════════════════════════════════════════

describe("getEspecialidadesHorario", () => {
  test("retorna lista mapeada con soloActivos=true por defecto", async () => {
    mockFindAll.mockResolvedValue([ESP_PSICOLOGIA]);
    const result = await Svc.getEspecialidadesHorario();
    expect(mockFindAll).toHaveBeenCalledWith({ soloActivos: true });
    expect(result[0]).toMatchObject({ idEspecialidad: 3, nombre: "Psicología", activo: true });
  });

  test("soloActivos=false pasa al modelo", async () => {
    mockFindAll.mockResolvedValue([{ ...ESP_PSICOLOGIA, ACTIVO: 0 }]);
    const result = await Svc.getEspecialidadesHorario({ soloActivos: false });
    expect(result[0].activo).toBe(false);
  });

  test("HORA_FIN null → horaFin null en resultado", async () => {
    mockFindAll.mockResolvedValue([ESP_CIRUGIA]);
    const [r] = await Svc.getEspecialidadesHorario();
    expect(r.horaFin).toBeNull();
  });

  test("CAPACIDAD_MAX null → capacidadMax null en resultado", async () => {
    mockFindAll.mockResolvedValue([ESP_CIRUGIA]);
    const [r] = await Svc.getEspecialidadesHorario();
    expect(r.capacidadMax).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getEspecialidadById
// ═══════════════════════════════════════════════════════════════════════════════

describe("getEspecialidadById", () => {
  test("encontrada → retorna objeto mapeado", async () => {
    mockFindById.mockResolvedValue(ESP_PSICOLOGIA);
    const r = await Svc.getEspecialidadById(3);
    expect(r.nombre).toBe("Psicología");
    expect(r.idEspecialidad).toBe(3);
  });

  test("no encontrada → lanza 404", async () => {
    mockFindById.mockResolvedValue(null);
    await expect(Svc.getEspecialidadById(999)).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getEspecialidadByNombre
// ═══════════════════════════════════════════════════════════════════════════════

describe("getEspecialidadByNombre", () => {
  test("delega al modelo y retorna la fila", async () => {
    mockFindByNombre.mockResolvedValue(ESP_PSICOLOGIA);
    const r = await Svc.getEspecialidadByNombre("Psicología");
    expect(mockFindByNombre).toHaveBeenCalledWith("Psicología");
    expect(r).toBe(ESP_PSICOLOGIA);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// updateEspecialidad — validaciones
// ═══════════════════════════════════════════════════════════════════════════════

describe("updateEspecialidad — validaciones y ramas", () => {
  test("especialidad no encontrada → lanza 404", async () => {
    mockFindById.mockResolvedValue(null);
    await expect(Svc.updateEspecialidad(999, {})).rejects.toMatchObject({ statusCode: 404 });
  });

  test("horaInicio con formato inválido → lanza 400", async () => {
    mockFindById.mockResolvedValue(ESP_PSICOLOGIA);
    await expect(Svc.updateEspecialidad(3, { horaInicio: "10h00" })).rejects.toMatchObject({ statusCode: 400 });
  });

  test("horaFin con formato inválido → lanza 400", async () => {
    mockFindById.mockResolvedValue(ESP_PSICOLOGIA);
    await expect(Svc.updateEspecialidad(3, { horaFin: "12h00" })).rejects.toMatchObject({ statusCode: 400 });
  });

  test("horaFin = null es válido (sin límite superior)", async () => {
    mockFindById.mockResolvedValueOnce(ESP_PSICOLOGIA).mockResolvedValueOnce(ESP_PSICOLOGIA);
    mockUpdate.mockResolvedValue(undefined);
    await expect(Svc.updateEspecialidad(3, { horaFin: null })).resolves.toBeDefined();
  });

  test("tipoFrecuencia inválido → lanza 400", async () => {
    mockFindById.mockResolvedValue(ESP_PSICOLOGIA);
    await expect(Svc.updateEspecialidad(3, { tipoFrecuencia: "DIARIO" })).rejects.toMatchObject({ statusCode: 400 });
  });

  test("tipoFrecuencia MENSUAL_PRIMER_DIA es válido", async () => {
    mockFindById.mockResolvedValueOnce(ESP_PSICOLOGIA).mockResolvedValueOnce(ESP_PSICOLOGIA);
    mockUpdate.mockResolvedValue(undefined);
    await expect(Svc.updateEspecialidad(3, { tipoFrecuencia: "MENSUAL_PRIMER_DIA" })).resolves.toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getExcepciones
// ═══════════════════════════════════════════════════════════════════════════════

describe("getExcepciones", () => {
  test("especialidad no encontrada → lanza 404", async () => {
    mockFindById.mockResolvedValue(null);
    await expect(Svc.getExcepciones(999)).rejects.toMatchObject({ statusCode: 404 });
  });

  test("retorna lista mapeada con motivo", async () => {
    mockFindById.mockResolvedValue(ESP_PSICOLOGIA);
    mockFindExcepciones.mockResolvedValue([
      { ID_EXCEPCION: 1, ID_ESPECIALIDAD: 3, FECHA: "2026-07-03", MOTIVO: "Congreso", CREATED_AT: "2026-06-01" },
    ]);
    const result = await Svc.getExcepciones(3);
    expect(result[0]).toMatchObject({ idExcepcion: 1, fecha: "2026-07-03", motivo: "Congreso" });
  });

  test("MOTIVO null → motivo null en resultado", async () => {
    mockFindById.mockResolvedValue(ESP_PSICOLOGIA);
    mockFindExcepciones.mockResolvedValue([
      { ID_EXCEPCION: 2, ID_ESPECIALIDAD: 3, FECHA: "2026-07-04", MOTIVO: null, CREATED_AT: "2026-06-01" },
    ]);
    const result = await Svc.getExcepciones(3);
    expect(result[0].motivo).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// createExcepcion
// ═══════════════════════════════════════════════════════════════════════════════

describe("createExcepcion", () => {
  test("especialidad no encontrada → lanza 404", async () => {
    mockFindById.mockResolvedValue(null);
    await expect(Svc.createExcepcion(999, "2026-07-01", null)).rejects.toMatchObject({ statusCode: 404 });
  });

  test("fecha con formato inválido → lanza 400", async () => {
    mockFindById.mockResolvedValue(ESP_PSICOLOGIA);
    await expect(Svc.createExcepcion(3, "01-07-2026", null)).rejects.toMatchObject({ statusCode: 400 });
  });

  test("fecha duplicada → lanza 409", async () => {
    mockFindById.mockResolvedValue(ESP_PSICOLOGIA);
    mockFindExcepcionByFecha.mockResolvedValue({ ID_EXCEPCION: 5 });
    await expect(Svc.createExcepcion(3, "2026-07-03", null)).rejects.toMatchObject({ statusCode: 409 });
  });

  test("crea correctamente con motivo", async () => {
    mockFindById.mockResolvedValue(ESP_PSICOLOGIA);
    mockFindExcepcionByFecha.mockResolvedValue(null);
    mockCreateExcepcion.mockResolvedValue(undefined);
    const r = await Svc.createExcepcion(3, "2026-07-03", "Vacaciones");
    expect(r).toEqual({ idEspecialidad: 3, fecha: "2026-07-03", motivo: "Vacaciones" });
  });

  test("motivo undefined → motivo null en resultado", async () => {
    mockFindById.mockResolvedValue(ESP_PSICOLOGIA);
    mockFindExcepcionByFecha.mockResolvedValue(null);
    mockCreateExcepcion.mockResolvedValue(undefined);
    const r = await Svc.createExcepcion(3, "2026-07-10", undefined);
    expect(r.motivo).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// deleteExcepcion
// ═══════════════════════════════════════════════════════════════════════════════

describe("deleteExcepcion", () => {
  test("delega al modelo con el id correcto", async () => {
    mockDeleteExcepcion.mockResolvedValue(undefined);
    await Svc.deleteExcepcion(7);
    expect(mockDeleteExcepcion).toHaveBeenCalledWith(7);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// regression ISSUE-001 — updateEspecialidad persiste diaSemana
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
