/**
 * Tests para:
 *   - src/routes/configuracion.routes.js
 *   - src/routes/especialistas.routes.js
 *   - src/routes/servicios-catalogo.routes.js
 *
 * Estos routes NO están montados en app.js (son módulos nuevos), así que se
 * monta cada uno en un mini-app Express para testear con supertest.
 */
import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";
import jwt    from "jsonwebtoken";
import {
  TEST_SECRET, mockExecute, mockClose,
  dbModuleMock, resetMocks,
} from "./helpers/mockDb.js";

// ─── Entorno ──────────────────────────────────────────────────────────────────
process.env.JWT_SECRET  = TEST_SECRET;
process.env.CORS_ORIGIN = "http://localhost:3000";

// ─── Mock Oracle ──────────────────────────────────────────────────────────────
jest.unstable_mockModule("../config/db.js", () => dbModuleMock);

// ─── Importar routes DESPUÉS del mock (ESM) ──────────────────────────────────
const { default: configuracionRoutes } = await import("../routes/configuracion.routes.js");
const { default: especialistasRoutes  } = await import("../routes/especialistas.routes.js");
const { default: catalogoRoutes       } = await import("../routes/servicios-catalogo.routes.js");

// ─── Mini Express app por route ───────────────────────────────────────────────
function buildApp(prefix, router) {
  const app = express();
  app.use(express.json());
  app.use(prefix, router);
  // error handler mínimo
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    res.status(err.status || err.statusCode || 500).json({ error: err.message });
  });
  return app;
}

const configApp   = buildApp("/configuracion",    configuracionRoutes);
const espApp      = buildApp("/especialistas",     especialistasRoutes);
const catalogoApp = buildApp("/servicios-catalogo", catalogoRoutes);

const tokenAdmin = jwt.sign({ idAdmin: 1, idRol: 1 }, TEST_SECRET);

beforeEach(() => resetMocks());

// ═══════════════════════════════════════════════════════════════════════════════
// GET /configuracion
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /configuracion", () => {
  it("retorna config como objeto clave:valor", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [
        { CLAVE: "BANCO_NOMBRE",    VALOR: "BBVA" },
        { CLAVE: "MONTO_MEMBRESIA", VALOR: "500"  },
      ],
    });

    const res = await request(configApp).get("/configuracion");

    expect(res.status).toBe(200);
    expect(res.body.BANCO_NOMBRE).toBe("BBVA");
    expect(res.body.MONTO_MEMBRESIA).toBe("500");
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it("retorna objeto vacío cuando no hay filas", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(configApp).get("/configuracion");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({});
  });

  it("cierra conexión y propaga error de DB", async () => {
    mockExecute.mockRejectedValueOnce(new Error("ORA-00942"));

    const res = await request(configApp).get("/configuracion");

    expect(res.status).toBe(500);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /configuracion/cuentas-bancarias
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /configuracion/cuentas-bancarias", () => {
  it("retorna datos bancarios mapeados", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [
        { CLAVE: "BANCO_NOMBRE",        VALOR: "BBVA"               },
        { CLAVE: "BANCO_NUMERO_CUENTA", VALOR: "1234567890"         },
        { CLAVE: "BANCO_CLABE",         VALOR: "012345678901234567" },
      ],
    });

    const res = await request(configApp).get("/configuracion/cuentas-bancarias");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      banco:        "BBVA",
      numeroCuenta: "1234567890",
      clabe:        "012345678901234567",
    });
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it("retorna nulls cuando no existen las claves bancarias", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(configApp).get("/configuracion/cuentas-bancarias");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ banco: null, numeroCuenta: null, clabe: null });
  });

  it("cierra conexión y propaga error de DB", async () => {
    mockExecute.mockRejectedValueOnce(new Error("timeout"));

    const res = await request(configApp).get("/configuracion/cuentas-bancarias");

    expect(res.status).toBe(500);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /configuracion/resumen-financiero
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /configuracion/resumen-financiero", () => {
  it("requiere JWT — 401 sin token", async () => {
    const res = await request(configApp).get("/configuracion/resumen-financiero");
    expect(res.status).toBe(401);
  });

  it("calcula porcentajeCambio correctamente cuando mes anterior > 0", async () => {
    // actual=5000, anterior=4000 → cambio = 25%
    mockExecute
      .mockResolvedValueOnce({ rows: [{ TOTAL: 5000, EFECTIVO: 3000, TRANSFERENCIA: 2000, TARJETA: 0, CANTIDAD: 10 }] })
      .mockResolvedValueOnce({ rows: [{ TOTAL: 4000, EFECTIVO: 2500, TRANSFERENCIA: 1500, TARJETA: 0, CANTIDAD:  8 }] });

    const res = await request(configApp)
      .get("/configuracion/resumen-financiero?mes=2026-03")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.totalActual).toBe(5000);
    expect(res.body.totalAnterior).toBe(4000);
    expect(res.body.porcentajeCambio).toBe(25);
    expect(res.body.mesAnterior).toBe("2026-02");
    expect(res.body.desglosePorMetodo.efectivo).toBe(3000);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it("porcentajeCambio = 0 cuando mes anterior no tiene pagos (totalAnterior = 0)", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ TOTAL: 3000, EFECTIVO: 3000, TRANSFERENCIA: 0, TARJETA: 0, CANTIDAD: 3 }] })
      .mockResolvedValueOnce({ rows: [{ TOTAL: 0,    EFECTIVO: 0,    TRANSFERENCIA: 0, TARJETA: 0, CANTIDAD: 0 }] });

    const res = await request(configApp)
      .get("/configuracion/resumen-financiero?mes=2026-03")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.porcentajeCambio).toBe(0);
  });

  it("mes=enero → mesAnterior es diciembre del año anterior", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ TOTAL: 0, EFECTIVO: 0, TRANSFERENCIA: 0, TARJETA: 0, CANTIDAD: 0 }] })
      .mockResolvedValueOnce({ rows: [{ TOTAL: 0, EFECTIVO: 0, TRANSFERENCIA: 0, TARJETA: 0, CANTIDAD: 0 }] });

    const res = await request(configApp)
      .get("/configuracion/resumen-financiero?mes=2026-01")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.mesAnterior).toBe("2025-12");
  });

  it("usa mes actual por defecto cuando no se pasa ?mes", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ TOTAL: 0, EFECTIVO: 0, TRANSFERENCIA: 0, TARJETA: 0, CANTIDAD: 0 }] })
      .mockResolvedValueOnce({ rows: [{ TOTAL: 0, EFECTIVO: 0, TRANSFERENCIA: 0, TARJETA: 0, CANTIDAD: 0 }] });

    const res = await request(configApp)
      .get("/configuracion/resumen-financiero")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    // mes debe ser YYYY-MM del día de hoy
    expect(res.body.mes).toMatch(/^\d{4}-\d{2}$/);
  });

  it("cierra conexión y propaga error de DB", async () => {
    mockExecute.mockRejectedValueOnce(new Error("ORA-00600"));

    const res = await request(configApp)
      .get("/configuracion/resumen-financiero?mes=2026-03")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(500);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /especialistas
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /especialistas", () => {
  it("mapea rows con especialidad — label incluye nombre y especialidad", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [
        { ID_ESPECIALISTA: 1, NOMBRE: "Dr. García", ESPECIALIDAD: "Neurología" },
      ],
    });

    const res = await request(espApp).get("/especialistas");

    expect(res.status).toBe(200);
    expect(res.body[0]).toMatchObject({
      id:           1,
      nombre:       "Dr. García",
      especialidad: "Neurología",
      label:        "Dr. García - Neurología",
    });
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it("label es solo el nombre cuando ESPECIALIDAD es null", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [
        { ID_ESPECIALISTA: 2, NOMBRE: "Lic. López", ESPECIALIDAD: null },
      ],
    });

    const res = await request(espApp).get("/especialistas");

    expect(res.status).toBe(200);
    expect(res.body[0].especialidad).toBeNull();
    expect(res.body[0].label).toBe("Lic. López");
  });

  it("retorna [] cuando no hay especialistas activos", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(espApp).get("/especialistas");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("cierra conexión y propaga error de DB", async () => {
    mockExecute.mockRejectedValueOnce(new Error("ORA-12154"));

    const res = await request(espApp).get("/especialistas");

    expect(res.status).toBe(500);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /servicios-catalogo
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /servicios-catalogo", () => {
  it("retorna tipos de servicio mapeados con montoSugerido numérico", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [
        { ID_TIPO_SERVICIO: 1, NOMBRE: "Consulta General", DESCRIPCION: "Desc",  MONTO_SUGERIDO: 200 },
        { ID_TIPO_SERVICIO: 2, NOMBRE: "Terapia Física",   DESCRIPCION: null,    MONTO_SUGERIDO: null },
      ],
    });

    const res = await request(catalogoApp).get("/servicios-catalogo");

    expect(res.status).toBe(200);
    expect(res.body[0]).toMatchObject({
      idTipoServicio: 1,
      nombre:         "Consulta General",
      descripcion:    "Desc",
      montoSugerido:  200,
    });
    expect(res.body[1].descripcion).toBeNull();
    expect(res.body[1].montoSugerido).toBeNull();
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it("retorna [] cuando el catálogo está vacío", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(catalogoApp).get("/servicios-catalogo");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("cierra conexión y propaga error de DB", async () => {
    mockExecute.mockRejectedValueOnce(new Error("ORA-00942"));

    const res = await request(catalogoApp).get("/servicios-catalogo");

    expect(res.status).toBe(500);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});
