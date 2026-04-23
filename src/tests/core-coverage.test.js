import fs from "fs";
import path from "path";
import { jest } from "@jest/globals";
import {
  HttpError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  internal,
  isHttpError,
  mapOracleError,
} from "../utils/httpErrors.js";
import { AppError, notFoundHandler, errorHandler } from "../middleware/errorHandler.js";
import { adminSelfOrSuper } from "../middleware/adminSelfOrSuper.js";
import { publicPathForStoredFile, unlinkOldProfileIfSafe } from "../utils/profileFiles.js";
import { REPO_ROOT } from "../repoRoot.js";

function makeRes() {
  const res = {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe("httpErrors utils", () => {
  test("helpers crean HttpError con status correctos", () => {
    expect(badRequest("x").statusCode).toBe(400);
    expect(unauthorized("x").statusCode).toBe(401);
    expect(forbidden("x").statusCode).toBe(403);
    expect(notFound("x").statusCode).toBe(404);
    expect(conflict("x").statusCode).toBe(409);
    expect(internal().statusCode).toBe(500);
  });

  test("isHttpError distingue errores tipados", () => {
    expect(isHttpError(new HttpError(400, "bad", "BAD"))).toBe(true);
    expect(isHttpError(new Error("plain"))).toBe(false);
  });

  test("mapOracleError mapea errorNum y ORA-xxxxx", () => {
    expect(mapOracleError({ errorNum: 1 })?.code).toBe("DUPLICATE_RECORD");
    expect(mapOracleError({ errorNum: 2291 })?.code).toBe("REFERENTIAL_INTEGRITY");
    expect(mapOracleError({ errorNum: 2292 })?.code).toBe("REFERENTIAL_INTEGRITY");
    expect(mapOracleError({ errorNum: 1400 })?.code).toBe("MISSING_REQUIRED_FIELDS");
    expect(mapOracleError({ errorNum: 1722 })?.code).toBe("INVALID_NUMBER_FORMAT");
    expect(mapOracleError({ errorNum: 1830 })?.code).toBe("INVALID_DATE_FORMAT");
    expect(mapOracleError({ errorNum: 1840 })?.code).toBe("INVALID_DATE_FORMAT");
    expect(mapOracleError({ errorNum: 1841 })?.code).toBe("INVALID_DATE_FORMAT");
    expect(mapOracleError({ message: "ORA-00001: unique constraint" })?.code).toBe("DUPLICATE_RECORD");
    expect(mapOracleError({ message: "ORA-99999: unknown" })).toBeNull();
    expect(mapOracleError({ message: "texto sin ora" })).toBeNull();
  });
});

describe("errorHandler middleware", () => {
  const req = { method: "GET", originalUrl: "/x" };

  test("notFoundHandler crea HttpError ROUTE_NOT_FOUND", () => {
    const next = jest.fn();
    notFoundHandler(req, {}, next);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(HttpError);
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("ROUTE_NOT_FOUND");
  });

  test("maneja HttpError y preserva details", () => {
    const res = makeRes();
    errorHandler(new HttpError(400, "dato inválido", "BAD", { campo: "curp" }), req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ code: "BAD", message: "dato inválido", error: "dato inválido" });
    expect(res.body.details).toEqual({ campo: "curp" });
  });

  test("maneja AppError con mapeo por status", () => {
    const res = makeRes();
    errorHandler(new AppError("no auth", 401), req, res);
    expect(res.statusCode).toBe(401);
    expect(res.body.code).toBe("UNAUTHORIZED");
  });

  test("maneja LIMIT_FILE_SIZE", () => {
    const res = makeRes();
    errorHandler({ code: "LIMIT_FILE_SIZE" }, req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe("FILE_TOO_LARGE");
  });

  test("maneja ORA mapeado", () => {
    const res = makeRes();
    errorHandler({ errorNum: 1 }, req, res);
    expect(res.statusCode).toBe(409);
    expect(res.body.code).toBe("DUPLICATE_RECORD");
  });

  test("maneja NJS-044", () => {
    const res = makeRes();
    errorHandler({ code: "NJS-044" }, req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe("BIND_ERROR");
  });

  test("maneja INSUFFICIENT_STOCK con contrato especial 422", () => {
    const res = makeRes();
    errorHandler(new HttpError(409, "x", "INSUFFICIENT_STOCK", { disponible: "3" }), req, res);
    expect(res.statusCode).toBe(422);
    expect(res.body).toEqual({
      error: "Stock insuficiente",
      code: "INSUFFICIENT_STOCK",
      disponible: 3,
    });
  });

  test("errores 500 hacen fallback y log", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const res = makeRes();
    errorHandler(new Error("boom"), req, res);
    expect(res.statusCode).toBe(500);
    expect(res.body.code).toBe("INTERNAL_ERROR");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("adminSelfOrSuper", () => {
  test("retorna 400 si idAdmin no es numérico", () => {
    const req = { params: { idAdmin: "abc" }, user: { idAdmin: 1, idRol: 1 } };
    const res = makeRes();
    const next = jest.fn();
    adminSelfOrSuper(req, res, next);
    expect(res.statusCode).toBe(400);
    expect(next).not.toHaveBeenCalled();
  });

  test("permite cuando es el mismo admin", () => {
    const req = { params: { idAdmin: "7" }, user: { idAdmin: 7, idRol: 2 } };
    const res = makeRes();
    const next = jest.fn();
    adminSelfOrSuper(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.body).toBeUndefined();
  });

  test("permite cuando es super admin", () => {
    const req = { params: { idAdmin: "7" }, user: { idAdmin: 99, idRol: 1 } };
    const res = makeRes();
    const next = jest.fn();
    adminSelfOrSuper(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test("retorna 403 cuando no está autorizado", () => {
    const req = { params: { idAdmin: "7" }, user: { idAdmin: 9, idRol: 2 } };
    const res = makeRes();
    const next = jest.fn();
    adminSelfOrSuper(req, res, next);
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe("profileFiles utils", () => {
  test("publicPathForStoredFile construye ruta pública", () => {
    expect(publicPathForStoredFile("foto.png")).toBe("/uploads/profiles/foto.png");
  });

  test("unlinkOldProfileIfSafe ignora entradas inválidas", () => {
    expect(() => unlinkOldProfileIfSafe(null)).not.toThrow();
    expect(() => unlinkOldProfileIfSafe("/otra/ruta/x.png")).not.toThrow();
  });

  test("elimina archivo existente en uploads/profiles", () => {
    const profilesDir = path.join(REPO_ROOT, "uploads", "profiles");
    fs.mkdirSync(profilesDir, { recursive: true });
    const fileName = `test-${Date.now()}.tmp`;
    const full = path.join(profilesDir, fileName);
    fs.writeFileSync(full, "ok");

    unlinkOldProfileIfSafe(`/uploads/profiles/${fileName}`);

    expect(fs.existsSync(full)).toBe(false);
  });

  test("no falla si unlinkSync lanza excepción", () => {
    const existsSpy = jest.spyOn(fs, "existsSync").mockReturnValue(true);
    const unlinkSpy = jest.spyOn(fs, "unlinkSync").mockImplementation(() => {
      throw new Error("deny");
    });

    expect(() => unlinkOldProfileIfSafe("/uploads/profiles/abc.png")).not.toThrow();

    unlinkSpy.mockRestore();
    existsSpy.mockRestore();
  });
});