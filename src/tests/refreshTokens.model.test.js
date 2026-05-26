import { jest } from "@jest/globals";
import {
  mockExecute, mockClose, mockCommit,
  dbModuleMock, resetMocks,
} from "./helpers/mockDb.js";

jest.unstable_mockModule("../config/db.js", () => dbModuleMock);

const Model = await import("../models/refreshTokens.model.js");

const EXPIRES_AT = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

beforeEach(() => resetMocks());

// ── hashToken ──────────────────────────────────────────────────────────────────

describe("hashToken", () => {
  it("devuelve un string hex de 64 caracteres", () => {
    const hash = Model.hashToken("raw-token-value");
    expect(typeof hash).toBe("string");
    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
  });

  it("produce el mismo hash para la misma entrada", () => {
    expect(Model.hashToken("abc")).toBe(Model.hashToken("abc"));
  });

  it("produce hashes distintos para entradas distintas", () => {
    expect(Model.hashToken("abc")).not.toBe(Model.hashToken("xyz"));
  });
});

// ── insert ─────────────────────────────────────────────────────────────────────

describe("insert", () => {
  it("ejecuta el INSERT y hace commit", async () => {
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    await Model.insert(1, "abc123hash", EXPIRES_AT);

    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO REFRESH_TOKENS"),
      expect.objectContaining({ idAdmin: 1, tokenHash: "abc123hash" })
    );
    expect(mockCommit).toHaveBeenCalledTimes(1);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

// ── findByHash ─────────────────────────────────────────────────────────────────

describe("findByHash", () => {
  it("retorna la fila cuando existe el hash", async () => {
    const row = { ID_TOKEN: 1, ID_ADMIN: 2, EXPIRES_AT: EXPIRES_AT, REVOCADO: 0 };
    mockExecute.mockResolvedValueOnce({ rows: [row] });

    const result = await Model.findByHash("somehash");

    expect(result).toEqual(row);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining("FROM REFRESH_TOKENS"),
      expect.objectContaining({ tokenHash: "somehash" })
    );
  });

  it("retorna null cuando no existe el hash", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const result = await Model.findByHash("nonexistent");

    expect(result).toBeNull();
  });
});

// ── revoke ─────────────────────────────────────────────────────────────────────

describe("revoke", () => {
  it("ejecuta UPDATE SET REVOCADO=1 y hace commit", async () => {
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    await Model.revoke("hashToRevoke");

    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining("REVOCADO = 1"),
      expect.objectContaining({ tokenHash: "hashToRevoke" })
    );
    expect(mockCommit).toHaveBeenCalledTimes(1);
  });
});

// ── revokeAllForAdmin ──────────────────────────────────────────────────────────

describe("revokeAllForAdmin", () => {
  it("revoca todos los tokens activos del admin", async () => {
    mockExecute.mockResolvedValueOnce({ rowsAffected: 3 });

    await Model.revokeAllForAdmin(5);

    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining("REVOCADO = 1"),
      expect.objectContaining({ idAdmin: 5 })
    );
    expect(mockCommit).toHaveBeenCalledTimes(1);
  });
});

// ── cleanExpired ───────────────────────────────────────────────────────────────

describe("cleanExpired", () => {
  it("ejecuta DELETE de tokens expirados y hace commit", async () => {
    mockExecute.mockResolvedValueOnce({ rowsAffected: 2 });

    await Model.cleanExpired();

    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM REFRESH_TOKENS")
    );
    expect(mockCommit).toHaveBeenCalledTimes(1);
  });
});
