/**
 * Tests unitarios de src/services/reportes.service.js
 * Cubre las 3 funciones exportadas: generarReporte, generarPDF, generarXLSX.
 * Mockea reportes.model, puppeteer, xlsx y reporteTemplate — sin Oracle ni Chrome real.
 */
import { jest } from '@jest/globals';

// ── mocks de modelos/utilidades ───────────────────────────────────────────────

const mockGetResumenPeriodo       = jest.fn();
const mockGetDetalleServicios     = jest.fn();
const mockGetDistribucionCiudades = jest.fn();
const mockGetEstudios             = jest.fn();
const mockGetAtencionesPorMes     = jest.fn();

jest.unstable_mockModule('../models/reportes.model.js', () => ({
  getResumenPeriodo:       mockGetResumenPeriodo,
  getDetalleServicios:     mockGetDetalleServicios,
  getDistribucionCiudades: mockGetDistribucionCiudades,
  getEstudios:             mockGetEstudios,
  getAtencionesPorMes:     mockGetAtencionesPorMes,
}));

const mockGenerarHTML = jest.fn();

jest.unstable_mockModule('../utils/reporteTemplate.js', () => ({
  generarHTML: mockGenerarHTML,
}));

// ── mock de puppeteer ─────────────────────────────────────────────────────────

const mockPdfFn        = jest.fn();
const mockSetContentFn = jest.fn();
const mockNewPageFn    = jest.fn();
const mockBrowserClose = jest.fn();
const mockLaunch       = jest.fn();

jest.unstable_mockModule('puppeteer', () => ({
  default: { launch: mockLaunch },
}));

// ── mock de xlsx ──────────────────────────────────────────────────────────────

const mockBookNew         = jest.fn();
const mockBookAppendSheet = jest.fn();
const mockJsonToSheet     = jest.fn();
const mockXlsxWrite       = jest.fn();

jest.unstable_mockModule('xlsx', () => ({
  utils: {
    book_new:         mockBookNew,
    book_append_sheet: mockBookAppendSheet,
    json_to_sheet:    mockJsonToSheet,
  },
  write: mockXlsxWrite,
}));

const { generarReporte, generarPDF, generarXLSX } = await import('../services/reportes.service.js');

const PERIODO = { inicio: '2026-01-01', fin: '2026-01-31' };
const DATA = {
  tipo:     'estadisticas',
  resumen:  { CANT_SERVICIOS: 10 },
  detalle:  [{ NOMBRE: 'Consulta', CANTIDAD: 5 }],
  ciudades: [{ CIUDAD: 'Monterrey', CANTIDAD: 8 }],
  estudios: [],
  porMes:   [{ MES: '2026-01', PACIENTES: 8, SERVICIOS: 10 }],
};

beforeEach(() => {
  jest.clearAllMocks();

  // Defaults reutilizables para puppeteer
  mockBrowserClose.mockResolvedValue(undefined);
  mockSetContentFn.mockResolvedValue(undefined);
  mockPdfFn.mockResolvedValue(Buffer.from('%PDF-'));
  mockNewPageFn.mockResolvedValue({
    setContent: mockSetContentFn,
    pdf: mockPdfFn,
  });
  mockLaunch.mockResolvedValue({
    newPage:  mockNewPageFn,
    close:    mockBrowserClose,
  });

  // Default para atenciones por mes
  mockGetAtencionesPorMes.mockResolvedValue(DATA.porMes);

  // Defaults para xlsx
  mockBookNew.mockReturnValue({});
  mockJsonToSheet.mockReturnValue({});
  mockXlsxWrite.mockReturnValue(Buffer.from('xlsx-data'));

  // Default para reporteTemplate
  mockGenerarHTML.mockReturnValue('<html><body>Reporte</body></html>');
});

// ── generarReporte ────────────────────────────────────────────────────────────

describe('generarReporte', () => {
  it('llama las 5 queries del modelo y retorna el objeto consolidado', async () => {
    mockGetResumenPeriodo      .mockResolvedValueOnce(DATA.resumen);
    mockGetDetalleServicios    .mockResolvedValueOnce(DATA.detalle);
    mockGetDistribucionCiudades.mockResolvedValueOnce(DATA.ciudades);
    mockGetEstudios            .mockResolvedValueOnce(DATA.estudios);
    mockGetAtencionesPorMes    .mockResolvedValueOnce(DATA.porMes);

    const result = await generarReporte(PERIODO.inicio, PERIODO.fin, 'estadisticas');

    expect(result).toEqual(DATA);
    expect(mockGetResumenPeriodo      ).toHaveBeenCalledWith(PERIODO.inicio, PERIODO.fin);
    expect(mockGetDetalleServicios    ).toHaveBeenCalledWith(PERIODO.inicio, PERIODO.fin);
    expect(mockGetDistribucionCiudades).toHaveBeenCalledWith(PERIODO.inicio, PERIODO.fin);
    expect(mockGetEstudios            ).toHaveBeenCalledWith(PERIODO.inicio, PERIODO.fin);
    expect(mockGetAtencionesPorMes    ).toHaveBeenCalledWith(PERIODO.inicio, PERIODO.fin);
  });

  it('propaga errores del modelo sin envolver', async () => {
    mockGetResumenPeriodo.mockRejectedValueOnce(new Error('ORA-00942'));

    await expect(generarReporte(PERIODO.inicio, PERIODO.fin))
      .rejects.toThrow('ORA-00942');
  });
});

// ── generarPDF ────────────────────────────────────────────────────────────────

describe('generarPDF', () => {
  it('retorna un Buffer con contenido del pdf', async () => {
    const result = await generarPDF(DATA, PERIODO.inicio, PERIODO.fin);

    expect(Buffer.isBuffer(result)).toBe(true);
    expect(mockGenerarHTML).toHaveBeenCalledWith(DATA, {
      fechaInicio: PERIODO.inicio, fechaFin: PERIODO.fin,
    });
    expect(mockLaunch).toHaveBeenCalledTimes(1);
    expect(mockSetContentFn).toHaveBeenCalledWith(
      '<html><body>Reporte</body></html>',
      { waitUntil: 'load' }
    );
    expect(mockPdfFn).toHaveBeenCalledWith({
      format: 'Letter', printBackground: true,
    });
  });

  it('cierra el browser incluso cuando page.pdf() falla', async () => {
    mockPdfFn.mockRejectedValueOnce(new Error('Chrome error'));

    await expect(generarPDF(DATA, PERIODO.inicio, PERIODO.fin))
      .rejects.toThrow('Chrome error');

    expect(mockBrowserClose).toHaveBeenCalledTimes(1);
  });

  it('cierra el browser incluso cuando setContent() falla', async () => {
    mockSetContentFn.mockRejectedValueOnce(new Error('Navigation timeout'));

    await expect(generarPDF(DATA, PERIODO.inicio, PERIODO.fin))
      .rejects.toThrow('Navigation timeout');

    expect(mockBrowserClose).toHaveBeenCalledTimes(1);
  });
});

// ── generarXLSX ───────────────────────────────────────────────────────────────

describe('generarXLSX', () => {
  it('crea workbook con 5 hojas y retorna buffer', async () => {
    const result = await generarXLSX(DATA);

    expect(mockBookNew).toHaveBeenCalledTimes(1);
    expect(mockBookAppendSheet).toHaveBeenCalledTimes(5);
    expect(mockXlsxWrite).toHaveBeenCalledWith(
      expect.anything(),
      { type: 'buffer', bookType: 'xlsx' }
    );
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it('pasa cada sección de data a json_to_sheet en el orden correcto', async () => {
    await generarXLSX(DATA);

    const calls = mockJsonToSheet.mock.calls;
    expect(calls[0][0]).toEqual([DATA.resumen]);  // Resumen wraps object in array
    expect(calls[1][0]).toEqual(DATA.porMes);
    expect(calls[2][0]).toEqual(DATA.detalle);
    expect(calls[3][0]).toEqual(DATA.ciudades);
    expect(calls[4][0]).toEqual(DATA.estudios);
  });
});
