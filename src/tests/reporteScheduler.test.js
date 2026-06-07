import { jest } from "@jest/globals";

// ─── Mocks ──────────────────────────────────────────────────────────────────
const mockSchedule = jest.fn();

jest.unstable_mockModule("node-cron", () => ({
  default: { schedule: mockSchedule },
  schedule: mockSchedule,
}));

const mockGenerarReporte = jest.fn();
const mockGenerarPDF     = jest.fn();
const mockGenerarXLSX    = jest.fn();

jest.unstable_mockModule("../services/reportes.service.js", () => ({
  generarReporte: mockGenerarReporte,
  generarPDF:     mockGenerarPDF,
  generarXLSX:    mockGenerarXLSX,
}));

const mockGuardarRegistro = jest.fn();

jest.unstable_mockModule("../models/reportes.model.js", () => ({
  guardarRegistro: mockGuardarRegistro,
  findAll:   jest.fn(),
  findById:  jest.fn(),
}));

const mockInsertReporteGenerado = jest.fn().mockResolvedValue(undefined);

jest.unstable_mockModule("../models/notificaciones.model.js", () => ({
  insertReporteGenerado: mockInsertReporteGenerado,
}));

const mockMkdir     = jest.fn();
const mockWriteFile = jest.fn();

jest.unstable_mockModule("node:fs/promises", () => ({
  default: { mkdir: mockMkdir, writeFile: mockWriteFile },
  mkdir:   mockMkdir,
  writeFile: mockWriteFile,
}));

// Importaciones después de los mocks (ESM)
process.env.STORAGE_PATH = "/tmp/test-reportes";

const { calcularPeriodo, initScheduler } = await import("../utils/reporteScheduler.js");

// ─── Helpers ────────────────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.REPORT_MENSUAL;
  delete process.env.REPORT_SEMESTRAL;
  delete process.env.REPORT_ANUAL;
});

// ═══════════════════════════════════════════════════════════════════════════════
// calcularPeriodo — función pura exportada
// ═══════════════════════════════════════════════════════════════════════════════

describe("calcularPeriodo — MENSUAL", () => {
  test("1 de febrero → cubre enero del mismo año", () => {
    const hoy = new Date(2026, 1, 1); // 1-feb-2026
    const { fechaInicio, fechaFin } = calcularPeriodo("MENSUAL", hoy);
    expect(fechaInicio).toBe("2026-01-01");
    expect(fechaFin).toBe("2026-01-31");
  });

  test("1 de enero → cubre diciembre del año anterior", () => {
    const hoy = new Date(2026, 0, 1); // 1-ene-2026
    const { fechaInicio, fechaFin } = calcularPeriodo("MENSUAL", hoy);
    expect(fechaInicio).toBe("2025-12-01");
    expect(fechaFin).toBe("2025-12-31");
  });
});

describe("calcularPeriodo — SEMESTRAL", () => {
  test("1 de enero (m=0) → cubre jul-dic del año anterior", () => {
    const hoy = new Date(2026, 0, 1);
    const { fechaInicio, fechaFin } = calcularPeriodo("SEMESTRAL", hoy);
    expect(fechaInicio).toBe("2025-07-01");
    expect(fechaFin).toBe("2025-12-31");
  });

  test("1 de julio (m=6) → cubre ene-jun del año actual", () => {
    const hoy = new Date(2026, 6, 1);
    const { fechaInicio, fechaFin } = calcularPeriodo("SEMESTRAL", hoy);
    expect(fechaInicio).toBe("2026-01-01");
    expect(fechaFin).toBe("2026-06-30");
  });
});

describe("calcularPeriodo — ANUAL", () => {
  test("1 de enero → cubre todo el año anterior", () => {
    const hoy = new Date(2026, 0, 1);
    const { fechaInicio, fechaFin } = calcularPeriodo("ANUAL", hoy);
    expect(fechaInicio).toBe("2025-01-01");
    expect(fechaFin).toBe("2025-12-31");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// initScheduler — activa cron jobs según variables de entorno
// ═══════════════════════════════════════════════════════════════════════════════

describe("initScheduler — ningún reporte habilitado", () => {
  test("no registra ningún cron job", () => {
    initScheduler();
    expect(mockSchedule).not.toHaveBeenCalled();
  });
});

describe("initScheduler — REPORT_MENSUAL=true", () => {
  test("registra exactamente un cron job con la expresión mensual", () => {
    process.env.REPORT_MENSUAL = "true";
    initScheduler();
    expect(mockSchedule).toHaveBeenCalledTimes(1);
    expect(mockSchedule.mock.calls[0][0]).toBe("0 6 1 * *");
  });
});

describe("initScheduler — REPORT_SEMESTRAL=true", () => {
  test("registra el cron job semestral", () => {
    process.env.REPORT_SEMESTRAL = "true";
    initScheduler();
    expect(mockSchedule).toHaveBeenCalledTimes(1);
    expect(mockSchedule.mock.calls[0][0]).toBe("0 6 1 1,7 *");
  });
});

describe("initScheduler — REPORT_ANUAL=true", () => {
  test("registra el cron job anual", () => {
    process.env.REPORT_ANUAL = "true";
    initScheduler();
    expect(mockSchedule).toHaveBeenCalledTimes(1);
    expect(mockSchedule.mock.calls[0][0]).toBe("0 6 1 1 *");
  });
});

describe("initScheduler — los tres tipos habilitados", () => {
  test("registra tres cron jobs distintos", () => {
    process.env.REPORT_MENSUAL   = "true";
    process.env.REPORT_SEMESTRAL = "true";
    process.env.REPORT_ANUAL     = "true";
    initScheduler();
    expect(mockSchedule).toHaveBeenCalledTimes(3);
    const exprs = mockSchedule.mock.calls.map((c) => c[0]);
    expect(exprs).toContain("0 6 1 * *");
    expect(exprs).toContain("0 6 1 1,7 *");
    expect(exprs).toContain("0 6 1 1 *");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// generarAutomatico — invocado a través del callback del cron
// ═══════════════════════════════════════════════════════════════════════════════

describe("generarAutomatico — ejecución exitosa del callback MENSUAL", () => {
  test("llama a generarReporte, generarPDF, generarXLSX y guardarRegistro", async () => {
    process.env.REPORT_MENSUAL = "true";
    mockGenerarReporte.mockResolvedValueOnce({ resumen: {} });
    mockGenerarPDF.mockResolvedValueOnce(Buffer.from("pdf-bytes"));
    mockGenerarXLSX.mockResolvedValueOnce(Buffer.from("xlsx-bytes"));
    mockMkdir.mockResolvedValueOnce(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockGuardarRegistro.mockResolvedValueOnce({});

    initScheduler();

    // captura el callback registrado
    const callback = mockSchedule.mock.calls[0][1];
    await callback();

    expect(mockGenerarReporte).toHaveBeenCalledTimes(1);
    expect(mockGenerarPDF).toHaveBeenCalledTimes(1);
    expect(mockGenerarXLSX).toHaveBeenCalledTimes(1);
    expect(mockGuardarRegistro).toHaveBeenCalledTimes(1);
    // El registro debe incluir tipo MENSUAL
    expect(mockGuardarRegistro.mock.calls[0][0]).toMatchObject({ tipo: "MENSUAL" });
  });
});

describe("generarAutomatico — error en generarReporte (no crashea el scheduler)", () => {
  test("captura el error, logea y no relanza", async () => {
    process.env.REPORT_MENSUAL = "true";
    mockGenerarReporte.mockRejectedValueOnce(new Error("DB connection lost"));

    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    initScheduler();
    const callback = mockSchedule.mock.calls[0][1];

    // No debe lanzar
    await expect(callback()).resolves.toBeUndefined();

    // Formato: console.error(`[scheduler] Error generando reporte ${tipo} (...)`, err)
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[scheduler]"),
      expect.any(Error)
    );

    errorSpy.mockRestore();
  });
});

describe("generarAutomatico — callback SEMESTRAL exitoso", () => {
  test("guarda registro con tipo SEMESTRAL", async () => {
    process.env.REPORT_SEMESTRAL = "true";
    mockGenerarReporte.mockResolvedValueOnce({});
    mockGenerarPDF.mockResolvedValueOnce(Buffer.from(""));
    mockGenerarXLSX.mockResolvedValueOnce(Buffer.from(""));
    mockMkdir.mockResolvedValueOnce(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockGuardarRegistro.mockResolvedValueOnce({});

    initScheduler();
    const callback = mockSchedule.mock.calls[0][1];
    await callback();

    expect(mockGuardarRegistro.mock.calls[0][0]).toMatchObject({ tipo: "SEMESTRAL" });
  });
});

describe("generarAutomatico — callback ANUAL exitoso", () => {
  test("guarda registro con tipo ANUAL", async () => {
    process.env.REPORT_ANUAL = "true";
    mockGenerarReporte.mockResolvedValueOnce({});
    mockGenerarPDF.mockResolvedValueOnce(Buffer.from(""));
    mockGenerarXLSX.mockResolvedValueOnce(Buffer.from(""));
    mockMkdir.mockResolvedValueOnce(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockGuardarRegistro.mockResolvedValueOnce({});

    initScheduler();
    const callback = mockSchedule.mock.calls[0][1];
    await callback();

    expect(mockGuardarRegistro.mock.calls[0][0]).toMatchObject({ tipo: "ANUAL" });
  });
});

describe("generarAutomatico — notificación REPORTE_GENERADO", () => {
  test("llama insertReporteGenerado tras guardar registro exitosamente", async () => {
    process.env.REPORT_MENSUAL = "true";
    mockGenerarReporte.mockResolvedValueOnce({});
    mockGenerarPDF.mockResolvedValueOnce(Buffer.from(""));
    mockGenerarXLSX.mockResolvedValueOnce(Buffer.from(""));
    mockMkdir.mockResolvedValueOnce(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockGuardarRegistro.mockResolvedValueOnce({});

    initScheduler();
    const callback = mockSchedule.mock.calls[0][1];
    await callback();

    expect(mockInsertReporteGenerado).toHaveBeenCalledWith(
      "MENSUAL",
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
    );
  });

  test("no lanza si insertReporteGenerado falla", async () => {
    process.env.REPORT_MENSUAL = "true";
    mockGenerarReporte.mockResolvedValueOnce({});
    mockGenerarPDF.mockResolvedValueOnce(Buffer.from(""));
    mockGenerarXLSX.mockResolvedValueOnce(Buffer.from(""));
    mockMkdir.mockResolvedValueOnce(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockGuardarRegistro.mockResolvedValueOnce({});
    mockInsertReporteGenerado.mockRejectedValueOnce(new Error("DB error"));

    initScheduler();
    const callback = mockSchedule.mock.calls[0][1];
    await expect(callback()).resolves.toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// calcularPeriodo — casos borde de meses
// ═══════════════════════════════════════════════════════════════════════════════

describe("calcularPeriodo — MENSUAL año bisiesto", () => {
  test("1 de marzo 2024 → febrero con 29 días", () => {
    const { fechaInicio, fechaFin } = calcularPeriodo("MENSUAL", new Date(2024, 2, 1));
    expect(fechaInicio).toBe("2024-02-01");
    expect(fechaFin).toBe("2024-02-29");
  });
});

describe("calcularPeriodo — MENSUAL meses con 30 días", () => {
  test("1 de mayo → abril (30 días)", () => {
    const { fechaInicio, fechaFin } = calcularPeriodo("MENSUAL", new Date(2026, 4, 1));
    expect(fechaInicio).toBe("2026-04-01");
    expect(fechaFin).toBe("2026-04-30");
  });

  test("1 de diciembre → noviembre (30 días)", () => {
    const { fechaInicio, fechaFin } = calcularPeriodo("MENSUAL", new Date(2026, 11, 1));
    expect(fechaInicio).toBe("2026-11-01");
    expect(fechaFin).toBe("2026-11-30");
  });
});

describe("calcularPeriodo — MENSUAL meses con 31 días", () => {
  test("1 de abril → marzo (31 días)", () => {
    const { fechaInicio, fechaFin } = calcularPeriodo("MENSUAL", new Date(2026, 3, 1));
    expect(fechaInicio).toBe("2026-03-01");
    expect(fechaFin).toBe("2026-03-31");
  });

  test("1 de agosto → julio (31 días)", () => {
    const { fechaInicio, fechaFin } = calcularPeriodo("MENSUAL", new Date(2026, 7, 1));
    expect(fechaInicio).toBe("2026-07-01");
    expect(fechaFin).toBe("2026-07-31");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// generarAutomatico — errores intermedios (no deben crashear el scheduler)
// ═══════════════════════════════════════════════════════════════════════════════

describe("generarAutomatico — error en generarPDF", () => {
  test("captura el error sin relanzar y no escribe archivos", async () => {
    process.env.REPORT_MENSUAL = "true";
    mockGenerarReporte.mockResolvedValueOnce({});
    mockGenerarPDF.mockRejectedValueOnce(new Error("PDF generation failed"));
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});

    initScheduler();
    await expect(mockSchedule.mock.calls[0][1]()).resolves.toBeUndefined();

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("[scheduler]"),
      expect.any(Error)
    );
    expect(mockWriteFile).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("generarAutomatico — error en fs.mkdir", () => {
  test("captura el error sin relanzar y no llega a escribir archivos", async () => {
    process.env.REPORT_SEMESTRAL = "true";
    mockGenerarReporte.mockResolvedValueOnce({});
    mockGenerarPDF.mockResolvedValueOnce(Buffer.from(""));
    mockGenerarXLSX.mockResolvedValueOnce(Buffer.from(""));
    mockMkdir.mockRejectedValueOnce(new Error("EACCES: permission denied"));
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});

    initScheduler();
    await expect(mockSchedule.mock.calls[0][1]()).resolves.toBeUndefined();

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("[scheduler]"),
      expect.any(Error)
    );
    expect(mockWriteFile).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("generarAutomatico — error en guardarRegistro", () => {
  test("captura el error sin relanzar y no dispara la notificación", async () => {
    process.env.REPORT_ANUAL = "true";
    mockGenerarReporte.mockResolvedValueOnce({});
    mockGenerarPDF.mockResolvedValueOnce(Buffer.from(""));
    mockGenerarXLSX.mockResolvedValueOnce(Buffer.from(""));
    mockMkdir.mockResolvedValueOnce(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockGuardarRegistro.mockRejectedValueOnce(new Error("ORA-00001: unique constraint"));
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});

    initScheduler();
    await expect(mockSchedule.mock.calls[0][1]()).resolves.toBeUndefined();

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("[scheduler]"),
      expect.any(Error)
    );
    // Si guardarRegistro falla, la notificación no debe dispararse
    expect(mockInsertReporteGenerado).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// generarAutomatico — verificación de rutas y log de éxito
// ═══════════════════════════════════════════════════════════════════════════════

describe("generarAutomatico — formato de rutas en guardarRegistro", () => {
  test("rutaPdf y rutaXlsx contienen tipo y fechaInicio", async () => {
    process.env.REPORT_MENSUAL = "true";
    mockGenerarReporte.mockResolvedValueOnce({});
    mockGenerarPDF.mockResolvedValueOnce(Buffer.from(""));
    mockGenerarXLSX.mockResolvedValueOnce(Buffer.from(""));
    mockMkdir.mockResolvedValueOnce(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockGuardarRegistro.mockResolvedValueOnce({});

    initScheduler();
    await mockSchedule.mock.calls[0][1]();

    const { fechaInicio, rutaPdf, rutaXlsx } = mockGuardarRegistro.mock.calls[0][0];
    expect(rutaPdf).toContain("reporte-mensual-");
    expect(rutaXlsx).toContain("reporte-mensual-");
    expect(rutaPdf).toContain(fechaInicio);
    expect(rutaXlsx).toContain(fechaInicio);
    expect(rutaPdf).toMatch(/\.pdf$/);
    expect(rutaXlsx).toMatch(/\.xlsx$/);
  });
});

describe("generarAutomatico — console.log en éxito", () => {
  test("registra mensaje con 'generado' en consola", async () => {
    process.env.REPORT_MENSUAL = "true";
    mockGenerarReporte.mockResolvedValueOnce({});
    mockGenerarPDF.mockResolvedValueOnce(Buffer.from(""));
    mockGenerarXLSX.mockResolvedValueOnce(Buffer.from(""));
    mockMkdir.mockResolvedValueOnce(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockGuardarRegistro.mockResolvedValueOnce({});
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});

    initScheduler();
    await mockSchedule.mock.calls[0][1]();

    // initScheduler también logea "activado"; el callback debe loguear "generado"
    const mensajes = spy.mock.calls.map((c) => c[0]);
    expect(mensajes.some((m) => m.includes("generado"))).toBe(true);
    spy.mockRestore();
  });
});
