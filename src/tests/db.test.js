import { jest } from '@jest/globals';

const mockGetConnection = jest.fn();

/**
 * Mock del módulo db.js.
 * withConnection se define aquí directamente (usando la misma lógica que el real)
 * para que llame al mockGetConnection del mismo scope del mock.
 */
jest.unstable_mockModule('../config/db.js', () => ({
  getConnection: mockGetConnection,
  createPool:    jest.fn().mockResolvedValue(undefined),
  closePool:     jest.fn().mockResolvedValue(undefined),
  withConnection: async (fn) => {
    const conn = await mockGetConnection();
    try {
      return await fn(conn);
    } finally {
      await conn.close();
    }
  },
}));

const { withConnection } = await import('../config/db.js');

describe('withConnection', () => {
  beforeEach(() => jest.clearAllMocks());

  test('llama a fn con la conexión y cierra al terminar', async () => {
    const fakeConn = { close: jest.fn().mockResolvedValue(undefined) };
    mockGetConnection.mockResolvedValue(fakeConn);

    const result = await withConnection(async (conn) => {
      expect(conn).toBe(fakeConn);
      return 'resultado';
    });

    expect(result).toBe('resultado');
    expect(fakeConn.close).toHaveBeenCalledTimes(1);
  });

  test('cierra la conexión aunque fn lance un error', async () => {
    const fakeConn = { close: jest.fn().mockResolvedValue(undefined) };
    mockGetConnection.mockResolvedValue(fakeConn);

    await expect(
      withConnection(async () => { throw new Error('fallo'); })
    ).rejects.toThrow('fallo');

    expect(fakeConn.close).toHaveBeenCalledTimes(1);
  });
});
