import { jest } from "@jest/globals";

// ─── Mocks del modelo ─────────────────────────────────────────────────────────
const mockFindBeneficiarioByCurp    = jest.fn();
const mockFindLastByCurp            = jest.fn();
const mockHasPeriodOverlap          = jest.fn();
const mockFindMembresiaActivaByCurp = jest.fn();
const mockSetBeneficiarioInactivo   = jest.fn();
const mockCreate                    = jest.fn();

const mockSyncEstados       = jest.fn();
const mockFindPagosRecientes = jest.fn();
const mockFindAll            = jest.fn();

jest.unstable_mockModule("../models/membresias.model.js", () => ({
  findBeneficiarioByCurp:    mockFindBeneficiarioByCurp,
  findLastByCurp:            mockFindLastByCurp,
  hasPeriodOverlap:          mockHasPeriodOverlap,
  findMembresiaActivaByCurp: mockFindMembresiaActivaByCurp,
  setBeneficiarioInactivo:   mockSetBeneficiarioInactivo,
  cancelarPorCurp:           jest.fn(),
  create:                    mockCreate,
  syncEstados:               mockSyncEstados,
  findPagosRecientes:        mockFindPagosRecientes,
  findAll:                   mockFindAll,
}));

// Importaciones después de los mocks (ESM)
const Service = await import("../services/membresias.service.js");

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const CURP = "GAEJ900101HMNRRL09";

function credencialFija(overrides = {}) {
  return {
    ID_CREDENCIAL:         1,
    CURP,
    NUMERO_CREDENCIAL:     "CRED-001",
    FECHA_EMISION:         new Date("2026-01-01"),
    FECHA_VIGENCIA_INICIO: new Date("2026-01-01"),
    FECHA_VIGENCIA_FIN:    new Date("2027-01-01"),
    FECHA_ULTIMO_PAGO:     null,
    OBSERVACIONES:         null,
    ...overrides,
  };
}

beforeEach(() => jest.clearAllMocks());

// ═══════════════════════════════════════════════════════════════════════════════
// isMembresiaActiva — función pura exportada (líneas 34–41)
// ═══════════════════════════════════════════════════════════════════════════════

describe("isMembresiaActiva", () => {
  test("fecha futura → true", () => {
    const fechaFutura = new Date();
    fechaFutura.setFullYear(fechaFutura.getFullYear() + 1);
    expect(Service.isMembresiaActiva(fechaFutura)).toBe(true);
  });

  test("fecha pasada → false", () => {
    expect(Service.isMembresiaActiva(new Date("2020-01-01"))).toBe(false);
  });

  test("fecha de hoy → true (límite exacto, todavía vigente)", () => {
    const hoy = new Date();
    expect(Service.isMembresiaActiva(hoy)).toBe(true);
  });

  test("null → false", () => {
    expect(Service.isMembresiaActiva(null)).toBe(false);
  });

  test("undefined → false", () => {
    expect(Service.isMembresiaActiva(undefined)).toBe(false);
  });

  test("string ISO válido → evalúa correctamente", () => {
    // isMembresiaActiva acepta cualquier valor que new Date() pueda parsear
    const fechaFutura = new Date();
    fechaFutura.setFullYear(fechaFutura.getFullYear() + 1);
    expect(Service.isMembresiaActiva(fechaFutura.toISOString())).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// validarMembresiaActivaPorCurp — líneas 62–80
// (también ejercita mapMembresiaPublica internamente)
// ═══════════════════════════════════════════════════════════════════════════════

describe("validarMembresiaActivaPorCurp", () => {
  test("curp vacío → BAD_REQUEST", async () => {
    await expect(
      Service.validarMembresiaActivaPorCurp("")
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test("curp null → BAD_REQUEST", async () => {
    await expect(
      Service.validarMembresiaActivaPorCurp(null)
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test("membresía activa → activa: true, no marca beneficiario como inactivo", async () => {
    const futuro = new Date();
    futuro.setFullYear(futuro.getFullYear() + 1);

    mockFindMembresiaActivaByCurp.mockResolvedValue(
      credencialFija({ FECHA_VIGENCIA_FIN: futuro })
    );

    const result = await Service.validarMembresiaActivaPorCurp(CURP);

    expect(result.activa).toBe(true);
    expect(result.estatus).toBe("ACTIVA");
    expect(result.curp).toBe(CURP);
    expect(result.membresia).not.toBeNull();
    expect(mockSetBeneficiarioInactivo).not.toHaveBeenCalled();
  });

  test("sin membresía activa → activa: false y llama setBeneficiarioInactivo", async () => {
    mockFindMembresiaActivaByCurp.mockResolvedValue(null);
    mockSetBeneficiarioInactivo.mockResolvedValue(1);

    const result = await Service.validarMembresiaActivaPorCurp(CURP);

    expect(result.activa).toBe(false);
    expect(result.estatus).toBe("VENCIDA");
    expect(result.membresia).toBeNull();
    expect(mockSetBeneficiarioInactivo).toHaveBeenCalledWith(CURP);
  });

  test("curp con minúsculas se normaliza a mayúsculas", async () => {
    mockFindMembresiaActivaByCurp.mockResolvedValue(null);
    mockSetBeneficiarioInactivo.mockResolvedValue(1);

    const result = await Service.validarMembresiaActivaPorCurp(CURP.toLowerCase());

    expect(result.curp).toBe(CURP); // normalizado
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// registrarMembresia — validaciones de fechas no cubiertas
// Líneas 93 (fecha_emision inválida), 103 (fecha_vigencia_inicio inválida),
// 112 (inicio > fin), 123 (ultimo_pago formato), 127 (último pago futuro)
// ═══════════════════════════════════════════════════════════════════════════════

describe("registrarMembresia — validaciones de fechas", () => {
  beforeEach(() => {
    // La mayoría de estos tests pasan la validación de beneficiario,
    // así que lo mockeamos como existente por defecto.
    mockFindBeneficiarioByCurp.mockResolvedValue({ CURP });
  });

  test("fecha_emision con formato inválido → BAD_REQUEST", async () => {
    await expect(
      Service.registrarMembresia({
        curp: CURP,
        numero_credencial: "CRED-001",
        fecha_emision: "no-es-fecha",
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test("fecha_vigencia_inicio con formato inválido → BAD_REQUEST", async () => {
    await expect(
      Service.registrarMembresia({
        curp: CURP,
        numero_credencial: "CRED-001",
        fecha_emision: "2026-01-01",
        fecha_vigencia_inicio: "no-es-fecha",
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test("fecha_ultimo_pago con formato inválido → BAD_REQUEST", async () => {
    await expect(
      Service.registrarMembresia({
        curp: CURP,
        numero_credencial: "CRED-001",
        fecha_emision: "2026-01-01",
        fecha_ultimo_pago: "no-es-fecha",
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test("fecha_ultimo_pago en el futuro → BAD_REQUEST", async () => {
    await expect(
      Service.registrarMembresia({
        curp: CURP,
        numero_credencial: "CRED-001",
        fecha_emision: "2026-01-01",
        fecha_ultimo_pago: "2099-01-01",
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test("registro exitoso — crea credencial y retorna resultado", async () => {
    mockHasPeriodOverlap.mockResolvedValue(false);
    mockCreate.mockResolvedValue({ rowsAffected: 1 });

    const result = await Service.registrarMembresia({
      curp: CURP,
      numero_credencial: "CRED-001",
      fecha_emision: "2026-01-01",
      observaciones: "Alta inicial",
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ curp: CURP, numeroCredencial: "CRED-001" })
    );
    expect(result).toBeDefined();
  });

  test("registro con fecha_ultimo_pago válida (hoy) → exitoso", async () => {
    const hoy = new Date().toISOString().slice(0, 10);
    mockHasPeriodOverlap.mockResolvedValue(false);
    mockCreate.mockResolvedValue({ rowsAffected: 1 });

    await expect(
      Service.registrarMembresia({
        curp: CURP,
        numero_credencial: "CRED-002",
        fecha_emision: "2026-01-01",
        fecha_ultimo_pago: hoy,
      })
    ).resolves.toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getEstatusMembresia — líneas 156–180 (función completamente no cubierta)
// ═══════════════════════════════════════════════════════════════════════════════

describe("getEstatusMembresia", () => {
  test("curp vacío → BAD_REQUEST", async () => {
    await expect(
      Service.getEstatusMembresia("")
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test("sin ninguna membresía registrada → SIN_MEMBRESIA", async () => {
    mockFindLastByCurp.mockResolvedValue(null);
    mockSetBeneficiarioInactivo.mockResolvedValue(1);

    const result = await Service.getEstatusMembresia(CURP);

    expect(result.existe).toBe(false);
    expect(result.estatus).toBe("SIN_MEMBRESIA");
    expect(result.activa).toBe(false);
    expect(result.membresia).toBeNull();
    expect(mockSetBeneficiarioInactivo).toHaveBeenCalledWith(CURP);
  });

  test("membresía vigente → ACTIVA, no llama setBeneficiarioInactivo", async () => {
    const futuro = new Date();
    futuro.setFullYear(futuro.getFullYear() + 1);

    mockFindLastByCurp.mockResolvedValue(
      credencialFija({ FECHA_VIGENCIA_FIN: futuro })
    );

    const result = await Service.getEstatusMembresia(CURP);

    expect(result.existe).toBe(true);
    expect(result.activa).toBe(true);
    expect(result.estatus).toBe("ACTIVA");
    expect(result.membresia).not.toBeNull();
    expect(mockSetBeneficiarioInactivo).not.toHaveBeenCalled();
  });

  test("membresía vencida → VENCIDA y llama setBeneficiarioInactivo", async () => {
    mockFindLastByCurp.mockResolvedValue(
      credencialFija({ FECHA_VIGENCIA_FIN: new Date("2021-01-01") })
    );
    mockSetBeneficiarioInactivo.mockResolvedValue(1);

    const result = await Service.getEstatusMembresia(CURP);

    expect(result.existe).toBe(true);
    expect(result.activa).toBe(false);
    expect(result.estatus).toBe("VENCIDA");
    expect(mockSetBeneficiarioInactivo).toHaveBeenCalledWith(CURP);
  });

  test("membresía con FECHA_VIGENCIA_FIN nula → vencida", async () => {
    mockFindLastByCurp.mockResolvedValue(
      credencialFija({ FECHA_VIGENCIA_FIN: null })
    );
    mockSetBeneficiarioInactivo.mockResolvedValue(1);

    const result = await Service.getEstatusMembresia(CURP);

    expect(result.activa).toBe(false);
    expect(mockSetBeneficiarioInactivo).toHaveBeenCalled();
  });

  test("mapeo de respuesta incluye todos los campos de la membresía", async () => {
    const futuro = new Date();
    futuro.setFullYear(futuro.getFullYear() + 1);

    mockFindLastByCurp.mockResolvedValue(
      credencialFija({ FECHA_VIGENCIA_FIN: futuro, OBSERVACIONES: "Alta inicial" })
    );

    const result = await Service.getEstatusMembresia(CURP);

    expect(result.membresia).toMatchObject({
      id_credencial:     1,
      curp:              CURP,
      numero_credencial: "CRED-001",
      observaciones:     "Alta inicial",
    });
    expect(result.membresia.fecha_vigencia_fin).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getAll, syncEstados, getPagosRecientes — líneas 64–74
// ═══════════════════════════════════════════════════════════════════════════════

describe("getAll", () => {
  test("delega en findAll del modelo", async () => {
    mockFindAll.mockResolvedValueOnce([{ ID_CREDENCIAL: 1 }]);
    const result = await Service.getAll();
    expect(result).toEqual([{ ID_CREDENCIAL: 1 }]);
    expect(mockFindAll).toHaveBeenCalledTimes(1);
  });
});

describe("syncEstados", () => {
  test("delega en syncEstados del modelo sin retornar nada", async () => {
    mockSyncEstados.mockResolvedValueOnce(undefined);
    await expect(Service.syncEstados()).resolves.toBeUndefined();
    expect(mockSyncEstados).toHaveBeenCalledTimes(1);
  });
});

describe("getPagosRecientes", () => {
  test("usa limit=20 por defecto y devuelve resultados del modelo", async () => {
    mockFindPagosRecientes.mockResolvedValueOnce([{ ID_CREDENCIAL: 5 }]);
    const result = await Service.getPagosRecientes();
    expect(result).toEqual([{ ID_CREDENCIAL: 5 }]);
    expect(mockFindPagosRecientes).toHaveBeenCalledWith(20);
  });

  test("clampea el limit mínimo a 1 cuando se pasa -5", async () => {
    mockFindPagosRecientes.mockResolvedValue([]);
    await Service.getPagosRecientes(-5);
    expect(mockFindPagosRecientes).toHaveBeenCalledWith(1);
  });

  test("clampea el limit máximo a 100 cuando se pasa 200", async () => {
    mockFindPagosRecientes.mockResolvedValue([]);
    await Service.getPagosRecientes(200);
    expect(mockFindPagosRecientes).toHaveBeenCalledWith(100);
  });

  test("valor no numérico usa default 20", async () => {
    mockFindPagosRecientes.mockResolvedValue([]);
    await Service.getPagosRecientes("abc");
    expect(mockFindPagosRecientes).toHaveBeenCalledWith(20);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// registrarMembresia — ramas de monto y metodoPago no cubiertas (líneas 155–164)
// ═══════════════════════════════════════════════════════════════════════════════

describe("registrarMembresia — validación de monto y metodoPago", () => {
  beforeEach(() => {
    mockFindBeneficiarioByCurp.mockResolvedValue({ CURP });
  });

  test("monto negativo → BAD_REQUEST", async () => {
    await expect(
      Service.registrarMembresia({
        curp: CURP,
        numero_credencial: "CRED-001",
        fecha_emision: "2026-01-01",
        monto: -50,
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test("monto no numérico → BAD_REQUEST", async () => {
    await expect(
      Service.registrarMembresia({
        curp: CURP,
        numero_credencial: "CRED-001",
        fecha_emision: "2026-01-01",
        monto: "no-es-numero",
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test("metodo_pago inválido → BAD_REQUEST", async () => {
    await expect(
      Service.registrarMembresia({
        curp: CURP,
        numero_credencial: "CRED-001",
        fecha_emision: "2026-01-01",
        metodo_pago: "bitcoin",
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
