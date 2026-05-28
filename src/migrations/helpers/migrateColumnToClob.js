import { getConnection } from "../../config/db.js";

/**
 * Convierte una columna FOTO_PERFIL_URL de VARCHAR2 a CLOB en la tabla indicada.
 * Estrategia: agregar columna temporal → copiar datos → eliminar original → renombrar.
 * Es idempotente: detecta el estado actual y solo ejecuta lo que falta.
 *
 * @param {string} table   Nombre de la tabla Oracle (ej. 'BENEFICIARIOS')
 * @param {string} prefix  Prefijo de log (ej. '[migration-001]')
 */
export async function migrateColumnToClob(table, prefix) {
  let connection;
  try {
    connection = await getConnection();

    const result = await connection.execute(
      `SELECT COLUMN_NAME, DATA_TYPE FROM ALL_TAB_COLUMNS
       WHERE OWNER = USER
         AND TABLE_NAME = :tbl_name
         AND COLUMN_NAME IN ('FOTO_PERFIL_URL', 'FOTO_PERFIL_CLOB')
       ORDER BY COLUMN_NAME`,
      { tbl_name: table }
    );

    const cols = {};
    for (const row of result.rows ?? []) {
      const name = row.COLUMN_NAME ?? row[0];
      const type = row.DATA_TYPE  ?? row[1];
      cols[name] = type;
    }

    if (cols["FOTO_PERFIL_URL"] === "CLOB") {
      console.log(`${prefix} FOTO_PERFIL_URL ya es CLOB. Sin cambios.`);
      return;
    }

    console.log(`${prefix} Convirtiendo FOTO_PERFIL_URL a CLOB (4 pasos)...`);

    if (cols["FOTO_PERFIL_CLOB"]) {
      console.log(`${prefix}   1/4 Columna CLOB temporal ya existe, continuando.`);
    } else {
      await connection.execute(`ALTER TABLE ${table} ADD FOTO_PERFIL_CLOB CLOB`);
      console.log(`${prefix}   1/4 Columna CLOB temporal creada.`);
    }

    if (cols["FOTO_PERFIL_URL"]) {
      await connection.execute(`UPDATE ${table} SET FOTO_PERFIL_CLOB = FOTO_PERFIL_URL`);
      await connection.execute(`COMMIT`);
      console.log(`${prefix}   2/4 Datos copiados a columna CLOB.`);

      await connection.execute(`ALTER TABLE ${table} DROP COLUMN FOTO_PERFIL_URL`);
      console.log(`${prefix}   3/4 Columna VARCHAR2 original eliminada.`);
    } else {
      console.log(`${prefix}   2-3/4 FOTO_PERFIL_URL ya fue eliminada, continuando.`);
    }

    await connection.execute(`ALTER TABLE ${table} RENAME COLUMN FOTO_PERFIL_CLOB TO FOTO_PERFIL_URL`);
    console.log(`${prefix}   4/4 Columna renombrada a FOTO_PERFIL_URL.`);
    console.log(`${prefix} ✅ Migración completada. FOTO_PERFIL_URL es ahora CLOB.`);
  } catch (err) {
    console.error(`${prefix} ❌ Error en migración:`, err?.message ?? err);
  } finally {
    if (connection) await connection.close().catch(() => {});
  }
}
