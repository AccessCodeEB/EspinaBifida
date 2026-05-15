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
const mockGetBeneficiariosPeriodo = jest.fn();
const mockGetMembresias           = jest.fn();
const mockGetServiciosPeriodo     = jest.fn();
const mockGetArticulosStock       = jest.fn();
const mockGetMovimientosPeriodo   = jest.fn();
const mockGetCitasPeriodo         = jest.fn();

jest.unstable_mockModule('../models/reportes.model.js', () => ({
  getResumenPeriodo:       mockGetResumenPeriodo,
  getDetalleServicios:     mockGetDetalleServicios,
  getDistribucionCiudades: mockGetDistribucionCiudades,
  getEstudios:             mockGetEstudios,
  getAtencionesPorMes:     mockGetAtencionesPorMes,
  getBeneficiariosPeriodo: mockGetBeneficiariosPeriodo,
  getMembresias:           mockGetMembresias,
  getServiciosPeriodo:     mockGetServiciosPeriodo,
  getArticulosStock:       mockGetArticulosStock,
  getMovimientosPeriodo:   mockGetMovimientosPeriodo,
  getCitasPeriodo:         mockGetCitasPeriodo,
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

  it('tipo beneficiarios llama getBeneficiariosPeriodo y retorna { tipo, filas }', async () => {
    const filas = [{ CURP: 'GARM900101HNLRLS01', NOMBRE_COMPLETO: 'Marco García' }];
    mockGetBeneficiariosPeriodo.mockResolvedValueOnce(filas);

    const result = await generarReporte(PERIODO.inicio, PERIODO.fin, 'beneficiarios');

    expect(result).toEqual({ tipo: 'beneficiarios', filas });
    expect(mockGetBeneficiariosPeriodo).toHaveBeenCalledWith(PERIODO.inicio, PERIODO.fin);
  });

  it('tipo membresias llama getMembresias y retorna { tipo, filas }', async () => {
    const filas = [{ NOMBRE: 'Ana Martínez', ESTADO: 'Activa' }];
    mockGetMembresias.mockResolvedValueOnce(filas);

    const result = await generarReporte(PERIODO.inicio, PERIODO.fin, 'membresias');

    expect(result).toEqual({ tipo: 'membresias', filas });
    expect(mockGetMembresias).toHaveBeenCalledWith(PERIODO.inicio, PERIODO.fin);
  });

  it('tipo servicios llama getServiciosPeriodo y retorna { tipo, filas }', async () => {
    const filas = [{ FECHA: '2026-01-15', TIPO_SERVICIO: 'Consulta', MONTO_PAGADO: 50 }];
    mockGetServiciosPeriodo.mockResolvedValueOnce(filas);

    const result = await generarReporte(PERIODO.inicio, PERIODO.fin, 'servicios');

    expect(result).toEqual({ tipo: 'servicios', filas });
    expect(mockGetServiciosPeriodo).toHaveBeenCalledWith(PERIODO.inicio, PERIODO.fin);
  });

  it('tipo inventario llama getArticulosStock + getMovimientosPeriodo y retorna { tipo, articulos, movimientos }', async () => {
    const articulos   = [{ DESCRIPCION: 'Silla', INVENTARIO_ACTUAL: 3 }];
    const movimientos = [{ ARTICULO: 'Silla', TIPO_MOVIMIENTO: 'SALIDA', CANTIDAD: 1 }];
    mockGetArticulosStock    .mockResolvedValueOnce(articulos);
    mockGetMovimientosPeriodo.mockResolvedValueOnce(movimientos);

    const result = await generarReporte(PERIODO.inicio, PERIODO.fin, 'inventario');

    expect(result).toEqual({ tipo: 'inventario', articulos, movimientos });
    expect(mockGetArticulosStock).toHaveBeenCalledTimes(1);
    expect(mockGetMovimientosPeriodo).toHaveBeenCalledWith(PERIODO.inicio, PERIODO.fin);
  });

  it('tipo citas llama getCitasPeriodo y retorna { tipo, filas }', async () => {
    const filas = [{ FECHA: '2026-01-20', ESPECIALISTA: 'Dr. López', ESTATUS: 'Completada' }];
    mockGetCitasPeriodo.mockResolvedValueOnce(filas);

    const result = await generarReporte(PERIODO.inicio, PERIODO.fin, 'citas');

    expect(result).toEqual({ tipo: 'citas', filas });
    expect(mockGetCitasPeriodo).toHaveBeenCalledWith(PERIODO.inicio, PERIODO.fin);
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

  it('beneficiarios: crea 1 hoja "Beneficiarios"', async () => {
    const data = { tipo: 'beneficiarios', filas: [{ CURP: 'ABC', NOMBRE_COMPLETO: 'X' }] };
    await generarXLSX(data);

    expect(mockBookAppendSheet).toHaveBeenCalledTimes(1);
    expect(mockBookAppendSheet.mock.calls[0][2]).toBe('Beneficiarios');
    expect(mockJsonToSheet).toHaveBeenCalledWith(data.filas);
  });

  it('membresias: crea 1 hoja "Membresías"', async () => {
    const data = { tipo: 'membresias', filas: [{ NOMBRE: 'Ana', ESTADO: 'Activa' }] };
    await generarXLSX(data);

    expect(mockBookAppendSheet).toHaveBeenCalledTimes(1);
    expect(mockBookAppendSheet.mock.calls[0][2]).toBe('Membresías');
  });

  it('servicios: crea 1 hoja "Servicios"', async () => {
    const data = { tipo: 'servicios', filas: [{ FECHA: '2026-01-15', TIPO_SERVICIO: 'Consulta' }] };
    await generarXLSX(data);

    expect(mockBookAppendSheet).toHaveBeenCalledTimes(1);
    expect(mockBookAppendSheet.mock.calls[0][2]).toBe('Servicios');
  });

  it('inventario: crea 2 hojas "Stock Actual" y "Movimientos"', async () => {
    const data = {
      tipo: 'inventario',
      articulos:   [{ DESCRIPCION: 'Silla', INVENTARIO_ACTUAL: 3 }],
      movimientos: [{ ARTICULO: 'Silla', TIPO_MOVIMIENTO: 'SALIDA' }],
    };
    await generarXLSX(data);

    expect(mockBookAppendSheet).toHaveBeenCalledTimes(2);
    expect(mockBookAppendSheet.mock.calls[0][2]).toBe('Stock Actual');
    expect(mockBookAppendSheet.mock.calls[1][2]).toBe('Movimientos');
    expect(mockJsonToSheet).toHaveBeenCalledWith(data.articulos);
    expect(mockJsonToSheet).toHaveBeenCalledWith(data.movimientos);
  });

  it('citas: crea 1 hoja "Citas"', async () => {
    const data = { tipo: 'citas', filas: [{ FECHA: '2026-01-20', ESPECIALISTA: 'Dr. López' }] };
    await generarXLSX(data);

    expect(mockBookAppendSheet).toHaveBeenCalledTimes(1);
    expect(mockBookAppendSheet.mock.calls[0][2]).toBe('Citas');
  });
});
