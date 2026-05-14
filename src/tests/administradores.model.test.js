/**
 * Tests unitarios de src/models/administradores.model.js
 * Cubre las funciones sin tests existentes: updatePassword, updateFotoPerfilUrl,
 * deactivate, y las funciones de consulta (findAll, findById, findByEmail, create, update).
 * Mockea getConnection — sin Oracle real.
 */
import { jest } from '@jest/globals';
import {
  mockExecute, mockClose, mockCommit,
  dbModuleMock, resetMocks,
} from './helpers/mockDb.js';

jest.unstable_mockModule('../config/db.js', () => dbModuleMock);

const AdminModel = await import('../models/administradores.model.js');

const ADMIN_ROW = {
  ID_ADMIN: 1, ID_ROL: 1, NOMBRE_COMPLETO: 'Ana López',
  EMAIL: 'ana@example.com', ACTIVO: 1, FOTO_PERFIL_URL: null,
};

beforeEach(() => resetMocks());

// ── findAll ───────────────────────────────────────────────────────────────────

describe('findAll', () => {
  it('retorna todas las filas', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [ADMIN_ROW] });

    const result = await AdminModel.findAll();

    expect(result).toEqual([ADMIN_ROW]);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

// ── findById ──────────────────────────────────────────────────────────────────

describe('findById', () => {
  it('retorna la fila cuando existe', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [ADMIN_ROW] });

    const result = await AdminModel.findById(1);

    expect(result).toBe(ADMIN_ROW);
  });

  it('retorna null cuando no existe', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const result = await AdminModel.findById(999);

    expect(result).toBeNull();
  });
});

// ── findByEmail ───────────────────────────────────────────────────────────────

describe('findByEmail', () => {
  it('retorna la fila por email', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [ADMIN_ROW] });

    const result = await AdminModel.findByEmail('ana@example.com');

    expect(result).toBe(ADMIN_ROW);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('retorna null si el email no existe', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const result = await AdminModel.findByEmail('noexiste@x.com');

    expect(result).toBeNull();
  });
});

// ── create ────────────────────────────────────────────────────────────────────

describe('create', () => {
  it('ejecuta INSERT con autoCommit', async () => {
    mockExecute.mockResolvedValueOnce({});

    await AdminModel.create({
      idRol: 2, nombreCompleto: 'Luis Ramos',
      email: 'luis@x.com', passwordHash: '$2b$10$hash',
    });

    expect(mockExecute).toHaveBeenCalledTimes(1);
    const [, binds, opts] = mockExecute.mock.calls[0];
    expect(binds.email).toBe('luis@x.com');
    expect(opts?.autoCommit).toBe(true);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

// ── update ────────────────────────────────────────────────────────────────────

describe('update', () => {
  it('ejecuta UPDATE con los campos correctos', async () => {
    mockExecute.mockResolvedValueOnce({});

    await AdminModel.update(1, { idRol: 1, nombreCompleto: 'Ana González', email: 'ana2@x.com' });

    const [, binds] = mockExecute.mock.calls[0];
    expect(binds.idAdmin).toBe(1);
    expect(binds.nombreCompleto).toBe('Ana González');
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

// ── updatePassword ────────────────────────────────────────────────────────────
// Líneas 83-94 — antes sin cobertura

describe('updatePassword', () => {
  it('ejecuta UPDATE con el nuevo hash y cierra la conexión', async () => {
    mockExecute.mockResolvedValueOnce({});

    await AdminModel.updatePassword(1, '$2b$10$nuevohash');

    expect(mockExecute).toHaveBeenCalledTimes(1);
    const [sql, binds, opts] = mockExecute.mock.calls[0];
    expect(sql).toMatch(/PASSWORD_HASH/i);
    expect(binds.passwordHash).toBe('$2b$10$nuevohash');
    expect(binds.idAdmin).toBe(1);
    expect(opts?.autoCommit).toBe(true);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('cierra la conexión aunque execute lance', async () => {
    mockExecute.mockRejectedValueOnce(new Error('DB error'));

    await expect(AdminModel.updatePassword(1, 'hash'))
      .rejects.toThrow('DB error');

    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

// ── updateFotoPerfilUrl ───────────────────────────────────────────────────────
// Líneas 96-107 — antes sin cobertura

describe('updateFotoPerfilUrl', () => {
  it('ejecuta UPDATE con la nueva URL y cierra la conexión', async () => {
    mockExecute.mockResolvedValueOnce({});

    await AdminModel.updateFotoPerfilUrl(5, 'profiles/admin5.jpg');

    expect(mockExecute).toHaveBeenCalledTimes(1);
    const [sql, binds, opts] = mockExecute.mock.calls[0];
    expect(sql).toMatch(/FOTO_PERFIL_URL/i);
    expect(binds.fotoPerfilUrl).toBe('profiles/admin5.jpg');
    expect(binds.idAdmin).toBe(5);
    expect(opts?.autoCommit).toBe(true);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('acepta null para borrar la foto de perfil', async () => {
    mockExecute.mockResolvedValueOnce({});

    await AdminModel.updateFotoPerfilUrl(5, null);

    const [, binds] = mockExecute.mock.calls[0];
    expect(binds.fotoPerfilUrl).toBeNull();
  });

  it('cierra la conexión aunque execute lance', async () => {
    mockExecute.mockRejectedValueOnce(new Error('ORA-00600'));

    await expect(AdminModel.updateFotoPerfilUrl(5, 'foto.jpg'))
      .rejects.toThrow('ORA-00600');

    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

// ── deactivate ────────────────────────────────────────────────────────────────

describe('deactivate', () => {
  it('ejecuta UPDATE ACTIVO=0', async () => {
    mockExecute.mockResolvedValueOnce({});

    await AdminModel.deactivate(3);

    const [sql, binds] = mockExecute.mock.calls[0];
    expect(sql).toMatch(/ACTIVO\s*=\s*0/i);
    expect(binds.idAdmin).toBe(3);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});
