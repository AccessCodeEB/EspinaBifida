import { jest } from "@jest/globals";
import {
  TEST_SECRET, mockExecute, mockCommit, mockRollback,
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

const tokenAdmin     = jwt.sign({ idAdmin: 1, idRol: 1 }, TEST_SECRET);
const tokenRecepcion = jwt.sign({ idAdmin: 2, idRol: 2 }, TEST_SECRET);

const movimientoBase = {
  idArticulo: 101,
  tipo:       "ENTRADA",
  cantidad:   5,
  motivo:     "Reposición",
};

const articuloRow = { ID_ARTICULO: 101, INVENTARIO_ACTUAL: 10 };

beforeEach(() => { resetMocks(); });

// ═══════════════════════════════════════════════════════════════════════════════
// 1. POST /api/v1/movimientos — crear movimiento
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/v1/movimientos — crear movimiento de inventario", () => {
  test("registra ENTRADA exitosamente via SP (201)", async () => {
    // SP call returns stock resultante via OUT bind
    mockExecute.mockResolvedValueOnce({ outBinds: { stock_out: 15 } });

    const res = await request(app)
      .post("/api/v1/movimientos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(movimientoBase); // idArticulo: 101, tipo: ENTRADA, cantidad: 5

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/registrado/i);
    expect(res.body.data.stockActual).toBe(15);
    expect(mockCommit).toHaveBeenCalled();
  });

  test("registra SALIDA exitosamente via SP (201)", async () => {
    mockExecute.mockResolvedValueOnce({ outBinds: { stock_out: 17 } });

    const res = await request(app)
      .post("/api/v1/movimientos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ ...movimientoBase, tipo: "SALIDA", cantidad: 3 });

    expect(res.status).toBe(201);
    expect(res.body.data.stockActual).toBe(17);
  });

  test("devuelve 422 si stock insuficiente para SALIDA (via SP ORA-20002)", async () => {
    const oraErr = Object.assign(
      new Error("ORA-20002: Stock insuficiente para SALIDA"),
      { errorNum: 20002 }
    );
    mockExecute.mockRejectedValueOnce(oraErr);

    const res = await request(app)
      .post("/api/v1/movimientos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ ...movimientoBase, tipo: "SALIDA", cantidad: 10 });

    expect(res.status).toBe(422);
    expect(mockRollback).toHaveBeenCalled();
  });

  test("devuelve 404 si el artículo no existe (via SP ORA-20006)", async () => {
    const oraErr = Object.assign(
      new Error("ORA-20006: Articulo no encontrado: 101"),
      { errorNum: 20006 }
    );
    mockExecute.mockRejectedValueOnce(oraErr);

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
  });

  test("devuelve 400 si cantidad es 0", async () => {
    const res = await request(app)
      .post("/api/v1/movimientos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ ...movimientoBase, cantidad: 0 });

    expect(res.status).toBe(400);
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
    mockExecute.mockResolvedValueOnce({ outBinds: { stock_out: 15 } });

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

  test("filtra por ?dias=30 (rama dias && !NaN → pasa número al service)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get("/api/v1/movimientos?dias=30")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
  });

  test("ignora ?dias=abc (NaN → pasa null al service)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get("/api/v1/movimientos?dias=abc")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
  });

  test("devuelve 401 sin token", async () => {
    const res = await request(app).get("/api/v1/movimientos");
    expect(res.status).toBe(401);
  });
});

// ─── countMovimientosByArticulo — inventario.model.js L78-83 ──────────────────

describe("countMovimientosByArticulo — modelo directo", () => {
  test("retorna conteo de movimientos para un artículo", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [{ TOTAL: 5 }] });

    // Importar el modelo directamente (ya fue cargado por el import de app)
    const { countMovimientosByArticulo } = await import("../models/inventario.model.js");
    const total = await countMovimientosByArticulo(101);

    expect(total).toBe(5);
  });

  test("retorna 0 cuando no hay movimientos", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [{ TOTAL: 0 }] });

    const { countMovimientosByArticulo } = await import("../models/inventario.model.js");
    const total = await countMovimientosByArticulo(999);

    expect(total).toBe(0);
  });
});

// ─── SP error codes adicionales (inventario.model.js líneas 25-31) ────────────

describe("POST /api/v1/movimientos — códigos de error SP adicionales", () => {
  test("devuelve 422 si SP lanza ORA-20001 (stock insuficiente variante)", async () => {
    const oraErr = Object.assign(
      new Error("ORA-20001: Stock insuficiente para la operacion"),
      { errorNum: 20001 }
    );
    mockExecute.mockRejectedValueOnce(oraErr);

    const res = await request(app)
      .post("/api/v1/movimientos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ ...movimientoBase, tipo: "SALIDA", cantidad: 100 });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe("INSUFFICIENT_STOCK");
    expect(mockRollback).toHaveBeenCalled();
  });

  test("devuelve 400 si SP lanza ORA-20005 (tipo de movimiento inválido a nivel DB)", async () => {
    const oraErr = Object.assign(
      new Error("ORA-20005: Tipo de movimiento invalido"),
      { errorNum: 20005 }
    );
    mockExecute.mockRejectedValueOnce(oraErr);

    const res = await request(app)
      .post("/api/v1/movimientos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(movimientoBase);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_MOVIMIENTO_TIPO");
    expect(mockRollback).toHaveBeenCalled();
  });

  test("propaga error genérico del SP como 500", async () => {
    const genericErr = new Error("ORA-01031: insufficient privileges");
    mockExecute.mockRejectedValueOnce(genericErr);

    const res = await request(app)
      .post("/api/v1/movimientos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(movimientoBase);

    expect(res.status).toBe(500);
    expect(mockRollback).toHaveBeenCalled();
  });
});
