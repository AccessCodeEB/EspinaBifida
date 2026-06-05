import { jest } from "@jest/globals";
import { createHash } from "node:crypto";

// ─── Mocks del modelo ─────────────────────────────────────────────────────────
const mockFindById        = jest.fn();
const mockFindByEmail     = jest.fn();
const mockUpdatePassword  = jest.fn();
const mockUpdateTelefono  = jest.fn();
const mockCreate          = jest.fn();
const mockUpdate          = jest.fn();

jest.unstable_mockModule("../models/administradores.model.js", () => ({
  findById:           mockFindById,
  findByEmail:        mockFindByEmail,
  findAll:            jest.fn(),
  create:             mockCreate,
  update:             mockUpdate,
  updatePassword:     mockUpdatePassword,
  updateTelefono:     mockUpdateTelefono,
  deactivate:         jest.fn(),
  updateFotoPerfilUrl: jest.fn(),
}));

// ─── Mocks de OTP y SMS ───────────────────────────────────────────────────────
const mockSaveOtp     = jest.fn();
const mockVerifyOtp   = jest.fn();
const mockSendEmailCode = jest.fn();

jest.unstable_mockModule("../utils/otpStore.js", () => ({
  saveOtp:    mockSaveOtp,
  verifyOtp:  mockVerifyOtp,
  clearOtp:   jest.fn(),
  OTP_TTL_MS: 300000,
  _testStore: new Map(),
}));

jest.unstable_mockModule("../utils/email.js", () => ({
  sendEmailCode: mockSendEmailCode,
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

// ─── Mock del modelo de refresh tokens ───────────────────────────────────────
const mockRtInsert       = jest.fn().mockResolvedValue(undefined);
const mockRtFindByHash   = jest.fn();
const mockRtRevoke       = jest.fn().mockResolvedValue(undefined);
const mockRtRevokeAll    = jest.fn().mockResolvedValue(undefined);

jest.unstable_mockModule("../models/refreshTokens.model.js", () => ({
  insert:          mockRtInsert,
  findByHash:      mockRtFindByHash,
  revoke:          mockRtRevoke,
  revokeAllForAdmin: mockRtRevokeAll,
  cleanExpired:    jest.fn().mockResolvedValue(undefined),
  hashToken:       (raw) => createHash("sha256").update(raw).digest("hex"),
}));

// ─── Mocks de utilidades de archivos (evitar acceso a disco) ─────────────────
jest.unstable_mockModule("../utils/profileFiles.js", () => ({
  publicPathForStoredFile: jest.fn((f) => `/uploads/profiles/${f}`),
  unlinkOldProfileIfSafe:  jest.fn(),
}));

jest.unstable_mockModule("node:fs", () => ({
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
  NOMBRE_ROL:      "Admin",
  FOTO_PERFIL_URL: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdatePassword.mockResolvedValue(undefined);
  mockUpdateTelefono.mockResolvedValue(undefined);
  mockVerifyOtp.mockReturnValue(true);   // por defecto OTP válido
  mockSaveOtp.mockResolvedValue(undefined);
  mockSendEmailCode.mockResolvedValue(undefined);
  mockRtInsert.mockResolvedValue(undefined);
  mockRtRevoke.mockResolvedValue(undefined);
  mockRtRevokeAll.mockResolvedValue(undefined);
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
      Service.changePassword(2, { passwordActual: "old", passwordNueva: "newpass123", codigo: "123456" }, 1)
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(mockFindById).not.toHaveBeenCalled();
  });

  test("lanza 400 si faltan passwordActual o passwordNueva", async () => {
    await expect(
      Service.changePassword(1, { passwordActual: "", passwordNueva: "", codigo: "123456" }, 1)
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test("lanza 400 si passwordNueva tiene menos de 6 caracteres", async () => {
    await expect(
      Service.changePassword(1, { passwordActual: "actual", passwordNueva: "abc", codigo: "123456" }, 1)
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test("lanza 400 MISSING_OTP si no se proporciona código", async () => {
    await expect(
      Service.changePassword(1, { passwordActual: "actual", passwordNueva: "newpass123" }, 1)
    ).rejects.toMatchObject({ statusCode: 400, code: "MISSING_OTP" });
  });

  test("lanza 400 INVALID_OTP si el código es incorrecto", async () => {
    mockVerifyOtp.mockReturnValueOnce(false);
    await expect(
      Service.changePassword(1, { passwordActual: "actual", passwordNueva: "newpass123", codigo: "000000" }, 1)
    ).rejects.toMatchObject({ statusCode: 400, code: "INVALID_OTP" });
  });

  test("lanza 401 si la contraseña actual es incorrecta", async () => {
    mockFindById.mockResolvedValueOnce(adminRow);
    mockFindByEmail.mockResolvedValueOnce(adminRow);
    mockBcryptCompare.mockResolvedValueOnce(false);

    await expect(
      Service.changePassword(1, { passwordActual: "wrongcurrent", passwordNueva: "newpass123", codigo: "123456" }, 1)
    ).rejects.toMatchObject({ statusCode: 401 });

    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  test("cambia la contraseña exitosamente cuando todo es válido", async () => {
    mockFindById.mockResolvedValueOnce(adminRow);
    mockFindByEmail.mockResolvedValueOnce(adminRow);
    mockBcryptCompare.mockResolvedValueOnce(true);
    mockBcryptHash.mockResolvedValueOnce("$2a$10$newhash");

    await expect(
      Service.changePassword(1, { passwordActual: "correctcurrent", passwordNueva: "newpass123", codigo: "123456" }, 1)
    ).resolves.toBeUndefined();

    expect(mockBcryptHash).toHaveBeenCalledWith("newpass123", expect.any(Number));
    expect(mockUpdatePassword).toHaveBeenCalledWith(1, "$2a$10$newhash");
  });

  test("lanza 404 si el administrador no existe (findById → null)", async () => {
    mockFindById.mockResolvedValueOnce(null);

    await expect(
      Service.changePassword(1, { passwordActual: "current", passwordNueva: "newpass123", codigo: "123456" }, 1)
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  test("lanza 404 si findByEmail no encuentra al admin (línea 179)", async () => {
    mockFindById.mockResolvedValueOnce(adminRow);
    mockFindByEmail.mockResolvedValueOnce(null); // findByEmail devuelve null

    await expect(
      Service.changePassword(1, { passwordActual: "current", passwordNueva: "newpass123", codigo: "123456" }, 1)
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// solicitarCodigo
// ═══════════════════════════════════════════════════════════════════════════════

describe("solicitarCodigo", () => {
  test("lanza 403 si el caller intenta solicitar código de otro admin", async () => {
    await expect(
      Service.solicitarCodigo(2, 1)
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  test("lanza 404 si el admin no existe", async () => {
    mockFindById.mockResolvedValueOnce(null);
    await expect(
      Service.solicitarCodigo(1, 1)
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  test("genera OTP, llama sendEmailCode con el email del admin y retorna mensaje", async () => {
    mockFindById.mockResolvedValueOnce(adminRow);

    const result = await Service.solicitarCodigo(1, 1);

    expect(mockSaveOtp).toHaveBeenCalledWith(1, expect.stringMatching(/^\d{6}$/));
    expect(mockSendEmailCode).toHaveBeenCalledWith("admin@test.com", expect.stringMatching(/^\d{6}$/));
    expect(result).toHaveProperty("message");
  });

  test("incluye codigoDev en desarrollo cuando sendEmailCode devuelve el código", async () => {
    mockFindById.mockResolvedValueOnce(adminRow);
    mockSendEmailCode.mockResolvedValueOnce("654321");

    const result = await Service.solicitarCodigo(1, 1);

    expect(result).toHaveProperty("codigoDev", "654321");
  });

  test("no incluye codigoDev en producción aunque sendEmailCode lo devuelva", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      mockFindById.mockResolvedValueOnce(adminRow);
      mockSendEmailCode.mockResolvedValueOnce("654321");

      const result = await Service.solicitarCodigo(1, 1);

      expect(result).not.toHaveProperty("codigoDev");
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// solicitarRecuperacion
// ═══════════════════════════════════════════════════════════════════════════════

describe("solicitarRecuperacion", () => {
  test("lanza 404 si no existe admin con ese email", async () => {
    mockFindByEmail.mockResolvedValueOnce(null);
    await expect(
      Service.solicitarRecuperacion("noexiste@test.com")
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  test("normaliza el email a minúsculas antes de buscar", async () => {
    mockFindByEmail.mockResolvedValueOnce(adminRow);

    await Service.solicitarRecuperacion("ADMIN@TEST.COM");

    expect(mockFindByEmail).toHaveBeenCalledWith("admin@test.com");
  });

  test("genera OTP, llama sendEmailCode con el email del admin y retorna mensaje", async () => {
    mockFindByEmail.mockResolvedValueOnce(adminRow);

    const result = await Service.solicitarRecuperacion("admin@test.com");

    expect(mockSaveOtp).toHaveBeenCalledWith(
      adminRow.ID_ADMIN,
      expect.stringMatching(/^\d{6}$/)
    );
    expect(mockSendEmailCode).toHaveBeenCalledWith(
      "admin@test.com",
      expect.stringMatching(/^\d{6}$/)
    );
    expect(result).toHaveProperty("message");
  });

  test("incluye codigoDev en desarrollo cuando sendEmailCode lo devuelve", async () => {
    mockFindByEmail.mockResolvedValueOnce(adminRow);
    mockSendEmailCode.mockResolvedValueOnce("111222");

    const result = await Service.solicitarRecuperacion("admin@test.com");

    expect(result).toHaveProperty("codigoDev", "111222");
  });

  test("no incluye codigoDev en producción", async () => {
    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      mockFindByEmail.mockResolvedValueOnce(adminRow);
      mockSendEmailCode.mockResolvedValueOnce("111222");

      const result = await Service.solicitarRecuperacion("admin@test.com");

      expect(result).not.toHaveProperty("codigoDev");
    } finally {
      process.env.NODE_ENV = orig;
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// resetPasswordPublico
// ═══════════════════════════════════════════════════════════════════════════════

describe("resetPasswordPublico", () => {
  test("lanza 404 si no existe admin con ese email", async () => {
    mockFindByEmail.mockResolvedValueOnce(null);
    await expect(
      Service.resetPasswordPublico("noexiste@test.com", "123456", "NuevaPass1")
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  test("lanza 400 MISSING_OTP si el código es falsy", async () => {
    mockFindByEmail.mockResolvedValueOnce(adminRow);
    await expect(
      Service.resetPasswordPublico("admin@test.com", "", "NuevaPass1")
    ).rejects.toMatchObject({ statusCode: 400, code: "MISSING_OTP" });
  });

  test("lanza 400 INVALID_OTP si el código no es válido", async () => {
    mockFindByEmail.mockResolvedValueOnce(adminRow);
    mockVerifyOtp.mockReturnValueOnce(false);
    await expect(
      Service.resetPasswordPublico("admin@test.com", "000000", "NuevaPass1")
    ).rejects.toMatchObject({ statusCode: 400, code: "INVALID_OTP" });
  });

  test("lanza 400 si la nueva contraseña tiene menos de 6 caracteres", async () => {
    mockFindByEmail.mockResolvedValueOnce(adminRow);
    mockVerifyOtp.mockReturnValueOnce(true);
    await expect(
      Service.resetPasswordPublico("admin@test.com", "123456", "abc")
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test("actualiza contraseña y retorna mensaje cuando todo es válido", async () => {
    mockFindByEmail.mockResolvedValueOnce(adminRow);
    mockVerifyOtp.mockReturnValueOnce(true);
    mockBcryptHash.mockResolvedValueOnce("$2a$10$newhash");
    mockUpdatePassword.mockResolvedValueOnce(undefined);

    const result = await Service.resetPasswordPublico(
      "admin@test.com",
      "123456",
      "NuevaPass1"
    );

    expect(mockBcryptHash).toHaveBeenCalledWith("NuevaPass1", expect.any(Number));
    expect(mockUpdatePassword).toHaveBeenCalledWith(adminRow.ID_ADMIN, "$2a$10$newhash");
    expect(result).toHaveProperty("message");
  });

  test("normaliza el email a minúsculas antes de buscar", async () => {
    mockFindByEmail.mockResolvedValueOnce(adminRow);
    mockVerifyOtp.mockReturnValueOnce(true);
    mockBcryptHash.mockResolvedValueOnce("$2a$10$newhash");
    mockUpdatePassword.mockResolvedValueOnce(undefined);

    await Service.resetPasswordPublico("ADMIN@TEST.COM", "123456", "NuevaPass1");

    expect(mockFindByEmail).toHaveBeenCalledWith("admin@test.com");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// updateTelefono
// ═══════════════════════════════════════════════════════════════════════════════

describe("updateTelefono", () => {
  test("lanza 403 si el caller intenta actualizar teléfono de otro admin", async () => {
    await expect(
      Service.updateTelefono(2, "8181234567", 1)
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  test("lanza 404 si el admin no existe", async () => {
    mockFindById.mockResolvedValueOnce(null);
    await expect(
      Service.updateTelefono(1, "8181234567", 1)
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  test("lanza 400 INVALID_PHONE si el teléfono no tiene 10 dígitos", async () => {
    mockFindById.mockResolvedValueOnce(adminRow);
    await expect(
      Service.updateTelefono(1, "12345", 1)
    ).rejects.toMatchObject({ statusCode: 400, code: "INVALID_PHONE" });
  });

  test("actualiza teléfono con 10 dígitos limpios", async () => {
    mockFindById.mockResolvedValueOnce(adminRow);
    await Service.updateTelefono(1, "8181234567", 1);
    expect(mockUpdateTelefono).toHaveBeenCalledWith(1, "8181234567");
  });

  test("guarda null si se pasa teléfono vacío", async () => {
    mockFindById.mockResolvedValueOnce(adminRow);
    await Service.updateTelefono(1, "", 1);
    expect(mockUpdateTelefono).toHaveBeenCalledWith(1, null);
  });

  test("limpia caracteres no numéricos antes de guardar", async () => {
    mockFindById.mockResolvedValueOnce(adminRow);
    await Service.updateTelefono(1, "818-123-4567", 1);
    expect(mockUpdateTelefono).toHaveBeenCalledWith(1, "8181234567");
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

  test("mime fallback 'image/jpeg' cuando file.mimetype es vacío (L179)", async () => {
    const caller = { idAdmin: 1, idRol: 1 };
    mockFindById.mockResolvedValueOnce(adminRow);

    const result = await Service.updateFotoPerfilByUpload(1, {
      path: "/tmp/espina-test-profile.bin",
      mimetype: "", // falsy → usa "image/jpeg"
      filename: "upload.jpg",
    }, caller);

    expect(result.fotoPerfilUrl).toMatch(/^data:image\/jpeg;base64,/);
  });

  test("prev con URL externa (no 'data:') → intenta eliminar archivo (L182)", async () => {
    const caller = { idAdmin: 1, idRol: 1 };
    const adminWithExternalPhoto = {
      ...adminRow,
      FOTO_PERFIL_URL: "/uploads/profiles/old-photo.jpg", // no empieza con "data:"
    };
    mockFindById.mockResolvedValueOnce(adminWithExternalPhoto);

    const result = await Service.updateFotoPerfilByUpload(1, fakeUploadedFile, caller);

    expect(result.fotoPerfilUrl).toMatch(/^data:image\/jpeg;base64,/);
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
      Service.create({ idRol: 99, nombreCompleto: "Admin", email: "a@b.com", password: "pass12345" })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  test("email ya en uso → CONFLICT", async () => {
    mockRolesFindById.mockResolvedValueOnce({ ID_ROL: 1, NOMBRE_ROL: "Staff" });
    mockFindByEmail.mockResolvedValueOnce(adminRow); // ya existe
    await expect(
      Service.create({ idRol: 1, nombreCompleto: "Admin", email: "admin@test.com", password: "pass12345" })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  test("creación exitosa → no lanza", async () => {
    mockRolesFindById.mockResolvedValueOnce({ ID_ROL: 1, NOMBRE_ROL: "Staff" });
    mockFindByEmail.mockResolvedValueOnce(null); // no existe
    mockBcryptHash.mockResolvedValueOnce("$2a$10$newhash");
    mockCreate.mockResolvedValueOnce({ rowsAffected: 1 });
    await expect(
      Service.create({ idRol: 1, nombreCompleto: "Nuevo Admin", email: "nuevo@test.com", password: "pass12345" })
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

  test("email no proporcionado → usa admin.EMAIL (L132: ?? admin.EMAIL)", async () => {
    mockFindById.mockResolvedValueOnce(adminRow);
    mockRolesFindById.mockResolvedValueOnce({ ID_ROL: 1 });
    mockUpdate.mockResolvedValueOnce({ rowsAffected: 1 });

    await Service.update(1, { idRol: 1, nombreCompleto: "Admin Test" });

    const callArgs = mockUpdate.mock.calls[0][1];
    expect(callArgs.email).toBe(adminRow.EMAIL);
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
    mockBcryptCompare.mockReset();
    const rowNullHash = { ...adminRow, PASSWORD_HASH: null };
    mockFindByEmail.mockResolvedValueOnce(rowNullHash);

    await expect(Service.login("admin@test.com", "anypass")).rejects.toMatchObject({
      statusCode: 401,
    });
    // bcrypt.compare no debe llamarse con hash vacío
    expect(mockBcryptCompare).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// refresh — rotación de refresh token
// ═══════════════════════════════════════════════════════════════════════════════

describe("refresh", () => {
  const FUTURE_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const PAST_DATE   = new Date(Date.now() - 1000);

  test("token válido → retorna nuevo par { token, refreshToken }", async () => {
    mockRtFindByHash.mockResolvedValueOnce({
      ID_TOKEN: 1, ID_ADMIN: 1, EXPIRES_AT: FUTURE_DATE, REVOCADO: 0,
    });
    mockRtRevoke.mockResolvedValueOnce(undefined);
    mockFindById.mockResolvedValueOnce(adminRow);

    const result = await Service.refresh("raw-valid-token");

    expect(result).toHaveProperty("token");
    expect(result).toHaveProperty("refreshToken");
    expect(mockRtRevoke).toHaveBeenCalledTimes(1);
    expect(mockRtInsert).toHaveBeenCalledTimes(1);
  });

  test("sin refresh token → 401", async () => {
    await expect(Service.refresh(null)).rejects.toMatchObject({ statusCode: 401 });
  });

  test("token no encontrado en DB → 401", async () => {
    mockRtFindByHash.mockResolvedValueOnce(null);
    await expect(Service.refresh("unknown-token")).rejects.toMatchObject({ statusCode: 401 });
  });

  test("token revocado → 401", async () => {
    mockRtFindByHash.mockResolvedValueOnce({
      ID_TOKEN: 2, ID_ADMIN: 1, EXPIRES_AT: FUTURE_DATE, REVOCADO: 1,
    });
    await expect(Service.refresh("revoked-token")).rejects.toMatchObject({ statusCode: 401 });
  });

  test("token expirado → 401", async () => {
    mockRtFindByHash.mockResolvedValueOnce({
      ID_TOKEN: 3, ID_ADMIN: 1, EXPIRES_AT: PAST_DATE, REVOCADO: 0,
    });
    await expect(Service.refresh("expired-token")).rejects.toMatchObject({ statusCode: 401 });
  });

  test("admin inactivo → 401", async () => {
    mockRtFindByHash.mockResolvedValueOnce({
      ID_TOKEN: 4, ID_ADMIN: 1, EXPIRES_AT: FUTURE_DATE, REVOCADO: 0,
    });
    mockRtRevoke.mockResolvedValueOnce(undefined);
    mockFindById.mockResolvedValueOnce({ ...adminRow, ACTIVO: 0 });

    await expect(Service.refresh("token-inactive-admin")).rejects.toMatchObject({ statusCode: 401 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// revokeRefreshToken
// ═══════════════════════════════════════════════════════════════════════════════

describe("revokeRefreshToken", () => {
  test("token proporcionado → llama a revoke del modelo", async () => {
    await Service.revokeRefreshToken("some-raw-token");
    expect(mockRtRevoke).toHaveBeenCalledTimes(1);
  });

  test("sin token (null) → no lanza ni llama a revoke", async () => {
    await Service.revokeRefreshToken(null);
    expect(mockRtRevoke).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// resetPasswordByAdmin
// ═══════════════════════════════════════════════════════════════════════════════

describe("resetPasswordByAdmin", () => {
  test("cambia la contraseña cuando el admin existe y la password es válida", async () => {
    mockFindById.mockResolvedValueOnce(adminRow);
    mockUpdatePassword.mockResolvedValueOnce(undefined);
    await Service.resetPasswordByAdmin(1, { passwordNueva: "NuevaPass1!" });
    expect(mockUpdatePassword).toHaveBeenCalledTimes(1);
  });

  test("lanza notFound cuando el admin no existe", async () => {
    mockFindById.mockResolvedValueOnce(null);
    await expect(
      Service.resetPasswordByAdmin(999, { passwordNueva: "NuevaPass1!" })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  test("lanza badRequest cuando la password no cumple requisitos", async () => {
    await expect(
      Service.resetPasswordByAdmin(1, { passwordNueva: "corta" })
    ).rejects.toThrow();
  });
});
