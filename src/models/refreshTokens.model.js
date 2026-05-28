import crypto from "node:crypto";
import { withConnection } from "../config/db.js";

export function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export const insert = (idAdmin, tokenHash, expiresAt) =>
  withConnection(async (conn) => {
    await conn.execute(
      `INSERT INTO REFRESH_TOKENS (ID_ADMIN, TOKEN_HASH, EXPIRES_AT)
       VALUES (:idAdmin, :tokenHash, :expiresAt)`,
      { idAdmin, tokenHash, expiresAt }
    );
    await conn.commit();
  });

export const findByHash = (tokenHash) =>
  withConnection(async (conn) => {
    const { rows } = await conn.execute(
      `SELECT ID_TOKEN, ID_ADMIN, EXPIRES_AT, REVOCADO
       FROM REFRESH_TOKENS
       WHERE TOKEN_HASH = :tokenHash`,
      { tokenHash }
    );
    return rows[0] ?? null;
  });

export const revoke = (tokenHash) =>
  withConnection(async (conn) => {
    await conn.execute(
      `UPDATE REFRESH_TOKENS SET REVOCADO = 1
       WHERE TOKEN_HASH = :tokenHash`,
      { tokenHash }
    );
    await conn.commit();
  });

export const revokeAllForAdmin = (idAdmin) =>
  withConnection(async (conn) => {
    await conn.execute(
      `UPDATE REFRESH_TOKENS SET REVOCADO = 1
       WHERE ID_ADMIN = :idAdmin AND REVOCADO = 0`,
      { idAdmin }
    );
    await conn.commit();
  });

export const cleanExpired = () =>
  withConnection(async (conn) => {
    await conn.execute(
      `DELETE FROM REFRESH_TOKENS WHERE EXPIRES_AT < SYSDATE`
    );
    await conn.commit();
  });
