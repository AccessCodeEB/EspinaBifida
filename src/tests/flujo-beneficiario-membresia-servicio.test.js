import { jest } from "@jest/globals";
import jwt from "jsonwebtoken";
import {
  TEST_SECRET, mockExecute,
  dbModuleMock, resetMocks,
} from "./helpers/mockDb.js";

// ─── Entorno ─────────────────────────────────────────────────────────────────
process.env.JWT_SECRET   = TEST_SECRET;
process.env.CORS_ORIGIN  = "http://localhost:3000";

// ─── Mock de conexión Oracle ──────────────────────────────────────────────────
jest.unstable_mockModule("../config/db.js", () => dbModuleMock);

// ─── Importaciones dinámicas (deben ir DESPUÉS del mock) ─────────────────────
const { default: app }     = await import("../app.js");
const { default: request } = await import("supertest");

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const CURP_VALIDA = "GAEJ900101HMNRRL09";

const tokenAdmin     = jwt.sign({ idAdmin: 1, idRol: 1 }, TEST_SECRET);
const tokenRecepcion = jwt.sign({ idAdmin: 2, idRol: 2 }, TEST_SECRET);

const beneficiarioBase = {
  curp:             CURP_VALIDA,
  nombres:          "Juan",
  apellidoPaterno:  "García",
  apellidoMaterno:  "López",
  fechaNacimiento:  "1990-01-01",
};

const membresiaBase = {
  curp:              CURP_VALIDA,
  numero_credencial: "CRED-001",
  fecha_emision:     "2026-01-01",
  fecha_vigencia_inicio: "2026-01-01",
};

const servicioBase = {
  curp:           CURP_VALIDA,
  idTipoServicio: 1,
  costo:          150.0,
  montoPagado:    0,
  notas:          "Primera consulta",
};

// ─── Setup ────────────────────────────────────────────────────────────────────
beforeEach(() => { resetMocks(); });

// ═══════════════════════════════════════════════════════════════════════════════
// 1. CASO FELIZ COMPLETO
// ═══════════════════════════════════════════════════════════════════════════════

describe("Flujo feliz: beneficiario → membresía → servicio", () => {
  test("POST /api/v1/beneficiarios crea beneficiario exitosamente", async () => {
    // findById → no existe todavía
    mockExecute.mockResolvedValueOnce({ rows: [] });
    // INSERT BENEFICIARIOS
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .post("/api/v1/beneficiarios")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(beneficiarioBase);

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/creado/i);
  });

  test("POST /api/v1/membresias registra membresía sin traslape", async () => {
    // findBeneficiarioByCurp → existe
    mockExecute.mockResolvedValueOnce({ rows: [{ CURP: CURP_VALIDA }] });
    // hasPeriodOverlap → sin traslape
    mockExecute.mockResolvedValueOnce({ rows: [{ TOTAL: 0 }] });
    // INSERT CREDENCIALES
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .post("/api/v1/membresias")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(membresiaBase);

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/membres/i);
  });

  test("POST /api/v1/servicios crea servicio para beneficiario activo", async () => {
    // findBeneficiarioActivoConMembresia → consulta combinada (atómica, sin TOCTOU)
    mockExecute.mockResolvedValueOnce({
      rows: [{
        ESTATUS:          "Activo",
        NOMBRES:          "Juan",
        APELLIDO_PATERNO: "García",
        ID_CREDENCIAL:    1,
        NUMERO_CREDENCIAL:"CRED-001",
      }],
    });
    // SEQ_SERVICIOS.NEXTVAL → ID atómico del sequence de Oracle
    mockExecute.mockResolvedValueOnce({ rows: [{ NEXT_ID: 1 }] });
    // INSERT SERVICIOS
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .post("/api/v1/servicios")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(servicioBase);

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/creado/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. NO AUTORIZADO — sin token (401)
// ═══════════════════════════════════════════════════════════════════════════════

describe("Autenticación: sin token → 401", () => {
  test("GET /api/v1/beneficiarios sin token", async () => {
    const res = await request(app).get("/api/v1/beneficiarios");
    expect(res.status).toBe(401);
  });

  test("POST /api/v1/beneficiarios sin token", async () => {
    const res = await request(app)
      .post("/api/v1/beneficiarios")
      .send(beneficiarioBase);
    expect(res.status).toBe(401);
  });

  test("POST /api/v1/membresias sin token", async () => {
    const res = await request(app)
      .post("/api/v1/membresias")
      .send(membresiaBase);
    expect(res.status).toBe(401);
  });

  test("POST /api/v1/beneficiarios con token malformado → 401", async () => {
    const res = await request(app)
      .post("/api/v1/beneficiarios")
      .set("Authorization", "Bearer token.invalido.aqui")
      .send(beneficiarioBase);
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. ROL INCORRECTO — recepción intentando acción de admin (403)
// ═══════════════════════════════════════════════════════════════════════════════

describe("Autorización: rol insuficiente → 403", () => {
  test("DELETE /api/v1/beneficiarios/:curp con rol recepción (solo admin puede dar baja)", async () => {
    const res = await request(app)
      .delete(`/api/v1/beneficiarios/${CURP_VALIDA}`)
      .set("Authorization", `Bearer ${tokenRecepcion}`);
    expect(res.status).toBe(403);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. DATOS INVÁLIDOS (400)
// ═══════════════════════════════════════════════════════════════════════════════

describe("Validación: datos inválidos → 400", () => {
  test("CURP con formato inválido", async () => {
    const res = await request(app)
      .post("/api/v1/beneficiarios")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ ...beneficiarioBase, curp: "INVALIDA" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_CURP");
  });

  test("Nombres vacíos (campo obligatorio)", async () => {
    const res = await request(app)
      .post("/api/v1/beneficiarios")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ ...beneficiarioBase, nombres: "" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("MISSING_REQUIRED_FIELDS");
  });

  test("Correo electrónico inválido", async () => {
    const res = await request(app)
      .post("/api/v1/beneficiarios")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ ...beneficiarioBase, correoElectronico: "no-es-un-email" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_EMAIL");
  });

  test("Fecha de nacimiento en el futuro", async () => {
    const res = await request(app)
      .post("/api/v1/beneficiarios")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ ...beneficiarioBase, fechaNacimiento: "2099-01-01" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("DATE_IN_FUTURE");
  });

  test("Teléfono con formato inválido (no 10 dígitos)", async () => {
    const res = await request(app)
      .post("/api/v1/beneficiarios")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ ...beneficiarioBase, telefonoCelular: "123" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_PHONE");
  });

  test("Servicio con costo negativo → 400", async () => {
    const res = await request(app)
      .post("/api/v1/servicios")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ ...servicioBase, costo: -50 });
    expect(res.status).toBe(400);
  });

  test("Servicio sin campos requeridos → 400", async () => {
    const res = await request(app)
      .post("/api/v1/servicios")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ curp: CURP_VALIDA });
    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. BENEFICIARIO DUPLICADO (409)
// ═══════════════════════════════════════════════════════════════════════════════

describe("Conflicto: CURP duplicada → 409", () => {
  test("POST /api/v1/beneficiarios con CURP ya registrada", async () => {
    // findById → ya existe
    mockExecute.mockResolvedValueOnce({
      rows: [{ CURP: CURP_VALIDA, ESTATUS: "Activo" }],
    });

    const res = await request(app)
      .post("/api/v1/beneficiarios")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(beneficiarioBase);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("DUPLICATE_CURP");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. MEMBRESÍA CON PERÍODO TRASLAPADO (409)
// ═══════════════════════════════════════════════════════════════════════════════

describe("Conflicto: membresía traslapada → 409", () => {
  test("POST /api/v1/membresias con vigencia que se solapa con una existente", async () => {
    // findBeneficiarioByCurp → existe
    mockExecute.mockResolvedValueOnce({ rows: [{ CURP: CURP_VALIDA }] });
    // hasPeriodOverlap → hay traslape
    mockExecute.mockResolvedValueOnce({ rows: [{ TOTAL: 1 }] });

    const res = await request(app)
      .post("/api/v1/membresias")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(membresiaBase);

    expect(res.status).toBe(409);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. MEMBRESÍA PARA CURP INEXISTENTE (404)
// ═══════════════════════════════════════════════════════════════════════════════

describe("No encontrado: membresía para beneficiario inexistente → 404", () => {
  test("POST /api/v1/membresias para CURP sin registro en la BD", async () => {
    // findBeneficiarioByCurp → no existe
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post("/api/v1/membresias")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(membresiaBase);

    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. SERVICIO PARA BENEFICIARIO BLOQUEADO
// ═══════════════════════════════════════════════════════════════════════════════

describe("Falla: servicio para beneficiario con estatus bloqueado", () => {
  test("Beneficiario Inactivo no puede recibir servicios", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [{
        ESTATUS:           "Inactivo",
        NUMERO_CREDENCIAL: null,
        NOMBRES:           "Juan",
        APELLIDO_PATERNO:  "García",
      }],
    });

    const res = await request(app)
      .post("/api/v1/servicios")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(servicioBase);

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test("Beneficiario con Baja no puede recibir servicios", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [{
        ESTATUS:           "Baja",
        NUMERO_CREDENCIAL: null,
        NOMBRES:           "Juan",
        APELLIDO_PATERNO:  "García",
      }],
    });

    const res = await request(app)
      .post("/api/v1/servicios")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(servicioBase);

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test("CURP inexistente en servicios → 404", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post("/api/v1/servicios")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(servicioBase);

    expect(res.status).toBe(404);
  });
});
