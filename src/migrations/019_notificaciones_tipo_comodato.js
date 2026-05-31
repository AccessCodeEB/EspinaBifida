import { getConnection } from "../config/db.js";

/**
 * Agrega 'COMODATO_POR_VENCER' al constraint CHK_NOTIF_TIPO de NOTIFICACIONES.
 * Los CHECK constraints en Oracle no se pueden modificar — hay que drop + recrear.
 * Detecta si ya incluye el valor consultando el diccionario USER_CONSTRAINTS.
 */
export async function runMigration019() {
  let conn;
  try {
    conn = await getConnection();

    // Leer la definición actual del constraint desde el diccionario
    const { rows } = await conn.execute(
      `SELECT SEARCH_CONDITION FROM USER_CONSTRAINTS
       WHERE CONSTRAINT_NAME = 'CHK_NOTIF_TIPO'
         AND TABLE_NAME = 'NOTIFICACIONES'`
    );

    if (rows.length === 0) {
      console.log("[migration-019] CHK_NOTIF_TIPO no encontrado — sin cambios.");
      return;
    }

    const condition = String(rows[0].SEARCH_CONDITION ?? rows[0][0] ?? "");
    if (condition.includes("COMODATO_POR_VENCER")) {
      console.log("[migration-019] COMODATO_POR_VENCER ya está en CHK_NOTIF_TIPO.");
      return;
    }

    // Drop + recrear con el nuevo tipo incluido
    await conn.execute(`ALTER TABLE NOTIFICACIONES DROP CONSTRAINT CHK_NOTIF_TIPO`);
    await conn.execute(
      `ALTER TABLE NOTIFICACIONES ADD CONSTRAINT CHK_NOTIF_TIPO CHECK (
         TIPO IN (
           'STOCK_BAJO',
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
    console.log("[migration-019] ✅ CHK_NOTIF_TIPO actualizado con COMODATO_POR_VENCER.");
  } catch (err) {
    console.error("[migration-019] ❌ Error:", err?.message ?? err);
  } finally {
    if (conn) await conn.close().catch(() => {});
  }
}
