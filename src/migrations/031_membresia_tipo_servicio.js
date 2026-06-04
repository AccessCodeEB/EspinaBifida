import { withConnection } from "../config/db.js";

/**
 * Migración 031 — Tipo de servicio "Membresía Anual"
 *
 * Inserta el tipo de servicio que vincula cada registro de membresía
 * con la tabla SERVICIOS, haciéndolo visible en Servicios Registrados.
 */
export async function runMigration031() {
  await withConnection(async (conn) => {
    const { rows } = await conn.execute(
      `SELECT ID_TIPO_SERVICIO FROM SERVICIOS_CATALOGO
       WHERE UPPER(NOMBRE) = UPPER('Membresía Anual')`
    );

    if (rows.length === 0) {
      // Usa MAX(ID) + 1 para evitar conflictos — SERVICIOS_CATALOGO no tiene secuencia propia
      await conn.execute(
        `INSERT INTO SERVICIOS_CATALOGO (ID_TIPO_SERVICIO, NOMBRE, TIPO_SERVICIO)
         SELECT NVL(MAX(ID_TIPO_SERVICIO), 0) + 1, 'Membresía Anual', 'SERVICIO'
         FROM SERVICIOS_CATALOGO`,
        {},
        { autoCommit: true }
      );
      console.log("[migration-031] ✅ Tipo de servicio 'Membresía Anual' creado.");
    } else {
      console.log("[migration-031] Tipo 'Membresía Anual' ya existe, sin cambios.");
    }
  });
}
