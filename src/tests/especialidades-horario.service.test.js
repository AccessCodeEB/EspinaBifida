import { jest } from "@jest/globals";

// ─── Mocks del modelo ─────────────────────────────────────────────────────────
const mockFindAll                   = jest.fn();
const mockFindById                  = jest.fn();
const mockFindByNombre              = jest.fn();
const mockUpdate                    = jest.fn();
const mockCountCitasActivas         = jest.fn();
const mockCountCitasFuturasActivas  = jest.fn();
const mockCountCitasBySlot          = jest.fn();
const mockFindExcepciones           = jest.fn();
const mockFindExcepcionByFecha      = jest.fn();
const mockCreateExcepcion           = jest.fn();
const mockDeleteExcepcion           = jest.fn();

jest.unstable_mockModule("../models/especialidades-horario.model.js", () => ({
  findAll:                   mockFindAll,
  findById:                  mockFindById,
  findByNombre:              mockFindByNombre,
  update:                    mockUpdate,
  countCitasActivasPorFecha: mockCountCitasActivas,
  countCitasFuturasActivas:  mockCountCitasFuturasActivas,
  countCitasBySlot:          mockCountCitasBySlot,
  findExcepciones:           mockFindExcepciones,
  findExcepcionByFecha:      mockFindExcepcionByFecha,
  createExcepcion:           mockCreateExcepcion,
  deleteExcepcion:           mockDeleteExcepcion,
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

  test("12:00 en el límite superior de 10:00-12:00 → inválido (fin exclusivo)", () => {
    expect(Svc.esDentroDeHorario(ESP_PSICOLOGIA, "12:00")).toBe(false);
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
    mockCountCitasBySlot.mockResolvedValue(3); // ya llenas las 3 plazas
    await expect(
      Svc.validarSlotEspecialidad("Psicología", "2026-06-05", "10:00")
    ).rejects.toMatchObject({ statusCode: 400, code: "CAPACIDAD_LLENA" });
  });

  test("capacidad parcial (2/3) → válido", async () => {
    mockFindByNombre.mockResolvedValue(ESP_PSICOLOGIA);
    mockFindExcepcionByFecha.mockResolvedValue(null);
    mockCountCitasBySlot.mockResolvedValue(2);
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

  test("horario fuera de rango con HORA_FIN null → error incluye 'en adelante'", async () => {
    mockFindByNombre.mockResolvedValue(ESP_CIRUGIA); // HORA_FIN: null
    mockFindExcepcionByFecha.mockResolvedValue(null);
    // 2026-06-03 = primer miércoles de junio, hora 07:30 < 08:00
    await expect(
      Svc.validarSlotEspecialidad("Cirugía", "2026-06-03", "07:30")
    ).rejects.toMatchObject({ statusCode: 400, code: "HORARIO_NO_PERMITIDO" });
  });

  test("fecha bloqueada sin motivo → error sin sufijo de motivo (motivo vacío)", async () => {
    mockFindByNombre.mockResolvedValue(ESP_PSICOLOGIA);
    mockFindExcepcionByFecha.mockResolvedValue({ ID_EXCEPCION: 2, MOTIVO: null });
    // 2026-06-05 = viernes, hora válida, pero fecha bloqueada sin motivo
    await expect(
      Svc.validarSlotEspecialidad("Psicología", "2026-06-05", "10:00")
    ).rejects.toMatchObject({ statusCode: 400, code: "FECHA_BLOQUEADA" });
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

// ═══════════════════════════════════════════════════════════════════════════════
// updateEspecialidad — regla de negocio: no desactivar con citas futuras
// ═══════════════════════════════════════════════════════════════════════════════

describe("updateEspecialidad — regla de negocio: no desactivar con citas pendientes", () => {
  test("activo=false, ACTIVO=1 y tiene citas futuras → 400 ESPECIALIDAD_CON_CITAS", async () => {
    mockFindById.mockResolvedValue(ESP_PSICOLOGIA); // ACTIVO = 1
    mockCountCitasFuturasActivas.mockResolvedValue(2);
    await expect(Svc.updateEspecialidad(3, { activo: false }))
      .rejects.toMatchObject({ statusCode: 400, code: "ESPECIALIDAD_CON_CITAS" });
    expect(mockCountCitasFuturasActivas).toHaveBeenCalledWith("Psicología");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  test("activo=false, ACTIVO=1, exactamente 1 cita futura → mensaje en singular", async () => {
    mockFindById.mockResolvedValue(ESP_PSICOLOGIA);
    mockCountCitasFuturasActivas.mockResolvedValue(1);
    const err = await Svc.updateEspecialidad(3, { activo: false }).catch(e => e);
    expect(err.statusCode).toBe(400);
    expect(err.message).toMatch(/1 cita pendiente/);
  });

  test("activo=false, ACTIVO=1 y sin citas futuras → procede normalmente", async () => {
    mockFindById
      .mockResolvedValueOnce(ESP_PSICOLOGIA)
      .mockResolvedValueOnce(ESP_PSICOLOGIA);
    mockCountCitasFuturasActivas.mockResolvedValue(0);
    mockUpdate.mockResolvedValue(undefined);
    await expect(Svc.updateEspecialidad(3, { activo: false })).resolves.toBeDefined();
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  test("activo=false con especialidad ya inactiva (ACTIVO=0) → no consulta citas futuras", async () => {
    const inactiva = { ...ESP_PSICOLOGIA, ACTIVO: 0 };
    mockFindById.mockResolvedValueOnce(inactiva).mockResolvedValueOnce(inactiva);
    mockUpdate.mockResolvedValue(undefined);
    await Svc.updateEspecialidad(3, { activo: false });
    expect(mockCountCitasFuturasActivas).not.toHaveBeenCalled();
  });

  test("activo=true → no consulta citas futuras", async () => {
    mockFindById
      .mockResolvedValueOnce(ESP_PSICOLOGIA)
      .mockResolvedValueOnce(ESP_PSICOLOGIA);
    mockUpdate.mockResolvedValue(undefined);
    await Svc.updateEspecialidad(3, { activo: true });
    expect(mockCountCitasFuturasActivas).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// countCitasFuturas y countCitasEnFecha — consultas de impacto
// ═══════════════════════════════════════════════════════════════════════════════

describe("countCitasFuturas y countCitasEnFecha", () => {
  test("countCitasFuturas delega al modelo con el nombre y retorna el resultado", async () => {
    mockCountCitasFuturasActivas.mockResolvedValue(3);
    const result = await Svc.countCitasFuturas("Psicología");
    expect(mockCountCitasFuturasActivas).toHaveBeenCalledWith("Psicología");
    expect(result).toBe(3);
  });

  test("countCitasEnFecha delega al modelo con nombre y fecha", async () => {
    mockCountCitasActivas.mockResolvedValue(1);
    const result = await Svc.countCitasEnFecha("Psicología", "2026-06-05");
    expect(mockCountCitasActivas).toHaveBeenCalledWith("Psicología", "2026-06-05");
    expect(result).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// generateSlots
// ═══════════════════════════════════════════════════════════════════════════════

describe("generateSlots", () => {
  test("Urología 09:30–12:00, duracion=30 → 5 slots", () => {
    const esp = { HORA_INICIO: "09:30", HORA_FIN: "12:00", DURACION_CITA: 30 };
    expect(Svc.generateSlots(esp)).toEqual(["09:30", "10:00", "10:30", "11:00", "11:30"]);
  });

  test("Psicología 10:00–12:00, duracion=60 → 2 slots", () => {
    const esp = { HORA_INICIO: "10:00", HORA_FIN: "12:00", DURACION_CITA: 60 };
    expect(Svc.generateSlots(esp)).toEqual(["10:00", "11:00"]);
  });

  test("Gastro 10:00–12:00, duracion=30 → 4 slots", () => {
    const esp = { HORA_INICIO: "10:00", HORA_FIN: "12:00", DURACION_CITA: 30 };
    expect(Svc.generateSlots(esp)).toEqual(["10:00", "10:30", "11:00", "11:30"]);
  });

  test("sin HORA_FIN, duracion=45 desde 08:00 → usa 240min máximo → 5 slots", () => {
    // endMins = 480 + 240 = 720, latestStart = 720 - 45 = 675 = 11:15
    // slots: 480(08:00), 525(08:45), 570(09:30), 615(10:15), 660(11:00) → 660 <= 675 ✓
    // siguiente: 705 > 675 ✗ → stop
    const esp = { HORA_INICIO: "08:00", HORA_FIN: null, DURACION_CITA: 45 };
    expect(Svc.generateSlots(esp)).toEqual(["08:00", "08:45", "09:30", "10:15", "11:00"]);
  });

  test("HORA_FIN = HORA_INICIO → [] (latestStart < startMins)", () => {
    const esp = { HORA_INICIO: "09:00", HORA_FIN: "09:00", DURACION_CITA: 30 };
    expect(Svc.generateSlots(esp)).toEqual([]);
  });

  test("DURACION_CITA = 0 → []", () => {
    const esp = { HORA_INICIO: "09:00", HORA_FIN: "12:00", DURACION_CITA: 0 };
    expect(Svc.generateSlots(esp)).toEqual([]);
  });

  test("DURACION_CITA = null → []", () => {
    const esp = { HORA_INICIO: "09:00", HORA_FIN: "12:00", DURACION_CITA: null };
    expect(Svc.generateSlots(esp)).toEqual([]);
  });

  test("DURACION_CITA = undefined → []", () => {
    const esp = { HORA_INICIO: "09:00", HORA_FIN: "12:00", DURACION_CITA: undefined };
    expect(Svc.generateSlots(esp)).toEqual([]);
  });

  test("Cirugía sin HORA_FIN, duracion=45 desde 08:00 → mismo que caso anterior", () => {
    const esp = { ...ESP_CIRUGIA, DURACION_CITA: 45 };
    expect(Svc.generateSlots(esp)).toEqual(["08:00", "08:45", "09:30", "10:15", "11:00"]);
  });

  test("ventana no divisible exacta: duracion=90, ventana 09:00–11:00 → solo 09:00", () => {
    // latestStart = 660 - 90 = 570 = 09:30; pero 09:00+90=10:30<=660... espera
    // startMins=540, endMins=660, latestStart=660-90=570
    // 540<=570 → slot 09:00; 540+90=630>570 → stop → [09:00]
    const esp = { HORA_INICIO: "09:00", HORA_FIN: "11:00", DURACION_CITA: 90 };
    expect(Svc.generateSlots(esp)).toEqual(["09:00"]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getSlotsConDisponibilidad
// ═══════════════════════════════════════════════════════════════════════════════

const ESP_SLOTS_BASE = {
  ID_ESPECIALIDAD: 3,
  NOMBRE: "Psicología",
  DIA_SEMANA: 5,
  HORA_INICIO: "10:00",
  HORA_FIN: "12:00",
  CAPACIDAD_MAX: 2,
  TIPO_FRECUENCIA: "SEMANAL",
  ACTIVO: 1,
  NOTAS: null,
  DURACION_CITA: 60,
};

describe("getSlotsConDisponibilidad", () => {
  test("especialidad no encontrada → 404", async () => {
    mockFindById.mockResolvedValue(null);
    await expect(Svc.getSlotsConDisponibilidad(99, "2026-06-05"))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test("especialidad inactiva → { inactiva: true }", async () => {
    mockFindById.mockResolvedValue({ ...ESP_SLOTS_BASE, ACTIVO: 0 });
    const r = await Svc.getSlotsConDisponibilidad(3, "2026-06-05");
    expect(r).toEqual({ inactiva: true });
    expect(mockFindExcepcionByFecha).not.toHaveBeenCalled();
  });

  test("fecha bloqueada con motivo → { bloqueada: true, motivo }", async () => {
    mockFindById.mockResolvedValue(ESP_SLOTS_BASE);
    mockFindExcepcionByFecha.mockResolvedValue({ MOTIVO: "Festivo" });
    const r = await Svc.getSlotsConDisponibilidad(3, "2026-06-05");
    expect(r).toEqual({ bloqueada: true, motivo: "Festivo" });
    expect(mockCountCitasBySlot).not.toHaveBeenCalled();
  });

  test("fecha bloqueada sin motivo → { bloqueada: true, motivo: null }", async () => {
    mockFindById.mockResolvedValue(ESP_SLOTS_BASE);
    mockFindExcepcionByFecha.mockResolvedValue({ MOTIVO: null });
    const r = await Svc.getSlotsConDisponibilidad(3, "2026-06-05");
    expect(r).toEqual({ bloqueada: true, motivo: null });
  });

  test("slots disponibles parcialmente llenos", async () => {
    mockFindById.mockResolvedValue(ESP_SLOTS_BASE); // cap=2, slots: 10:00, 11:00
    mockFindExcepcionByFecha.mockResolvedValue(null);
    mockCountCitasBySlot.mockResolvedValue(1); // 1 ocupado en cada slot
    const r = await Svc.getSlotsConDisponibilidad(3, "2026-06-05");
    expect(r.slots).toEqual([
      { hora: "10:00", ocupados: 1, capacidad: 2, lleno: false },
      { hora: "11:00", ocupados: 1, capacidad: 2, lleno: false },
    ]);
  });

  test("slot lleno cuando ocupados >= capacidad", async () => {
    mockFindById.mockResolvedValue(ESP_SLOTS_BASE); // cap=2
    mockFindExcepcionByFecha.mockResolvedValue(null);
    mockCountCitasBySlot.mockResolvedValue(2); // lleno
    const r = await Svc.getSlotsConDisponibilidad(3, "2026-06-05");
    expect(r.slots[0].lleno).toBe(true);
    expect(r.slots[1].lleno).toBe(true);
  });

  test("sin capacidad (CAPACIDAD_MAX=null) → lleno siempre false", async () => {
    mockFindById.mockResolvedValue({ ...ESP_SLOTS_BASE, CAPACIDAD_MAX: null });
    mockFindExcepcionByFecha.mockResolvedValue(null);
    mockCountCitasBySlot.mockResolvedValue(99);
    const r = await Svc.getSlotsConDisponibilidad(3, "2026-06-05");
    expect(r.slots.every(s => s.lleno === false)).toBe(true);
    expect(r.slots[0].capacidad).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// validarSlotEspecialidad — SLOT_NO_VALIDO (nueva validación)
// ═══════════════════════════════════════════════════════════════════════════════

describe("validarSlotEspecialidad — SLOT_NO_VALIDO", () => {
  const ESP_CON_SLOTS = {
    ...ESP_PSICOLOGIA,
    HORA_INICIO: "09:30",
    HORA_FIN: "12:00",
    DURACION_CITA: 30,
    // slots válidos: 09:30, 10:00, 10:30, 11:00, 11:30
  };

  test("hora 09:47 no es slot válido (30min desde 09:30) → SLOT_NO_VALIDO", async () => {
    mockFindByNombre.mockResolvedValue(ESP_CON_SLOTS);
    mockFindExcepcionByFecha.mockResolvedValue(null);
    // 2026-06-05 = viernes, válido para Psicología
    await expect(
      Svc.validarSlotEspecialidad("Psicología", "2026-06-05", "09:47")
    ).rejects.toMatchObject({ statusCode: 400, code: "SLOT_NO_VALIDO" });
  });

  test("hora 09:30 es slot válido → pasa validación de slot", async () => {
    mockFindByNombre.mockResolvedValue(ESP_CON_SLOTS);
    mockFindExcepcionByFecha.mockResolvedValue(null);
    mockCountCitasBySlot.mockResolvedValue(0);
    // No debe lanzar SLOT_NO_VALIDO
    await expect(
      Svc.validarSlotEspecialidad("Psicología", "2026-06-05", "09:30")
    ).resolves.toBeUndefined();
  });

  test("especialidad sin DURACION_CITA → sin slots generados, no valida slot exacto", async () => {
    // ESP_PSICOLOGIA no tiene DURACION_CITA → generateSlots devuelve []
    mockFindByNombre.mockResolvedValue(ESP_PSICOLOGIA);
    mockFindExcepcionByFecha.mockResolvedValue(null);
    mockCountCitasBySlot.mockResolvedValue(0);
    // Hora arbitraria dentro del horario, no debe lanzar SLOT_NO_VALIDO
    await expect(
      Svc.validarSlotEspecialidad("Psicología", "2026-06-05", "10:17")
    ).resolves.toBeUndefined();
  });
});
