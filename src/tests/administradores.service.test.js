import { jest } from "@jest/globals";

// ─── Mocks del modelo ─────────────────────────────────────────────────────────
const mockFindById       = jest.fn();
const mockFindByEmail    = jest.fn();
const mockUpdatePassword = jest.fn();
const mockCreate         = jest.fn();
const mockUpdate         = jest.fn();

jest.unstable_mockModule("../models/administradores.model.js", () => ({
  findById:           mockFindById,
  findByEmail:        mockFindByEmail,
  findAll:            jest.fn(),
  create:             mockCreate,
  update:             mockUpdate,
  updatePassword:     mockUpdatePassword,
  deactivate:         jest.fn(),
  updateFotoPerfilUrl: jest.fn(),
}));

const mockRolesFindById = jest.fn();

jest.unstable_mockModule("../models/roles.model.js", () => ({
  findById: mockRolesFindById,
  findAll:  jest.fn(),
}));

// ─── Mocks de bcryptjs ────────────────────────────────────────────────────────
const mockBcryptCompare = jest.fn();
const mockBcryptHash    = jest.fn();

jest.unstable_mockModule("bcryptjs", () => ({
  default: { compare: mockBcryptCompare, hash: mockBcryptHash },
  compare: mockBcryptCompare,
  hash:    mockBcryptHash,
}));

// ─── Mocks de utilidades de archivos (evitar acceso a disco) ─────────────────
jest.unstable_mockModule("../utils/profileFiles.js", () => ({
  publicPathForStoredFile: jest.fn((f) => `/uploads/profiles/${f}`),
  unlinkOldProfileIfSafe:  jest.fn(),
}));

jest.unstable_mockModule("fs", () => ({
  default: {
    readFileSync: jest.fn(() => Buffer.from("fake-bytes")),
    unlinkSync: jest.fn(),
  },
}));

// Importaciones después de los mocks (ESM)
process.env.JWT_SECRET = "test-secret-espina-bifida";
const Service = await import("../services/administradores.service.js");

const fakeUploadedFile = Object.freeze({
  path: "/tmp/espina-test-profile.bin",
  mimetype: "image/jpeg",
  filename: "upload.jpg",
});

const adminRow = {
  ID_ADMIN:        1,
  ID_ROL:          1,
  NOMBRE_COMPLETO: "Admin Test",
  EMAIL:           "admin@test.com",
  PASSWORD_HASH:   "$2a$10$somehash",
  ACTIVO:          1,
  NOMBRE_ROL:      "SuperAdmin",
  FOTO_PERFIL_URL: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdatePassword.mockResolvedValue(undefined);
});

// ═══════════════════════════════════════════════════════════════════════════════
// login — ruta de contraseña legacy (plaintext → migración a bcrypt)
// Cubre líneas 62-67 de administradores.service.js
// ═══════════════════════════════════════════════════════════════════════════════

describe("login — migración de contraseña legacy (plaintext)", () => {
  test("acepta contraseña en texto plano y migra a bcrypt", async () => {
    // Hash que no empieza con $2a$/$2b$/$2y$ → es plaintext legacy
    const plainRow = { ...adminRow, PASSWORD_HASH: "myplainpassword" };
    mockFindByEmail.mockResolvedValueOnce(plainRow);
    mockBcryptHash.mockResolvedValueOnce("$2a$10$newhash");

    const result = await Service.login("admin@test.com", "myplainpassword");

    // Debe emitir token válido
    expect(result).toHaveProperty("token");
    // Debe haber llamado a bcrypt.hash para migrar
    expect(mockBcryptHash).toHaveBeenCalledWith("myplainpassword", expect.any(Number));
    // Debe guardar el nuevo hash
    expect(mockUpdatePassword).toHaveBeenCalledWith(1, "$2a$10$newhash");
  });

  test("rechaza contraseña legacy incorrecta (401)", async () => {
    const plainRow = { ...adminRow, PASSWORD_HASH: "myplainpassword" };
    mockFindByEmail.mockResolvedValueOnce(plainRow);

    await expect(Service.login("admin@test.com", "wrongpassword")).rejects.toMatchObject({
      statusCode: 401,
    });
    // No debe intentar migrar si la contraseña es incorrecta
    expect(mockBcryptHash).not.toHaveBeenCalled();
    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  test("normalizePasswordHash — valor numérico de Oracle se convierte a string", async () => {
    // Simula Oracle devolviendo hash como número (edge case)
    const numHashRow = { ...adminRow, PASSWORD_HASH: 12345 };
    mockFindByEmail.mockResolvedValueOnce(numHashRow);

    // "12345" no empieza con bcrypt prefix → trata como legacy
    // La contraseña "12345" coincide con el hash stringificado
    mockBcryptHash.mockResolvedValueOnce("$2a$10$converted");

    const result = await Service.login("admin@test.com", "12345");
    expect(result).toHaveProperty("token");
    expect(mockBcryptHash).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// changePassword
// Cubre líneas 145-156 de administradores.service.js
// ═══════════════════════════════════════════════════════════════════════════════

describe("changePassword", () => {
  test("lanza 403 si el caller intenta cambiar contraseña de otro admin", async () => {
    await expect(
      Service.changePassword(2, { passwordActual: "old", passwordNueva: "newpass123" }, 1)
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(mockFindById).not.toHaveBeenCalled();
  });

  test("lanza 400 si faltan passwordActual o passwordNueva", async () => {
    await expect(
      Service.changePassword(1, { passwordActual: "", passwordNueva: "" }, 1)
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test("lanza 400 si passwordNueva tiene menos de 6 caracteres", async () => {
    await expect(
      Service.changePassword(1, { passwordActual: "actual", passwordNueva: "abc" }, 1)
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test("lanza 401 si la contraseña actual es incorrecta", async () => {
    mockFindById.mockResolvedValueOnce(adminRow);
    mockFindByEmail.mockResolvedValueOnce(adminRow);
    mockBcryptCompare.mockResolvedValueOnce(false);

    await expect(
      Service.changePassword(1, { passwordActual: "wrongcurrent", passwordNueva: "newpass123" }, 1)
    ).rejects.toMatchObject({ statusCode: 401 });

    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  test("cambia la contraseña exitosamente cuando todo es válido", async () => {
    mockFindById.mockResolvedValueOnce(adminRow);
    mockFindByEmail.mockResolvedValueOnce(adminRow);
    mockBcryptCompare.mockResolvedValueOnce(true);
    mockBcryptHash.mockResolvedValueOnce("$2a$10$newhash");

    await expect(
      Service.changePassword(1, { passwordActual: "correctcurrent", passwordNueva: "newpass123" }, 1)
    ).resolves.toBeUndefined();

    expect(mockBcryptHash).toHaveBeenCalledWith("newpass123", expect.any(Number));
    expect(mockUpdatePassword).toHaveBeenCalledWith(1, "$2a$10$newhash");
  });

  test("lanza 404 si el administrador no existe", async () => {
    mockFindById.mockResolvedValueOnce(null);
    // findByEmail recibe undefined.EMAIL → undefined
    mockFindByEmail.mockResolvedValueOnce(null);

    await expect(
      Service.changePassword(1, { passwordActual: "current", passwordNueva: "newpass123" }, 1)
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// updateFotoPerfilByUpload (para admins)
// Cubre líneas 167-179 de administradores.service.js
// ═══════════════════════════════════════════════════════════════════════════════

describe("updateFotoPerfilByUpload", () => {
  test("lanza 403 si el caller no es el mismo ni superAdmin", async () => {
    const caller = { idAdmin: 2, idRol: 2 }; // distinto admin, sin rol 1

    await expect(
      Service.updateFotoPerfilByUpload(1, fakeUploadedFile, caller)
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(mockFindById).not.toHaveBeenCalled();
  });

  test("superAdmin (rol 1) puede actualizar foto de otro admin", async () => {
    const caller = { idAdmin: 99, idRol: 1 };
    mockFindById.mockResolvedValueOnce(adminRow);

    const result = await Service.updateFotoPerfilByUpload(1, fakeUploadedFile, caller);

    expect(result).toHaveProperty("fotoPerfilUrl");
    expect(result.fotoPerfilUrl).toMatch(/^data:image\/jpeg;base64,/);
  });

  test("admin actualiza su propia foto (misma id)", async () => {
    const caller = { idAdmin: 1, idRol: 2 };
    mockFindById.mockResolvedValueOnce(adminRow);

    const result = await Service.updateFotoPerfilByUpload(1, fakeUploadedFile, caller);

    expect(result.fotoPerfilUrl).toMatch(/^data:image\/jpeg;base64,/);
  });

  test("lanza 404 si el admin no existe", async () => {
    const caller = { idAdmin: 1, idRol: 1 };
    mockFindById.mockResolvedValueOnce(null);

    await expect(
      Service.updateFotoPerfilByUpload(99, fakeUploadedFile, caller)
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  test("lanza 400 si file.path está ausente", async () => {
    const caller = { idAdmin: 1, idRol: 1 };
    await expect(
      Service.updateFotoPerfilByUpload(1, { mimetype: "image/png" }, caller)
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// create — validaciones de campos obligatorios (líneas 99–107)
// ═══════════════════════════════════════════════════════════════════════════════

describe("create — validaciones de campos (líneas 99–107)", () => {
  test("nombre vacío → BAD_REQUEST", async () => {
    await expect(
      Service.create({ idRol: 1, nombreCompleto: "  ", email: "a@b.com", password: "pass123" })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test("idRol ausente → BAD_REQUEST", async () => {
    await expect(
      Service.create({ idRol: null, nombreCompleto: "Admin", email: "a@b.com", password: "pass123" })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test("rol no encontrado → NOT_FOUND", async () => {
    mockRolesFindById.mockResolvedValueOnce(null);
    await expect(
      Service.create({ idRol: 99, nombreCompleto: "Admin", email: "a@b.com", password: "pass123" })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  test("email ya en uso → CONFLICT", async () => {
    mockRolesFindById.mockResolvedValueOnce({ ID_ROL: 1, NOMBRE_ROL: "Staff" });
    mockFindByEmail.mockResolvedValueOnce(adminRow); // ya existe
    await expect(
      Service.create({ idRol: 1, nombreCompleto: "Admin", email: "admin@test.com", password: "pass123" })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  test("creación exitosa → no lanza", async () => {
    mockRolesFindById.mockResolvedValueOnce({ ID_ROL: 1, NOMBRE_ROL: "Staff" });
    mockFindByEmail.mockResolvedValueOnce(null); // no existe
    mockBcryptHash.mockResolvedValueOnce("$2a$10$newhash");
    mockCreate.mockResolvedValueOnce({ rowsAffected: 1 });
    await expect(
      Service.create({ idRol: 1, nombreCompleto: "Nuevo Admin", email: "nuevo@test.com", password: "pass123" })
    ).resolves.toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// update — validaciones (líneas 123–133)
// ═══════════════════════════════════════════════════════════════════════════════

describe("update — validaciones (líneas 123–133)", () => {
  test("admin no encontrado → NOT_FOUND", async () => {
    mockFindById.mockResolvedValueOnce(null);
    await expect(
      Service.update(99, { idRol: 1, nombreCompleto: "Admin", email: "a@b.com" })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  test("email inválido → BAD_REQUEST", async () => {
    mockFindById.mockResolvedValueOnce(adminRow);
    await expect(
      Service.update(1, { idRol: 1, nombreCompleto: "Admin", email: "no-es-email" })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test("nombre vacío → BAD_REQUEST", async () => {
    mockFindById.mockResolvedValueOnce(adminRow);
    await expect(
      Service.update(1, { idRol: 1, nombreCompleto: "  " })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test("idRol ausente → BAD_REQUEST", async () => {
    mockFindById.mockResolvedValueOnce(adminRow);
    await expect(
      Service.update(1, { idRol: null, nombreCompleto: "Admin" })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test("rol no encontrado → NOT_FOUND", async () => {
    mockFindById.mockResolvedValueOnce(adminRow);
    mockRolesFindById.mockResolvedValueOnce(null);
    await expect(
      Service.update(1, { idRol: 99, nombreCompleto: "Admin" })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  test("actualización exitosa → no lanza", async () => {
    mockFindById.mockResolvedValueOnce(adminRow);
    mockRolesFindById.mockResolvedValueOnce({ ID_ROL: 1 });
    mockUpdate.mockResolvedValueOnce({ rowsAffected: 1 });
    await expect(
      Service.update(1, { idRol: 1, nombreCompleto: "Admin Test", email: "admin@test.com" })
    ).resolves.toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// login — rama bcrypt (línea 61): passwordHash válido con bcrypt
// ═══════════════════════════════════════════════════════════════════════════════

describe("login — rama bcrypt estándar", () => {
  test("contraseña correcta con hash bcrypt → retorna token", async () => {
    mockFindByEmail.mockResolvedValueOnce(adminRow);
    mockBcryptCompare.mockResolvedValueOnce(true);

    const result = await Service.login("admin@test.com", "mipassword");

    expect(result).toHaveProperty("token");
    expect(mockBcryptCompare).toHaveBeenCalledWith("mipassword", "$2a$10$somehash");
  });

  test("contraseña incorrecta con hash bcrypt → 401", async () => {
    mockFindByEmail.mockResolvedValueOnce(adminRow);
    mockBcryptCompare.mockResolvedValueOnce(false);

    await expect(Service.login("admin@test.com", "wrongpass")).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  test("PASSWORD_HASH null → stored='', passwordValida=false → 401", async () => {
    const rowNullHash = { ...adminRow, PASSWORD_HASH: null };
    mockFindByEmail.mockResolvedValueOnce(rowNullHash);

    await expect(Service.login("admin@test.com", "anypass")).rejects.toMatchObject({
      statusCode: 401,
    });
    // bcrypt.compare no debe llamarse con hash vacío
    expect(mockBcryptCompare).not.toHaveBeenCalled();
  });
});
