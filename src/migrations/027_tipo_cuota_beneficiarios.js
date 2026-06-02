import { getConnection } from "../config/db.js";

/**
 * Migración 027 — TIPO_CUOTA en BENEFICIARIOS
 *
 * Agrega TIPO_CUOTA VARCHAR2(1) CHECK('A','B') a BENEFICIARIOS.
 * NULL = sin asignar (bloquea registro de servicios hasta que admin la asigne).
 *
 * Idempotente: verifica USER_TAB_COLUMNS antes de ALTER TABLE.
 */
export async function runMigration027() {
  let conn;
  try {
    conn = await getConnection();

    const { rows } = await conn.execute(
      `SELECT COUNT(*) AS CNT FROM USER_TAB_COLUMNS
       WHERE TABLE_NAME = 'BENEFICIARIOS' AND COLUMN_NAME = 'TIPO_CUOTA'`
    );
    const cnt = rows[0]?.CNT ?? rows[0]?.[0] ?? 0;

    if (Number(cnt) === 0) {
      await conn.execute(
        `ALTER TABLE BENEFICIARIOS
           ADD (TIPO_CUOTA VARCHAR2(1)
                CONSTRAINT CHK_BENEFICIARIOS_TIPO_CUOTA
                CHECK (TIPO_CUOTA IN ('A', 'B')))`
      );
      console.log("[migration-027] ✅ Columna TIPO_CUOTA agregada a BENEFICIARIOS.");
    } else {
      console.log("[migration-027] TIPO_CUOTA ya existe en BENEFICIARIOS.");
    }

    console.log("[migration-027] ✅ Migración completa.");
  } catch (err) {
    console.error("[migration-027] ❌ Error:", err?.message ?? err);
    throw err;
  } finally {
    if (conn) await conn.close().catch(() => {});
  }
}
