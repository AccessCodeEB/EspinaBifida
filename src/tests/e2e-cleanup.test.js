import { jest } from "@jest/globals";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockDeleteE2ECitas  = jest.fn();
const mockDeleteE2EMovs        = jest.fn();
const mockDeleteE2EInventario  = jest.fn();
const mockDeleteE2EAdmins = jest.fn();

jest.unstable_mockModule("../services/citas.service.js", () => ({
  deleteE2ECitas:  mockDeleteE2ECitas,
  getAllCitas:      jest.fn(),
  getCitaById:     jest.fn(),
  createCita:      jest.fn(),
  updateCita:      jest.fn(),
  deleteCita:      jest.fn(),
}));

jest.unstable_mockModule("../services/inventario.service.js", () => ({
  deleteE2EMovimientos:  mockDeleteE2EMovs,
  deleteE2EInventario:   mockDeleteE2EInventario,
  getInventario:        jest.fn(),
  registrarMovimiento:  jest.fn(),
  crearArticulo:        jest.fn(),
  actualizarArticulo:   jest.fn(),
  eliminarArticulo:     jest.fn(),
  getMovimientos:       jest.fn(),
  getCategorias:        jest.fn(),
}));

jest.unstable_mockModule("../services/administradores.service.js", () => ({
  deleteE2EAdmins:           mockDeleteE2EAdmins,
  login:                     jest.fn(),
  getAll:                    jest.fn(),
  getById:                   jest.fn(),
  create:                    jest.fn(),
  update:                    jest.fn(),
  deactivate:                jest.fn(),
  changePassword:            jest.fn(),
  solicitarCodigo:           jest.fn(),
  resetPasswordByAdmin: jest.fn(),
  resetPasswordPublico:      jest.fn(),
  solicitarRecuperacion:     jest.fn(),
  refresh:                   jest.fn(),
  revokeRefreshToken:        jest.fn(),
  updateTelefono:            jest.fn(),
  updateFotoPerfilByUpload:  jest.fn(),
}));

const { e2eCleanup: citasCleanup }  = await import("../controllers/citas.controller.js");
const { e2eCleanup: invCleanup }    = await import("../controllers/inventario.controller.js");
const { e2eCleanup: adminsCleanup } = await import("../controllers/administradores.controller.js");

function makeRes() {
  const res = { _status: 200, _body: null };
  res.status = (code) => { res._status = code; return res; };
  res.json   = (body)  => { res._body = body;  return res; };
  return res;
}

beforeEach(() => jest.resetAllMocks());

// ── citas.controller — e2eCleanup ─────────────────────────────────────────────

describe("citas.controller — e2eCleanup", () => {
  const OLD = process.env.NODE_ENV;
  afterEach(() => { process.env.NODE_ENV = OLD; });

  it("borra citas E2E y responde 200", async () => {
    process.env.NODE_ENV = "test";
    mockDeleteE2ECitas.mockResolvedValueOnce(undefined);
    const res = makeRes();
    await citasCleanup({}, res, jest.fn());
    expect(mockDeleteE2ECitas).toHaveBeenCalledTimes(1);
    expect(res._body.message).toMatch(/E2E/i);
  });

  it("devuelve 403 en producción", async () => {
    process.env.NODE_ENV = "production";
    const res = makeRes();
    await citasCleanup({}, res, jest.fn());
    expect(res._status).toBe(403);
    expect(mockDeleteE2ECitas).not.toHaveBeenCalled();
  });
});

// ── inventario.controller — e2eCleanup ───────────────────────────────────────

describe("inventario.controller — e2eCleanup", () => {
  const OLD = process.env.NODE_ENV;
  afterEach(() => { process.env.NODE_ENV = OLD; });

  it("borra datos E2E de inventario y responde 200", async () => {
    process.env.NODE_ENV = "test";
    mockDeleteE2EInventario.mockResolvedValueOnce(undefined);
    const res = makeRes();
    await invCleanup({}, res, jest.fn());
    expect(mockDeleteE2EInventario).toHaveBeenCalledTimes(1);
    expect(res._body.message).toMatch(/E2E/i);
  });

  it("devuelve 403 en producción", async () => {
    process.env.NODE_ENV = "production";
    const res = makeRes();
    await invCleanup({}, res, jest.fn());
    expect(res._status).toBe(403);
    expect(mockDeleteE2EInventario).not.toHaveBeenCalled();
  });
});

// ── administradores.controller — e2eCleanup ──────────────────────────────────

describe("administradores.controller — e2eCleanup", () => {
  const OLD = process.env.NODE_ENV;
  afterEach(() => { process.env.NODE_ENV = OLD; });

  it("borra admins E2E y responde 200", async () => {
    process.env.NODE_ENV = "test";
    mockDeleteE2EAdmins.mockResolvedValueOnce(undefined);
    const res = makeRes();
    await adminsCleanup({}, res, jest.fn());
    expect(mockDeleteE2EAdmins).toHaveBeenCalledTimes(1);
    expect(res._body.message).toMatch(/E2E/i);
  });

  it("devuelve 403 en producción", async () => {
    process.env.NODE_ENV = "production";
    const res = makeRes();
    await adminsCleanup({}, res, jest.fn());
    expect(res._status).toBe(403);
    expect(mockDeleteE2EAdmins).not.toHaveBeenCalled();
  });
});
