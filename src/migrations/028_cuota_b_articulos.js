import { getConnection } from "../config/db.js";

/**
 * Migración 028 — CUOTA_B en ARTICULOS
 *
 * Agrega CUOTA_B NUMBER(10,2) a ARTICULOS para artículos con doble precio.
 * CUOTA_RECUPERACION = precio cuota A; CUOTA_B = precio cuota B.
 * Si CUOTA_B es NULL, el sistema usa CUOTA_RECUPERACION como fallback.
 *
 * Idempotente: verifica USER_TAB_COLUMNS antes de ALTER TABLE.
 */
export async function runMigration028() {
  let conn;
  try {
    conn = await getConnection();

    const { rows } = await conn.execute(
      `SELECT COUNT(*) AS CNT FROM USER_TAB_COLUMNS
       WHERE TABLE_NAME = 'ARTICULOS' AND COLUMN_NAME = 'CUOTA_B'`
    );
    const cnt = rows[0]?.CNT ?? rows[0]?.[0] ?? 0;

    if (Number(cnt) === 0) {
      await conn.execute(`ALTER TABLE ARTICULOS ADD (CUOTA_B NUMBER(10,2))`);
      console.log("[migration-028] ✅ Columna CUOTA_B agregada a ARTICULOS.");
    } else {
      console.log("[migration-028] CUOTA_B ya existe en ARTICULOS.");
    }

    console.log("[migration-028] ✅ Migración completa.");
  } catch (err) {
    console.error("[migration-028] ❌ Error:", err?.message ?? err);
    throw err;
  } finally {
    if (conn) await conn.close().catch(() => {});
  }
}
