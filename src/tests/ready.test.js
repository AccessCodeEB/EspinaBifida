import { jest } from "@jest/globals";

const mockGetConnection = jest.fn();
const mockConnClose = jest.fn();

jest.unstable_mockModule("../config/db.js", () => ({
  getConnection: mockGetConnection,
  closePool: jest.fn(),
  createPool: jest.fn(),
  withConnection: jest.fn(),
}));

const { default: app } = await import("../app.js");
const { default: request } = await import("supertest");

beforeEach(() => jest.clearAllMocks());

describe("GET /ready", () => {
  it("retorna 200 cuando Oracle está disponible", async () => {
    mockGetConnection.mockResolvedValueOnce({ close: mockConnClose });
    mockConnClose.mockResolvedValueOnce(undefined);
    const res = await request(app).get("/ready");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ready" });
    expect(mockConnClose).toHaveBeenCalledTimes(1);
  });

  it("retorna 503 cuando el pool no está inicializado", async () => {
    mockGetConnection.mockRejectedValueOnce(new Error("DB pool no inicializado"));
    const res = await request(app).get("/ready");
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: "starting" });
  });
});
