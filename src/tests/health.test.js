import request from "supertest";
import app from "../app.js";

describe("GET /health", () => {
  it("should return status ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("CORS origin callback (app.js) — rama con Origin header", () => {
  test("responde con headers CORS cuando la request incluye header Origin", async () => {
    const res = await request(app)
      .get("/health")
      .set("Origin", "http://localhost:3000");

    expect(res.status).toBe(200);
    // Access-Control-Allow-Origin confirms CORS middleware ran with a non-null origin
    expect(res.headers["access-control-allow-origin"]).toBeDefined();
  });
});