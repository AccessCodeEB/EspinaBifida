import { getConnection } from "../config/db.js";

/**
 * Migración 020:
 * Las "consultas" (dental, neurología, urología, etc.) estaban incorrectamente
 * en ARTICULOS (inventario). Ya existen en SERVICIOS_CATALOGO como "Consulta médica"
 * (ID 1, TIPO_SERVICIO='SERVICIO'). Se marcan como inactivas (ACTIVO='N').
 */
export async function runMigration022() {
  let conn;
  try {
    conn = await getConnection();

    const { rowsAffected } = await conn.execute(
      `UPDATE ARTICULOS
         SET ACTIVO = 'N'
       WHERE UPPER(DESCRIPCION) LIKE '%CONSULTA%'
         AND NVL(ACTIVO, 'S') != 'N'`,
      {},
      { autoCommit: true }
    );

    console.log(`[migration-022] ✅ ${rowsAffected} artículos tipo "consulta" marcados como inactivos.`);
  } catch (err) {
    console.error("[migration-022] ❌ Error:", err.message);
    throw err;
  } finally {
    if (conn) await conn.close();
  }
}
