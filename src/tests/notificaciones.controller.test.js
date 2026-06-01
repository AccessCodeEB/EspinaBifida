import { jest } from '@jest/globals';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGetAll              = jest.fn();
const mockGetPendientes       = jest.fn();
const mockGetCount            = jest.fn();
const mockMarcarLeida         = jest.fn();
const mockMarcarTodasLeidas   = jest.fn();
const mockRunJob              = jest.fn();
const mockDeleteE2ENotif      = jest.fn();

jest.unstable_mockModule('../services/notificaciones.service.js', () => ({
  getAll:                   mockGetAll,
  getPendientes:            mockGetPendientes,
  getCount:                 mockGetCount,
  marcarLeida:              mockMarcarLeida,
  marcarTodasLeidas:        mockMarcarTodasLeidas,
  runJob:                   mockRunJob,
  deleteE2ENotificaciones:  mockDeleteE2ENotif,
}));

const { getAll, getPendientes, getCount, marcarLeida, marcarTodasLeidas, runJob, e2eCleanup } =
  await import('../controllers/notificaciones.controller.js');

function makeRes() {
  return { json: jest.fn(), status: jest.fn().mockReturnThis() };
}

beforeEach(() => jest.resetAllMocks());

// ── getAll ────────────────────────────────────────────────────────────────────

describe('getAll', () => {
  it('retorna lista de notificaciones transformada a camelCase', async () => {
    mockGetAll.mockResolvedValueOnce([{ ID_NOTIFICACION: 1, TIPO: 'STOCK_BAJO' }]);
    const req = { query: {} };
    const res = makeRes();
    await getAll(req, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith({ data: [{ idNotificacion: 1, tipo: 'STOCK_BAJO' }] });
  });

  it('limita a 500 aunque se pase un valor mayor', async () => {
    mockGetAll.mockResolvedValueOnce([]);
    await getAll({ query: { limit: '9999' } }, makeRes(), jest.fn());
    expect(mockGetAll).toHaveBeenCalledWith(500);
  });

  it('llama next en error', async () => {
    const err = new Error('db fail');
    mockGetAll.mockRejectedValueOnce(err);
    const next = jest.fn();
    await getAll({ query: {} }, makeRes(), next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

// ── getPendientes ─────────────────────────────────────────────────────────────

describe('getPendientes', () => {
  it('retorna notificaciones pendientes transformadas a camelCase', async () => {
    mockGetPendientes.mockResolvedValueOnce([{ ID_NOTIFICACION: 2, ESTATUS: 'PENDIENTE' }]);
    const res = makeRes();
    await getPendientes({}, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith({ data: [{ idNotificacion: 2, estatus: 'PENDIENTE' }] });
  });

  it('llama next en error', async () => {
    const err = new Error('db fail');
    mockGetPendientes.mockRejectedValueOnce(err);
    const next = jest.fn();
    await getPendientes({}, makeRes(), next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

// ── getCount ──────────────────────────────────────────────────────────────────

describe('getCount', () => {
  it('retorna total pendiente', async () => {
    mockGetCount.mockResolvedValueOnce(3);
    const res = makeRes();
    await getCount({}, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith({ total: 3 });
  });

  it('llama next en error', async () => {
    const err = new Error('db fail');
    mockGetCount.mockRejectedValueOnce(err);
    const next = jest.fn();
    await getCount({}, makeRes(), next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

// ── marcarLeida ───────────────────────────────────────────────────────────────

describe('marcarLeida', () => {
  it('responde 200 con mensaje', async () => {
    mockMarcarLeida.mockResolvedValueOnce(undefined);
    const res = makeRes();
    await marcarLeida({ params: { id: '5' } }, res, jest.fn());
    expect(mockMarcarLeida).toHaveBeenCalledWith(5);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
  });

  it('llama next en error (ej. notFound)', async () => {
    const err = new Error('not found');
    mockMarcarLeida.mockRejectedValueOnce(err);
    const next = jest.fn();
    await marcarLeida({ params: { id: '99' } }, makeRes(), next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

// ── marcarTodasLeidas ─────────────────────────────────────────────────────────

describe('marcarTodasLeidas', () => {
  it('responde con mensaje de éxito', async () => {
    mockMarcarTodasLeidas.mockResolvedValueOnce(undefined);
    const res = makeRes();
    await marcarTodasLeidas({}, res, jest.fn());
    expect(mockMarcarTodasLeidas).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
  });

  it('llama next en error', async () => {
    const err = new Error('db fail');
    mockMarcarTodasLeidas.mockRejectedValueOnce(err);
    const next = jest.fn();
    await marcarTodasLeidas({}, makeRes(), next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

// ── runJob ────────────────────────────────────────────────────────────────────

describe('runJob', () => {
  it('retorna resumen del job', async () => {
    mockRunJob.mockResolvedValueOnce({ stockBajo: 2, proximas: 1, vencidas: 0 });
    const res = makeRes();
    await runJob({}, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith({
      message: 'Job ejecutado',
      data: { stockBajo: 2, proximas: 1, vencidas: 0 },
    });
  });

  it('llama next en error', async () => {
    const err = new Error('job fail');
    mockRunJob.mockRejectedValueOnce(err);
    const next = jest.fn();
    await runJob({}, makeRes(), next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

// ── e2eCleanup ────────────────────────────────────────────────────────────────

describe('e2eCleanup', () => {
  const OLD_ENV = process.env.NODE_ENV;
  afterEach(() => { process.env.NODE_ENV = OLD_ENV; });

  it('llama deleteE2ENotificaciones y devuelve mensaje', async () => {
    process.env.NODE_ENV = 'test';
    mockDeleteE2ENotif.mockResolvedValueOnce(undefined);
    const res = makeRes();
    await e2eCleanup({}, res, jest.fn());
    expect(mockDeleteE2ENotif).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({ message: 'Notificaciones E2E eliminadas' });
  });

  it('devuelve 403 en producción', async () => {
    process.env.NODE_ENV = 'production';
    const res = makeRes();
    await e2eCleanup({}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockDeleteE2ENotif).not.toHaveBeenCalled();
  });
});
