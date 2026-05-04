import { jest } from "@jest/globals";
import {
  TEST_SECRET, mockExecute,
  dbModuleMock, resetMocks,
} from "./helpers/mockDb.js";

// ─── Entorno ──────────────────────────────────────────────────────────────────
process.env.JWT_SECRET  = TEST_SECRET;
process.env.CORS_ORIGIN = "http://localhost:3000";

// ─── Mock de verifyTurnstile ──────────────────────────────────────────────────
// Debe ir ANTES de importar app para interceptar el import del controller
const mockVerifyTurnstileToken = jest.fn();

jest.unstable_mockModule("../utils/verifyTurnstile.js", () => ({
  verifyTurnstileToken: mockVerifyTurnstileToken,
}));

// ─── Mock de conexión Oracle ──────────────────────────────────────────────────
jest.unstable_mockModule("../config/db.js", () => dbModuleMock);

const { default: app }     = await import("../app.js");
process.env.JWT_SECRET = TEST_SECRET;
const { default: request } = await import("supertest");
import jwt from "jsonwebtoken";

const tokenAdmin = jwt.sign({ idAdmin: 1, idRol: 1 }, TEST_SECRET);
const CURP = "GAEJ900101HMNRRL09";
const MARCADOR = "[SOLICITUD_PUBLICA_PRE_REG]";

/** Fila de beneficiario pendiente de aprobación */
const pendienteRow = {
  CURP,
  NOMBRES:          "María",
  APELLIDO_PATERNO: "López",
  APELLIDO_MATERNO: "Pérez",
  ESTATUS:          "Inactivo",
  NOTAS:            MARCADOR,
  FOTO_PERFIL_URL:  null,
};

/** Payload mínimo válido para una solicitud pública */
const solicitudValida = {
  turnstileToken:   "test-token-cloudflare",
  curp:             CURP,
  nombres:          "María",
  apellidoPaterno:  "López",
  apellidoMaterno:  "Pérez",
  fechaNacimiento:  "1990-06-15",
  ciudad:           "Monterrey",
  estado:           "NL",
  telefonoCelular:  "8181234567",
  correoElectronico: "maria@test.com",
  tipo:             "Espina Bífida",
  usaValvula:       false,
};

beforeEach(() => {
  resetMocks();
  mockVerifyTurnstileToken.mockReset();
  mockVerifyTurnstileToken.mockResolvedValue(undefined);
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /beneficiarios/solicitud-publica — createPublicSolicitud
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /beneficiarios/solicitud-publica — createPublicSolicitud", () => {
  test("crea solicitud exitosamente y devuelve 201", async () => {
    // findById → no existe
    mockExecute.mockResolvedValueOnce({ rows: [] });
    // create INSERT
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .post("/beneficiarios/solicitud-publica")
      .send(solicitudValida);

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/solicitud recibida/i);
    expect(mockVerifyTurnstileToken).toHaveBeenCalledWith("test-token-cloudflare", expect.anything());
  });

  test("devuelve 403 cuando Turnstile lanza CAPTCHA_REQUIRED", async () => {
    mockVerifyTurnstileToken.mockRejectedValueOnce(
      Object.assign(new Error("Captcha requerido"), { statusCode: 400, code: "CAPTCHA_REQUIRED" })
    );

    const res = await request(app)
      .post("/beneficiarios/solicitud-publica")
      .send(solicitudValida);

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test("devuelve 400 si faltan campos obligatorios (sin nombres)", async () => {
    const { nombres, ...sinNombres } = solicitudValida;

    const res = await request(app)
      .post("/beneficiarios/solicitud-publica")
      .send(sinNombres);

    expect(res.status).toBe(400);
  });

  test("devuelve 400 con CURP inválida", async () => {
    const res = await request(app)
      .post("/beneficiarios/solicitud-publica")
      .send({ ...solicitudValida, curp: "INVALIDA" });

    expect(res.status).toBe(400);
  });

  test("devuelve 409 si la CURP ya existe en BD", async () => {
    // findById → ya existe
    mockExecute.mockResolvedValueOnce({ rows: [pendienteRow] });

    const res = await request(app)
      .post("/beneficiarios/solicitud-publica")
      .send(solicitudValida);

    expect(res.status).toBe(409);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /beneficiarios/:curp/aprobar-pre-registro — approvePreRegistro
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /beneficiarios/:curp/aprobar-pre-registro — approvePreRegistro", () => {
  test("aprueba solicitud pendiente y devuelve 200", async () => {
    // findById → pendiente
    mockExecute.mockResolvedValueOnce({ rows: [pendienteRow] });
    // updateEstatusAndNotas
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .post(`/beneficiarios/${CURP}/aprobar-pre-registro`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/aprobada/i);
  });

  test("devuelve 404 si el beneficiario no existe", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post(`/beneficiarios/${CURP}/aprobar-pre-registro`);

    expect(res.status).toBe(404);
  });

  test("devuelve 400 si el beneficiario no es una solicitud pendiente", async () => {
    // Beneficiario activo — no tiene el marcador
    mockExecute.mockResolvedValueOnce({
      rows: [{ ...pendienteRow, ESTATUS: "Activo", NOTAS: null }],
    });

    const res = await request(app)
      .post(`/beneficiarios/${CURP}/aprobar-pre-registro`);

    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /beneficiarios/:curp/pre-registro — rejectPreRegistro
// ═══════════════════════════════════════════════════════════════════════════════

describe("DELETE /beneficiarios/:curp/pre-registro — rejectPreRegistro", () => {
  test("rechaza solicitud pendiente y devuelve 200", async () => {
    // findById → pendiente
    mockExecute.mockResolvedValueOnce({ rows: [pendienteRow] });
    // hardDelete
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .delete(`/beneficiarios/${CURP}/pre-registro`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/cancelada/i);
  });

  test("devuelve 404 si el beneficiario no existe", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete(`/beneficiarios/${CURP}/pre-registro`);

    expect(res.status).toBe(404);
  });

  test("devuelve 400 si el beneficiario no es una solicitud pendiente", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [{ ...pendienteRow, ESTATUS: "Activo", NOTAS: null }],
    });

    const res = await request(app)
      .delete(`/beneficiarios/${CURP}/pre-registro`);

    expect(res.status).toBe(400);
  });
});
