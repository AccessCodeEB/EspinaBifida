import { getConnection } from "../config/db.js";

/**
 * Convierte FOTO_PERFIL_URL de VARCHAR2 a CLOB usando el método Oracle correcto:
 * 1. Agregar columna CLOB temporal
 * 2. Copiar datos existentes
 * 3. Eliminar columna original
 * 4. Renombrar la nueva columna
 *
 * Es idempotente: detecta el estado actual y solo ejecuta lo que falta.
 */
export async function runMigration001() {
  let connection;
  try {
    connection = await getConnection();

    // Leer tipos actuales de ambas columnas
    const result = await connection.execute(
      `SELECT COLUMN_NAME, DATA_TYPE FROM ALL_TAB_COLUMNS
       WHERE OWNER = USER
         AND TABLE_NAME = 'BENEFICIARIOS'
         AND COLUMN_NAME IN ('FOTO_PERFIL_URL', 'FOTO_PERFIL_CLOB')
       ORDER BY COLUMN_NAME`
    );

    const cols = {};
    for (const row of (result.rows ?? [])) {
      const name = row.COLUMN_NAME ?? row[0];
      const type = row.DATA_TYPE  ?? row[1];
      cols[name] = type;
    }

    // Ya terminó correctamente
    if (cols["FOTO_PERFIL_URL"] === "CLOB") {
      console.log("[migration-001] FOTO_PERFIL_URL ya es CLOB. Sin cambios.");
      return;
    }

    console.log("[migration-001] Convirtiendo FOTO_PERFIL_URL a CLOB (4 pasos)...");

    // Paso 1: agregar columna temporal si no existe ya
    if (!cols["FOTO_PERFIL_CLOB"]) {
      await connection.execute(`ALTER TABLE BENEFICIARIOS ADD FOTO_PERFIL_CLOB CLOB`);
      console.log("[migration-001]   1/4 Columna CLOB temporal creada.");
    } else {
      console.log("[migration-001]   1/4 Columna CLOB temporal ya existe, continuando.");
    }

    // Paso 2: copiar datos (solo si FOTO_PERFIL_URL aún existe)
    if (cols["FOTO_PERFIL_URL"]) {
      await connection.execute(
        `UPDATE BENEFICIARIOS SET FOTO_PERFIL_CLOB = FOTO_PERFIL_URL`
      );
      await connection.execute(`COMMIT`);
      console.log("[migration-001]   2/4 Datos copiados a columna CLOB.");

      // Paso 3: eliminar columna original
      await connection.execute(`ALTER TABLE BENEFICIARIOS DROP COLUMN FOTO_PERFIL_URL`);
      console.log("[migration-001]   3/4 Columna VARCHAR2 original eliminada.");
    } else {
      console.log("[migration-001]   2-3/4 FOTO_PERFIL_URL ya fue eliminada, continuando.");
    }

    // Paso 4: renombrar
    await connection.execute(
      `ALTER TABLE BENEFICIARIOS RENAME COLUMN FOTO_PERFIL_CLOB TO FOTO_PERFIL_URL`
    );
    console.log("[migration-001]   4/4 Columna renombrada a FOTO_PERFIL_URL.");
    console.log("[migration-001] ✅ Migración completada. FOTO_PERFIL_URL es ahora CLOB.");
  } catch (err) {
    console.error("[migration-001] ❌ Error en migración:", err?.message ?? err);
  } finally {
    if (connection) await connection.close().catch(() => {});
  }
}
