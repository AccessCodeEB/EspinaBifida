import { jest } from '@jest/globals';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockFindAll                      = jest.fn();
const mockDeleteE2ENotificaciones      = jest.fn();
const mockFindPendientes               = jest.fn();
const mockCountPendientes              = jest.fn();
const mockMarkAsRead                   = jest.fn();
const mockMarkAllAsRead                = jest.fn();
const mockSyncStockBajoConsolidado     = jest.fn();
const mockSyncCitasHoyConsolidado      = jest.fn();
const mockSyncComodatosPorVencer       = jest.fn();
const mockUpsertMembresia              = jest.fn();
const mockClosePendingMembresia        = jest.fn();
const mockFindArticulosConStockBajo    = jest.fn();
const mockFindArticulosSinStock        = jest.fn();
const mockSyncSinStockConsolidado      = jest.fn();
const mockFindMembresiasProximas       = jest.fn();
const mockFindMembresiasVencidas       = jest.fn();
const mockFindCitasHoyProgramadas      = jest.fn();
const mockFindComodatosPorVencer           = jest.fn();
const mockDeleteOrphanedNotificaciones     = jest.fn();

jest.unstable_mockModule('../models/notificaciones.model.js', () => ({
  findAll:                   mockFindAll,
  deleteE2ENotificaciones:   mockDeleteE2ENotificaciones,
  findPendientes:            mockFindPendientes,
  countPendientes:           mockCountPendientes,
  markAsRead:                mockMarkAsRead,
  markAllAsRead:             mockMarkAllAsRead,
  syncStockBajoConsolidado:  mockSyncStockBajoConsolidado,
  syncSinStockConsolidado:   mockSyncSinStockConsolidado,
  syncCitasHoyConsolidado:   mockSyncCitasHoyConsolidado,
  syncComodatosPorVencer:    mockSyncComodatosPorVencer,
  upsertMembresia:           mockUpsertMembresia,
  closePendingMembresia:     mockClosePendingMembresia,
  findArticulosConStockBajo: mockFindArticulosConStockBajo,
  findArticulosSinStock:     mockFindArticulosSinStock,
  findMembresiasProximas:    mockFindMembresiasProximas,
  findMembresiasVencidas:    mockFindMembresiasVencidas,
  findCitasHoyProgramadas:   mockFindCitasHoyProgramadas,
  findComodatosPorVencer:             mockFindComodatosPorVencer,
  deleteOrphanedNotificaciones:       mockDeleteOrphanedNotificaciones,
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

describe('deleteE2ENotificaciones', () => {
  it('delega al model', async () => {
    mockDeleteE2ENotificaciones.mockResolvedValueOnce(undefined);
    await Service.deleteE2ENotificaciones();
    expect(mockDeleteE2ENotificaciones).toHaveBeenCalledTimes(1);
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

describe('marcarTodasLeidas', () => {
  it('delega al model sin argumentos', async () => {
    mockMarkAllAsRead.mockResolvedValueOnce(undefined);
    await Service.marcarTodasLeidas();
    expect(mockMarkAllAsRead).toHaveBeenCalledTimes(1);
  });
});

// ── runJob ────────────────────────────────────────────────────────────────────

describe('runJob', () => {
  beforeEach(() => {
    mockSyncStockBajoConsolidado.mockResolvedValue(undefined);
    mockSyncSinStockConsolidado.mockResolvedValue(undefined);
    mockSyncCitasHoyConsolidado.mockResolvedValue(undefined);
    mockSyncComodatosPorVencer.mockResolvedValue(undefined);
    mockUpsertMembresia.mockResolvedValue(undefined);
    mockClosePendingMembresia.mockResolvedValue(undefined);
    mockFindComodatosPorVencer.mockResolvedValue([]);
    mockFindArticulosSinStock.mockResolvedValue([]);
    mockDeleteOrphanedNotificaciones.mockResolvedValue(0);
  });

  it('llama syncStockBajoConsolidado una vez con mensaje del artículo cuando hay uno solo', async () => {
    mockFindArticulosConStockBajo.mockResolvedValueOnce([
      { ID_ARTICULO: 1, DESCRIPCION: 'Silla', INVENTARIO_ACTUAL: 2, STOCK_MINIMO: 5 },
    ]);
    mockFindMembresiasProximas.mockResolvedValueOnce([]);
    mockFindMembresiasVencidas.mockResolvedValueOnce([]);
    mockFindCitasHoyProgramadas.mockResolvedValueOnce([]);

    const res = await Service.runJob();

    expect(mockSyncStockBajoConsolidado).toHaveBeenCalledWith(expect.stringContaining('Silla'));
    expect(res).toEqual({ stockBajo: 1, sinStock: 0, proximas: 0, vencidas: 0, citasHoy: 0, comodatos: 0 });
  });

  it('llama upsertMembresia MEMBRESIA_PROXIMA con mensaje de días', async () => {
    mockFindArticulosConStockBajo.mockResolvedValueOnce([]);
    mockFindMembresiasProximas.mockResolvedValueOnce([
      { CURP: 'ABCD000000XXXXXX00', NOMBRE: 'Juan Pérez', FECHA_VIGENCIA_FIN: new Date(), DIAS_RESTANTES: 5 },
    ]);
    mockFindMembresiasVencidas.mockResolvedValueOnce([]);
    mockFindCitasHoyProgramadas.mockResolvedValueOnce([]);

    const res = await Service.runJob();

    expect(mockUpsertMembresia).toHaveBeenCalledWith(
      'ABCD000000XXXXXX00', 'MEMBRESIA_PROXIMA', expect.stringContaining('5 día')
    );
    expect(res.proximas).toBe(1);
  });

  it('usa singular "día" cuando quedan exactamente 1 día', async () => {
    mockFindArticulosConStockBajo.mockResolvedValueOnce([]);
    mockFindMembresiasProximas.mockResolvedValueOnce([
      { CURP: 'CURP01', NOMBRE: 'Ana', FECHA_VIGENCIA_FIN: new Date(), DIAS_RESTANTES: 1 },
    ]);
    mockFindMembresiasVencidas.mockResolvedValueOnce([]);
    mockFindCitasHoyProgramadas.mockResolvedValueOnce([]);

    await Service.runJob();

    expect(mockUpsertMembresia).toHaveBeenCalledWith(
      'CURP01', 'MEMBRESIA_PROXIMA', expect.stringContaining('1 día.')
    );
  });

  it('llama upsertMembresia MEMBRESIA_VENCIDA con nombre del beneficiario', async () => {
    mockFindArticulosConStockBajo.mockResolvedValueOnce([]);
    mockFindMembresiasProximas.mockResolvedValueOnce([]);
    mockFindMembresiasVencidas.mockResolvedValueOnce([
      { CURP: 'ZZZZ000000XXXXXX00', NOMBRE: 'María López', FECHA_VIGENCIA_FIN: new Date('2025-01-01') },
    ]);
    mockFindCitasHoyProgramadas.mockResolvedValueOnce([]);

    const res = await Service.runJob();

    expect(mockUpsertMembresia).toHaveBeenCalledWith(
      'ZZZZ000000XXXXXX00', 'MEMBRESIA_VENCIDA', expect.stringContaining('María López')
    );
    expect(res.vencidas).toBe(1);
  });

  it('llama syncStockBajoConsolidado con null cuando no hay artículos con stock bajo', async () => {
    mockFindArticulosConStockBajo.mockResolvedValueOnce([]);
    mockFindMembresiasProximas.mockResolvedValueOnce([]);
    mockFindMembresiasVencidas.mockResolvedValueOnce([]);
    mockFindCitasHoyProgramadas.mockResolvedValueOnce([]);

    const res = await Service.runJob();
    expect(mockSyncStockBajoConsolidado).toHaveBeenCalledWith(null);
    expect(res).toEqual({ stockBajo: 0, sinStock: 0, proximas: 0, vencidas: 0, citasHoy: 0, comodatos: 0 });
  });

  it('genera mensaje consolidado y llama syncStockBajoConsolidado una vez para múltiples artículos', async () => {
    mockFindArticulosConStockBajo.mockResolvedValueOnce([
      { ID_ARTICULO: 1, DESCRIPCION: 'Silla', INVENTARIO_ACTUAL: 1, STOCK_MINIMO: 5 },
      { ID_ARTICULO: 2, DESCRIPCION: 'Mesa',  INVENTARIO_ACTUAL: 0, STOCK_MINIMO: 3 },
    ]);
    mockFindMembresiasProximas.mockResolvedValueOnce([
      { CURP: 'C1', NOMBRE: 'Ana', FECHA_VIGENCIA_FIN: new Date(), DIAS_RESTANTES: 10 },
      { CURP: 'C2', NOMBRE: 'Luis', FECHA_VIGENCIA_FIN: new Date(), DIAS_RESTANTES: 3 },
    ]);
    mockFindMembresiasVencidas.mockResolvedValueOnce([]);
    mockFindCitasHoyProgramadas.mockResolvedValueOnce([]);

    const res = await Service.runJob();

    expect(mockSyncStockBajoConsolidado).toHaveBeenCalledWith(expect.stringContaining('2 artículos'));
    expect(mockUpsertMembresia).toHaveBeenCalledTimes(2);
    expect(res).toEqual({ stockBajo: 2, sinStock: 0, proximas: 2, vencidas: 0, citasHoy: 0, comodatos: 0 });
  });

  it('genera mensaje para una sola cita de hoy sin confirmar', async () => {
    mockFindArticulosConStockBajo.mockResolvedValueOnce([]);
    mockFindMembresiasProximas.mockResolvedValueOnce([]);
    mockFindMembresiasVencidas.mockResolvedValueOnce([]);
    mockFindCitasHoyProgramadas.mockResolvedValueOnce([
      { ID_CITA: 1, ESPECIALISTA: 'Dr. García', NOMBRE: 'Juan López', HORA: '10:00' },
    ]);

    const res = await Service.runJob();

    expect(mockSyncCitasHoyConsolidado).toHaveBeenCalledWith(expect.stringContaining('Juan López'));
    expect(res.citasHoy).toBe(1);
  });

  it('genera mensaje consolidado para múltiples citas de hoy', async () => {
    mockFindArticulosConStockBajo.mockResolvedValueOnce([]);
    mockFindMembresiasProximas.mockResolvedValueOnce([]);
    mockFindMembresiasVencidas.mockResolvedValueOnce([]);
    mockFindCitasHoyProgramadas.mockResolvedValueOnce([
      { ID_CITA: 1, ESPECIALISTA: 'Dr. A', NOMBRE: 'Ana', HORA: '09:00' },
      { ID_CITA: 2, ESPECIALISTA: 'Dr. B', NOMBRE: 'Luis', HORA: '11:00' },
    ]);

    const res = await Service.runJob();

    expect(mockSyncCitasHoyConsolidado).toHaveBeenCalledWith(expect.stringContaining('2 citas'));
    expect(res.citasHoy).toBe(2);
  });

  it('llama syncCitasHoyConsolidado con null cuando no hay citas hoy', async () => {
    mockFindArticulosConStockBajo.mockResolvedValueOnce([]);
    mockFindMembresiasProximas.mockResolvedValueOnce([]);
    mockFindMembresiasVencidas.mockResolvedValueOnce([]);
    mockFindCitasHoyProgramadas.mockResolvedValueOnce([]);

    await Service.runJob();
    expect(mockSyncCitasHoyConsolidado).toHaveBeenCalledWith(null);
  });

  it('usa "unidad" en singular cuando INVENTARIO_ACTUAL es exactamente 1', async () => {
    mockFindArticulosConStockBajo.mockResolvedValueOnce([
      { ID_ARTICULO: 1, DESCRIPCION: 'Muleta', INVENTARIO_ACTUAL: 1, STOCK_MINIMO: 5 },
    ]);
    mockFindMembresiasProximas.mockResolvedValueOnce([]);
    mockFindMembresiasVencidas.mockResolvedValueOnce([]);
    mockFindCitasHoyProgramadas.mockResolvedValueOnce([]);

    await Service.runJob();

    expect(mockSyncStockBajoConsolidado).toHaveBeenCalledWith(
      expect.stringContaining('1 unidad disponible')
    );
  });

  it('trunca descripcion larga en mensaje de artículo único (trimNombre > max)', async () => {
    const longDesc = 'A'.repeat(40); // > 35 chars → debe truncarse
    mockFindArticulosConStockBajo.mockResolvedValueOnce([
      { ID_ARTICULO: 1, DESCRIPCION: longDesc, INVENTARIO_ACTUAL: 3, STOCK_MINIMO: 10 },
    ]);
    mockFindMembresiasProximas.mockResolvedValueOnce([]);
    mockFindMembresiasVencidas.mockResolvedValueOnce([]);
    mockFindCitasHoyProgramadas.mockResolvedValueOnce([]);

    await Service.runJob();

    const msg = mockSyncStockBajoConsolidado.mock.calls[0][0];
    expect(msg).toMatch(/…/); // debe contener el carácter de truncamiento
  });

  it('incluye "y N más" cuando hay más de 5 artículos con stock bajo', async () => {
    const rows = Array.from({ length: 7 }, (_, i) => ({
      ID_ARTICULO: i + 1,
      DESCRIPCION: `Art${i + 1}`,
      INVENTARIO_ACTUAL: 0,
      STOCK_MINIMO: 5,
    }));
    mockFindArticulosConStockBajo.mockResolvedValueOnce(rows);
    mockFindMembresiasProximas.mockResolvedValueOnce([]);
    mockFindMembresiasVencidas.mockResolvedValueOnce([]);
    mockFindCitasHoyProgramadas.mockResolvedValueOnce([]);

    await Service.runJob();

    expect(mockSyncStockBajoConsolidado).toHaveBeenCalledWith(
      expect.stringContaining('y 2 más')
    );
  });

  it('trunca mensaje a 500 chars cuando la lista de artículos es muy larga', async () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({
      ID_ARTICULO: i + 1,
      DESCRIPCION: 'A'.repeat(30),
      INVENTARIO_ACTUAL: 0,
      STOCK_MINIMO: 5,
    }));
    mockFindArticulosConStockBajo.mockResolvedValueOnce(rows);
    mockFindMembresiasProximas.mockResolvedValueOnce([]);
    mockFindMembresiasVencidas.mockResolvedValueOnce([]);
    mockFindCitasHoyProgramadas.mockResolvedValueOnce([]);

    await Service.runJob();

    const msg = mockSyncStockBajoConsolidado.mock.calls[0][0];
    expect(msg.length).toBeLessThanOrEqual(500);
  });
});

// ── checkComodatosPorVencer ───────────────────────────────────────────────────

describe('checkComodatosPorVencer (via runJob)', () => {
  beforeEach(() => {
    mockSyncStockBajoConsolidado.mockResolvedValue(undefined);
    mockSyncSinStockConsolidado.mockResolvedValue(undefined);
    mockSyncCitasHoyConsolidado.mockResolvedValue(undefined);
    mockSyncComodatosPorVencer.mockResolvedValue(undefined);
    mockUpsertMembresia.mockResolvedValue(undefined);
    mockFindArticulosConStockBajo.mockResolvedValue([]);
    mockFindArticulosSinStock.mockResolvedValue([]);
    mockFindMembresiasProximas.mockResolvedValue([]);
    mockFindMembresiasVencidas.mockResolvedValue([]);
    mockFindCitasHoyProgramadas.mockResolvedValue([]);
    mockDeleteOrphanedNotificaciones.mockResolvedValue(0);
  });

  it('llama syncComodatosPorVencer con null cuando no hay préstamos por vencer', async () => {
    mockFindComodatosPorVencer.mockResolvedValueOnce([]);
    const res = await Service.runJob();
    expect(mockSyncComodatosPorVencer).toHaveBeenCalledWith(null);
    expect(res.comodatos).toBe(0);
  });

  it('genera mensaje para un préstamo que vence hoy', async () => {
    mockFindComodatosPorVencer.mockResolvedValueOnce([
      { ID_SERVICIO: 1, CURP: 'C1', NOMBRE: 'Juan Pérez', DIAS_RESTANTES: 0, ARTICULO: 'Andadera' },
    ]);
    const res = await Service.runJob();
    expect(mockSyncComodatosPorVencer).toHaveBeenCalledWith(expect.stringContaining('vence hoy'));
    expect(res.comodatos).toBe(1);
  });

  it('genera mensaje para un préstamo que vence en N días', async () => {
    mockFindComodatosPorVencer.mockResolvedValueOnce([
      { ID_SERVICIO: 2, CURP: 'C2', NOMBRE: 'Ana García', DIAS_RESTANTES: 3, ARTICULO: 'Silla de ruedas' },
    ]);
    await Service.runJob();
    expect(mockSyncComodatosPorVencer).toHaveBeenCalledWith(expect.stringContaining('3 días'));
  });

  it('genera mensaje para un préstamo vencido (días negativos)', async () => {
    mockFindComodatosPorVencer.mockResolvedValueOnce([
      { ID_SERVICIO: 3, CURP: 'C3', NOMBRE: 'Luis Torres', DIAS_RESTANTES: -2, ARTICULO: 'Cojín' },
    ]);
    await Service.runJob();
    expect(mockSyncComodatosPorVencer).toHaveBeenCalledWith(expect.stringContaining('vencido hace 2 días'));
  });

  it('genera mensaje consolidado para múltiples préstamos', async () => {
    mockFindComodatosPorVencer.mockResolvedValueOnce([
      { ID_SERVICIO: 1, NOMBRE: 'Ana', DIAS_RESTANTES: 1,  ARTICULO: 'Andadera' },
      { ID_SERVICIO: 2, NOMBRE: 'Luis', DIAS_RESTANTES: -1, ARTICULO: 'Silla' },
    ]);
    const res = await Service.runJob();
    expect(mockSyncComodatosPorVencer).toHaveBeenCalledWith(expect.stringContaining('2 préstamos'));
    expect(res.comodatos).toBe(2);
  });

  it('usa "día" singular cuando vence en exactamente 1 día', async () => {
    mockFindComodatosPorVencer.mockResolvedValueOnce([
      { ID_SERVICIO: 4, NOMBRE: 'María', DIAS_RESTANTES: 1, ARTICULO: 'Caminador' },
    ]);
    await Service.runJob();
    const msg = mockSyncComodatosPorVencer.mock.calls[0][0];
    expect(msg).toMatch(/1 día[^s]/);
  });

  it('usa "día" singular cuando vencido hace exactamente 1 día', async () => {
    mockFindComodatosPorVencer.mockResolvedValueOnce([
      { ID_SERVICIO: 5, NOMBRE: 'Carlos', DIAS_RESTANTES: -1, ARTICULO: 'Muleta' },
    ]);
    await Service.runJob();
    const msg = mockSyncComodatosPorVencer.mock.calls[0][0];
    expect(msg).toMatch(/vencido hace 1 día[^s]/);
  });

  it('trunca el mensaje a 500 chars cuando hay muchos préstamos', async () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      ID_SERVICIO: i + 1,
      NOMBRE: `${'A'.repeat(20)} ${i}`,
      DIAS_RESTANTES: i - 3,
      ARTICULO: 'A'.repeat(20),
    }));
    mockFindComodatosPorVencer.mockResolvedValueOnce(rows);
    await Service.runJob();
    const msg = mockSyncComodatosPorVencer.mock.calls[0][0];
    expect(msg.length).toBeLessThanOrEqual(500);
  });
});

// ── checkSinStock ─────────────────────────────────────────────────────────────

describe('checkSinStock', () => {
  beforeEach(() => {
    mockSyncSinStockConsolidado.mockResolvedValue(undefined);
  });

  it('sincroniza con null cuando no hay artículos sin stock', async () => {
    mockFindArticulosSinStock.mockResolvedValueOnce([]);
    const result = await Service.checkSinStock();
    expect(result).toBe(0);
    expect(mockSyncSinStockConsolidado).toHaveBeenCalledWith(null);
  });

  it('genera mensaje para un solo artículo sin stock', async () => {
    mockFindArticulosSinStock.mockResolvedValueOnce([
      { ID_ARTICULO: 1, DESCRIPCION: 'Pañales grandes', INVENTARIO_ACTUAL: 0 },
    ]);
    const result = await Service.checkSinStock();
    expect(result).toBe(1);
    expect(mockSyncSinStockConsolidado).toHaveBeenCalledWith(
      expect.stringContaining('Pañales grandes')
    );
  });

  it('genera mensaje consolidado para múltiples artículos sin stock', async () => {
    const rows = Array.from({ length: 3 }, (_, i) => ({
      ID_ARTICULO: i + 1, DESCRIPCION: `Art${i}`, INVENTARIO_ACTUAL: 0,
    }));
    mockFindArticulosSinStock.mockResolvedValueOnce(rows);
    const result = await Service.checkSinStock();
    expect(result).toBe(3);
    expect(mockSyncSinStockConsolidado).toHaveBeenCalledWith(
      expect.stringContaining('3 artículos sin stock')
    );
  });
});

// ── Tests de regresión ────────────────────────────────────────────────────────

describe('regresión: bugs detectados en QA 2026-06-05', () => {
  beforeEach(() => {
    mockSyncStockBajoConsolidado.mockResolvedValue(undefined);
    mockSyncSinStockConsolidado.mockResolvedValue(undefined);
    mockSyncCitasHoyConsolidado.mockResolvedValue(undefined);
    mockSyncComodatosPorVencer.mockResolvedValue(undefined);
    mockUpsertMembresia.mockResolvedValue(undefined);
    mockClosePendingMembresia.mockResolvedValue(undefined);
    mockFindComodatosPorVencer.mockResolvedValue([]);
    mockFindArticulosSinStock.mockResolvedValue([]);
    mockFindArticulosConStockBajo.mockResolvedValue([]);
    mockFindCitasHoyProgramadas.mockResolvedValue([]);
    mockDeleteOrphanedNotificaciones.mockResolvedValue(0);
  });

  // Regression: ISSUE-001 — Notificación dual MEMBRESIA_PROXIMA + MEMBRESIA_VENCIDA para el mismo CURP
  // Found by /qa on 2026-06-05
  // Report: .gstack/qa-reports/qa-report-notificaciones-2026-06-05.md
  it('cierra MEMBRESIA_PROXIMA antes de crear MEMBRESIA_VENCIDA para el mismo CURP', async () => {
    mockFindMembresiasProximas.mockResolvedValueOnce([]);
    mockFindMembresiasVencidas.mockResolvedValueOnce([
      { CURP: 'ZZZZ000000XXXXXX00', NOMBRE: 'María López', FECHA_VIGENCIA_FIN: new Date('2025-01-01') },
    ]);

    await Service.runJob();

    // closePendingMembresia debe llamarse con el CURP y tipo MEMBRESIA_PROXIMA
    expect(mockClosePendingMembresia).toHaveBeenCalledWith('ZZZZ000000XXXXXX00', 'MEMBRESIA_PROXIMA');
    // Y después debe crearse la MEMBRESIA_VENCIDA
    expect(mockUpsertMembresia).toHaveBeenCalledWith(
      'ZZZZ000000XXXXXX00', 'MEMBRESIA_VENCIDA', expect.stringContaining('María López')
    );
  });

  // Regression: ISSUE-002 — checkMembresiasVencidas llama closePendingMembresia por cada beneficiario vencido
  it('llama closePendingMembresia una vez por cada membresía vencida', async () => {
    mockFindMembresiasProximas.mockResolvedValueOnce([]);
    mockFindMembresiasVencidas.mockResolvedValueOnce([
      { CURP: 'CURP001', NOMBRE: 'Ana García',  FECHA_VIGENCIA_FIN: new Date('2025-01-01') },
      { CURP: 'CURP002', NOMBRE: 'Luis Martínez', FECHA_VIGENCIA_FIN: new Date('2025-03-01') },
    ]);

    await Service.runJob();

    expect(mockClosePendingMembresia).toHaveBeenCalledTimes(2);
    expect(mockClosePendingMembresia).toHaveBeenCalledWith('CURP001', 'MEMBRESIA_PROXIMA');
    expect(mockClosePendingMembresia).toHaveBeenCalledWith('CURP002', 'MEMBRESIA_PROXIMA');
  });

  // Regression: ISSUE-003 — "vence en 0 días" confuso — debe decir "vence hoy"
  it('usa "vence hoy" cuando DIAS_RESTANTES es 0', async () => {
    mockFindMembresiasProximas.mockResolvedValueOnce([
      { CURP: 'CURP003', NOMBRE: 'Pedro Ruiz', FECHA_VIGENCIA_FIN: new Date(), DIAS_RESTANTES: 0 },
    ]);
    mockFindMembresiasVencidas.mockResolvedValueOnce([]);

    await Service.runJob();

    const [, , msg] = mockUpsertMembresia.mock.calls[0];
    expect(msg).toContain('hoy');
    expect(msg).not.toContain('0 días');
  });
});
