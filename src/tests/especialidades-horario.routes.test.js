/**
 * Tests de integración para:
 *   - src/routes/especialidades-horario.routes.js
 *   - src/controllers/especialidades-horario.controller.js
 *   - src/models/especialidades-horario.model.js (vía mock de DB)
 */
import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import {
  TEST_SECRET, mockExecute, mockClose,
  dbModuleMock, resetMocks,
} from "./helpers/mockDb.js";

process.env.JWT_SECRET  = TEST_SECRET;
process.env.CORS_ORIGIN = "http://localhost:3000";

jest.unstable_mockModule("../config/db.js", () => dbModuleMock);

const { default: router } = await import("../routes/especialidades-horario.routes.js");

const app = express();
app.use(express.json());
app.use("/especialidades-horario", router);
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  res.status(err.status ?? err.statusCode ?? 500).json({ error: err.message, code: err.code });
});

const token = jwt.sign({ idAdmin: 1, idRol: 1 }, TEST_SECRET);

const ESP_ROW = {
  ID_ESPECIALIDAD: 1, NOMBRE: "Neurología", DIA_SEMANA: 1,
  HORA_INICIO: "09:00", HORA_FIN: "17:00", CAPACIDAD_MAX: 5,
  TIPO_FRECUENCIA: "SEMANAL", ACTIVO: 1, NOTAS: null,
};

beforeEach(() => resetMocks());

// ═══════════════════════════════════════════════════════════════════════════════
// GET /especialidades-horario
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /especialidades-horario", () => {
  test("200 — retorna lista (sin auth)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [ESP_ROW] });
    const res = await request(app).get("/especialidades-horario");
    expect(res.status).toBe(200);
    expect(res.body[0].nombre).toBe("Neurología");
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  test("200 — ?todos=true pasa soloActivos=false", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get("/especialidades-horario?todos=true");
    expect(res.status).toBe(200);
  });

  test("500 — error de BD propaga", async () => {
    mockExecute.mockRejectedValueOnce(new Error("ORA-00942"));
    const res = await request(app).get("/especialidades-horario");
    expect(res.status).toBe(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /especialidades-horario/:id
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /especialidades-horario/:id", () => {
  test("200 — encontrada", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [ESP_ROW] });
    const res = await request(app).get("/especialidades-horario/1");
    expect(res.status).toBe(200);
    expect(res.body.idEspecialidad).toBe(1);
  });

  test("404 — no encontrada", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get("/especialidades-horario/999");
    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PUT /especialidades-horario/:id
// ═══════════════════════════════════════════════════════════════════════════════

describe("PUT /especialidades-horario/:id", () => {
  test("200 — actualiza correctamente", async () => {
    // findById para verificar existencia
    mockExecute.mockResolvedValueOnce({ rows: [ESP_ROW] });
    // model.update
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });
    // findById para retornar actualizado
    mockExecute.mockResolvedValueOnce({ rows: [{ ...ESP_ROW, DIA_SEMANA: 3 }] });

    const res = await request(app)
      .put("/especialidades-horario/1")
      .set("Authorization", `Bearer ${token}`)
      .send({ diaSemana: 3 });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/actualizada/i);
  });

  test("400 — horaInicio con formato inválido", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [ESP_ROW] });
    const res = await request(app)
      .put("/especialidades-horario/1")
      .set("Authorization", `Bearer ${token}`)
      .send({ horaInicio: "9am" });
    expect(res.status).toBe(400);
  });

  test("404 — especialidad no existe", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .put("/especialidades-horario/999")
      .set("Authorization", `Bearer ${token}`)
      .send({ diaSemana: 1 });
    expect(res.status).toBe(404);
  });

  test("401 — sin token", async () => {
    const res = await request(app).put("/especialidades-horario/1").send({});
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /especialidades-horario/:id/excepciones
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /especialidades-horario/:id/excepciones", () => {
  test("200 — retorna lista de excepciones", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [ESP_ROW] }); // findById
    mockExecute.mockResolvedValueOnce({ rows: [
      { ID_EXCEPCION: 1, ID_ESPECIALIDAD: 1, FECHA: "2026-07-01", MOTIVO: "Vacaciones", CREATED_AT: "2026-06-01" },
    ]});
    const res = await request(app)
      .get("/especialidades-horario/1/excepciones")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body[0].idExcepcion).toBe(1);
  });

  test("404 — especialidad no existe", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .get("/especialidades-horario/999/excepciones")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /especialidades-horario/:id/excepciones
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /especialidades-horario/:id/excepciones", () => {
  test("201 — crea excepción con motivo", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [ESP_ROW] }); // findById
    mockExecute.mockResolvedValueOnce({ rows: [] });          // findExcepcionByFecha → no dup
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });   // createExcepcion

    const res = await request(app)
      .post("/especialidades-horario/1/excepciones")
      .set("Authorization", `Bearer ${token}`)
      .send({ fecha: "2026-07-01", motivo: "Congreso" });

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/creada/i);
  });

  test("400 — sin fecha", async () => {
    const res = await request(app)
      .post("/especialidades-horario/1/excepciones")
      .set("Authorization", `Bearer ${token}`)
      .send({ motivo: "Sin fecha" });
    expect(res.status).toBe(400);
  });

  test("400 — fecha con formato inválido", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [ESP_ROW] });
    const res = await request(app)
      .post("/especialidades-horario/1/excepciones")
      .set("Authorization", `Bearer ${token}`)
      .send({ fecha: "01/07/2026" });
    expect(res.status).toBe(400);
  });

  test("409 — fecha duplicada", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [ESP_ROW] });
    mockExecute.mockResolvedValueOnce({ rows: [{ ID_EXCEPCION: 1 }] }); // dup encontrado
    const res = await request(app)
      .post("/especialidades-horario/1/excepciones")
      .set("Authorization", `Bearer ${token}`)
      .send({ fecha: "2026-07-01" });
    expect(res.status).toBe(409);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /especialidades-horario/:id/excepciones/:idExc
// ═══════════════════════════════════════════════════════════════════════════════

describe("DELETE /especialidades-horario/:id/excepciones/:idExc", () => {
  test("200 — elimina excepción", async () => {
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });
    const res = await request(app)
      .delete("/especialidades-horario/1/excepciones/5")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/eliminada/i);
  });

  test("500 — error de BD propaga", async () => {
    mockExecute.mockRejectedValueOnce(new Error("ORA-01403"));
    const res = await request(app)
      .delete("/especialidades-horario/1/excepciones/99")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /especialidades-horario/:id/citas-futuras
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /especialidades-horario/:id/citas-futuras", () => {
  test("200 — retorna count de citas futuras pendientes", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [ESP_ROW] });         // findById
    mockExecute.mockResolvedValueOnce({ rows: [{ TOTAL: 3 }] });    // countCitasFuturasActivas
    const res = await request(app)
      .get("/especialidades-horario/1/citas-futuras")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(3);
  });

  test("404 — especialidad no existe", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .get("/especialidades-horario/999/citas-futuras")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  test("401 — sin token", async () => {
    const res = await request(app).get("/especialidades-horario/1/citas-futuras");
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /especialidades-horario/:id/citas-en-fecha
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /especialidades-horario/:id/citas-en-fecha", () => {
  test("200 — retorna count de citas en la fecha dada", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [ESP_ROW] });         // findById
    mockExecute.mockResolvedValueOnce({ rows: [{ TOTAL: 1 }] });    // countCitasActivasPorFecha
    const res = await request(app)
      .get("/especialidades-horario/1/citas-en-fecha?fecha=2026-06-05")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
  });

  test("400 — sin parámetro fecha", async () => {
    const res = await request(app)
      .get("/especialidades-horario/1/citas-en-fecha")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  test("401 — sin token", async () => {
    const res = await request(app).get("/especialidades-horario/1/citas-en-fecha?fecha=2026-06-05");
    expect(res.status).toBe(401);
  });
});
