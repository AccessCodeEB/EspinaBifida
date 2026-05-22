import { jest } from '@jest/globals';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockFindAll                    = jest.fn();
const mockFindPendientes             = jest.fn();
const mockCountPendientes            = jest.fn();
const mockMarkAsRead                 = jest.fn();
const mockUpsertStockBajo            = jest.fn();
const mockUpsertMembresia            = jest.fn();
const mockFindArticulosConStockBajo  = jest.fn();
const mockFindMembresiasProximas     = jest.fn();
const mockFindMembresiasVencidas     = jest.fn();

jest.unstable_mockModule('../models/notificaciones.model.js', () => ({
  findAll:                   mockFindAll,
  findPendientes:            mockFindPendientes,
  countPendientes:           mockCountPendientes,
  markAsRead:                mockMarkAsRead,
  upsertStockBajo:           mockUpsertStockBajo,
  upsertMembresia:           mockUpsertMembresia,
  findArticulosConStockBajo: mockFindArticulosConStockBajo,
  findMembresiasProximas:    mockFindMembresiasProximas,
  findMembresiasVencidas:    mockFindMembresiasVencidas,
}));

const Service = await import('../services/notificaciones.service.js');

beforeEach(() => jest.resetAllMocks());

// ── Delegaciones directas ─────────────────────────────────────────────────────

describe('getAll', () => {
  it('delega al model con el límite dado', async () => {
    mockFindAll.mockResolvedValueOnce([]);
    await Service.getAll(50);
    expect(mockFindAll).toHaveBeenCalledWith(50);
  });
});

describe('getPendientes', () => {
  it('delega al model', async () => {
    mockFindPendientes.mockResolvedValueOnce([]);
    await Service.getPendientes();
    expect(mockFindPendientes).toHaveBeenCalledTimes(1);
  });
});

describe('getCount', () => {
  it('retorna el conteo del model', async () => {
    mockCountPendientes.mockResolvedValueOnce(7);
    const result = await Service.getCount();
    expect(result).toBe(7);
  });
});

describe('marcarLeida', () => {
  it('delega al model con el id', async () => {
    mockMarkAsRead.mockResolvedValueOnce(undefined);
    await Service.marcarLeida(42);
    expect(mockMarkAsRead).toHaveBeenCalledWith(42);
  });
});

// ── runJob ────────────────────────────────────────────────────────────────────

describe('runJob', () => {
  beforeEach(() => {
    mockUpsertStockBajo.mockResolvedValue(undefined);
    mockUpsertMembresia.mockResolvedValue(undefined);
  });

  it('llama upsertStockBajo para cada artículo con stock bajo', async () => {
    mockFindArticulosConStockBajo.mockResolvedValueOnce([
      { ID_ARTICULO: 1, DESCRIPCION: 'Silla', INVENTARIO_ACTUAL: 2, STOCK_MINIMO: 5 },
    ]);
    mockFindMembresiasProximas.mockResolvedValueOnce([]);
    mockFindMembresiasVencidas.mockResolvedValueOnce([]);

    const res = await Service.runJob();

    expect(mockUpsertStockBajo).toHaveBeenCalledTimes(1);
    expect(mockUpsertStockBajo).toHaveBeenCalledWith(1, expect.stringContaining('Silla'));
    expect(res).toEqual({ stockBajo: 1, proximas: 0, vencidas: 0 });
  });

  it('llama upsertMembresia MEMBRESIA_PROXIMA con mensaje de días', async () => {
    mockFindArticulosConStockBajo.mockResolvedValueOnce([]);
    mockFindMembresiasProximas.mockResolvedValueOnce([
      { CURP: 'ABCD000000XXXXXX00', NOMBRE: 'Juan Pérez', FECHA_VIGENCIA_FIN: new Date(), DIAS_RESTANTES: 5 },
    ]);
    mockFindMembresiasVencidas.mockResolvedValueOnce([]);

    const res = await Service.runJob();

    expect(mockUpsertMembresia).toHaveBeenCalledWith(
      'ABCD000000XXXXXX00',
      'MEMBRESIA_PROXIMA',
      expect.stringContaining('5 día')
    );
    expect(res.proximas).toBe(1);
  });

  it('usa singular "día" cuando quedan exactamente 1 día', async () => {
    mockFindArticulosConStockBajo.mockResolvedValueOnce([]);
    mockFindMembresiasProximas.mockResolvedValueOnce([
      { CURP: 'CURP01', NOMBRE: 'Ana', FECHA_VIGENCIA_FIN: new Date(), DIAS_RESTANTES: 1 },
    ]);
    mockFindMembresiasVencidas.mockResolvedValueOnce([]);

    await Service.runJob();

    expect(mockUpsertMembresia).toHaveBeenCalledWith(
      'CURP01',
      'MEMBRESIA_PROXIMA',
      expect.stringContaining('1 día.')
    );
  });

  it('llama upsertMembresia MEMBRESIA_VENCIDA con nombre del beneficiario', async () => {
    mockFindArticulosConStockBajo.mockResolvedValueOnce([]);
    mockFindMembresiasProximas.mockResolvedValueOnce([]);
    mockFindMembresiasVencidas.mockResolvedValueOnce([
      { CURP: 'ZZZZ000000XXXXXX00', NOMBRE: 'María López', FECHA_VIGENCIA_FIN: new Date('2025-01-01') },
    ]);

    const res = await Service.runJob();

    expect(mockUpsertMembresia).toHaveBeenCalledWith(
      'ZZZZ000000XXXXXX00',
      'MEMBRESIA_VENCIDA',
      expect.stringContaining('María López')
    );
    expect(res.vencidas).toBe(1);
  });

  it('retorna ceros cuando no hay alertas', async () => {
    mockFindArticulosConStockBajo.mockResolvedValueOnce([]);
    mockFindMembresiasProximas.mockResolvedValueOnce([]);
    mockFindMembresiasVencidas.mockResolvedValueOnce([]);

    const res = await Service.runJob();
    expect(res).toEqual({ stockBajo: 0, proximas: 0, vencidas: 0 });
  });

  it('procesa múltiples artículos y membresías', async () => {
    mockFindArticulosConStockBajo.mockResolvedValueOnce([
      { ID_ARTICULO: 1, DESCRIPCION: 'Silla', INVENTARIO_ACTUAL: 1, STOCK_MINIMO: 5 },
      { ID_ARTICULO: 2, DESCRIPCION: 'Mesa',  INVENTARIO_ACTUAL: 0, STOCK_MINIMO: 3 },
    ]);
    mockFindMembresiasProximas.mockResolvedValueOnce([
      { CURP: 'C1', NOMBRE: 'Ana', FECHA_VIGENCIA_FIN: new Date(), DIAS_RESTANTES: 10 },
      { CURP: 'C2', NOMBRE: 'Luis', FECHA_VIGENCIA_FIN: new Date(), DIAS_RESTANTES: 3 },
    ]);
    mockFindMembresiasVencidas.mockResolvedValueOnce([]);

    const res = await Service.runJob();

    expect(mockUpsertStockBajo).toHaveBeenCalledTimes(2);
    expect(mockUpsertMembresia).toHaveBeenCalledTimes(2);
    expect(res).toEqual({ stockBajo: 2, proximas: 2, vencidas: 0 });
  });
});
