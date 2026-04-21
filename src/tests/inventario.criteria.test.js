import { jest } from "@jest/globals";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "test-secret-espina-bifida";
const tokenAdmin = jwt.sign({ idAdmin: 1, idRol: 1 }, process.env.JWT_SECRET);

const mockExecute = jest.fn();
const mockClose = jest.fn().mockResolvedValue(undefined);
const mockCommit = jest.fn().mockResolvedValue(undefined);
const mockRollback = jest.fn().mockResolvedValue(undefined);

const mockConn = {
  execute: mockExecute,
  close: mockClose,
  commit: mockCommit,
  rollback: mockRollback,
};

jest.unstable_mockModule("../config/db.js", () => ({
  getConnection: jest.fn().mockResolvedValue(mockConn),
  createPool: jest.fn().mockResolvedValue(undefined),
  closePool: jest.fn().mockResolvedValue(undefined),
}));

const { default: app } = await import("../app.js");
const { default: request } = await import("supertest");

beforeEach(() => {
  jest.clearAllMocks();
  mockExecute.mockReset();
  mockClose.mockResolvedValue(undefined);
  mockCommit.mockResolvedValue(undefined);
  mockRollback.mockResolvedValue(undefined);
});

describe("Criterios de aceptación - inventario", () => {
  test("Scenario 1: descuenta stock al registrar servicio con consumo", async () => {
    mockExecute
      .mockResolvedValueOnce({
        rows: [{ ESTATUS: "Activo", NOMBRES: "Juan", APELLIDO_PATERNO: "Perez" }],
      })
      .mockResolvedValueOnce({
        rows: [{ ID_CREDENCIAL: 1, CURP: "CURP123456HDFABC01" }],
      })
      .mockResolvedValueOnce({ rows: [{ NEXT_ID: 10 }] })
      .mockResolvedValueOnce({ rowsAffected: 1 })
      .mockResolvedValueOnce({ rows: [{ ID_ARTICULO: 1, INVENTARIO_ACTUAL: 50 }] })
      .mockResolvedValueOnce({ rowsAffected: 1 })
      .mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app).post("/api/v1/servicios").send({
      curp: "CURP123456HDFABC01",
      idTipoServicio: 1,
      costo: 100,
      montoPagado: 0,
      consumos: [{ idProducto: 1, cantidad: 3 }],
    });

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/creado/i);
    expect(mockCommit).toHaveBeenCalled();
  });

  test("Scenario 2: stock insuficiente responde 422 con payload esperado", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [{ ID_ARTICULO: 7, INVENTARIO_ACTUAL: 2 }] });

    const res = await request(app)
      .post("/api/v1/movimientos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({
        tipo: "SALIDA",
        idProducto: 7,
        cantidad: 5,
      });

    expect(res.status).toBe(422);
    expect(res.body).toEqual({
      error: "Stock insuficiente",
      code: "INSUFFICIENT_STOCK",
      disponible: 2,
    });
  });

  test("Scenario 3: POST /api/v1/movimientos ENTRADA incrementa stock y responde 201", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ ID_ARTICULO: 101, INVENTARIO_ACTUAL: 10 }] })
      .mockResolvedValueOnce({ rowsAffected: 1 })
      .mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .post("/api/v1/movimientos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({
        tipo: "ENTRADA",
        idProducto: 101,
        cantidad: 5,
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/registrado/i);
    expect(res.body.data).toMatchObject({
      idProducto: 101,
      tipo: "ENTRADA",
      cantidad: 5,
      stockResultante: 15,
    });
  });

  test("Scenario 4: GET /api/v1/inventario retorna contrato esperado", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [
        { ID_ARTICULO: 1, DESCRIPCION: "Aspirina", INVENTARIO_ACTUAL: 8, UNIDAD: "PZA" },
        { ID_ARTICULO: 2, DESCRIPCION: "Vendas", INVENTARIO_ACTUAL: 12, UNIDAD: "CAJA" },
      ],
    });

    const res = await request(app)
      .get("/api/v1/inventario")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toEqual(
      expect.objectContaining({
        idProducto: expect.any(Number),
        nombre: expect.any(String),
        stockActual: expect.any(Number),
        unidad: expect.any(String),
      })
    );
  });
});
