import { getConnection } from "../config/db.js";

/**
 * Agrega 'SIN_STOCK' al constraint CHK_NOTIF_TIPO de NOTIFICACIONES.
 * Los CHECK constraints en Oracle no se pueden modificar — hay que drop + recrear.
 */
export async function runMigration023() {
  let conn;
  try {
    conn = await getConnection();

    const { rows } = await conn.execute(
      `SELECT SEARCH_CONDITION FROM USER_CONSTRAINTS
       WHERE CONSTRAINT_NAME = 'CHK_NOTIF_TIPO'
         AND TABLE_NAME = 'NOTIFICACIONES'`
    );

    if (rows.length === 0) {
      console.log("[migration-023] CHK_NOTIF_TIPO no encontrado — sin cambios.");
      return;
    }

    const condition = String(rows[0].SEARCH_CONDITION ?? rows[0][0] ?? "");
    if (condition.includes("SIN_STOCK")) {
      console.log("[migration-023] SIN_STOCK ya está en CHK_NOTIF_TIPO.");
      return;
    }

    await conn.execute(`ALTER TABLE NOTIFICACIONES DROP CONSTRAINT CHK_NOTIF_TIPO`);
    await conn.execute(
      `ALTER TABLE NOTIFICACIONES ADD CONSTRAINT CHK_NOTIF_TIPO CHECK (
         TIPO IN (
           'STOCK_BAJO',
           'SIN_STOCK',
           'MEMBRESIA_PROXIMA',
           'MEMBRESIA_VENCIDA',
           'PREREGISTRO_NUEVO',
           'BENEFICIARIO_BAJA',
           'CITA_HOY',
           'REPORTE_GENERADO',
           'COMODATO_POR_VENCER'
         )
       )`
    );
    console.log("[migration-023] ✅ CHK_NOTIF_TIPO actualizado con SIN_STOCK.");
    await conn.commit();
  } catch (err) {
    console.error("[migration-023] ❌ Error:", err?.message ?? err);
  } finally {
    if (conn) await conn.close().catch(() => {});
  }
}
