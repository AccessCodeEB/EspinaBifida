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

const tokenAdmin  = jwt.sign({ idAdmin: 1, idRol: 1 }, TEST_SECRET);
const CURP_VALIDA = "GAEJ900101HMNRRL09";

const servicioRow = {
  ID_SERVICIO:      1,
  CURP:             CURP_VALIDA,
  ID_TIPO_SERVICIO: 1,
  FECHA:            null,
  COSTO:            200,
  MONTO_PAGADO:     0,
  REFERENCIA_ID:    null,
  REFERENCIA_TIPO:  null,
  NOTAS:            null,
};

beforeEach(() => { resetMocks(); });

// ═══════════════════════════════════════════════════════════════════════════════
// 1. GET /api/v1/servicios/:curp
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/v1/servicios/:curp — servicios por beneficiario", () => {
  test("devuelve servicios cuando existen (200)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [servicioRow] });

    const res = await request(app)
      .get(`/api/v1/servicios/${CURP_VALIDA}`)
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.curp).toBe(CURP_VALIDA);
    expect(res.body.total).toBe(1);
  });

  test("devuelve 401 sin token", async () => {
    const res = await request(app).get(`/api/v1/servicios/${CURP_VALIDA}`);
    expect(res.status).toBe(401);
  });

  test("devuelve 404 si el beneficiario no tiene servicios", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get(`/api/v1/servicios/${CURP_VALIDA}`)
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. GET /api/v1/servicios/detalle — consulta con filtros
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/v1/servicios/detalle — consulta detallada paginada", () => {
  test("devuelve resultados paginados (200)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [servicioRow] });
    mockExecute.mockResolvedValueOnce({ rows: [{ TOTAL: 1 }] });

    const res = await request(app)
      .get("/api/v1/servicios/detalle")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("page");
    expect(res.body).toHaveProperty("total");
    expect(res.body).toHaveProperty("data");
  });

  test("devuelve 400 si page < 1", async () => {
    const res = await request(app)
      .get("/api/v1/servicios/detalle?page=0")
      .set("Authorization", `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(400);
  });

  test("devuelve 400 si limit > 100", async () => {
    const res = await request(app)
      .get("/api/v1/servicios/detalle?limit=200")
      .set("Authorization", `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(400);
  });

  test("devuelve 400 si fechaDesde > fechaHasta", async () => {
    const res = await request(app)
      .get("/api/v1/servicios/detalle?fechaDesde=2026-12-31&fechaHasta=2026-01-01")
      .set("Authorization", `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(400);
  });

  test("devuelve 400 si costoMin es negativo", async () => {
    const res = await request(app)
      .get("/api/v1/servicios/detalle?costoMin=-10")
      .set("Authorization", `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(400);
  });

  test("devuelve 400 si costoMin > costoMax", async () => {
    const res = await request(app)
      .get("/api/v1/servicios/detalle?costoMin=500&costoMax=100")
      .set("Authorization", `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. GET /api/v1/servicios/detalle/:idServicio
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/v1/servicios/detalle/:idServicio — obtener por ID", () => {
  test("devuelve el servicio cuando existe (200)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [servicioRow] });

    const res = await request(app)
      .get("/api/v1/servicios/detalle/1")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
  });

  test("devuelve 404 si el servicio no existe", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get("/api/v1/servicios/detalle/999")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(404);
  });

  test("devuelve 400 si idServicio no es entero positivo", async () => {
    const res = await request(app)
      .get("/api/v1/servicios/detalle/abc")
      .set("Authorization", `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(400);
  });

  test("devuelve 400 si idServicio es 0", async () => {
    const res = await request(app)
      .get("/api/v1/servicios/detalle/0")
      .set("Authorization", `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. PUT /api/v1/servicios/:idServicio
// ═══════════════════════════════════════════════════════════════════════════════

describe("PUT /api/v1/servicios/:idServicio — actualizar servicio", () => {
  test("actualiza monto pagado exitosamente (200)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [servicioRow] });
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .put("/api/v1/servicios/1")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ montoPagado: 100 });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/actualizado/i);
  });

  test("actualiza notas exitosamente (200)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [servicioRow] });
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .put("/api/v1/servicios/1")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ notas: "Seguimiento" });

    expect(res.status).toBe(200);
  });

  test("devuelve 401 sin token", async () => {
    const res = await request(app).put("/api/v1/servicios/1").send({ montoPagado: 100 });
    expect(res.status).toBe(401);
  });

  test("devuelve 400 si no se envían campos a actualizar", async () => {
    const res = await request(app)
      .put("/api/v1/servicios/1")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({});

    expect(res.status).toBe(400);
  });

  test("devuelve 404 si el servicio no existe", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put("/api/v1/servicios/999")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ montoPagado: 100 });

    expect(res.status).toBe(404);
  });

  test("devuelve 400 si montoPagado es negativo", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [servicioRow] });

    const res = await request(app)
      .put("/api/v1/servicios/1")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ montoPagado: -50 });

    expect(res.status).toBe(400);
  });

  test("devuelve 400 si montoPagado supera el costo", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [{ ...servicioRow, COSTO: 200 }] });

    const res = await request(app)
      .put("/api/v1/servicios/1")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ montoPagado: 500 });

    expect(res.status).toBe(400);
  });

  test("devuelve 400 si idServicio es inválido", async () => {
    const res = await request(app)
      .put("/api/v1/servicios/abc")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ montoPagado: 100 });

    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. DELETE /api/v1/servicios/:idServicio
// ═══════════════════════════════════════════════════════════════════════════════

describe("DELETE /api/v1/servicios/:idServicio — eliminar servicio", () => {
  test("elimina servicio existente (200)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [servicioRow] });
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .delete("/api/v1/servicios/1")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/eliminado/i);
  });

  test("devuelve 401 sin token", async () => {
    const res = await request(app).delete("/api/v1/servicios/1");
    expect(res.status).toBe(401);
  });

  test("devuelve 404 si el servicio no existe", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete("/api/v1/servicios/999")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(404);
  });

  test("devuelve 400 si idServicio es inválido", async () => {
    const res = await request(app)
      .delete("/api/v1/servicios/abc")
      .set("Authorization", `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. POST /api/v1/servicios — crear (validación adicional del controlador)
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/v1/servicios — validación del controlador", () => {
  test("devuelve 401 sin token", async () => {
    const res = await request(app)
      .post("/api/v1/servicios")
      .send({ curp: CURP_VALIDA, idTipoServicio: 1, costo: 100 });

    expect(res.status).toBe(401);
  });

  test("devuelve 400 si faltan campos requeridos (curp, idTipoServicio, costo)", async () => {
    const res = await request(app)
      .post("/api/v1/servicios")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ notas: "solo notas" });

    expect(res.status).toBe(400);
  });

  test("devuelve 400 si falta costo", async () => {
    const res = await request(app)
      .post("/api/v1/servicios")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ curp: CURP_VALIDA, idTipoServicio: 1 });

    expect(res.status).toBe(400);
  });
});
