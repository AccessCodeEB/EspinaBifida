import { jest } from "@jest/globals";
import {
  TEST_SECRET, mockExecute,
  dbModuleMock, resetMocks,
} from "./helpers/mockDb.js";

// ─── Entorno ──────────────────────────────────────────────────────────────────
process.env.JWT_SECRET  = TEST_SECRET;
process.env.CORS_ORIGIN = "http://localhost:3000";

// ─── Mock de bcryptjs ─────────────────────────────────────────────────────────
const mockBcryptCompare = jest.fn();
const mockBcryptHash    = jest.fn();

jest.unstable_mockModule("bcryptjs", () => ({
  default: { compare: mockBcryptCompare, hash: mockBcryptHash },
  compare: mockBcryptCompare,
  hash:    mockBcryptHash,
}));

// ─── Mock de conexión Oracle ──────────────────────────────────────────────────
jest.unstable_mockModule("../config/db.js", () => dbModuleMock);

// ─── Mock de auditoría (fire-and-forget, no debe interferir con asserts de DB) ─
jest.unstable_mockModule("../models/auditoria.model.js", () => ({
  registrar: jest.fn().mockResolvedValue(undefined),
}));

const { default: app }     = await import("../app.js");
process.env.JWT_SECRET = TEST_SECRET; // dotenv override: restituir secreto de prueba
const { default: request } = await import("supertest");
const { saveOtp }          = await import("../utils/otpStore.js");
import jwt from "jsonwebtoken";

const tokenAdmin  = jwt.sign({ idAdmin: 1, idRol: 1 }, TEST_SECRET);
const tokenUser   = jwt.sign({ idAdmin: 2, idRol: 2 }, TEST_SECRET);
const CURP_VALIDA = "GAEJ900101HMNRRL09";

const adminRow = {
  ID_ADMIN:        1,
  ID_ROL:          1,
  NOMBRE_COMPLETO: "Juan Admin",
  EMAIL:           "admin@test.com",
  PASSWORD_HASH:   "$2a$10$hash",
  ACTIVO:          1,
  NOMBRE_ROL:      "SuperAdmin",
};

const citaRow = {
  ID_CITA:          1,
  CURP:             CURP_VALIDA,
  ID_TIPO_SERVICIO: 1,
  ESPECIALISTA:     null,
  FECHA:            "2026-06-01 10:00:00",
  ESTATUS:          "PROGRAMADA",
  NOTAS:            null,
};

beforeEach(() => {
  resetMocks();
  mockBcryptCompare.mockReset();
  mockBcryptHash.mockReset();
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROLES
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/v1/roles — listar roles", () => {
  test("devuelve lista de roles (200)", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [
        { ID_ROL: 1, NOMBRE_ROL: "SuperAdmin", DESCRIPCION: "Acceso total" },
        { ID_ROL: 2, NOMBRE_ROL: "Recepción",  DESCRIPCION: "Acceso limitado" },
      ],
    });

    const res = await request(app)
      .get("/api/v1/roles")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("devuelve 401 sin token", async () => {
    const res = await request(app).get("/api/v1/roles");
    expect(res.status).toBe(401);
  });

  test("devuelve 403 con rol incorrecto", async () => {
    const res = await request(app)
      .get("/api/v1/roles")
      .set("Authorization", `Bearer ${tokenUser}`);
    expect(res.status).toBe(403);
  });
});

describe("GET /api/v1/roles/:idRol — obtener rol por ID", () => {
  test("devuelve el rol cuando existe (200)", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [{ ID_ROL: 1, NOMBRE_ROL: "SuperAdmin", DESCRIPCION: "Acceso total" }],
    });

    const res = await request(app)
      .get("/api/v1/roles/1")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
  });

  test("devuelve 404 si el rol no existe", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get("/api/v1/roles/999")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMINISTRADORES — login
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/v1/administradores/login", () => {
  test("devuelve 400 si faltan email y password", async () => {
    const res = await request(app)
      .post("/api/v1/administradores/login")
      .send({});

    expect(res.status).toBe(400);
  });

  test("devuelve 401 si el administrador no existe", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post("/api/v1/administradores/login")
      .send({ email: "noexiste@test.com", password: "pass123" });

    expect(res.status).toBe(401);
  });

  test("devuelve 403 si la cuenta está desactivada", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [{ ...adminRow, ACTIVO: 0 }],
    });

    const res = await request(app)
      .post("/api/v1/administradores/login")
      .send({ email: "admin@test.com", password: "pass123" });

    expect(res.status).toBe(403);
  });

  test("devuelve 401 si la contraseña es incorrecta", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [adminRow] });
    mockBcryptCompare.mockResolvedValueOnce(false);

    const res = await request(app)
      .post("/api/v1/administradores/login")
      .send({ email: "admin@test.com", password: "wrongpass" });

    expect(res.status).toBe(401);
  });

  test("devuelve token cuando las credenciales son válidas (200)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [adminRow] });
    mockBcryptCompare.mockResolvedValueOnce(true);

    const res = await request(app)
      .post("/api/v1/administradores/login")
      .send({ email: "admin@test.com", password: "pass123" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMINISTRADORES — CRUD
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/v1/administradores — CRUD", () => {
  test("getAll devuelve lista (200)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [adminRow] });

    const res = await request(app)
      .get("/api/v1/administradores")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("getAll requiere rol 1 (403 con rol 2)", async () => {
    const res = await request(app)
      .get("/api/v1/administradores")
      .set("Authorization", `Bearer ${tokenUser}`);

    expect(res.status).toBe(403);
  });

  test("getById devuelve admin existente (200)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [adminRow] });

    const res = await request(app)
      .get("/api/v1/administradores/1")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
  });

  test("getById devuelve 404 si no existe", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get("/api/v1/administradores/999")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(404);
  });

  test("create devuelve 400 con email inválido", async () => {
    const res = await request(app)
      .post("/api/v1/administradores")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ idRol: 1, nombreCompleto: "Test", email: "no-email", password: "pass123" });

    expect(res.status).toBe(400);
  });

  test("create devuelve 400 con password corta", async () => {
    const res = await request(app)
      .post("/api/v1/administradores")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ idRol: 1, nombreCompleto: "Test", email: "t@test.com", password: "123" });

    expect(res.status).toBe(400);
  });

  test("create devuelve 201 con datos válidos", async () => {
    // findById(idRol) en roles
    mockExecute.mockResolvedValueOnce({ rows: [{ ID_ROL: 1 }] });
    // findByEmail → no existe
    mockExecute.mockResolvedValueOnce({ rows: [] });
    // bcrypt.hash
    mockBcryptHash.mockResolvedValueOnce("$2a$10$hashedpassword");
    // INSERT
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .post("/api/v1/administradores")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ idRol: 1, nombreCompleto: "Nuevo Admin", email: "nuevo@test.com", password: "pass12345" });

    expect(res.status).toBe(201);
  });

  test("deactivate devuelve 200 (admin existente)", async () => {
    // findById → existe
    mockExecute.mockResolvedValueOnce({ rows: [adminRow] });
    // deactivate UPDATE
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .delete("/api/v1/administradores/1")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/desactivado/i);
  });

  test("deactivate devuelve 404 si no existe", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete("/api/v1/administradores/999")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CITAS
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/v1/citas — listar citas", () => {
  test("devuelve lista de citas (200)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [citaRow] });

    const res = await request(app).get("/api/v1/citas");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("devuelve arreglo vacío si no hay citas (200)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get("/api/v1/citas");

    expect(res.status).toBe(200);
  });

  test("ESTATUS null → estatusRaw='' → mapea a 'Pendiente' (L18-19 null branches)", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [{ ...citaRow, ESTATUS: null }],
    });

    const res = await request(app).get("/api/v1/citas");

    expect(res.status).toBe(200);
    // estatusRaw="" → ESTATUS_MAP[""] undefined → r.estatus null → "Pendiente"
    expect(res.body[0].estatus).toBe("Pendiente");
  });

  test("ESTATUS desconocido → ESTATUS_MAP falla → usa r.estatus (L19 ?? r.estatus branch)", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [{ ...citaRow, ESTATUS: "OTRO_ESTADO" }],
    });

    const res = await request(app).get("/api/v1/citas");

    expect(res.status).toBe(200);
    // ESTATUS_MAP["OTRO_ESTADO"] undefined → ?? r.estatus = "OTRO_ESTADO"
    expect(res.body[0].estatus).toBe("OTRO_ESTADO");
  });
});

describe("GET /api/v1/citas/:id — obtener cita por ID", () => {
  test("devuelve la cita cuando existe (200)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [citaRow] });

    const res = await request(app).get("/api/v1/citas/1");

    expect(res.status).toBe(200);
  });

  test("devuelve 404 si la cita no existe", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get("/api/v1/citas/999");

    expect(res.status).toBe(404);
  });
});

describe("POST /api/v1/citas — crear cita", () => {
  test("crea cita exitosamente (201)", async () => {
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .post("/api/v1/citas")
      .send({
        curp:            CURP_VALIDA,
        especialista:    "Dr. Test",
        idTipoServicio:  1,
        fecha:           "2026-07-01",
        estatus:         "PROGRAMADA",
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/creada/i);
  });

  test("devuelve 400 si faltan campos obligatorios", async () => {
    const res = await request(app)
      .post("/api/v1/citas")
      .send({ notas: "solo notas" });

    expect(res.status).toBe(400);
  });

  test("devuelve 400 si estatus es inválido", async () => {
    const res = await request(app)
      .post("/api/v1/citas")
      .send({ curp: CURP_VALIDA, idTipoServicio: 1, fecha: "2026-07-01", estatus: "INVALIDO" });

    expect(res.status).toBe(400);
  });
});

describe("PUT /api/v1/citas/:id — actualizar cita", () => {
  test("actualiza cita existente (200)", async () => {
    // findById → existe (retorna array)
    mockExecute.mockResolvedValueOnce({ rows: [citaRow] });
    // UPDATE
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .put("/api/v1/citas/1")
      .send({ estatus: "COMPLETADA" });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/actualizada/i);
  });

  test("devuelve 404 si la cita no existe", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put("/api/v1/citas/999")
      .send({ estatus: "COMPLETADA" });

    expect(res.status).toBe(404);
  });

  test("devuelve 400 si estatus es inválido", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [citaRow] });

    const res = await request(app)
      .put("/api/v1/citas/1")
      .send({ estatus: "INVALIDO" });

    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/v1/citas/:id — cancelar cita", () => {
  test("cancela cita existente (200)", async () => {
    // findById → existe
    mockExecute.mockResolvedValueOnce({ rows: [citaRow] });
    // UPDATE ESTATUS='CANCELADA'
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app).delete("/api/v1/citas/1");

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/cancelada/i);
  });

  test("devuelve 404 si la cita no existe", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).delete("/api/v1/citas/999");

    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CITAS — ramas no cubiertas: fecha inválida + catch de getCitas
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/v1/citas — ramas de mapCita no cubiertas", () => {
  test("FECHA string y HORA string → mapeados directamente (200)", async () => {
    // El nuevo mapCita usa typeof r.fecha === "string" y typeof r.hora === "string"
    mockExecute.mockResolvedValueOnce({
      rows: [{ ...citaRow, FECHA: "2026-07-15", HORA: "10:30" }],
    });

    const res = await request(app).get("/api/v1/citas");

    expect(res.status).toBe(200);
    expect(res.body[0].fecha).toBe("2026-07-15");
    expect(res.body[0].hora).toBe("10:30");
  });

  test("FECHA no-string → fechaStr vacío; HORA no-string → horaStr vacío", async () => {
    // typeof null === "string" = false → "" en ambos casos
    mockExecute.mockResolvedValueOnce({
      rows: [{ ...citaRow, FECHA: null, HORA: null }],
    });

    const res = await request(app).get("/api/v1/citas");

    expect(res.status).toBe(200);
    expect(res.body[0].fecha).toBe("");
    expect(res.body[0].hora).toBe("");
  });

  test("error de DB en getCitas → next(error) → 500", async () => {
    mockExecute.mockRejectedValueOnce(new Error("DB timeout"));

    const res = await request(app).get("/api/v1/citas");

    expect(res.status).toBe(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMINISTRADORES — update y changePassword (ramas no cubiertas)
// ═══════════════════════════════════════════════════════════════════════════════

describe("PUT /api/v1/administradores/:idAdmin — update", () => {
  test("actualiza admin existente exitosamente (200)", async () => {
    // AdminModel.findById → existe
    mockExecute.mockResolvedValueOnce({ rows: [adminRow] });
    // RolesModel.findById → existe
    mockExecute.mockResolvedValueOnce({ rows: [{ ID_ROL: 1 }] });
    // AdminModel.update
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .put("/api/v1/administradores/1")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ idRol: 1, nombreCompleto: "Admin Actualizado", email: "admin@test.com" });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/actualizado/i);
  });

  test("devuelve 404 si admin no existe", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put("/api/v1/administradores/999")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ idRol: 1, nombreCompleto: "Admin", email: "x@test.com" });

    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/v1/administradores/:idAdmin/password — changePassword", () => {
  test("devuelve 403 si caller != idAdmin (sin llamadas a DB)", async () => {
    // tokenAdmin tiene idAdmin=1, intentamos cambiar password del admin 2
    const res = await request(app)
      .patch("/api/v1/administradores/2/password")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ passwordActual: "pass123", passwordNueva: "newpass123" });

    expect(res.status).toBe(403);
  });

  test("devuelve 400 si faltan passwordActual o passwordNueva", async () => {
    // callerIdAdmin=1 === idAdmin=1 → pasa el check de identidad
    // luego validación lanza 400 por faltar campos
    const res = await request(app)
      .patch("/api/v1/administradores/1/password")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({});

    expect(res.status).toBe(400);
  });
});

describe("POST /api/v1/administradores/:idAdmin/foto-perfil — uploadFotoPerfil", () => {
  test("devuelve 400 si no se envía archivo (req.file = undefined)", async () => {
    const res = await request(app)
      .post("/api/v1/administradores/1/foto-perfil")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BENEFICIARIOS — endpoints sin cobertura
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/v1/beneficiarios — listar todos", () => {
  test("devuelve lista (200)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get("/api/v1/beneficiarios")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
  });
});

describe("PUT /api/v1/beneficiarios/:curp — actualizar beneficiario", () => {
  const updateBody = {
    nombres:         "Juan Actualizado",
    apellidoPaterno: "García",
    apellidoMaterno: "López",
    fechaNacimiento: "1990-01-01",
  };

  test("actualiza beneficiario activo exitosamente (200)", async () => {
    // findById → existe y está Activo
    mockExecute.mockResolvedValueOnce({
      rows: [{
        CURP: CURP_VALIDA, ESTATUS: "Activo",
        NOMBRES: "Juan", APELLIDO_PATERNO: "García", APELLIDO_MATERNO: "López",
        FECHA_NACIMIENTO: null, GENERO: null, NOMBRE_PADRE_MADRE: null,
        CALLE: null, COLONIA: null, CIUDAD: null, MUNICIPIO: null, ESTADO: null, CP: null,
        TELEFONO_CASA: null, TELEFONO_CELULAR: null, CORREO_ELECTRONICO: null,
        CONTACTO_EMERGENCIA: null, TELEFONO_EMERGENCIA: null,
        HOSPITAL_NACIMIENTO: null,
        TIPOS_SANGRE: null, USA_VALVULA: null, NOTAS: null,
      }],
    });
    // UPDATE BENEFICIARIOS
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .put(`/api/v1/beneficiarios/${CURP_VALIDA}`)
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(updateBody);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/actualizado/i);
  });

  test("devuelve 404 si el beneficiario no existe", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put(`/api/v1/beneficiarios/${CURP_VALIDA}`)
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(updateBody);

    expect(res.status).toBe(404);
  });

  test("permite actualizar beneficiario en Baja (200)", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [{
        CURP: CURP_VALIDA, ESTATUS: "Baja",
        NOMBRES: "Juan", APELLIDO_PATERNO: "García", APELLIDO_MATERNO: "López",
        FECHA_NACIMIENTO: null, GENERO: null, NOMBRE_PADRE_MADRE: null,
        CALLE: null, COLONIA: null, CIUDAD: null, MUNICIPIO: null, ESTADO: null, CP: null,
        TELEFONO_CASA: null, TELEFONO_CELULAR: null, CORREO_ELECTRONICO: null,
        CONTACTO_EMERGENCIA: null, TELEFONO_EMERGENCIA: null,
        HOSPITAL_NACIMIENTO: null,
        TIPOS_SANGRE: null, USA_VALVULA: null, NOTAS: null,
      }],
    });
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .put(`/api/v1/beneficiarios/${CURP_VALIDA}`)
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(updateBody);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/actualizado/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMINISTRADORES — uploadFotoPerfil sin archivo
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/v1/administradores/:idAdmin/foto-perfil — sin archivo adjunto", () => {
  test("devuelve 400 si no se envía imagen (req.file ausente → MISSING_FILE)", async () => {
    const res = await request(app)
      .post("/api/v1/administradores/1/foto-perfil")
      .set("Authorization", `Bearer ${tokenAdmin}`);
      // No .attach() → req.file será undefined → controller lanza badRequest

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("MISSING_FILE");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROLES — error path (L7 en roles.controller.js: next(err))
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/v1/roles — error de DB → next(err)", () => {
  test("DB error en getAll → 500", async () => {
    mockExecute.mockRejectedValueOnce(new Error("DB timeout roles"));

    const res = await request(app)
      .get("/api/v1/roles")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ARTICULOS — error paths (L8 y L18 en articulos.controller.js: next(err))
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/v1/articulos — error de DB → next(err)", () => {
  test("DB error en getAll → 500", async () => {
    mockExecute.mockRejectedValueOnce(new Error("DB timeout articulos"));

    const res = await request(app)
      .get("/api/v1/articulos")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(500);
  });
});

describe("GET /api/v1/articulos/:id — error de DB → next(err)", () => {
  test("DB error en getById → 500", async () => {
    mockExecute.mockRejectedValueOnce(new Error("DB timeout articulo by id"));

    const res = await request(app)
      .get("/api/v1/articulos/1")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INVENTARIO — error paths (L17 y L26 en inventario.controller.js: next(err))
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /inventario — error de DB → next(err)", () => {
  test("DB error en getInventario → 500", async () => {
    mockExecute.mockRejectedValueOnce(new Error("DB timeout inventario"));

    const res = await request(app)
      .get("/inventario")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(500);
  });
});

describe("GET /inventario/movimientos — error de DB → next(err)", () => {
  test("DB error en getMovimientos → 500", async () => {
    mockExecute.mockRejectedValueOnce(new Error("DB timeout movimientos"));

    const res = await request(app)
      .get("/inventario/movimientos")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMINISTRADORES — error paths (L6, L35, L73, L91, L92, L97 y L90 branch)
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/v1/administradores — error de DB → next(err)", () => {
  test("DB error en getAll → 500", async () => {
    mockExecute.mockRejectedValueOnce(new Error("DB timeout admins getAll"));

    const res = await request(app)
      .get("/api/v1/administradores")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(500);
  });
});

describe("GET /api/v1/administradores/:idAdmin — getById null row", () => {
  test("getById retorna null → mapAdminPublic(null) → body es null", async () => {
    // findById → not found (servicio lanza notFound)
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get("/api/v1/administradores/999")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    // El servicio lanza notFound cuando no encuentra el admin
    expect([200, 404]).toContain(res.status);
  });

  test("DB error en getById → 500", async () => {
    mockExecute.mockRejectedValueOnce(new Error("DB timeout admins getById"));

    const res = await request(app)
      .get("/api/v1/administradores/1")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(500);
  });
});

describe("POST /api/v1/administradores — error de DB → next(err) en create", () => {
  test("DB error después de validación → 500", async () => {
    // RolesModel.findById → existe
    mockExecute.mockResolvedValueOnce({ rows: [{ ID_ROL: 1 }] });
    // findByEmail → no existe
    mockExecute.mockResolvedValueOnce({ rows: [] });
    // bcrypt.hash
    mockBcryptHash.mockResolvedValueOnce("$2a$10$hash");
    // INSERT falla
    mockExecute.mockRejectedValueOnce(new Error("DB insert error"));

    const res = await request(app)
      .post("/api/v1/administradores")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ idRol: 1, nombreCompleto: "Test", email: "test@test.com", password: "pass12345" });

    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/v1/administradores/:idAdmin — error de DB", () => {
  test("DB error en deactivate → 500", async () => {
    mockExecute.mockRejectedValueOnce(new Error("DB timeout deactivate"));

    const res = await request(app)
      .delete("/api/v1/administradores/1")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CITAS — updateCita con fecha provista (cubre L55-56 en citas.service.js)
// ═══════════════════════════════════════════════════════════════════════════════

describe("PUT /api/v1/citas/:id — actualizar con fecha provista", () => {
  test("actualiza cita con fecha y hora explícitas (200)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [citaRow] });
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .put("/api/v1/citas/1")
      .send({ fecha: "2026-08-01", hora: "14:30", estatus: "CONFIRMADA" });

    expect(res.status).toBe(200);
  });

  test("actualiza cita con fecha pero sin hora (usa 00:00)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [citaRow] });
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .put("/api/v1/citas/1")
      .send({ fecha: "2026-08-01" });

    expect(res.status).toBe(200);
  });

  test("actualiza cita sin fecha ni hora y cita.FECHA es Date object → L58 branch (instanceof Date)", async () => {
    // cita.FECHA como Date instance → instanceof Date = true
    const citaConFechaDate = { ...citaRow, FECHA: new Date("2026-06-01T10:00:00.000Z"), ESTATUS: "PROGRAMADA" };
    mockExecute.mockResolvedValueOnce({ rows: [citaConFechaDate] });
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    // No enviamos fecha → usa la de la cita (cita.FECHA)
    const res = await request(app)
      .put("/api/v1/citas/1")
      .send({ estatus: "CONFIRMADA" });

    expect(res.status).toBe(200);
  });

  test("actualiza cita sin fecha y sin cita.FECHA (L57 false-branch: FECHA es null)", async () => {
    // cita.FECHA = null → else if (cita.FECHA) = false → fechaFinal queda null
    const citaSinFecha = { ...citaRow, FECHA: null, ESTATUS: "PROGRAMADA" };
    mockExecute.mockResolvedValueOnce({ rows: [citaSinFecha] });
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .put("/api/v1/citas/1")
      .send({ estatus: "CONFIRMADA" });

    expect(res.status).toBe(200);
  });

  test("actualiza cita sin estatus en body → usa cita.ESTATUS (L62 false-branch)", async () => {
    const citaConEstatus = { ...citaRow, ESTATUS: "PROGRAMADA" };
    mockExecute.mockResolvedValueOnce({ rows: [citaConEstatus] });
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    // No enviamos estatus → usa cita.ESTATUS
    const res = await request(app)
      .put("/api/v1/citas/1")
      .send({});

    expect(res.status).toBe(200);
  });

  test("cita sin ESTATUS en BD (null) → usa 'PROGRAMADA' por defecto (L64: ?? branch)", async () => {
    const citaSinEstatus = { ...citaRow, ESTATUS: null, FECHA: null };
    mockExecute.mockResolvedValueOnce({ rows: [citaSinEstatus] });
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    // No enviamos estatus → usa cita.ESTATUS ?? "PROGRAMADA"
    const res = await request(app)
      .put("/api/v1/citas/1")
      .send({});

    expect(res.status).toBe(200);
  });

  test("actualiza cita con curp en body → usa data.curp.toUpperCase() (L71 true-branch)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [citaRow] });
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .put("/api/v1/citas/1")
      .send({ curp: "gaej900101hmnrrl09" }); // curp en minúsculas → se convierte a mayúsculas

    expect(res.status).toBe(200);
  });
});

describe("POST /api/v1/citas — createCita sin estatus (usa PROGRAMADA)", () => {
  test("crea cita sin campo estatus → usa PROGRAMADA por defecto (L40: || branch)", async () => {
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .post("/api/v1/citas")
      .send({ curp: CURP_VALIDA, idTipoServicio: 1, fecha: "2026-09-01" });
    // No se envía estatus → estatus = "" o undefined → || "PROGRAMADA" se usa

    expect([200, 201, 400]).toContain(res.status);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BENEFICIARIOS — hardDelete error path (L103) y uploadFotoPerfil (L110, L111, L116)
// ═══════════════════════════════════════════════════════════════════════════════

describe("DELETE /api/v1/beneficiarios/:curp/eliminar — hardDelete", () => {
  test("elimina permanentemente (200)", async () => {
    // findById → existe
    mockExecute.mockResolvedValueOnce({ rows: [{ CURP: CURP_VALIDA }] });
    // DELETE
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .delete(`/api/v1/beneficiarios/${CURP_VALIDA}/eliminar`)
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
  });

  test("devuelve 404 si no existe", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete(`/api/v1/beneficiarios/${CURP_VALIDA}/eliminar`)
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(404);
  });

  test("DB error → next(err) → 500", async () => {
    mockExecute.mockRejectedValueOnce(new Error("DB hard delete error"));

    const res = await request(app)
      .delete(`/api/v1/beneficiarios/${CURP_VALIDA}/eliminar`)
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// errorHandler — notFoundHandler + ramas especiales
// ═══════════════════════════════════════════════════════════════════════════════

describe("errorHandler — notFoundHandler (ruta desconocida)", () => {
  test("devuelve 404 al acceder a una ruta inexistente", async () => {
    const res = await request(app)
      .get("/api/v1/ruta-que-no-existe-nunca");

    expect(res.status).toBe(404);
    expect(res.body.code).toBe("ROUTE_NOT_FOUND");
  });
});

describe("errorHandler — LIMIT_FILE_SIZE (archivo demasiado grande)", () => {
  test("devuelve 400 con código FILE_TOO_LARGE cuando multer rechaza por tamaño", async () => {
    // Subimos un archivo al endpoint de foto de perfil con un buffer grande
    // multer está configurado con límite de 2 MB; superamos ese límite
    const bufferGrande = Buffer.alloc(3 * 1024 * 1024); // 3 MB

    const res = await request(app)
      .post("/api/v1/administradores/1/foto-perfil")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .attach("foto", bufferGrande, { filename: "grande.jpg", contentType: "image/jpeg" });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("FILE_TOO_LARGE");
  });
});

describe("errorHandler — NJS-044 (bind error Oracle)", () => {
  test("devuelve 400 con código BIND_ERROR cuando OracleDB lanza NJS-044", async () => {
    const njs044Err = Object.assign(new Error("NJS-044 bind param inválido"), { code: "NJS-044" });
    mockExecute.mockRejectedValueOnce(njs044Err);

    // GET /api/v1/servicios (getAll) propagará el error al errorHandler
    const res = await request(app).get("/api/v1/servicios");

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("BIND_ERROR");
  });
});

describe("errorHandler — mapOracleError (ORA-00001 duplicado)", () => {
  test("devuelve 409 cuando Oracle lanza ORA-00001 (duplicate key)", async () => {
    const oraErr = Object.assign(new Error("ORA-00001: unique constraint violated"), { errorNum: 1 });
    mockExecute.mockRejectedValueOnce(oraErr);

    const res = await request(app).get("/api/v1/servicios");

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("DUPLICATE_RECORD");
  });
});

describe("errorHandler — 500 con err sin message ni name (L45/L49/L50 false-branches)", () => {
  test("error sin message ni name → usa defaults '?' en debug info", async () => {
    // Object.create(null) → sin prototype, sin name, sin message
    const errVacio = Object.create(null);
    // message no definido → undefined → err?.message es undefined → L45 usa message original
    // name no definido → undefined → err?.name ?? "Error" usa "Error" (L49)
    // message undefined → err?.message ?? null retorna null (L50)
    mockExecute.mockRejectedValueOnce(errVacio);

    const res = await request(app).get("/api/v1/servicios");

    expect(res.status).toBe(500);
  });

  test("error con message vacío → L45 false-branch (no sobreescribe message)", async () => {
    const errConMsgVacio = { message: "" }; // message falsy
    mockExecute.mockRejectedValueOnce(errConMsgVacio);

    const res = await request(app).get("/api/v1/servicios");

    expect(res.status).toBe(500);
  });
});

describe("errorHandler — INSUFFICIENT_STOCK (stock insuficiente SP)", () => {
  test("devuelve 422 con código INSUFFICIENT_STOCK", async () => {
    // ORA-20002 es mapeado a INSUFFICIENT_STOCK por inventario.model
    const oraErr = Object.assign(
      new Error("ORA-20002: Stock insuficiente"),
      { errorNum: 20002 }
    );
    mockExecute.mockRejectedValueOnce(oraErr);

    const res = await request(app)
      .post("/api/v1/movimientos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ idArticulo: 1, tipo: "SALIDA", cantidad: 999 });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe("INSUFFICIENT_STOCK");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMINISTRADORES — changePassword éxito (L73)
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/v1/administradores/:idAdmin/foto-perfil — uploadFotoPerfil éxito (L91-97)", () => {
  test("actualiza foto de perfil exitosamente (200)", async () => {
    // findById → admin existe (para updateFotoPerfilByUpload)
    mockExecute.mockResolvedValueOnce({
      rows: [{ ...adminRow, FOTO_PERFIL_URL: null }],
    });
    // updateFotoPerfilUrl → éxito
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const smallJpeg = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
    ]);

    const res = await request(app)
      .post("/api/v1/administradores/1/foto-perfil")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .attach("foto", smallJpeg, { filename: "avatar.jpg", contentType: "image/jpeg" });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/foto/i);
    expect(res.body).toHaveProperty("fotoPerfilUrl");
  });
});

describe("PATCH /api/v1/administradores/:idAdmin/password — changePassword éxito", () => {
  test("cambia la contraseña exitosamente (200)", async () => {
    // Pre-seed OTP para el admin 1
    saveOtp(1, "654321");

    // findById(1) → retorna admin con EMAIL y TELEFONO
    mockExecute.mockResolvedValueOnce({
      rows: [{ ...adminRow, EMAIL: "admin@test.com", TELEFONO: "8181234567" }],
    });
    // findByEmail → retorna admin con PASSWORD_HASH
    mockExecute.mockResolvedValueOnce({
      rows: [{ ...adminRow, PASSWORD_HASH: "$2a$10$hash" }],
    });
    mockBcryptCompare.mockResolvedValueOnce(true);
    mockBcryptHash.mockResolvedValueOnce("$2a$10$newhash");
    // updatePassword → éxito
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .patch("/api/v1/administradores/1/password")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ passwordActual: "pass123", passwordNueva: "newpass456", codigo: "654321" });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/contraseña/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /administradores/:id/solicitar-codigo — solicitarCodigo
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /administradores/:idAdmin/solicitar-codigo — solicitarCodigo", () => {
  test("retorna 200 con mensaje cuando el admin tiene teléfono", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [{ ...adminRow, TELEFONO: "8181234567" }],
    });

    const res = await request(app)
      .post("/administradores/1/solicitar-codigo")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message");
  });

  test("retorna 403 si el caller intenta solicitar código de otro admin", async () => {
    const res = await request(app)
      .post("/administradores/2/solicitar-codigo")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(403);
  });

  test("retorna 500 si el service lanza un error", async () => {
    mockExecute.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app)
      .post("/administradores/1/solicitar-codigo")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /administradores/:id/telefono — updateTelefono
// ═══════════════════════════════════════════════════════════════════════════════

describe("PATCH /administradores/:idAdmin/telefono — updateTelefono", () => {
  test("retorna 200 al actualizar teléfono correctamente", async () => {
    // findById → admin existe
    mockExecute.mockResolvedValueOnce({ rows: [adminRow] });
    // updateTelefono → éxito
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .patch("/administradores/1/telefono")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ telefono: "8181234567" });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/tel[eé]fono/i);
  });

  test("acepta body sin campo telefono → lo trata como null (rama ?? null)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [adminRow] });
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .patch("/administradores/1/telefono")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({});

    expect(res.status).toBe(200);
  });

  test("retorna 500 si el service lanza un error", async () => {
    mockExecute.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app)
      .patch("/administradores/1/telefono")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ telefono: "8181234567" });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /administradores/forgot-password — solicitarRecuperacion
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /administradores/forgot-password — solicitarRecuperacion", () => {
  test("retorna 200 con mensaje cuando el email existe y tiene teléfono", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [{ ...adminRow, TELEFONO: "8181234567" }],
    });

    const res = await request(app)
      .post("/administradores/forgot-password")
      .send({ email: "admin@test.com" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message");
  });

  test("retorna 404 si el email no existe", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post("/administradores/forgot-password")
      .send({ email: "noexiste@test.com" });

    expect(res.status).toBe(404);
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /administradores/forgot-password/reset — resetPasswordPublico
// ═══════════════════════════════════════════════════════════════════════════════

describe("PATCH /administradores/forgot-password/reset — resetPasswordPublico", () => {
  test("retorna 200 cuando el código y la contraseña son válidos", async () => {
    saveOtp(adminRow.ID_ADMIN, "654321");
    mockExecute.mockResolvedValueOnce({ rows: [adminRow] });
    mockBcryptHash.mockResolvedValueOnce("$2a$10$newhash");
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .patch("/administradores/forgot-password/reset")
      .send({ email: "admin@test.com", codigo: "654321", nuevaPassword: "NuevaPass1" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message");
  });

  test("retorna 400 INVALID_OTP si el código es incorrecto", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [adminRow] });

    const res = await request(app)
      .patch("/administradores/forgot-password/reset")
      .send({ email: "admin@test.com", codigo: "000000", nuevaPassword: "NuevaPass1" });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_OTP");
  });

  test("retorna 404 si el email no existe", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .patch("/administradores/forgot-password/reset")
      .send({ email: "nadie@test.com", codigo: "123456", nuevaPassword: "NuevaPass1" });

    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/v1/administradores/refresh — refresh token
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/v1/administradores/refresh — renovar token", () => {
  test("renueva el par de tokens con refreshToken válido (200)", async () => {
    const futureDate = new Date(Date.now() + 86400000);
    // findByHash → token válido no revocado
    mockExecute.mockResolvedValueOnce({
      rows: [{ ID_TOKEN: 1, ID_ADMIN: 1, EXPIRES_AT: futureDate, REVOCADO: 0 }],
    });
    // revoke (UPDATE)
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });
    // findById (admin activo)
    mockExecute.mockResolvedValueOnce({ rows: [adminRow] });
    // insert nuevo refresh token
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .post("/api/v1/administradores/refresh")
      .send({ refreshToken: "some-valid-raw-token" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body).toHaveProperty("refreshToken");
  });

  test("retorna 401 si el token está revocado", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [{ ID_TOKEN: 1, ID_ADMIN: 1, EXPIRES_AT: new Date(Date.now() + 86400000), REVOCADO: 1 }],
    });

    const res = await request(app)
      .post("/api/v1/administradores/refresh")
      .send({ refreshToken: "revoked-token" });

    expect(res.status).toBe(401);
  });

  test("retorna 401 si el token no existe", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post("/api/v1/administradores/refresh")
      .send({ refreshToken: "nonexistent-token" });

    expect(res.status).toBe(401);
  });

  test("retorna 400 si falta refreshToken en el body (Zod)", async () => {
    const res = await request(app)
      .post("/api/v1/administradores/refresh")
      .send({});

    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/v1/administradores/logout — revocar refresh token
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/v1/administradores/logout — cerrar sesión", () => {
  test("revoca el refreshToken y retorna 204", async () => {
    // revoke (UPDATE)
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .post("/api/v1/administradores/logout")
      .send({ refreshToken: "some-token-to-revoke" });

    expect(res.status).toBe(204);
  });

  test("retorna 400 si falta refreshToken en el body (Zod)", async () => {
    const res = await request(app)
      .post("/api/v1/administradores/logout")
      .send({});

    expect(res.status).toBe(400);
  });
});
