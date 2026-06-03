import { jest } from "@jest/globals";
import {
  mockExecute, mockClose, dbModuleMock, resetMocks,
} from "./helpers/mockDb.js";

// ─── Mock de la BD (antes del import del servicio) ────────────────────────────
jest.unstable_mockModule("../config/db.js", () => dbModuleMock);

const { getResumenFinanciero } = await import("../services/configuracion.service.js");

beforeEach(() => resetMocks());

// ═══════════════════════════════════════════════════════════════════════════════
// getResumenFinanciero — estructura de respuesta
// ═══════════════════════════════════════════════════════════════════════════════

describe("getResumenFinanciero — estructura de respuesta", () => {
  test("retorna todos los campos del contrato", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ TOTAL: 5000, EFECTIVO: 3000, TRANSFERENCIA: 1500, TARJETA: 500, CANTIDAD: 10 }] })
      .mockResolvedValueOnce({ rows: [{ TOTAL: 4000, EFECTIVO: 2000, TRANSFERENCIA: 1500, TARJETA: 500, CANTIDAD: 8 }] });

    const result = await getResumenFinanciero("2026-06");

    expect(result).toMatchObject({
      mes:           "2026-06",
      mesAnterior:   "2026-05",
      totalActual:   5000,
      totalAnterior: 4000,
      cantidadPagos: 10,
      desglosePorMetodo: {
        efectivo:      3000,
        transferencia: 1500,
        tarjeta:       500,
      },
    });
  });

  test("cierra la conexión al finalizar", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ TOTAL: 0, EFECTIVO: 0, TRANSFERENCIA: 0, TARJETA: 0, CANTIDAD: 0 }] })
      .mockResolvedValueOnce({ rows: [{ TOTAL: 0, EFECTIVO: 0, TRANSFERENCIA: 0, TARJETA: 0, CANTIDAD: 0 }] });

    await getResumenFinanciero("2026-06");

    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getResumenFinanciero — cálculo de porcentajeCambio
// ═══════════════════════════════════════════════════════════════════════════════

describe("getResumenFinanciero — porcentajeCambio", () => {
  test("calcula porcentajeCambio correctamente (aumento)", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ TOTAL: 5000, EFECTIVO: 5000, TRANSFERENCIA: 0, TARJETA: 0, CANTIDAD: 5 }] })
      .mockResolvedValueOnce({ rows: [{ TOTAL: 4000, EFECTIVO: 4000, TRANSFERENCIA: 0, TARJETA: 0, CANTIDAD: 4 }] });

    const result = await getResumenFinanciero("2026-06");

    // (5000 - 4000) / 4000 * 100 = 25.0
    expect(result.porcentajeCambio).toBe(25.0);
  });

  test("calcula porcentajeCambio negativo (disminución)", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ TOTAL: 3000, EFECTIVO: 3000, TRANSFERENCIA: 0, TARJETA: 0, CANTIDAD: 3 }] })
      .mockResolvedValueOnce({ rows: [{ TOTAL: 4000, EFECTIVO: 4000, TRANSFERENCIA: 0, TARJETA: 0, CANTIDAD: 4 }] });

    const result = await getResumenFinanciero("2026-06");

    // (3000 - 4000) / 4000 * 100 = -25.0
    expect(result.porcentajeCambio).toBe(-25.0);
  });

  test("porcentajeCambio = 0 cuando mes anterior no tiene pagos", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ TOTAL: 5000, EFECTIVO: 5000, TRANSFERENCIA: 0, TARJETA: 0, CANTIDAD: 5 }] })
      .mockResolvedValueOnce({ rows: [{ TOTAL: 0, EFECTIVO: 0, TRANSFERENCIA: 0, TARJETA: 0, CANTIDAD: 0 }] });

    const result = await getResumenFinanciero("2026-06");

    expect(result.porcentajeCambio).toBe(0);
  });

  test("porcentajeCambio se redondea a 1 decimal", async () => {
    // (1050 - 1000) / 1000 * 100 = 5.0 exacto; usemos valores que den decimal
    // (1100 - 1050) / 1050 * 100 = 4.761904... → 4.8
    mockExecute
      .mockResolvedValueOnce({ rows: [{ TOTAL: 1100, EFECTIVO: 1100, TRANSFERENCIA: 0, TARJETA: 0, CANTIDAD: 2 }] })
      .mockResolvedValueOnce({ rows: [{ TOTAL: 1050, EFECTIVO: 1050, TRANSFERENCIA: 0, TARJETA: 0, CANTIDAD: 2 }] });

    const result = await getResumenFinanciero("2026-06");

    expect(result.porcentajeCambio).toBe(4.8);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getResumenFinanciero — cálculo de mesAnterior
// ═══════════════════════════════════════════════════════════════════════════════

describe("getResumenFinanciero — cálculo de mesAnterior", () => {
  test("mes enero → mesAnterior es diciembre del año anterior", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ TOTAL: 0, EFECTIVO: 0, TRANSFERENCIA: 0, TARJETA: 0, CANTIDAD: 0 }] })
      .mockResolvedValueOnce({ rows: [{ TOTAL: 0, EFECTIVO: 0, TRANSFERENCIA: 0, TARJETA: 0, CANTIDAD: 0 }] });

    const result = await getResumenFinanciero("2026-01");

    expect(result.mesAnterior).toBe("2025-12");
    expect(result.mes).toBe("2026-01");
  });

  test("mes diciembre → mesAnterior es noviembre del mismo año", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ TOTAL: 0, EFECTIVO: 0, TRANSFERENCIA: 0, TARJETA: 0, CANTIDAD: 0 }] })
      .mockResolvedValueOnce({ rows: [{ TOTAL: 0, EFECTIVO: 0, TRANSFERENCIA: 0, TARJETA: 0, CANTIDAD: 0 }] });

    const result = await getResumenFinanciero("2026-12");

    expect(result.mesAnterior).toBe("2026-11");
  });

  test("mes con un dígito (febrero) → mesAnterior tiene cero al frente", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ TOTAL: 0, EFECTIVO: 0, TRANSFERENCIA: 0, TARJETA: 0, CANTIDAD: 0 }] })
      .mockResolvedValueOnce({ rows: [{ TOTAL: 0, EFECTIVO: 0, TRANSFERENCIA: 0, TARJETA: 0, CANTIDAD: 0 }] });

    const result = await getResumenFinanciero("2026-02");

    expect(result.mesAnterior).toBe("2026-01");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getResumenFinanciero — manejo de nulos en la BD
// ═══════════════════════════════════════════════════════════════════════════════

describe("getResumenFinanciero — campos null de la BD defaultean a 0", () => {
  test("fila con todos los campos null → totales en 0", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ TOTAL: null, EFECTIVO: null, TRANSFERENCIA: null, TARJETA: null, CANTIDAD: null }] })
      .mockResolvedValueOnce({ rows: [{ TOTAL: null, EFECTIVO: null, TRANSFERENCIA: null, TARJETA: null, CANTIDAD: null }] });

    const result = await getResumenFinanciero("2026-06");

    expect(result.totalActual).toBe(0);
    expect(result.totalAnterior).toBe(0);
    expect(result.cantidadPagos).toBe(0);
    expect(result.desglosePorMetodo.efectivo).toBe(0);
    expect(result.desglosePorMetodo.transferencia).toBe(0);
    expect(result.desglosePorMetodo.tarjeta).toBe(0);
    expect(result.porcentajeCambio).toBe(0);
  });

  test("fila undefined → totales en 0", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [undefined] })
      .mockResolvedValueOnce({ rows: [undefined] });

    const result = await getResumenFinanciero("2026-06");

    expect(result.totalActual).toBe(0);
    expect(result.totalAnterior).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getResumenFinanciero — manejo de errores de BD
// ═══════════════════════════════════════════════════════════════════════════════

describe("getResumenFinanciero — errores de BD", () => {
  test("error en la consulta → propaga el error y cierra conexión", async () => {
    mockExecute.mockRejectedValueOnce(new Error("ORA-00600: internal error"));

    await expect(getResumenFinanciero("2026-06")).rejects.toThrow("ORA-00600");

    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});
