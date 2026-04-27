import path from "node:path";
import { jest } from "@jest/globals";

// ─── Mocks de módulos del sistema ────────────────────────────────────────────
// fs se mockea para no tocar disco real (el middleware importa "fs", no "node:fs")
jest.unstable_mockModule("fs", () => ({
  default: {
    existsSync: jest.fn(),
    mkdirSync:  jest.fn(),
  },
}));

// multer se mockea para capturar la configuración que le pasa el middleware
let capturedConfig = null;
jest.unstable_mockModule("multer", () => {
  const multerFn = jest.fn((cfg) => {
    capturedConfig = cfg;
    return { single: jest.fn(), array: jest.fn(), fields: jest.fn() };
  });
  multerFn.diskStorage = jest.fn((opts) => opts); // devuelve las opciones directamente
  return { default: multerFn };
});

// Importamos después de establecer los mocks (ESM)
const fsMock   = (await import("fs")).default;
const multerMock = (await import("multer")).default;
await import("../middleware/uploadProfilePhoto.js");

// ─── Helpers ─────────────────────────────────────────────────────────────────
// Extraemos las funciones internas a través del mock de diskStorage
const storageOpts = multerMock.diskStorage.mock.calls[0][0];
const { destination, filename } = storageOpts;

// fileFilter se pasa directamente en la config de multer
const { fileFilter } = capturedConfig;

beforeEach(() => jest.clearAllMocks());

// ═══════════════════════════════════════════════════════════════════════════════
// ensureUploadDir — vía storage.destination
// ═══════════════════════════════════════════════════════════════════════════════

describe("storage.destination — ensureUploadDir", () => {
  const cb = jest.fn();

  test("crea el directorio cuando no existe", () => {
    fsMock.existsSync.mockReturnValue(false);

    destination({}, {}, cb);

    expect(fsMock.mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining(path.join("uploads", "profiles")),
      { recursive: true }
    );
    expect(cb).toHaveBeenCalledWith(null, expect.stringContaining("profiles"));
  });

  test("no crea el directorio cuando ya existe", () => {
    fsMock.existsSync.mockReturnValue(true);

    destination({}, {}, cb);

    expect(fsMock.mkdirSync).not.toHaveBeenCalled();
    expect(cb).toHaveBeenCalledWith(null, expect.stringContaining("profiles"));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// storage.filename
// ═══════════════════════════════════════════════════════════════════════════════

describe("storage.filename", () => {
  const cb = jest.fn();

  test("usa el prefijo de req._profileFilePrefix y la extensión original", () => {
    filename(
      { _profileFilePrefix: "GAEJ900101" },
      { originalname: "avatar.png" },
      cb
    );

    expect(cb).toHaveBeenCalledWith(
      null,
      expect.stringMatching(/^GAEJ900101-\d+\.png$/)
    );
  });

  test("sanitiza caracteres especiales en el prefijo", () => {
    filename(
      { _profileFilePrefix: "curp/../../etc" },
      { originalname: "photo.jpg" },
      cb
    );

    const [[, nombre]] = cb.mock.calls;
    // El prefijo sanitizado no debe contener /, \ ni puntos
    const prefix = nombre.split("-")[0];
    expect(prefix).not.toMatch(/[/\\.]/);
    // 7 caracteres especiales reemplazados por "_"
    expect(nombre).toMatch(/^curp_______etc-\d+\.jpg$/);
  });

  test("usa 'file' como prefijo cuando req._profileFilePrefix no está definido", () => {
    filename(
      {},
      { originalname: "pic.webp" },
      cb
    );

    expect(cb).toHaveBeenCalledWith(
      null,
      expect.stringMatching(/^file-\d+\.webp$/)
    );
  });

  test("extensión desconocida → usa .jpg como fallback", () => {
    filename(
      { _profileFilePrefix: "test" },
      { originalname: "foto.bmp" },
      cb
    );

    expect(cb).toHaveBeenCalledWith(
      null,
      expect.stringMatching(/^test-\d+\.jpg$/)
    );
  });

  test("extensión en mayúsculas → se normaliza a minúsculas", () => {
    filename(
      { _profileFilePrefix: "test" },
      { originalname: "foto.PNG" },
      cb
    );

    expect(cb).toHaveBeenCalledWith(
      null,
      expect.stringMatching(/^test-\d+\.png$/)
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// fileFilter
// ═══════════════════════════════════════════════════════════════════════════════

describe("fileFilter", () => {
  const cb = jest.fn();

  test.each([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ])("acepta %s", (mime) => {
    fileFilter({}, { mimetype: mime }, cb);
    expect(cb).toHaveBeenCalledWith(null, true);
  });

  test.each([
    "application/pdf",
    "image/svg+xml",
    "text/plain",
    "image/tiff",
  ])("rechaza %s con HttpError INVALID_UPLOAD", (mime) => {
    fileFilter({}, { mimetype: mime }, cb);

    const [[err]] = cb.mock.calls;
    expect(err).toMatchObject({
      statusCode: 400,
      code: "INVALID_UPLOAD",
    });
    // No se pasa segundo argumento o es undefined
    expect(cb.mock.calls[0][1]).toBeUndefined();
  });
});
