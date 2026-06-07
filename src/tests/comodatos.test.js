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

const tokenAdmin   = jwt.sign({ idAdmin: 1, idRol: 1 }, TEST_SECRET);
const tokenStaff   = jwt.sign({ idAdmin: 2, idRol: 2 }, TEST_SECRET);
const tokenLectura = jwt.sign({ idAdmin: 3, idRol: 3 }, TEST_SECRET);

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const comodatoRow = {
  ID_COMODATO:  1,
  CURP:         "ABCD123456HDFABC01",
  ID_ARTICULO:  4,
  MONTO_TOTAL:  2500,
  MONTO_PAGADO: 500,
  MONTO_EXENTO: 0,
  ESTATUS:      "Activo",
  FECHA_ALTA:   "2026-01-10",
  NOTAS:        null,
  // JOINs
  BENEFICIARIO: "Juan García López",
  ARTICULO:     "Silla de Ruedas",
};

const pagoRow = {
  ID_PAGO:     1,
  ID_COMODATO: 1,
  MONTO:       500,
  ES_EXENTO:   "N",
  FECHA:       "2026-01-15",
  NOTAS:       null,
};

const membresiaActiva = {
  ID_CREDENCIAL: 10,
  CURP:          "ABCD123456HDFABC01",
  FECHA_VIGENCIA_FIN: "2027-01-01",
};

// ─── Setup ────────────────────────────────────────────────────────────────────
beforeEach(() => { resetMocks(); });

// ═══════════════════════════════════════════════════════════════════════════════
// 1. GET /api/v1/comodatos
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/v1/comodatos — listar comodatos", () => {
  test("devuelve lista paginada (200)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [comodatoRow, comodatoRow] });

    const res = await request(app)
      .get("/api/v1/comodatos")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data[0]).toHaveProperty("idComodato");
  });

  test("filtra por estatus (200)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [comodatoRow] });

    const res = await request(app)
      .get("/api/v1/comodatos?estatus=Activo")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });

  test("devuelve arreglo vacío sin datos (200)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get("/api/v1/comodatos")
      .set("Authorization", `Bearer ${tokenStaff}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  test("devuelve 401 sin token", async () => {
    const res = await request(app).get("/api/v1/comodatos");
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. GET /api/v1/comodatos/reportes/exenciones (ruta estática — va ANTES de /:id)
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/v1/comodatos/reportes/exenciones — reporte de exenciones", () => {
  const exencionRow = {
    CURP:           "ABCD123456HDFABC01",
    BENEFICIARIO:   "Juan García López",
    EQUIPO:         "Silla de Ruedas",
    TOTAL_EXENTO:   750,
    NUM_EXENCIONES: 2,
  };

  test("devuelve reporte agrupado (200)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [exencionRow] });

    const res = await request(app)
      .get("/api/v1/comodatos/reportes/exenciones?fechaInicio=2026-01-01&fechaFin=2026-12-31")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0]).toHaveProperty("totalExento");
  });

  test("devuelve 400 si faltan fechas", async () => {
    const res = await request(app)
      .get("/api/v1/comodatos/reportes/exenciones")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(400);
  });

  test("devuelve 401 sin token", async () => {
    const res = await request(app)
      .get("/api/v1/comodatos/reportes/exenciones?fechaInicio=2026-01-01&fechaFin=2026-12-31");
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. GET /api/v1/comodatos/beneficiario/:curp
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/v1/comodatos/beneficiario/:curp — historial beneficiario", () => {
  test("devuelve historial del beneficiario (200)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [comodatoRow] });

    const res = await request(app)
      .get("/api/v1/comodatos/beneficiario/ABCD123456HDFABC01")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test("devuelve arreglo vacío si no tiene comodatos (200)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get("/api/v1/comodatos/beneficiario/NOEXISTE0000000001")
      .set("Authorization", `Bearer ${tokenStaff}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. GET /api/v1/comodatos/:id
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/v1/comodatos/:id — detalle comodato", () => {
  test("devuelve comodato con historial de pagos (200)", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [comodatoRow] })    // comodato
      .mockResolvedValueOnce({ rows: [pagoRow] });        // pagos

    const res = await request(app)
      .get("/api/v1/comodatos/1")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("idComodato");
    expect(res.body.data).toHaveProperty("pagos");
    expect(Array.isArray(res.body.data.pagos)).toBe(true);
  });

  test("devuelve 404 si no existe (404)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get("/api/v1/comodatos/999")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(404);
  });

  test("devuelve 401 sin token", async () => {
    const res = await request(app).get("/api/v1/comodatos/1");
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. POST /api/v1/comodatos — crear comodato
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/v1/comodatos — crear comodato", () => {
  const payload = {
    curp:       "ABCD123456HDFABC01",
    idArticulo: 4,
    montoTotal: 2500,
    notas:      "Silla de ruedas para uso permanente",
  };

  test("crea comodato con membresía activa (201)", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [membresiaActiva] })               // check membresía
      .mockResolvedValueOnce({ rows: [{ NOMBRE: "Juan García" }] })     // lookup nombre beneficiario
      .mockResolvedValueOnce({ outBinds: { newId: [1] } })              // INSERT comodato
      .mockResolvedValueOnce({ outBinds: { stock_out: 5 } });           // SP inventario SALIDA

    const res = await request(app)
      .post("/api/v1/comodatos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("data");
    expect(res.body.data).toHaveProperty("idComodato");
  });

  test("rechaza si membresía inactiva (403)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] }); // sin membresía activa

    const res = await request(app)
      .post("/api/v1/comodatos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(payload);

    expect(res.status).toBe(403);
  });

  test("crea comodato como donación total (MONTO_TOTAL null) con estatus Pagado (201)", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [membresiaActiva] })               // check membresía
      .mockResolvedValueOnce({ rows: [{ NOMBRE: "Juan García" }] })     // lookup nombre beneficiario
      .mockResolvedValueOnce({ outBinds: { newId: [2] } })              // INSERT comodato
      .mockResolvedValueOnce({ outBinds: { stock_out: 5 } });           // SP inventario SALIDA

    const res = await request(app)
      .post("/api/v1/comodatos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ curp: "ABCD123456HDFABC01", idArticulo: 4, montoTotal: null });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty("estatus", "Pagado");
  });

  test("hace rollback si el INSERT falla con error de BD", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [membresiaActiva] })               // check membresía
      .mockResolvedValueOnce({ rows: [{ NOMBRE: "Juan García" }] })     // lookup nombre
      .mockRejectedValueOnce(new Error("DB connection lost"));          // INSERT falla

    const res = await request(app)
      .post("/api/v1/comodatos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(payload);

    expect([500, 503]).toContain(res.status);
    expect(mockRollback).toHaveBeenCalled();
  });

  test("devuelve 400 si falta curp o idArticulo", async () => {
    const res = await request(app)
      .post("/api/v1/comodatos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ curp: "ABCD123456HDFABC01" }); // falta idArticulo

    expect(res.status).toBe(400);
  });

  test("devuelve 401 sin token", async () => {
    const res = await request(app)
      .post("/api/v1/comodatos")
      .send(payload);
    expect(res.status).toBe(401);
  });

  test("lectura no puede crear (403)", async () => {
    const res = await request(app)
      .post("/api/v1/comodatos")
      .set("Authorization", `Bearer ${tokenLectura}`)
      .send(payload);
    expect(res.status).toBe(403);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. PATCH /api/v1/comodatos/:id — actualizar notas
// ═══════════════════════════════════════════════════════════════════════════════

describe("PATCH /api/v1/comodatos/:id — actualizar notas", () => {
  test("actualiza notas correctamente (200)", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [comodatoRow] })   // verificar existe
      .mockResolvedValueOnce({ rowsAffected: 1 });       // UPDATE

    const res = await request(app)
      .patch("/api/v1/comodatos/1")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ notas: "Nota actualizada" });

    expect(res.status).toBe(200);
  });

  test("devuelve 404 si el comodato no existe", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .patch("/api/v1/comodatos/999")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ notas: "Algo" });

    expect(res.status).toBe(404);
  });

  test("devuelve 400 si no se envía notas", async () => {
    const res = await request(app)
      .patch("/api/v1/comodatos/1")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({});

    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. DELETE /api/v1/comodatos/:id — cancelar comodato
// ═══════════════════════════════════════════════════════════════════════════════

describe("DELETE /api/v1/comodatos/:id — cancelar comodato", () => {
  test("cancela comodato activo (200)", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [comodatoRow] })   // verificar existe y activo
      .mockResolvedValueOnce({ rowsAffected: 1 });       // UPDATE ESTATUS='Cancelado'

    const res = await request(app)
      .delete("/api/v1/comodatos/1")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/cancelado/i);
  });

  test("devuelve 404 si no existe", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete("/api/v1/comodatos/999")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(404);
  });

  test("devuelve 409 si ya está cancelado", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [{ ...comodatoRow, ESTATUS: "Cancelado" }] });

    const res = await request(app)
      .delete("/api/v1/comodatos/1")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(409);
  });

  test("lectura no puede cancelar (403)", async () => {
    const res = await request(app)
      .delete("/api/v1/comodatos/1")
      .set("Authorization", `Bearer ${tokenLectura}`);
    expect(res.status).toBe(403);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. POST /api/v1/comodatos/:id/pagos — registrar pago o exención
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/v1/comodatos/:id/pagos — registrar pago", () => {
  const pagoPayload = { monto: 300, esExento: false, notas: "" };
  const exencionPayload = { monto: 200, esExento: true, notas: "Motivo social" };

  test("registra pago real (201)", async () => {
    // 1) check comodato activo, 2) INSERT pago, 3) UPDATE saldos (no liquida aún)
    mockExecute
      .mockResolvedValueOnce({ rows: [{ ...comodatoRow, MONTO_PAGADO: 500, MONTO_EXENTO: 0 }] })
      .mockResolvedValueOnce({ outBinds: { newId: [5] } })   // INSERT pago
      .mockResolvedValueOnce({ rowsAffected: 1 });            // UPDATE comodato

    const res = await request(app)
      .post("/api/v1/comodatos/1/pagos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(pagoPayload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("data");
  });

  test("registra exención y liquida si alcanza monto total (201)", async () => {
    // monto_pagado=2200, monto_exento=0, monto_total=2500 → pago de 300 exento completa
    const comodatoCasiPagado = { ...comodatoRow, MONTO_PAGADO: 2200, MONTO_EXENTO: 0, MONTO_TOTAL: 2500 };
    mockExecute
      .mockResolvedValueOnce({ rows: [comodatoCasiPagado] })
      .mockResolvedValueOnce({ outBinds: { newId: [6] } })
      .mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .post("/api/v1/comodatos/1/pagos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ monto: 300, esExento: true });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty("estatusResultante", "Pagado");
  });

  test("devuelve 400 si monto es 0 o negativo", async () => {
    const res = await request(app)
      .post("/api/v1/comodatos/1/pagos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ monto: 0, esExento: false });

    expect(res.status).toBe(400);
  });

  test("devuelve 404 si el comodato no existe", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post("/api/v1/comodatos/999/pagos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(pagoPayload);

    expect(res.status).toBe(404);
  });

  test("devuelve 409 si comodato ya está cancelado", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [{ ...comodatoRow, ESTATUS: "Cancelado" }] });

    const res = await request(app)
      .post("/api/v1/comodatos/1/pagos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(exencionPayload);

    expect(res.status).toBe(409);
  });

  test("devuelve 401 sin token", async () => {
    const res = await request(app)
      .post("/api/v1/comodatos/1/pagos")
      .send(pagoPayload);
    expect(res.status).toBe(401);
  });

  test("hace rollback si el INSERT de pago falla con error de BD", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ ...comodatoRow, MONTO_PAGADO: 0, MONTO_EXENTO: 0 }] }) // check comodato
      .mockRejectedValueOnce(new Error("DB connection lost"));                                   // INSERT falla

    const res = await request(app)
      .post("/api/v1/comodatos/1/pagos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(pagoPayload);

    expect([500, 503]).toContain(res.status);
    expect(mockRollback).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 9. PATCH /api/v1/comodatos/:id/devolucion — registrar devolución física
// ═══════════════════════════════════════════════════════════════════════════════

describe("PATCH /api/v1/comodatos/:id/devolucion — registrar devolución física", () => {
  const baseRow = {
    ID_COMODATO: 1,
    ID_ARTICULO: 4,
    CURP: "ABCD123456HDFABC01",
    FECHA_DEVOLUCION_ESPERADA: null,
    FECHA_DEVOLUCION_REAL: null,
    ESTATUS: "Activo",
  };

  const mockDevolucionOk = (esperada = null, nombreRows = [{ NOMBRE: "Juan García" }]) => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ ...baseRow, FECHA_DEVOLUCION_ESPERADA: esperada }] }) // SELECT comodato
      .mockResolvedValueOnce({ rowsAffected: 1 })                                              // UPDATE fecha_devolucion_real
      .mockResolvedValueOnce({ rows: nombreRows })                                             // SELECT beneficiario
      .mockResolvedValueOnce({ outBinds: { stock_out: 5 } });                                 // applyMovimientoConConexion
  };

  test("registra devolución sin fecha esperada — tipo sinFechaEsperada (200)", async () => {
    mockDevolucionOk(null);

    const res = await request(app)
      .patch("/api/v1/comodatos/1/devolucion")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.data.tipo).toBe("sinFechaEsperada");
    expect(res.body.message).toMatch(/registrada exitosamente/i);
  });

  test("registra devolución anticipada (200)", async () => {
    const fechaFutura = new Date(Date.now() + 10 * 86400000);
    mockDevolucionOk(fechaFutura);

    const res = await request(app)
      .patch("/api/v1/comodatos/1/devolucion")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.data.tipo).toBe("anticipada");
    expect(res.body.message).toMatch(/anticipada/i);
  });

  test("registra devolución tardía (200)", async () => {
    const fechaPasada = new Date(Date.now() - 10 * 86400000);
    mockDevolucionOk(fechaPasada);

    const res = await request(app)
      .patch("/api/v1/comodatos/1/devolucion")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.data.tipo).toBe("tarde");
    expect(res.body.message).toMatch(/tardía/i);
  });

  test("registra devolución a tiempo (200)", async () => {
    mockDevolucionOk(new Date());

    const res = await request(app)
      .patch("/api/v1/comodatos/1/devolucion")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.data.tipo).toBe("aTiempo");
  });

  test("usa CURP como fallback si el beneficiario no se encuentra (200)", async () => {
    mockDevolucionOk(null, []); // SELECT beneficiario devuelve filas vacías

    const res = await request(app)
      .patch("/api/v1/comodatos/1/devolucion")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("tipo", "sinFechaEsperada");
  });

  test("devuelve 404 si el comodato no existe", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .patch("/api/v1/comodatos/999/devolucion")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/no encontrado/i);
  });

  test("devuelve 409 si el comodato ya tiene devolución registrada", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [{ ...baseRow, FECHA_DEVOLUCION_REAL: "2026-01-20" }],
    });

    const res = await request(app)
      .patch("/api/v1/comodatos/1/devolucion")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/ya tiene una devolución/i);
  });

  test("hace rollback si el UPDATE falla con error de BD (500)", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [baseRow] })
      .mockRejectedValueOnce(new Error("DB connection lost"));

    const res = await request(app)
      .patch("/api/v1/comodatos/1/devolucion")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect([500, 503]).toContain(res.status);
    expect(mockRollback).toHaveBeenCalled();
  });

  test("devuelve 401 sin token", async () => {
    const res = await request(app).patch("/api/v1/comodatos/1/devolucion");
    expect(res.status).toBe(401);
  });

  test("rol lectura no puede registrar devolución (403)", async () => {
    const res = await request(app)
      .patch("/api/v1/comodatos/1/devolucion")
      .set("Authorization", `Bearer ${tokenLectura}`);
    expect(res.status).toBe(403);
  });
});
