import { getConnection } from "../config/db.js";

/**
 * Migración 026 — Eliminar "Préstamo de equipo" de SERVICIOS_CATALOGO
 *
 * Los préstamos de equipo ahora se gestionan exclusivamente desde el módulo
 * de Comodatos. La entrada tipo COMODATO en SERVICIOS_CATALOGO ya no tiene
 * uso — la UI la filtraba, pero el registro seguía en BD.
 *
 * Proceso seguro:
 *   1. Redirigir SERVICIOS y CITAS que apunten a "Préstamo de equipo" → "Otros"
 *   2. Eliminar la entrada del catálogo
 *
 * Idempotente: si ya no existe, no hace nada.
 */
export async function runMigration026() {
  let conn;
  try {
    conn = await getConnection();

    const { rows } = await conn.execute(
      `SELECT ID_TIPO_SERVICIO FROM SERVICIOS_CATALOGO
       WHERE UPPER(NOMBRE) LIKE '%RESTAMO%QUIPO%'
          OR (TIPO_SERVICIO = 'COMODATO' AND ROWNUM = 1)`
    );

    if (rows.length === 0) {
      console.log("[migration-026] 'Préstamo de equipo' ya no existe en catálogo.");
      return;
    }

    const idPrestamo = rows[0].ID_TIPO_SERVICIO;

    const { rows: otrosRow } = await conn.execute(
      `SELECT ID_TIPO_SERVICIO FROM SERVICIOS_CATALOGO
       WHERE UPPER(NOMBRE) LIKE '%OTRO%' AND ROWNUM = 1`
    );
    const idFallback = otrosRow.length > 0 ? otrosRow[0].ID_TIPO_SERVICIO : null;

    if (idFallback) {
      await conn.execute(
        `UPDATE SERVICIOS SET ID_TIPO_SERVICIO = :dest WHERE ID_TIPO_SERVICIO = :src`,
        { dest: idFallback, src: idPrestamo },
        { autoCommit: true }
      );
      await conn.execute(
        `UPDATE CITAS SET ID_TIPO_SERVICIO = :dest WHERE ID_TIPO_SERVICIO = :src`,
        { dest: idFallback, src: idPrestamo },
        { autoCommit: true }
      );
    }

    await conn.execute(
      `DELETE FROM SERVICIOS_CATALOGO WHERE ID_TIPO_SERVICIO = :id`,
      { id: idPrestamo },
      { autoCommit: true }
    );

    console.log(`[migration-026] ✅ 'Préstamo de equipo' eliminado del catálogo (ID=${idPrestamo}).`);
    console.log("[migration-026] ✅ Migración completa.");
  } catch (err) {
    console.error("[migration-026] ❌ Error:", err?.message ?? err);
  } finally {
    if (conn) await conn.close().catch(() => {});
  }
}
