import { getConnection } from "../config/db.js";

async function columnExists(conn, tableName, columnName) {
  const result = await conn.execute(
    `SELECT COUNT(*) AS TOTAL
       FROM USER_TAB_COLUMNS
      WHERE TABLE_NAME = UPPER(:tableName)
        AND COLUMN_NAME = UPPER(:columnName)`,
    { tableName, columnName }
  );
  return Number(result.rows[0]?.TOTAL || 0) > 0;
}

export async function runMigration008() {
  const conn = await getConnection();
  try {
    const exists = await columnExists(conn, "ADMINISTRADORES", "TELEFONO");
    if (exists) {
      console.log("[migration-008] ℹ️ Columna TELEFONO ya existe en ADMINISTRADORES.");
      return;
    }
    await conn.execute(
      `ALTER TABLE ADMINISTRADORES ADD (TELEFONO VARCHAR2(15))`,
      {},
      { autoCommit: true }
    );
    console.log("[migration-008] ✅ Columna TELEFONO agregada a ADMINISTRADORES.");
  } catch (err) {
    console.error("[migration-008] ❌ Error ejecutando migración:", err);
    throw err;
  } finally {
    await conn.close();
  }
}

/* istanbul ignore next -- standalone runner */
if (import.meta.url === `file://${process.argv[1]}`) {
  /* istanbul ignore next */
  runMigration008().catch((err) => {
    console.error("[migration-008] ❌", err);
    process.exit(1);
  });
}
