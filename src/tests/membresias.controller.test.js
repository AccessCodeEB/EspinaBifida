import { jest } from "@jest/globals";
import {
  TEST_SECRET, mockExecute,
  dbModuleMock, resetMocks,
} from "./helpers/mockDb.js";

// ─── Entorno ──────────────────────────────────────────────────────────────────
process.env.JWT_SECRET  = TEST_SECRET;
process.env.CORS_ORIGIN = "http://localhost:3000";

// ─── Mock de conexión Oracle ──────────────────────────────────────────────────
jest.unstable_mockModule("../config/db.js", () => dbModuleMock);

const { default: app }     = await import("../app.js");
process.env.JWT_SECRET = TEST_SECRET; // dotenv override: restituir secreto de prueba
const { default: request } = await import("supertest");
import jwt from "jsonwebtoken";

const tokenAdmin = jwt.sign({ idAdmin: 1, idRol: 1 }, TEST_SECRET);
const CURP = "GAEJ900101HMNRRL09";

// Fila base de membresía que ejercita mapMembresia y formatMonto
const membresiaRow = {
  CURP,
  NOMBRE_COMPLETO:       "Juan García López",
  FECHA_VIGENCIA_INICIO: "2026-01-01",
  FECHA_VIGENCIA_FIN:    "2027-01-01",
  ESTATUS_MEMBRESIA:     "Activa",
  FECHA_ULTIMO_PAGO:     "2026-01-01",
  NUMERO_CREDENCIAL:     "CRED-001",
  OBSERVACIONES:         null,
};

beforeEach(() => { resetMocks(); });

// ═══════════════════════════════════════════════════════════════════════════════
// getAll — cubre mapMembresia y formatMonto
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /membresias — getAll", () => {
  test("retorna lista mapeada correctamente (200)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [membresiaRow] });

    const res = await request(app).get("/membresias");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].folio).toBe(CURP);
    expect(res.body[0].estatus).toBe("Activa");
    expect(res.body[0].porPagar).toBe("$0.00"); // Activa → porPagar = $0.00
  });

  test("membresía vencida → porPagar = $500.00", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [{ ...membresiaRow, ESTATUS_MEMBRESIA: "Vencida" }],
    });

    const res = await request(app).get("/membresias");

    expect(res.status).toBe(200);
    expect(res.body[0].porPagar).toBe("$500.00");
  });

  test("estatusMembresia nulo → default 'Vencida' en mapMembresia", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [{ ...membresiaRow, ESTATUS_MEMBRESIA: null }],
    });

    const res = await request(app).get("/membresias");

    expect(res.body[0].estatus).toBe("Vencida");
  });

  test("ultimoPago nulo → usa fechaVigenciaInicio como fallback", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [{ ...membresiaRow, FECHA_ULTIMO_PAGO: null }],
    });

    const res = await request(app).get("/membresias");

    expect(res.body[0].ultimoPago).toBe("2026-01-01");
  });

  test("lista vacía retorna arreglo vacío (200)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get("/membresias");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// createMembresia (POST /)
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /membresias — createMembresia", () => {
  test("registra membresía exitosamente (201)", async () => {
    // findBeneficiarioByCurp → existe
    mockExecute.mockResolvedValueOnce({ rows: [{ CURP }] });
    // hasPeriodOverlap → sin traslape
    mockExecute.mockResolvedValueOnce({ rows: [{ TOTAL: 0 }] });
    // INSERT CREDENCIALES
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .post("/membresias")
      .send({
        curp:              CURP,
        numero_credencial: "CRED-002",
        fecha_emision:     "2026-01-01",
        fecha_vigencia_inicio: "2026-01-01",
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/membres/i);
  });

  test("devuelve 404 si el beneficiario no existe", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post("/membresias")
      .send({ curp: CURP, numero_credencial: "X", fecha_emision: "2026-01-01" });

    expect(res.status).toBe(404);
  });

  test("devuelve 409 si hay traslape de períodos", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [{ CURP }] });
    mockExecute.mockResolvedValueOnce({ rows: [{ TOTAL: 1 }] });

    const res = await request(app)
      .post("/membresias")
      .send({ curp: CURP, numero_credencial: "X", fecha_emision: "2026-01-01" });

    expect(res.status).toBe(409);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getMembresiaStatus (GET /:curp)
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /membresias/:curp — getMembresiaStatus", () => {
  test("retorna estatus de membresía (200)", async () => {
    const futuro = new Date();
    futuro.setFullYear(futuro.getFullYear() + 1);
    mockExecute.mockResolvedValueOnce({
      rows: [{
        ID_CREDENCIAL:         1,
        CURP,
        NUMERO_CREDENCIAL:     "CRED-001",
        FECHA_EMISION:         new Date("2026-01-01"),
        FECHA_VIGENCIA_INICIO: new Date("2026-01-01"),
        FECHA_VIGENCIA_FIN:    futuro,
        FECHA_ULTIMO_PAGO:     null,
        OBSERVACIONES:         null,
      }],
    });

    const res = await request(app).get(`/membresias/${CURP}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("activa");
    expect(res.body.activa).toBe(true);
  });

  test("sin membresía → estatus SIN_MEMBRESIA (200)", async () => {
    // findLastByCurp → null
    mockExecute.mockResolvedValueOnce({ rows: [] });
    // setBeneficiarioInactivo
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app).get(`/membresias/${CURP}`);

    expect(res.status).toBe(200);
    expect(res.body.existe).toBe(false);
    expect(res.body.estatus).toBe("SIN_MEMBRESIA");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// validarMembresiaActiva (GET /:curp/activa)
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /membresias/:curp/activa — validarMembresiaActiva", () => {
  test("retorna activa: true para membresía vigente (200)", async () => {
    const futuro = new Date();
    futuro.setFullYear(futuro.getFullYear() + 1);
    mockExecute.mockResolvedValueOnce({
      rows: [{
        ID_CREDENCIAL:         1,
        CURP,
        NUMERO_CREDENCIAL:     "CRED-001",
        FECHA_EMISION:         new Date("2026-01-01"),
        FECHA_VIGENCIA_INICIO: new Date("2026-01-01"),
        FECHA_VIGENCIA_FIN:    futuro,
        FECHA_ULTIMO_PAGO:     null,
        OBSERVACIONES:         null,
      }],
    });

    const res = await request(app).get(`/membresias/${CURP}/activa`);

    expect(res.status).toBe(200);
    expect(res.body.activa).toBe(true);
    expect(res.body.estatus).toBe("ACTIVA");
  });

  test("membresía vencida → activa: false (200)", async () => {
    // findMembresiaActivaByCurp → null (vencida)
    mockExecute.mockResolvedValueOnce({ rows: [] });
    // setBeneficiarioInactivo
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app).get(`/membresias/${CURP}/activa`);

    expect(res.status).toBe(200);
    expect(res.body.activa).toBe(false);
    expect(res.body.estatus).toBe("VENCIDA");
  });
});
