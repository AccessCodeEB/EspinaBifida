import { jest } from '@jest/globals';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGetAll        = jest.fn();
const mockGetPendientes = jest.fn();
const mockGetCount      = jest.fn();
const mockMarcarLeida   = jest.fn();
const mockRunJob        = jest.fn();

jest.unstable_mockModule('../services/notificaciones.service.js', () => ({
  getAll:        mockGetAll,
  getPendientes: mockGetPendientes,
  getCount:      mockGetCount,
  marcarLeida:   mockMarcarLeida,
  runJob:        mockRunJob,
}));

const { getAll, getPendientes, getCount, marcarLeida, runJob } =
  await import('../controllers/notificaciones.controller.js');

function makeRes() {
  return { json: jest.fn(), status: jest.fn().mockReturnThis() };
}

beforeEach(() => jest.resetAllMocks());

// ── getAll ────────────────────────────────────────────────────────────────────

describe('getAll', () => {
  it('retorna lista de notificaciones', async () => {
    const data = [{ idNotificacion: 1 }];
    mockGetAll.mockResolvedValueOnce(data);
    const req = { query: {} };
    const res = makeRes();
    await getAll(req, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith({ data });
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
  it('retorna notificaciones pendientes', async () => {
    mockGetPendientes.mockResolvedValueOnce([{ idNotificacion: 2 }]);
    const res = makeRes();
    await getPendientes({}, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith({ data: [{ idNotificacion: 2 }] });
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
});
