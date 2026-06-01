import { getConnection } from "../config/db.js";

/**
 * Migración 025 — Fecha de devolución en COMODATOS
 *
 * Agrega FECHA_DEVOLUCION_ESPERADA DATE a la tabla COMODATOS.
 * Necesario para migrar el tracking de devoluciones desde SERVICIOS
 * al módulo de comodatos y mantener las notificaciones de préstamos por vencer.
 *
 * Idempotente: verifica USER_TAB_COLUMNS antes de ALTER TABLE.
 */
export async function runMigration025() {
  let conn;
  try {
    conn = await getConnection();

    // ── 1. Columna FECHA_DEVOLUCION_ESPERADA ─────────────────────────────────
    const { rows: r1 } = await conn.execute(
      `SELECT COUNT(*) AS CNT FROM USER_TAB_COLUMNS
       WHERE TABLE_NAME = 'COMODATOS' AND COLUMN_NAME = 'FECHA_DEVOLUCION_ESPERADA'`
    );
    if ((r1[0]?.CNT ?? r1[0]?.[0] ?? 0) === 0) {
      await conn.execute(`ALTER TABLE COMODATOS ADD FECHA_DEVOLUCION_ESPERADA DATE`);
      console.log("[migration-025] ✅ Columna FECHA_DEVOLUCION_ESPERADA agregada a COMODATOS.");
    } else {
      console.log("[migration-025] FECHA_DEVOLUCION_ESPERADA ya existe en COMODATOS.");
    }

    // ── 2. Índice para queries de notificaciones ─────────────────────────────
    const { rows: r2 } = await conn.execute(
      `SELECT COUNT(*) AS CNT FROM USER_INDEXES
       WHERE INDEX_NAME = 'IDX_COMODATOS_FECHA_DEV'`
    );
    if ((r2[0]?.CNT ?? r2[0]?.[0] ?? 0) === 0) {
      await conn.execute(
        `CREATE INDEX IDX_COMODATOS_FECHA_DEV ON COMODATOS(FECHA_DEVOLUCION_ESPERADA)`
      );
      console.log("[migration-025] ✅ Índice IDX_COMODATOS_FECHA_DEV creado.");
    } else {
      console.log("[migration-025] IDX_COMODATOS_FECHA_DEV ya existe.");
    }

    console.log("[migration-025] ✅ Migración completa.");
  } catch (err) {
    console.error("[migration-025] ❌ Error en migración:", err?.message ?? err);
  } finally {
    if (conn) await conn.close().catch(() => {});
  }
}
