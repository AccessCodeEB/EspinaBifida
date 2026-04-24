import { jest } from "@jest/globals";
import {
  TEST_SECRET, mockExecute, mockClose, mockCommit, mockRollback,
  dbModuleMock, resetMocks,
} from "./helpers/mockDb.js";

// ─── Entorno ──────────────────────────────────────────────────────────────────
process.env.JWT_SECRET  = TEST_SECRET;
process.env.CORS_ORIGIN = "http://localhost:3000";

// ─── Mock de conexión Oracle ──────────────────────────────────────────────────
jest.unstable_mockModule("../config/db.js", () => dbModuleMock);

// ─── Importaciones dinámicas (deben ir DESPUÉS del mock) ──────────────────────
const { default: app }     = await import("../app.js");
process.env.JWT_SECRET = TEST_SECRET; // dotenv override: restituir secreto de prueba
const { default: request } = await import("supertest");
import jwt from "jsonwebtoken";

const tokenAdmin = jwt.sign({ idAdmin: 1, idRol: 1 }, TEST_SECRET);

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const articuloBase = {
  idArticulo:       101,
  descripcion:      "Silla de ruedas plegable",
  unidad:           "pieza",
  cuotaRecuperacion: 200.00,
  inventarioActual: 10,
  manejaInventario: "S",
  idCategoria:      3,
};

const articuloRow = {
  ID_ARTICULO:        101,
  DESCRIPCION:        "Silla de ruedas plegable",
  UNIDAD:             "pieza",
  CUOTA_RECUPERACION: 200.00,
  INVENTARIO_ACTUAL:  10,
  MANEJA_INVENTARIO:  "S",
  ID_CATEGORIA:       3,
};

// ─── Setup ────────────────────────────────────────────────────────────────────
beforeEach(() => { resetMocks(); });

// ═══════════════════════════════════════════════════════════════════════════════
// 1. GET /api/v1/articulos
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/v1/articulos — listar todos", () => {
  test("devuelve lista de artículos (200)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [articuloRow] });

    const res = await request(app)
      .get("/api/v1/articulos")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
  });

  test("devuelve 401 sin token", async () => {
    const res = await request(app).get("/api/v1/articulos");
    expect(res.status).toBe(401);
  });

  test("devuelve arreglo vacío cuando no hay artículos (200)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get("/api/v1/articulos")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. GET /api/v1/articulos/:id
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/v1/articulos/:id — obtener por ID", () => {
  test("devuelve el artículo cuando existe (200)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [articuloRow] });

    const res = await request(app)
      .get("/api/v1/articulos/101")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
  });

  test("devuelve 404 cuando el artículo no existe", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get("/api/v1/articulos/9999")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/no encontrado/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. POST /api/v1/articulos — crear
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/v1/articulos — crear artículo", () => {
  test("devuelve 401 sin token", async () => {
    const res = await request(app).post("/api/v1/articulos").send(articuloBase);
    expect(res.status).toBe(401);
  });

  test("crea artículo correctamente (201)", async () => {
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .post("/api/v1/articulos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(articuloBase);

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/creado/i);
  });

  test("falla si falta idArticulo → 400", async () => {
    const { idArticulo, ...sinId } = articuloBase;

    const res = await request(app)
      .post("/api/v1/articulos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(sinId);

    expect(res.status).toBe(400);
  });

  test("falla si manejaInventario es inválido → 400", async () => {
    const res = await request(app)
      .post("/api/v1/articulos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ ...articuloBase, manejaInventario: "X" });

    expect(res.status).toBe(400);
  });

  test("falla si cuotaRecuperacion es negativa → 400", async () => {
    const res = await request(app)
      .post("/api/v1/articulos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ ...articuloBase, cuotaRecuperacion: -10 });

    expect(res.status).toBe(400);
  });

  test("falla si inventarioActual es negativo → 400", async () => {
    const res = await request(app)
      .post("/api/v1/articulos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ ...articuloBase, inventarioActual: -1 });

    expect(res.status).toBe(400);
  });

  test("falla si idCategoria no es numérico → 400", async () => {
    const res = await request(app)
      .post("/api/v1/articulos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ ...articuloBase, idCategoria: "abc" });

    expect(res.status).toBe(400);
  });

  test("acepta manejaInventario 'N' (201)", async () => {
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .post("/api/v1/articulos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ ...articuloBase, manejaInventario: "N" });

    expect(res.status).toBe(201);
  });

  test("acepta cuotaRecuperacion = 0", async () => {
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .post("/api/v1/articulos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ ...articuloBase, cuotaRecuperacion: 0 });

    expect(res.status).toBe(201);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. PUT /api/v1/articulos/:id — actualizar
// ═══════════════════════════════════════════════════════════════════════════════

describe("PUT /api/v1/articulos/:id — actualizar artículo", () => {
  test("actualiza artículo existente (200)", async () => {
    // findById → existe
    mockExecute.mockResolvedValueOnce({ rows: [articuloRow] });
    // UPDATE
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .put("/api/v1/articulos/101")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ ...articuloBase, descripcion: "Silla eléctrica" });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/actualizado/i);
  });

  test("devuelve 404 si el artículo no existe", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put("/api/v1/articulos/9999")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(articuloBase);

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/no encontrado/i);
  });

  test("falla si manejaInventario es inválido → 400", async () => {
    // findById → existe (la validación ocurre después en el service)
    mockExecute.mockResolvedValueOnce({ rows: [articuloRow] });

    const res = await request(app)
      .put("/api/v1/articulos/101")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ ...articuloBase, manejaInventario: "Z" });

    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. DELETE /api/v1/articulos/:id — eliminar
// ═══════════════════════════════════════════════════════════════════════════════

describe("DELETE /api/v1/articulos/:id — eliminar artículo", () => {
  test("elimina artículo sin movimientos (200)", async () => {
    // findById → existe
    mockExecute.mockResolvedValueOnce({ rows: [articuloRow] });
    // countMovimientosByArticulo → 0
    mockExecute.mockResolvedValueOnce({ rows: [{ TOTAL: 0 }] });
    // DELETE
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .delete("/api/v1/articulos/101")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/eliminado/i);
  });

  test("devuelve 401 sin token", async () => {
    const res = await request(app).delete("/api/v1/articulos/101");
    expect(res.status).toBe(401);
  });

  test("devuelve 404 si el artículo no existe", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete("/api/v1/articulos/9999")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/no encontrado/i);
  });

  test("devuelve 409 si el artículo tiene movimientos registrados", async () => {
    // findById → existe
    mockExecute.mockResolvedValueOnce({ rows: [articuloRow] });
    // countMovimientosByArticulo → 5
    mockExecute.mockResolvedValueOnce({ rows: [{ TOTAL: 5 }] });

    const res = await request(app)
      .delete("/api/v1/articulos/101")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("ARTICULO_HAS_MOVIMIENTOS");
  });
});
