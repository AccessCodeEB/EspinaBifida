import { getConnection } from "../config/db.js";

/**
 * Migración 033 — Columna FECHA_DEVOLUCION_REAL en COMODATOS
 *
 * Agrega FECHA_DEVOLUCION_REAL (DATE, nullable) para registrar cuándo se
 * devolvió físicamente el equipo, independiente del estado financiero.
 * Idempotente: verifica existencia de la columna antes de crearla.
 */
export async function runMigration033() {
  let conn;
  try {
    conn = await getConnection();

    const { rows } = await conn.execute(
      `SELECT COUNT(*) AS CNT
         FROM USER_TAB_COLUMNS
        WHERE TABLE_NAME  = 'COMODATOS'
          AND COLUMN_NAME = 'FECHA_DEVOLUCION_REAL'`
    );
    const existe = Number(rows[0]?.CNT ?? rows[0]?.[0] ?? 0) > 0;

    if (!existe) {
      await conn.execute(
        `ALTER TABLE COMODATOS ADD FECHA_DEVOLUCION_REAL DATE`
      );
      await conn.execute(
        `COMMENT ON COLUMN COMODATOS.FECHA_DEVOLUCION_REAL IS
         'Fecha real en que el beneficiario devolvió el equipo. NULL = aún no devuelto.'`
      );
      console.log("[migration-033] ✅ Columna FECHA_DEVOLUCION_REAL agregada a COMODATOS.");
    } else {
      console.log("[migration-033] FECHA_DEVOLUCION_REAL ya existe, se omite ALTER TABLE.");
    }

    console.log("[migration-033] ✅ Migración completa.");
  } catch (err) {
    console.error("[migration-033] ❌ Error:", err?.message ?? err);
    throw err;
  } finally {
    if (conn) await conn.close().catch(() => {});
  }
}
