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

// ─── Importaciones dinámicas ──────────────────────────────────────────────────
const { default: app }     = await import("../app.js");
process.env.JWT_SECRET = TEST_SECRET;
const { default: request } = await import("supertest");
import jwt from "jsonwebtoken";

const tokenAdmin      = jwt.sign({ idAdmin: 1, idRol: 1 }, TEST_SECRET);
const tokenStaff      = jwt.sign({ idAdmin: 2, idRol: 2 }, TEST_SECRET);
const tokenLectura    = jwt.sign({ idAdmin: 3, idRol: 3 }, TEST_SECRET);

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const catRow = { ID_CATEGORIA: 2, NOMBRE: "Medicamentos", DESCRIPCION: null };
const catRow2 = { ID_CATEGORIA: 4, NOMBRE: "Equipos Médicos", DESCRIPCION: null };
const catRow3 = { ID_CATEGORIA: 5, NOMBRE: "Insumos Médicos", DESCRIPCION: null };

// ─── Setup ────────────────────────────────────────────────────────────────────
beforeEach(() => { resetMocks(); });

// ═══════════════════════════════════════════════════════════════════════════════
// 1. GET /api/v1/categorias-articulo
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/v1/categorias-articulo — listar categorías", () => {
  test("devuelve lista de categorías (200)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [catRow, catRow2, catRow3] });

    const res = await request(app)
      .get("/api/v1/categorias-articulo")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(3);
    expect(res.body[0]).toMatchObject({ idCategoria: 2, nombre: "Medicamentos" });
  });

  test("devuelve 401 sin token", async () => {
    const res = await request(app).get("/api/v1/categorias-articulo");
    expect(res.status).toBe(401);
  });

  test("devuelve arreglo vacío cuando no hay categorías (200)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get("/api/v1/categorias-articulo")
      .set("Authorization", `Bearer ${tokenStaff}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test("staff puede listar categorías (200)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [catRow] });

    const res = await request(app)
      .get("/api/v1/categorias-articulo")
      .set("Authorization", `Bearer ${tokenStaff}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. POST /api/v1/categorias-articulo
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/v1/categorias-articulo — crear categoría", () => {
  test("admin crea categoría correctamente (201)", async () => {
    mockExecute
      .mockResolvedValueOnce({ outBinds: { newId: [6] } }); // RETURNING INTO outBinds

    const res = await request(app)
      .post("/api/v1/categorias-articulo")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ nombre: "Servicios y Estudios" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("data");
    expect(res.body.data).toHaveProperty("idCategoria");
  });

  test("staff puede crear categoría (201)", async () => {
    mockExecute
      .mockResolvedValueOnce({ outBinds: { newId: [7] } });

    const res = await request(app)
      .post("/api/v1/categorias-articulo")
      .set("Authorization", `Bearer ${tokenStaff}`)
      .send({ nombre: "Nueva Categoría" });

    expect(res.status).toBe(201);
  });

  test("devuelve 401 sin token", async () => {
    const res = await request(app)
      .post("/api/v1/categorias-articulo")
      .send({ nombre: "Test" });

    expect(res.status).toBe(401);
  });

  test("devuelve 400 cuando nombre está vacío", async () => {
    const res = await request(app)
      .post("/api/v1/categorias-articulo")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ nombre: "" });

    expect(res.status).toBe(400);
  });

  test("devuelve 400 cuando nombre no se envía", async () => {
    const res = await request(app)
      .post("/api/v1/categorias-articulo")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({});

    expect(res.status).toBe(400);
  });
});
