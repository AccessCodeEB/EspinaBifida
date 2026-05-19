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

export async function runMigration007() {
  const conn = await getConnection();
  try {
    const exists = await columnExists(conn, "ARTICULOS", "ACTIVO");
    if (exists) {
      console.log("[migration-007] ℹ️ Columna ACTIVO ya existe en ARTICULOS.");
      return;
    }

    await conn.execute(
      `ALTER TABLE ARTICULOS
         ADD (ACTIVO CHAR(1) DEFAULT 'S' NOT NULL)`
    );

    console.log("[migration-007] ✅ Columna ACTIVO agregada a ARTICULOS (default 'S').");
  } finally {
    await conn.close();
  }
}

/* istanbul ignore next -- standalone runner, not imported by tests */
if (import.meta.url === `file://${process.argv[1]}`) {
  /* istanbul ignore next */
  runMigration007().catch((err) => {
    console.error("[migration-007] ❌ Error ejecutando migración:", err);
    process.exit(1);
  });
}
