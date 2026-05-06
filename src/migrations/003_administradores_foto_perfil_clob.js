import { getConnection } from "../config/db.js";

/**
 * Convierte ADMINISTRADORES.FOTO_PERFIL_URL de VARCHAR2 a CLOB (misma estrategia que BENEFICIARIOS).
 * Las fotos como data URL en base64 no caben en VARCHAR2 cortos → ORA-01461 / error al guardar.
 *
 * Idempotente: detecta el estado actual y solo ejecuta lo que falta.
 */
export async function runMigration003() {
  let connection;
  try {
    connection = await getConnection();

    const result = await connection.execute(
      `SELECT COLUMN_NAME, DATA_TYPE FROM ALL_TAB_COLUMNS
       WHERE OWNER = USER
         AND TABLE_NAME = 'ADMINISTRADORES'
         AND COLUMN_NAME IN ('FOTO_PERFIL_URL', 'FOTO_PERFIL_CLOB')
       ORDER BY COLUMN_NAME`
    );

    const cols = {};
    for (const row of result.rows ?? []) {
      const name = row.COLUMN_NAME ?? row[0];
      const type = row.DATA_TYPE ?? row[1];
      cols[name] = type;
    }

    if (cols["FOTO_PERFIL_URL"] === "CLOB") {
      console.log("[migration-003] ADMINISTRADORES.FOTO_PERFIL_URL ya es CLOB. Sin cambios.");
      return;
    }

    console.log("[migration-003] Convirtiendo ADMINISTRADORES.FOTO_PERFIL_URL a CLOB (4 pasos)...");

    if (!cols["FOTO_PERFIL_CLOB"]) {
      await connection.execute(`ALTER TABLE ADMINISTRADORES ADD FOTO_PERFIL_CLOB CLOB`);
      console.log("[migration-003]   1/4 Columna CLOB temporal creada.");
    } else {
      console.log("[migration-003]   1/4 Columna CLOB temporal ya existe, continuando.");
    }

    if (cols["FOTO_PERFIL_URL"]) {
      await connection.execute(
        `UPDATE ADMINISTRADORES SET FOTO_PERFIL_CLOB = FOTO_PERFIL_URL`
      );
      await connection.execute(`COMMIT`);
      console.log("[migration-003]   2/4 Datos copiados a columna CLOB.");

      await connection.execute(`ALTER TABLE ADMINISTRADORES DROP COLUMN FOTO_PERFIL_URL`);
      console.log("[migration-003]   3/4 Columna VARCHAR2 original eliminada.");
    } else {
      console.log("[migration-003]   2-3/4 FOTO_PERFIL_URL ya fue eliminada, continuando.");
    }

    await connection.execute(
      `ALTER TABLE ADMINISTRADORES RENAME COLUMN FOTO_PERFIL_CLOB TO FOTO_PERFIL_URL`
    );
    console.log("[migration-003]   4/4 Columna renombrada a FOTO_PERFIL_URL.");
    console.log("[migration-003] ✅ Migración completada. ADMINISTRADORES.FOTO_PERFIL_URL es CLOB.");
  } catch (err) {
    console.error("[migration-003] ❌ Error en migración:", err?.message ?? err);
  } finally {
    if (connection) await connection.close().catch(() => {});
  }
}
