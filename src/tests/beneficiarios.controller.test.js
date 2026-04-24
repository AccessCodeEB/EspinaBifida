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

// Fila base de beneficiario con todos los campos que usa mapBeneficiario
const beneficiarioRow = {
  CURP,
  NOMBRES:             "Juan",
  APELLIDO_PATERNO:    "García",
  APELLIDO_MATERNO:    "López",
  FECHA_NACIMIENTO:    "1990-01-01",
  GENERO:              "M",
  TIPOS_SANGRE:        "O+",
  NOMBRE_PADRE_MADRE:  null,
  CALLE:               "Calle 1",
  COLONIA:             "Centro",
  CIUDAD:              "Monterrey",
  MUNICIPIO:           "Monterrey",
  ESTADO:              "NL",
  CP:                  "64000",
  TELEFONO_CASA:       null,
  TELEFONO_CELULAR:    "8181234567",
  CORREO_ELECTRONICO:  "juan@test.com",
  CONTACTO_EMERGENCIA: null,
  TELEFONO_EMERGENCIA: null,
  MUNICIPIO_NACIMIENTO: null,
  HOSPITAL_NACIMIENTO:  null,
  USA_VALVULA:          "S",
  NOTAS:                null,
  ESTATUS:              "Activo",
  MEMBRESIA_ESTATUS:    "Activa",
  TIPO:                 null,
  FECHA_ALTA:           "2026-01-01",
  NUMERO_CREDENCIAL:    "CRED-001",
  FOTO_PERFIL_URL:      null,
};

beforeEach(() => { resetMocks(); });

// ═══════════════════════════════════════════════════════════════════════════════
// getAll — cubre mapBeneficiario con datos reales
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /beneficiarios — getAll con datos", () => {
  test("mapea fila completa incluyendo usaValvula='S' y tiposSangre", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [beneficiarioRow] });

    const res = await request(app).get("/beneficiarios");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].usaValvula).toBe(true);
    expect(res.body[0].tipoSangre).toBe("O+");
  });

  test("usaValvula numérico 1 → true", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [{ ...beneficiarioRow, USA_VALVULA: 1, TIPOS_SANGRE: null }],
    });

    const res = await request(app).get("/beneficiarios");

    expect(res.status).toBe(200);
    expect(res.body[0].usaValvula).toBe(true);
  });

  test("usaValvula='N' → false", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [{ ...beneficiarioRow, USA_VALVULA: "N" }],
    });

    const res = await request(app).get("/beneficiarios");

    expect(res.body[0].usaValvula).toBe(false);
  });

  test("ciudad y estado nulos → se normalizan a cadena vacía", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [{ ...beneficiarioRow, CIUDAD: null, ESTADO: null }],
    });

    const res = await request(app).get("/beneficiarios");

    expect(res.body[0].ciudad).toBe("");
    expect(res.body[0].estado).toBe("");
  });

  test("estatus nulo → default 'Activo'", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [{ ...beneficiarioRow, ESTATUS: null }],
    });

    const res = await request(app).get("/beneficiarios");

    expect(res.body[0].estatus).toBe("Activo");
  });

  test("membresiaEstatus nulo → default 'Sin membresia'", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [{ ...beneficiarioRow, MEMBRESIA_ESTATUS: null }],
    });

    const res = await request(app).get("/beneficiarios");

    expect(res.body[0].membresiaEstatus).toBe("Sin membresia");
  });

  test("fotoPerfilUrl nulo → null en respuesta", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [{ ...beneficiarioRow, FOTO_PERFIL_URL: null }],
    });

    const res = await request(app).get("/beneficiarios");

    expect(res.body[0].fotoPerfilUrl).toBeNull();
  });

  test("tipoSangre via TIPO_SANGRE cuando TIPOS_SANGRE es null", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [{ ...beneficiarioRow, TIPOS_SANGRE: null, TIPO_SANGRE: "A+" }],
    });

    const res = await request(app).get("/beneficiarios");

    expect(res.body[0].tipoSangre).toBe("A+");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getById
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /beneficiarios/:curp — getById", () => {
  test("retorna beneficiario cuando existe (200)", async () => {
    // getById → SELECT * WHERE CURP
    mockExecute.mockResolvedValueOnce({ rows: [beneficiarioRow] });

    const res = await request(app).get(`/beneficiarios/${CURP}`);

    expect(res.status).toBe(200);
    expect(res.body.curp).toBe(CURP);
    expect(res.body.nombres).toBe("Juan");
  });

  test("retorna 404 si no existe", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get(`/beneficiarios/${CURP}`);

    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// updateEstatus (PATCH /:curp/estatus)
// ═══════════════════════════════════════════════════════════════════════════════

describe("PATCH /beneficiarios/:curp/estatus — updateEstatus", () => {
  test("actualiza estatus a 'Inactivo' (200)", async () => {
    // findById → existe
    mockExecute.mockResolvedValueOnce({ rows: [beneficiarioRow] });
    // UPDATE ESTATUS
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .patch(`/beneficiarios/${CURP}/estatus`)
      .send({ estatus: "Inactivo" });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/Inactivo/i);
  });

  test("actualiza estatus a 'Activo' (200)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [{ ...beneficiarioRow, ESTATUS: "Inactivo" }] });
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .patch(`/beneficiarios/${CURP}/estatus`)
      .send({ estatus: "Activo" });

    expect(res.status).toBe(200);
  });

  test("desde Baja restaura a Inactivo (200)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [{ ...beneficiarioRow, ESTATUS: "Baja" }] });
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .patch(`/beneficiarios/${CURP}/estatus`)
      .send({ estatus: "Inactivo" });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/Inactivo/i);
  });

  test("mismo estatus que ya tiene → 200 (sin segundo UPDATE)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [beneficiarioRow] });

    const res = await request(app)
      .patch(`/beneficiarios/${CURP}/estatus`)
      .send({ estatus: "Activo" });

    expect(res.status).toBe(200);
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  test("devuelve 400 si estatus es 'Baja' (solo Activo/Inactivo permitidos)", async () => {
    const res = await request(app)
      .patch(`/beneficiarios/${CURP}/estatus`)
      .send({ estatus: "Baja" });

    expect(res.status).toBe(400);
  });

  test("devuelve 400 si estatus es inválido", async () => {
    const res = await request(app)
      .patch(`/beneficiarios/${CURP}/estatus`)
      .send({ estatus: "Fantasma" });

    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// deactivate (DELETE /:curp — da de baja)
// ═══════════════════════════════════════════════════════════════════════════════

describe("DELETE /api/v1/beneficiarios/:curp — deactivate (rol admin)", () => {
  test("da de baja al beneficiario activo (200)", async () => {
    // findById → existe y Activo
    mockExecute.mockResolvedValueOnce({ rows: [{ CURP, ESTATUS: "Activo" }] });
    // BeneficiarioModel.deactivate
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });
    // MembresiasModel.cancelarPorCurp
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .delete(`/api/v1/beneficiarios/${CURP}`)
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/desactivado/i);
  });

  test("devuelve 401 sin token", async () => {
    const res = await request(app).delete(`/api/v1/beneficiarios/${CURP}`);
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// hardDelete (DELETE /:curp/eliminar)
// ═══════════════════════════════════════════════════════════════════════════════

describe("DELETE /api/v1/beneficiarios/:curp/eliminar — hardDelete (rol admin)", () => {
  test("elimina beneficiario permanentemente (200)", async () => {
    // findById → existe
    mockExecute.mockResolvedValueOnce({ rows: [{ CURP, ESTATUS: "Baja" }] });
    // DELETE
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .delete(`/api/v1/beneficiarios/${CURP}/eliminar`)
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/eliminado/i);
  });

  test("devuelve 401 sin token", async () => {
    const res = await request(app)
      .delete(`/api/v1/beneficiarios/${CURP}/eliminar`);
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// deleteFotoPerfil (DELETE /:curp/foto-perfil)
// ═══════════════════════════════════════════════════════════════════════════════

describe("DELETE /beneficiarios/:curp/foto-perfil — deleteFotoPerfil", () => {
  test("elimina foto de perfil exitosamente (200)", async () => {
    // findById → existe
    mockExecute.mockResolvedValueOnce({ rows: [{ CURP, FOTO_PERFIL_URL: null }] });
    // UPDATE foto_perfil_url = NULL
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .delete(`/beneficiarios/${CURP}/foto-perfil`);

    expect(res.status).toBe(200);
    expect(res.body.fotoPerfilUrl).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Catch blocks — cubren next(err) en los handlers no ejercitados
// ═══════════════════════════════════════════════════════════════════════════════

describe("Catch blocks de beneficiarios.controller", () => {
  test("getAll → error de DB → 500", async () => {
    mockExecute.mockRejectedValueOnce(new Error("DB timeout"));

    const res = await request(app).get("/beneficiarios");

    expect(res.status).toBe(500);
  });

  test("deactivate → error de DB → 500", async () => {
    mockExecute.mockRejectedValueOnce(new Error("DB timeout"));

    const res = await request(app)
      .delete(`/api/v1/beneficiarios/${CURP}`)
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(500);
  });

  test("deleteFotoPerfil → error de DB → 500", async () => {
    mockExecute.mockRejectedValueOnce(new Error("DB timeout"));

    const res = await request(app)
      .delete(`/beneficiarios/${CURP}/foto-perfil`);

    expect(res.status).toBe(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// uploadFotoPerfil — sin archivo → badRequest (cubre rama !req.file)
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /beneficiarios/:curp/foto-perfil — uploadFotoPerfil sin archivo", () => {
  test("devuelve 400 si no se envía archivo (req.file = undefined)", async () => {
    const res = await request(app)
      .post(`/beneficiarios/${CURP}/foto-perfil`);

    expect(res.status).toBe(400);
  });
});
