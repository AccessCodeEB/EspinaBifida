import fs from "node:fs";
import path from "node:path";
import { jest } from "@jest/globals";
import request from "supertest";
import app from "../app.js";
import { REPO_ROOT } from "../repoRoot.js";

const profilesDir = path.join(REPO_ROOT, "uploads", "profiles");

describe("GET /uploads/profiles/:filename", () => {
  beforeEach(() => {
    delete process.env.PROFILE_PHOTOS_REMOTE_BASE;
  });

  test("nombre inseguro delega y acaba en ROUTE_NOT_FOUND", async () => {
    const res = await request(app).get("/uploads/profiles/../../../passwd");
    expect(res.status).toBe(404);
    expect(res.body?.code).toBe("ROUTE_NOT_FOUND");
  });

  test("nombre con caracteres no permitidos delega", async () => {
    const res = await request(app).get("/uploads/profiles/foo%20bar.jpg");
    expect(res.status).toBe(404);
    expect(res.body?.code).toBe("ROUTE_NOT_FOUND");
  });

  test("archivo ausente y sin remoto → 404 JSON", async () => {
    const res = await request(app).get(
      "/uploads/profiles/zz-absent-" + Date.now() + ".jpg"
    );
    expect(res.status).toBe(404);
    expect(res.body?.code).toBe("ROUTE_NOT_FOUND");
  });

  test("sirve archivo existente (GET y HEAD)", async () => {
    fs.mkdirSync(profilesDir, { recursive: true });
    const name = `ci-profile-${Date.now()}.jpg`;
    const full = path.join(profilesDir, name);
    fs.writeFileSync(full, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 1]));

    const get = await request(app).get(`/uploads/profiles/${name}`);
    expect(get.status).toBe(200);
    expect(get.headers["content-type"]).toMatch(/jpeg|octet-stream/i);

    const head = await request(app).head(`/uploads/profiles/${name}`);
    expect(head.status).toBe(200);

    fs.unlinkSync(full);
  });

  test("remoto 404 → respuesta 404 vacía", async () => {
    process.env.PROFILE_PHOTOS_REMOTE_BASE = "http://127.0.0.1:9";
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 404,
      headers: { get: () => null },
    });

    const res = await request(app).get(
      "/uploads/profiles/zz-remote-miss-" + Date.now() + ".jpg"
    );
    expect(res.status).toBe(404);

    fetchSpy.mockRestore();
  });

  test("remoto 500 avisa en consola y responde 404", async () => {
    process.env.PROFILE_PHOTOS_REMOTE_BASE = "http://example.invalid";
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      headers: { get: () => null },
    });

    const res = await request(app).get(
      "/uploads/profiles/zz-remote-http500-" + Date.now() + ".jpg"
    );
    expect(res.status).toBe(404);
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
    fetchSpy.mockRestore();
  });

  test("remoto OK guarda y sirve imagen", async () => {
    process.env.PROFILE_PHOTOS_REMOTE_BASE = "http://example.invalid";
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64"
    );
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength),
      headers: { get: (h) => (h === "content-type" ? "image/png" : null) },
    });

    const name = `zz-remote-ok-${Date.now()}.png`;
    const full = path.join(profilesDir, name);
    try {
      if (fs.existsSync(full)) fs.unlinkSync(full);
    } catch {
      /* */
    }

    const res = await request(app).get(`/uploads/profiles/${name}`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("image/png");
    expect(fs.existsSync(full)).toBe(true);

    fetchSpy.mockRestore();
    fs.unlinkSync(full);
  });

  test("error de red al remoto → 502", async () => {
    process.env.PROFILE_PHOTOS_REMOTE_BASE = "http://example.invalid";
    const fetchSpy = jest.spyOn(global, "fetch").mockRejectedValue(new Error("network down"));
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    const res = await request(app).get(
      "/uploads/profiles/zz-remote-err-" + Date.now() + ".jpg"
    );
    expect(res.status).toBe(502);

    warnSpy.mockRestore();
    fetchSpy.mockRestore();
  });
});
