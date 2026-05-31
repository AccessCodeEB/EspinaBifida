import { getConnection } from "../config/db.js";

/**
 * Crea la secuencia SEQ_SERVICIO_ARTICULOS y el trigger TRG_SERVICIO_ARTICULOS_BI
 * para que INSERT INTO SERVICIO_ARTICULOS pueda asignar ID automáticamente.
 *
 * createWithInventarioTransaction ahora usa SEQ_SERVICIO_ARTICULOS.NEXTVAL de forma
 * explícita en el INSERT, así que la secuencia es obligatoria. El trigger es un
 * respaldo para cualquier otra ruta que inserte sin especificar ID.
 */
export async function runMigration017() {
  let conn;
  try {
    conn = await getConnection();

    // ── 1. Secuencia ──────────────────────────────────────────────────────────
    const { rows: seqRows } = await conn.execute(
      `SELECT COUNT(*) AS CNT FROM USER_SEQUENCES
       WHERE SEQUENCE_NAME = 'SEQ_SERVICIO_ARTICULOS'`
    );
    if (Number(seqRows[0]?.CNT ?? seqRows[0]?.[0] ?? 0) === 0) {
      await conn.execute(
        `CREATE SEQUENCE SEQ_SERVICIO_ARTICULOS
         START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE`
      );
      console.log("[migration-016] ✅ SEQ_SERVICIO_ARTICULOS creada.");
    } else {
      console.log("[migration-016] SEQ_SERVICIO_ARTICULOS ya existe.");
    }

    // ── 2. Trigger (respaldo para INSERTs sin ID explícito) ───────────────────
    const { rows: trgRows } = await conn.execute(
      `SELECT COUNT(*) AS CNT FROM USER_TRIGGERS
       WHERE TRIGGER_NAME = 'TRG_SERVICIO_ARTICULOS_BI'`
    );
    if (Number(trgRows[0]?.CNT ?? trgRows[0]?.[0] ?? 0) === 0) {
      await conn.execute(
        `CREATE OR REPLACE TRIGGER TRG_SERVICIO_ARTICULOS_BI
         BEFORE INSERT ON SERVICIO_ARTICULOS
         FOR EACH ROW
         BEGIN
           IF :NEW.ID IS NULL THEN
             SELECT SEQ_SERVICIO_ARTICULOS.NEXTVAL INTO :NEW.ID FROM DUAL;
           END IF;
         END;`
      );
      console.log("[migration-016] ✅ TRG_SERVICIO_ARTICULOS_BI creado.");
    } else {
      console.log("[migration-016] TRG_SERVICIO_ARTICULOS_BI ya existe.");
    }

    console.log("[migration-016] ✅ Migration completa.");
  } catch (err) {
    console.error("[migration-016] ❌ Error:", err?.message ?? err);
    throw err;
  } finally {
    if (conn) await conn.close().catch(() => {});
  }
}
