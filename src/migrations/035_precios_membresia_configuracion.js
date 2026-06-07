import { getConnection } from "../config/db.js";

/**
 * Migración 035 — Inserta precios base de membresía en CONFIGURACION.
 * Usa MERGE INTO para ser idempotente (no falla si ya existen).
 */
export async function runMigration035() {
  let conn;
  try {
    conn = await getConnection();

    await conn.execute(`
      MERGE INTO CONFIGURACION c
      USING (SELECT 'PRECIO_MEMBRESIA_NUEVO_INGRESO' AS clave, '200' AS valor FROM DUAL) src
      ON (c.CLAVE = src.clave)
      WHEN NOT MATCHED THEN
        INSERT (CLAVE, VALOR) VALUES (src.clave, src.valor)
    `);

    await conn.execute(`
      MERGE INTO CONFIGURACION c
      USING (SELECT 'PRECIO_MEMBRESIA_REINSCRIPCION' AS clave, '150' AS valor FROM DUAL) src
      ON (c.CLAVE = src.clave)
      WHEN NOT MATCHED THEN
        INSERT (CLAVE, VALOR) VALUES (src.clave, src.valor)
    `);

    await conn.commit();
    console.log("[migración 035] Precios de membresía insertados en CONFIGURACION");
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {});
    console.error("[migración 035] Error:", err.message);
    throw err;
  } finally {
    if (conn) await conn.close().catch(() => {});
  }
}
