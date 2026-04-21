import { jest } from "@jest/globals";

// ─── Entorno ──────────────────────────────────────────────────────────────────
const TEST_SECRET = "test-secret-espina-bifida";
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

const tokenAdmin = jwt.sign({ idAdmin: 1, idRol: 1 }, TEST_SECRET);
const tokenUser  = jwt.sign({ idAdmin: 2, idRol: 2 }, TEST_SECRET);
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

const citaRow = [1, CURP_VALIDA, 1, null, "2026-06-01 10:00:00", "PROGRAMADA", null];

beforeEach(() => {
  jest.clearAllMocks();
  mockExecute.mockReset();
  mockClose.mockResolvedValue(undefined);
  mockCommit.mockResolvedValue(undefined);
  mockRollback.mockResolvedValue(undefined);
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
      .send({ idRol: 1, nombreCompleto: "Nuevo Admin", email: "nuevo@test.com", password: "pass123" });

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
        idTipoServicio:  1,
        fecha:           "2026-07-01 09:00:00",
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
        MUNICIPIO_NACIMIENTO: null, HOSPITAL_NACIMIENTO: null,
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

  test("devuelve 409 si el beneficiario está de Baja", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [{ CURP: CURP_VALIDA, ESTATUS: "Baja" }],
    });

    const res = await request(app)
      .put(`/api/v1/beneficiarios/${CURP_VALIDA}`)
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(updateBody);

    expect(res.status).toBe(409);
  });
});
