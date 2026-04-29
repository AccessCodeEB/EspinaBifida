import { jest } from "@jest/globals";

// ─── Mocks de modelos ─────────────────────────────────────────────────────────
const mockFindById       = jest.fn();
const mockCreate         = jest.fn();
const mockUpdate         = jest.fn();
const mockDeactivate     = jest.fn();
const mockUpdateEstatus  = jest.fn();
const mockUpdateEstatusAndNotas = jest.fn();
const mockHardDelete     = jest.fn();
const mockCancelarPorCurp = jest.fn();

jest.unstable_mockModule("../models/beneficiarios.model.js", () => ({
  findAll:    jest.fn().mockResolvedValue([]),
  findById:   mockFindById,
  create:     mockCreate,
  update:     mockUpdate,
  deactivate: mockDeactivate,
  updateEstatus: mockUpdateEstatus,
  updateEstatusAndNotas: mockUpdateEstatusAndNotas,
  hardDelete: mockHardDelete,
}));

jest.unstable_mockModule("../models/membresias.model.js", () => ({
  cancelarPorCurp:           mockCancelarPorCurp,
  findBeneficiarioByCurp:    jest.fn(),
  findLastByCurp:            jest.fn(),
  hasPeriodOverlap:          jest.fn(),
  findMembresiaActivaByCurp: jest.fn(),
  setBeneficiarioInactivo:   jest.fn(),
  create:                    jest.fn(),
}));

// Importaciones después de los mocks (ESM)
const Service = await import("../services/beneficiarios.service.js");

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const CURP_VALIDA = "GAEJ900101HMNRRL09";

const baseCreate = {
  curp:            CURP_VALIDA,
  nombres:         "Juan",
  apellidoPaterno: "García",
  apellidoMaterno: "López",
  fechaNacimiento: "1990-01-01",
};

// Para update, curp va separado
const baseUpdate = {
  nombres:         "Juan",
  apellidoPaterno: "García",
  apellidoMaterno: "López",
  fechaNacimiento: "1990-01-01",
};

beforeEach(() => jest.clearAllMocks());

// ═══════════════════════════════════════════════════════════════════════════════
// validarFormatos — ramas no cubiertas (líneas 57, 60, 63, 66, 69, 72, 75, 84, 90)
// Estas validaciones se disparan antes de tocar la BD, no se necesitan mocks.
// ═══════════════════════════════════════════════════════════════════════════════

describe("validarFormatos — campos opcionales inválidos", () => {
  test("telefonoCasa con menos de 10 dígitos → INVALID_PHONE", async () => {
    await expect(
      Service.create({ ...baseCreate, telefonoCasa: "12345" })
    ).rejects.toMatchObject({ code: "INVALID_PHONE" });
  });

  test("telefonoEmergencia con más de 10 dígitos → INVALID_PHONE", async () => {
    await expect(
      Service.create({ ...baseCreate, telefonoEmergencia: "12345678901" })
    ).rejects.toMatchObject({ code: "INVALID_PHONE" });
  });

  test("cp con menos de 5 dígitos → INVALID_CP", async () => {
    await expect(
      Service.create({ ...baseCreate, cp: "123" })
    ).rejects.toMatchObject({ code: "INVALID_CP" });
  });

  test("cp con más de 5 dígitos → INVALID_CP", async () => {
    await expect(
      Service.create({ ...baseCreate, cp: "123456" })
    ).rejects.toMatchObject({ code: "INVALID_CP" });
  });

  test("genero con valor distinto a M/F → INVALID_GENERO", async () => {
    await expect(
      Service.create({ ...baseCreate, genero: "X" })
    ).rejects.toMatchObject({ code: "INVALID_GENERO" });
  });

  test("tipoSangre inválido → INVALID_TIPO_SANGRE", async () => {
    await expect(
      Service.create({ ...baseCreate, tipoSangre: "C+" })
    ).rejects.toMatchObject({ code: "INVALID_TIPO_SANGRE" });
  });

  test("usaValvula con valor distinto a S/N → INVALID_USA_VALVULA", async () => {
    await expect(
      Service.create({ ...baseCreate, usaValvula: "Y" })
    ).rejects.toMatchObject({ code: "INVALID_USA_VALVULA" });
  });

  test("notas con 501 caracteres → NOTES_TOO_LONG", async () => {
    await expect(
      Service.create({ ...baseCreate, notas: "x".repeat(501) })
    ).rejects.toMatchObject({ code: "NOTES_TOO_LONG" });
  });

  test("notas con exactamente 500 caracteres → pasa validación", async () => {
    // 500 chars es el límite exacto — debe pasar la validación de notas
    // (fallará en findById porque no hay mock, pero eso confirma que llegó a la BD)
    mockFindById.mockResolvedValue(null);
    mockCreate.mockResolvedValue(undefined);

    await expect(
      Service.create({ ...baseCreate, notas: "x".repeat(500) })
    ).resolves.not.toThrow();
  });
});

// ─── fechaNacimiento — ramas adicionales (líneas 84, 90) ────────────────────

describe("validarFormatos — fechaNacimiento ramas", () => {
  test("fechaNacimiento con string no parseable → INVALID_DATE_FORMAT", async () => {
    await expect(
      Service.create({ ...baseCreate, fechaNacimiento: "no-es-fecha" })
    ).rejects.toMatchObject({ code: "INVALID_DATE_FORMAT" });
  });

  test("fechaNacimiento hace más de 120 años → DATE_TOO_OLD", async () => {
    await expect(
      Service.create({ ...baseCreate, fechaNacimiento: "1850-01-01" })
    ).rejects.toMatchObject({ code: "DATE_TOO_OLD" });
  });

  test("fechaNacimiento hace 100 años → pasa validación (bien dentro del límite)", async () => {
    mockFindById.mockResolvedValue(null);
    mockCreate.mockResolvedValue(undefined);

    await expect(
      Service.create({ ...baseCreate, fechaNacimiento: "1926-01-01" })
    ).resolves.not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// update — líneas 115–130
// ═══════════════════════════════════════════════════════════════════════════════

describe("update", () => {
  test("actualiza beneficiario activo y preserva su estatus", async () => {
    mockFindById.mockResolvedValue({ CURP: CURP_VALIDA, ESTATUS: "Activo" });
    mockUpdate.mockResolvedValue(1);

    await Service.update(CURP_VALIDA, { ...baseUpdate });

    expect(mockUpdate).toHaveBeenCalledWith(
      CURP_VALIDA,
      expect.objectContaining({ estatus: "Activo" })
    );
  });

  test("actualiza beneficiario con estatus Inactivo (membresía vencida)", async () => {
    mockFindById.mockResolvedValue({ CURP: CURP_VALIDA, ESTATUS: "Inactivo" });
    mockUpdate.mockResolvedValue(1);

    await Service.update(CURP_VALIDA, { ...baseUpdate });

    expect(mockUpdate).toHaveBeenCalledWith(
      CURP_VALIDA,
      expect.objectContaining({ estatus: "Inactivo" })
    );
  });

  test("beneficiario no encontrado → BENEFICIARIO_NOT_FOUND (404)", async () => {
    mockFindById.mockResolvedValue(null);

    await expect(
      Service.update(CURP_VALIDA, { ...baseUpdate })
    ).rejects.toMatchObject({ code: "BENEFICIARIO_NOT_FOUND" });

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  test("beneficiario en Baja puede actualizar datos; se conserva ESTATUS Baja", async () => {
    mockFindById.mockResolvedValue({ CURP: CURP_VALIDA, ESTATUS: "Baja" });
    mockUpdate.mockResolvedValue(1);

    await Service.update(CURP_VALIDA, { ...baseUpdate });

    expect(mockUpdate).toHaveBeenCalledWith(
      CURP_VALIDA,
      expect.objectContaining({ estatus: "Baja" })
    );
  });

  test("CURP inválida → INVALID_CURP (400) sin consultar BD", async () => {
    await expect(
      Service.update("INVALIDA", { ...baseUpdate })
    ).rejects.toMatchObject({ code: "INVALID_CURP" });

    expect(mockFindById).not.toHaveBeenCalled();
  });

  test("campos obligatorios faltantes → MISSING_REQUIRED_FIELDS (400)", async () => {
    await expect(
      Service.update(CURP_VALIDA, { nombres: "" })
    ).rejects.toMatchObject({ code: "MISSING_REQUIRED_FIELDS" });

    expect(mockFindById).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// deactivate — líneas 132–142
// ═══════════════════════════════════════════════════════════════════════════════

describe("deactivate", () => {
  test("da de baja y cancela membresías activas del beneficiario", async () => {
    mockFindById.mockResolvedValue({ CURP: CURP_VALIDA, ESTATUS: "Activo" });
    mockDeactivate.mockResolvedValue(1);
    mockCancelarPorCurp.mockResolvedValue(undefined);

    await Service.deactivate(CURP_VALIDA);

    expect(mockDeactivate).toHaveBeenCalledWith(CURP_VALIDA);
    expect(mockCancelarPorCurp).toHaveBeenCalledWith(CURP_VALIDA);
  });

  test("cancelarPorCurp siempre se llama, incluso si beneficiario ya estaba Inactivo", async () => {
    mockFindById.mockResolvedValue({ CURP: CURP_VALIDA, ESTATUS: "Inactivo" });
    mockDeactivate.mockResolvedValue(1);
    mockCancelarPorCurp.mockResolvedValue(undefined);

    await Service.deactivate(CURP_VALIDA);

    expect(mockCancelarPorCurp).toHaveBeenCalledWith(CURP_VALIDA);
  });

  test("beneficiario no encontrado → BENEFICIARIO_NOT_FOUND (404)", async () => {
    mockFindById.mockResolvedValue(null);

    await expect(
      Service.deactivate(CURP_VALIDA)
    ).rejects.toMatchObject({ code: "BENEFICIARIO_NOT_FOUND" });

    expect(mockDeactivate).not.toHaveBeenCalled();
    expect(mockCancelarPorCurp).not.toHaveBeenCalled();
  });

  test("CURP inválida → INVALID_CURP (400) sin consultar BD", async () => {
    await expect(
      Service.deactivate("INVALIDA")
    ).rejects.toMatchObject({ code: "INVALID_CURP" });

    expect(mockFindById).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// toggleEstatus — salida de Baja y no-op
// ═══════════════════════════════════════════════════════════════════════════════

describe("toggleEstatus", () => {
  test("Baja → Inactivo llama updateEstatus", async () => {
    mockFindById.mockResolvedValue({ CURP: CURP_VALIDA, ESTATUS: "Baja" });
    mockUpdateEstatus.mockResolvedValue(undefined);

    await Service.toggleEstatus(CURP_VALIDA, "Inactivo");

    expect(mockUpdateEstatus).toHaveBeenCalledWith(CURP_VALIDA, "Inactivo");
  });

  test("Baja → Activo llama updateEstatus", async () => {
    mockFindById.mockResolvedValue({ CURP: CURP_VALIDA, ESTATUS: "Baja" });
    mockUpdateEstatus.mockResolvedValue(undefined);

    await Service.toggleEstatus(CURP_VALIDA, "Activo");

    expect(mockUpdateEstatus).toHaveBeenCalledWith(CURP_VALIDA, "Activo");
  });

  test("Activo → Activo no llama updateEstatus (idempotente)", async () => {
    mockFindById.mockResolvedValue({ CURP: CURP_VALIDA, ESTATUS: "Activo" });

    await Service.toggleEstatus(CURP_VALIDA, "Activo");

    expect(mockUpdateEstatus).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Solicitud pública / pre-registro (Inactivo + marcador; legado Pre-registro)
// ═══════════════════════════════════════════════════════════════════════════════

describe("createPublicSolicitud", () => {
  test("guarda Inactivo y prefija NOTAS con el marcador exacto", async () => {
    mockFindById.mockResolvedValue(null);
    mockCreate.mockResolvedValue(undefined);

    await Service.createPublicSolicitud({
      ...baseCreate,
      genero: "M",
      notas: "Texto familia",
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        estatus: "Inactivo",
        notas: "[SOLICITUD_PUBLICA_PRE_REG]\nTexto familia",
      })
    );
  });

  test("notas + marcador > 500 → NOTES_TOO_LONG", async () => {
    const largo = "x".repeat(480);
    await expect(
      Service.createPublicSolicitud({
        ...baseCreate,
        genero: "M",
        notas: largo,
      })
    ).rejects.toMatchObject({ code: "NOTES_TOO_LONG" });

    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe("approvePreRegistro", () => {
  test("pasa a Activo y quita el marcador de NOTAS", async () => {
    mockFindById.mockResolvedValue({
      CURP: CURP_VALIDA,
      ESTATUS: "Inactivo",
      NOTAS: "[SOLICITUD_PUBLICA_PRE_REG]\nhola",
    });
    mockUpdateEstatusAndNotas.mockResolvedValue(undefined);

    await Service.approvePreRegistro(CURP_VALIDA);

    expect(mockUpdateEstatusAndNotas).toHaveBeenCalledWith(CURP_VALIDA, "Activo", "hola");
  });

  test("legacy Pre-registro en ESTATUS también aprueba", async () => {
    mockFindById.mockResolvedValue({
      CURP: CURP_VALIDA,
      ESTATUS: "Pre-registro",
      NOTAS: null,
    });
    mockUpdateEstatusAndNotas.mockResolvedValue(undefined);

    await Service.approvePreRegistro(CURP_VALIDA);

    expect(mockUpdateEstatusAndNotas).toHaveBeenCalledWith(CURP_VALIDA, "Activo", null);
  });
});

describe("rejectPreRegistro", () => {
  test("hardDelete solo si Inactivo + marcador", async () => {
    mockFindById.mockResolvedValue({
      CURP: CURP_VALIDA,
      ESTATUS: "Inactivo",
      NOTAS: "[SOLICITUD_PUBLICA_PRE_REG]",
    });
    mockHardDelete.mockResolvedValue(1);

    await Service.rejectPreRegistro(CURP_VALIDA);

    expect(mockHardDelete).toHaveBeenCalledWith(CURP_VALIDA);
  });

  test("Activo sin marcador → NOT_PENDING_PUBLIC", async () => {
    mockFindById.mockResolvedValue({
      CURP: CURP_VALIDA,
      ESTATUS: "Activo",
      NOTAS: "x",
    });

    await expect(Service.rejectPreRegistro(CURP_VALIDA)).rejects.toMatchObject({
      code: "NOT_PENDING_PUBLIC",
    });

    expect(mockHardDelete).not.toHaveBeenCalled();
  });
});
