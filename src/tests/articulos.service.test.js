/**
 * Tests unitarios de src/services/articulos.service.js
 * Cubre las ramas null/undefined de normalizeData y deleteById.
 */
import { jest } from '@jest/globals';

const mockFindAll   = jest.fn();
const mockFindById  = jest.fn();
const mockCreate    = jest.fn();
const mockUpdate    = jest.fn();
const mockDeleteById = jest.fn();

jest.unstable_mockModule('../models/articulos.model.js', () => ({
  findAll:   mockFindAll,
  findById:  mockFindById,
  create:    mockCreate,
  update:    mockUpdate,
  deleteById: mockDeleteById,
}));

const Service = await import('../services/articulos.service.js');

beforeEach(() => jest.resetAllMocks());

// ── normalizeData — ramas null/undefined de cada field validator ──────────────

describe('normalizeData — null/undefined → null (ramas de cada validator)', () => {
  it('crea con descripcion null → normalizeData retorna null para descripcion', async () => {
    mockCreate.mockResolvedValueOnce({});

    await Service.create({ idArticulo: 1, descripcion: null });

    const [data] = mockCreate.mock.calls[0];
    expect(data.descripcion).toBeNull();
  });

  it('crea con unidad null → normalizeData retorna null para unidad', async () => {
    mockCreate.mockResolvedValueOnce({});

    await Service.create({ idArticulo: 1, unidad: null });

    const [data] = mockCreate.mock.calls[0];
    expect(data.unidad).toBeNull();
  });

  it('crea con cuotaRecuperacion null → normalizeData retorna null', async () => {
    mockCreate.mockResolvedValueOnce({});

    await Service.create({ idArticulo: 1, cuotaRecuperacion: null });

    const [data] = mockCreate.mock.calls[0];
    expect(data.cuotaRecuperacion).toBeNull();
  });

  it('crea con inventarioActual null → normalizeData retorna null', async () => {
    mockCreate.mockResolvedValueOnce({});

    await Service.create({ idArticulo: 1, inventarioActual: null });

    const [data] = mockCreate.mock.calls[0];
    expect(data.inventarioActual).toBeNull();
  });

  it('crea con manejaInventario null → normalizeData retorna null', async () => {
    mockCreate.mockResolvedValueOnce({});

    await Service.create({ idArticulo: 1, manejaInventario: null });

    const [data] = mockCreate.mock.calls[0];
    expect(data.manejaInventario).toBeNull();
  });

  it('crea con idCategoria null → normalizeData retorna null', async () => {
    mockCreate.mockResolvedValueOnce({});

    await Service.create({ idArticulo: 1, idCategoria: null });

    const [data] = mockCreate.mock.calls[0];
    expect(data.idCategoria).toBeNull();
  });

  it('crea con stockMinimo null → normalizeData retorna null', async () => {
    mockCreate.mockResolvedValueOnce({});

    await Service.create({ idArticulo: 1, stockMinimo: null });

    const [data] = mockCreate.mock.calls[0];
    expect(data.stockMinimo).toBeNull();
  });

  it('create sin idArticulo en data lanza 400', () => {
    expect(() => Service.create({})).toThrow(/idArticulo/);
  });
});

// ── deleteById ────────────────────────────────────────────────────────────────

describe('deleteById', () => {
  it('retorna null si el artículo no existe', async () => {
    mockFindById.mockResolvedValueOnce(null);

    const result = await Service.deleteById(999);

    expect(result).toBeNull();
    expect(mockDeleteById).not.toHaveBeenCalled();
  });

  it('lanza 409 si el artículo tiene stock > 0', async () => {
    mockFindById.mockResolvedValueOnce({ INVENTARIO_ACTUAL: 5 });

    await expect(Service.deleteById(1))
      .rejects.toMatchObject({ statusCode: 409, code: 'ARTICULO_CON_STOCK' });
  });

  it('elimina artículo con stock = 0', async () => {
    mockFindById.mockResolvedValueOnce({ INVENTARIO_ACTUAL: 0 });
    mockDeleteById.mockResolvedValueOnce({});

    const result = await Service.deleteById(1);

    expect(mockDeleteById).toHaveBeenCalledWith(1);
    expect(result).toEqual({});
  });
});

// ── normalizeData default parameter (L4) ──────────────────────────────────────

describe('create — normalizeData(data = {}) default param (L4)', () => {
  it('create con undefined → normalizeData usa {} default → lanza por idArticulo null', () => {
    expect(() => Service.create(undefined)).toThrow(/idArticulo/);
  });
});

describe('normalizeData — idArticulo undefined (L11: val===undefined branch)', () => {
  it('crea con idArticulo: undefined → lanza por idArticulo obligatorio', () => {
    // { idArticulo: undefined } → 'idArticulo' in data = true → validator(undefined)
    // → val === null = false → val === undefined = true → return null → throw
    expect(() => Service.create({ idArticulo: undefined })).toThrow(/idArticulo/);
  });
});
