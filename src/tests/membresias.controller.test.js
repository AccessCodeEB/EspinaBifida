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
  MONTO:                 500,
  METODO_PAGO:           "efectivo",
  REFERENCIA:            null,
  DIAS_RESTANTES:        15,
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
    expect(res.body[0].monto).toBe(500);
    expect(res.body[0].diasRestantes).toBe(15);
  });

  test("membresía vencida → monto devuelto correctamente", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [{ ...membresiaRow, ESTATUS_MEMBRESIA: "Vencida" }],
    });

    const res = await request(app).get("/membresias");

    expect(res.status).toBe(200);
    expect(res.body[0].estatus).toBe("Vencida");
    expect(res.body[0].monto).toBe(500);
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
    // SP_REGISTRAR_MEMBRESIA (BEGIN...END)
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

  test("devuelve 400 si falta curp", async () => {
    const res = await request(app)
      .post("/membresias")
      .send({ numero_credencial: "X", fecha_emision: "2026-01-01" });

    expect(res.status).toBe(400);
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

// ═══════════════════════════════════════════════════════════════════════════════
// Catch blocks — cubre next(error) en los tres handlers
// ═══════════════════════════════════════════════════════════════════════════════

describe("Catch blocks de membresias.controller", () => {
  test("getAll → error de DB → 500", async () => {
    mockExecute.mockRejectedValueOnce(new Error("DB timeout"));

    const res = await request(app).get("/membresias");

    expect(res.status).toBe(500);
  });

  test("getMembresiaStatus → error de DB → 500", async () => {
    mockExecute.mockRejectedValueOnce(new Error("DB timeout"));

    const res = await request(app).get(`/membresias/${CURP}`);

    expect(res.status).toBe(500);
  });

  test("validarMembresiaActiva → error de DB → 500", async () => {
    mockExecute.mockRejectedValueOnce(new Error("DB timeout"));

    const res = await request(app).get(`/membresias/${CURP}/activa`);

    expect(res.status).toBe(500);
  });
});

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

// ═══════════════════════════════════════════════════════════════════════════════
// postSyncEstados — líneas 57–61 (nunca cubierto)
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /membresias/sync-estados — postSyncEstados", () => {
  test("sincroniza estados y responde 200 con mensaje", async () => {
    // syncEstados → UPDATE CREDENCIALES SET ESTATUS...
    mockExecute.mockResolvedValueOnce({ rowsAffected: 5 });

    const res = await request(app)
      .post("/membresias/sync-estados")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message");
  });

  test("error en syncEstados → 500", async () => {
    mockExecute.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app)
      .post("/membresias/sync-estados")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBeGreaterThanOrEqual(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getPagosRecientes — líneas 66–71 (cubre mapPago, líneas 31-32)
// ═══════════════════════════════════════════════════════════════════════════════

const pagoRow = {
  ID_CREDENCIAL:         7,
  CURP,
  NOMBRE_COMPLETO:       "Juan García",
  FECHA_EMISION:         "2026-01-01",
  FECHA_VIGENCIA_INICIO: "2026-01-01",
  FECHA_VIGENCIA_FIN:    "2027-01-01",
  FECHA_ULTIMO_PAGO:     "2026-01-15",
  MONTO:                 500,
  METODO_PAGO:           "transferencia",
  REFERENCIA:            "REF-001",
  OBSERVACIONES:         "Alta inicial",
};

describe("GET /membresias/pagos/recientes — getPagosRecientes", () => {
  test("retorna lista de pagos mapeada con mapPago (200)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [pagoRow] });

    const res = await request(app)
      .get("/membresias/pagos/recientes")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toMatchObject({
      idCredencial: 7,
      curp:         CURP,
      monto:        500,
      metodoPago:   "transferencia",
      referencia:   "REF-001",
    });
  });

  test("acepta query param ?limit=5", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [pagoRow] });

    const res = await request(app)
      .get("/membresias/pagos/recientes?limit=5")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
  });

  test("error en getPagosRecientes → 500", async () => {
    mockExecute.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app)
      .get("/membresias/pagos/recientes")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBeGreaterThanOrEqual(500);
  });
});
