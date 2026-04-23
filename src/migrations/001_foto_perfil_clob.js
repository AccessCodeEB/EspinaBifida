import { getConnection } from "../config/db.js";

/**
 * Cambia FOTO_PERFIL_URL de VARCHAR2(500) a CLOB para soportar
 * fotos de perfil almacenadas como base64 compartidas en Oracle.
 * Es idempotente: si ya es CLOB, no hace nada.
 */
export async function runMigration001() {
  let connection;
  try {
    connection = await getConnection();

    // Verificar el tipo actual de la columna
    const result = await connection.execute(
      `SELECT DATA_TYPE FROM ALL_TAB_COLUMNS
       WHERE OWNER = USER AND TABLE_NAME = 'BENEFICIARIOS'
       AND COLUMN_NAME = 'FOTO_PERFIL_URL'`
    );

    const rows = result.rows;
    if (!rows || rows.length === 0) {
      console.log("[migration-001] Columna FOTO_PERFIL_URL no encontrada, omitiendo.");
      return;
    }

    const dataType = rows[0].DATA_TYPE ?? rows[0][0];
    if (dataType === "CLOB") {
      console.log("[migration-001] FOTO_PERFIL_URL ya es CLOB, sin cambios.");
      return;
    }

    console.log(`[migration-001] Cambiando FOTO_PERFIL_URL de ${dataType} a CLOB...`);
    await connection.execute(
      `ALTER TABLE BENEFICIARIOS MODIFY FOTO_PERFIL_URL CLOB`
    );
    console.log("[migration-001] ✅ FOTO_PERFIL_URL ahora es CLOB.");
  } catch (err) {
    console.error("[migration-001] Error al migrar columna:", err?.message ?? err);
  } finally {
    if (connection) await connection.close().catch(() => {});
  }
}
