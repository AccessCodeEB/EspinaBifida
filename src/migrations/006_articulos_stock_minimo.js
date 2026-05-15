import { getConnection } from "../config/db.js";

/**
 * Agrega columna STOCK_MINIMO a ARTICULOS.
 * Idempotente: verifica USER_TAB_COLUMNS antes del ALTER TABLE.
 * Valor por defecto: 5 unidades.
 */
export async function runMigration006() {
  let conn;
  try {
    conn = await getConnection();

    const { rows } = await conn.execute(
      `SELECT COUNT(*) AS CNT FROM USER_TAB_COLUMNS
       WHERE TABLE_NAME = 'ARTICULOS' AND COLUMN_NAME = 'STOCK_MINIMO'`
    );

    if (Number(rows[0].CNT) === 0) {
      await conn.execute(
        `ALTER TABLE ARTICULOS ADD STOCK_MINIMO NUMBER DEFAULT 5 NOT NULL`
      );
      console.log("[migration-006] ✅ Columna STOCK_MINIMO agregada a ARTICULOS (default 5).");
    } else {
      console.log("[migration-006] STOCK_MINIMO ya existe en ARTICULOS.");
    }

    await conn.commit();
  } finally {
    if (conn) await conn.close();
  }
}
