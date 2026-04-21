import { jest } from "@jest/globals";

// ─── Entorno ──────────────────────────────────────────────────────────────────
const TEST_SECRET = "test-secret-espina-bifida";
process.env.JWT_SECRET  = TEST_SECRET;
process.env.CORS_ORIGIN = "http://localhost:3000";

// ─── Mock de conexión Oracle ──────────────────────────────────────────────────
const mockExecute  = jest.fn();
const mockClose    = jest.fn().mockResolvedValue(undefined);
const mockCommit   = jest.fn().mockResolvedValue(undefined);
const mockRollback = jest.fn().mockResolvedValue(undefined);

const mockConn = {
  execute:  mockExecute,
  close:    mockClose,
  commit:   mockCommit,
  rollback: mockRollback,
};

jest.unstable_mockModule("../config/db.js", () => ({
  getConnection: jest.fn().mockResolvedValue(mockConn),
  createPool:    jest.fn().mockResolvedValue(undefined),
  closePool:     jest.fn().mockResolvedValue(undefined),
}));

const { default: app }     = await import("../app.js");
const { default: request } = await import("supertest");
import jwt from "jsonwebtoken";

const tokenAdmin     = jwt.sign({ idAdmin: 1, idRol: 1 }, TEST_SECRET);
const tokenRecepcion = jwt.sign({ idAdmin: 2, idRol: 2 }, TEST_SECRET);

const movimientoBase = {
  idArticulo: 101,
  tipo:       "ENTRADA",
  cantidad:   5,
  motivo:     "Reposición",
};

const articuloRow = { ID_ARTICULO: 101, INVENTARIO_ACTUAL: 10 };

beforeEach(() => {
  jest.clearAllMocks();
  mockExecute.mockReset();
  mockClose.mockResolvedValue(undefined);
  mockCommit.mockResolvedValue(undefined);
  mockRollback.mockResolvedValue(undefined);
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1. POST /api/v1/movimientos — crear movimiento
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/v1/movimientos — crear movimiento de inventario", () => {
  test("registra ENTRADA exitosamente (201)", async () => {
    // SELECT FOR UPDATE → artículo con stock
    mockExecute.mockResolvedValueOnce({ rows: [articuloRow] });
    // INSERT MOVIMIENTOS_INVENTARIO
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });
    // UPDATE ARTICULOS (nuevo stock)
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .post("/api/v1/movimientos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(movimientoBase);

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/registrado/i);
    expect(res.body.data.stockActual).toBe(15);
    expect(mockCommit).toHaveBeenCalled();
  });

  test("registra SALIDA exitosamente (201)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [{ ID_ARTICULO: 101, INVENTARIO_ACTUAL: 20 }] });
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .post("/api/v1/movimientos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ ...movimientoBase, tipo: "SALIDA", cantidad: 3 });

    expect(res.status).toBe(201);
    expect(res.body.data.stockActual).toBe(17);
  });

  test("devuelve 422 si stock insuficiente para SALIDA", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [{ ID_ARTICULO: 101, INVENTARIO_ACTUAL: 2 }] });

    const res = await request(app)
      .post("/api/v1/movimientos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ ...movimientoBase, tipo: "SALIDA", cantidad: 10 });

    expect(res.status).toBe(422);
    expect(mockRollback).toHaveBeenCalled();
  });

  test("devuelve 404 si el artículo no existe", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post("/api/v1/movimientos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(movimientoBase);

    expect(res.status).toBe(404);
    expect(mockRollback).toHaveBeenCalled();
  });

  test("devuelve 400 si tipo es inválido", async () => {
    const res = await request(app)
      .post("/api/v1/movimientos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ ...movimientoBase, tipo: "AJUSTE" });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_MOVIMIENTO_TIPO");
  });

  test("devuelve 400 si cantidad es 0", async () => {
    const res = await request(app)
      .post("/api/v1/movimientos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ ...movimientoBase, cantidad: 0 });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_CANTIDAD");
  });

  test("devuelve 400 si cantidad es negativa", async () => {
    const res = await request(app)
      .post("/api/v1/movimientos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ ...movimientoBase, cantidad: -5 });

    expect(res.status).toBe(400);
  });

  test("devuelve 400 si idArticulo no es numérico", async () => {
    const res = await request(app)
      .post("/api/v1/movimientos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ ...movimientoBase, idArticulo: "abc" });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_ID");
  });

  test("devuelve 401 sin token", async () => {
    const res = await request(app)
      .post("/api/v1/movimientos")
      .send(movimientoBase);

    expect(res.status).toBe(401);
  });

  test("devuelve 403 con rol incorrecto (solo rol 1 o 2)", async () => {
    const tokenOtroRol = jwt.sign({ idAdmin: 3, idRol: 3 }, TEST_SECRET);

    const res = await request(app)
      .post("/api/v1/movimientos")
      .set("Authorization", `Bearer ${tokenOtroRol}`)
      .send(movimientoBase);

    expect(res.status).toBe(403);
  });

  test("recepción (rol 2) también puede crear movimientos", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [articuloRow] });
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .post("/api/v1/movimientos")
      .set("Authorization", `Bearer ${tokenRecepcion}`)
      .send(movimientoBase);

    expect(res.status).toBe(201);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. GET /api/v1/inventario — obtener stock actual
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/v1/inventario — consultar stock actual", () => {
  test("devuelve lista de artículos con stock (200)", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [
        { ID_ARTICULO: 1, DESCRIPCION: "Silla", INVENTARIO_ACTUAL: 5 },
        { ID_ARTICULO: 2, DESCRIPCION: "Muleta", INVENTARIO_ACTUAL: 12 },
      ],
    });

    const res = await request(app)
      .get("/api/v1/inventario")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty("stock");
    expect(res.body[0]).toHaveProperty("nombre");
    expect(res.body[0].stock).toBe(5);
  });

  test("devuelve arreglo vacío si no hay artículos (200)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get("/api/v1/inventario")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test("devuelve 401 sin token", async () => {
    const res = await request(app).get("/api/v1/inventario");
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. GET /api/v1/movimientos — obtener historial
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/v1/movimientos — historial de movimientos", () => {
  test("devuelve lista de movimientos mapeados (200)", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [{
        ID_MOVIMIENTO:  1,
        ID_ARTICULO:    101,
        DESCRIPCION:    "Silla de ruedas",
        TIPO_MOVIMIENTO:"ENTRADA",
        CANTIDAD:       5,
        MOTIVO:         "Donación",
        FECHA:          null,
      }],
    });

    const res = await request(app)
      .get("/api/v1/movimientos")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty("idMovimiento");
    expect(res.body[0]).toHaveProperty("tipo");
    expect(res.body[0].cantidad).toBe(5);
  });

  test("devuelve arreglo vacío si no hay movimientos (200)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get("/api/v1/movimientos")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test("devuelve 401 sin token", async () => {
    const res = await request(app).get("/api/v1/movimientos");
    expect(res.status).toBe(401);
  });
});
