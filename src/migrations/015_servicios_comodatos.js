import { getConnection } from "../config/db.js";

async function columnExists(conn, table, column) {
  const { rows } = await conn.execute(
    `SELECT COUNT(*) AS CNT FROM USER_TAB_COLUMNS
     WHERE TABLE_NAME = :t AND COLUMN_NAME = :c`,
    { t: table, c: column }
  );
  return Number(rows[0].CNT ?? 0) > 0;
}

export async function runMigration015() {
  let conn;
  try {
    conn = await getConnection();

    // ── 1. TIPO_SERVICIO en SERVICIOS_CATALOGO ────────────────────────────────
    if (!(await columnExists(conn, "SERVICIOS_CATALOGO", "TIPO_SERVICIO"))) {
      await conn.execute(
        `ALTER TABLE SERVICIOS_CATALOGO
         ADD TIPO_SERVICIO VARCHAR2(20) DEFAULT 'SERVICIO'
         CONSTRAINT CHK_TIPO_SERVICIO CHECK (TIPO_SERVICIO IN ('SERVICIO','CONSUMIBLE','COMODATO'))`
      );
      console.log("[migration-014] ✅ Columna TIPO_SERVICIO agregada a SERVICIOS_CATALOGO.");
    } else {
      console.log("[migration-014] TIPO_SERVICIO ya existe en SERVICIOS_CATALOGO.");
    }

    // ── 2. Clasificar entradas del catálogo ───────────────────────────────────
    const clasificaciones = [
      { patron: "%Silla%Rueda%",   tipo: "COMODATO"   },
      { patron: "%Andadera%",      tipo: "COMODATO"   },
      { patron: "%Baston%",        tipo: "COMODATO"   },
      { patron: "%F_rula%",        tipo: "COMODATO"   },
      { patron: "%Pa%al%",         tipo: "CONSUMIBLE" },
      { patron: "%Cateter%",       tipo: "CONSUMIBLE" },
      { patron: "%Medicamento%",   tipo: "CONSUMIBLE" },
    ];
    for (const { patron, tipo } of clasificaciones) {
      await conn.execute(
        `UPDATE SERVICIOS_CATALOGO SET TIPO_SERVICIO = :tipo
         WHERE UPPER(NOMBRE) LIKE UPPER(:patron)
           AND NVL(TIPO_SERVICIO, 'SERVICIO') != :tipo`,
        { tipo, patron },
        { autoCommit: true }
      );
    }
    console.log("[migration-014] ✅ Clasificaciones TIPO_SERVICIO aplicadas.");

    // ── 3. FECHA_DEVOLUCION_ESPERADA en SERVICIOS ─────────────────────────────
    if (!(await columnExists(conn, "SERVICIOS", "FECHA_DEVOLUCION_ESPERADA"))) {
      await conn.execute(`ALTER TABLE SERVICIOS ADD FECHA_DEVOLUCION_ESPERADA DATE`);
      console.log("[migration-014] ✅ Columna FECHA_DEVOLUCION_ESPERADA agregada a SERVICIOS.");
    } else {
      console.log("[migration-014] FECHA_DEVOLUCION_ESPERADA ya existe en SERVICIOS.");
    }

    // ── 4. ESTATUS en SERVICIOS ───────────────────────────────────────────────
    if (!(await columnExists(conn, "SERVICIOS", "ESTATUS"))) {
      await conn.execute(
        `ALTER TABLE SERVICIOS ADD ESTATUS VARCHAR2(20) DEFAULT 'COMPLETADO'`
      );
      console.log("[migration-014] ✅ Columna ESTATUS agregada a SERVICIOS.");
    } else {
      console.log("[migration-014] ESTATUS ya existe en SERVICIOS.");
    }
    await conn.execute(
      `UPDATE SERVICIOS SET ESTATUS = 'COMPLETADO' WHERE ESTATUS IS NULL`,
      {}, { autoCommit: true }
    );

    // ── 5. Eliminar "Comodato" genérico del catálogo ──────────────────────────
    const { rows: comodatoGenerico } = await conn.execute(
      `SELECT ID_TIPO_SERVICIO FROM SERVICIOS_CATALOGO
       WHERE UPPER(NOMBRE) = 'COMODATO'
         AND NVL(TIPO_SERVICIO,'SERVICIO') != 'COMODATO'
         AND ROWNUM = 1`
    );

    if (comodatoGenerico.length > 0) {
      const idGenerico = comodatoGenerico[0].ID_TIPO_SERVICIO;

      // Redirigir sus servicios a "Otros" (ID 7) o al primer tipo disponible
      const { rows: otrosRow } = await conn.execute(
        `SELECT ID_TIPO_SERVICIO FROM SERVICIOS_CATALOGO
         WHERE UPPER(NOMBRE) LIKE '%OTRO%' AND ROWNUM = 1`
      );
      const idFallback = otrosRow.length > 0 ? otrosRow[0].ID_TIPO_SERVICIO : null;

      if (idFallback) {
        await conn.execute(
          `UPDATE SERVICIOS SET ID_TIPO_SERVICIO = :dest
           WHERE ID_TIPO_SERVICIO = :src`,
          { dest: idFallback, src: idGenerico },
          { autoCommit: true }
        );
        await conn.execute(
          `UPDATE CITAS SET ID_TIPO_SERVICIO = :dest
           WHERE ID_TIPO_SERVICIO = :src`,
          { dest: idFallback, src: idGenerico },
          { autoCommit: true }
        );
      }

      await conn.execute(
        `DELETE FROM SERVICIOS_CATALOGO WHERE ID_TIPO_SERVICIO = :id`,
        { id: idGenerico },
        { autoCommit: true }
      );
      console.log(`[migration-014] 🗑 Entrada 'Comodato' genérica eliminada (ID=${idGenerico}).`);
    } else {
      console.log("[migration-014] No hay entrada genérica 'Comodato' que eliminar.");
    }

    // ── 6. Renombrar "Silla de Ruedas" → "Préstamo de equipo" ───────────────
    await conn.execute(
      `UPDATE SERVICIOS_CATALOGO
       SET NOMBRE = 'Préstamo de equipo', TIPO_SERVICIO = 'COMODATO'
       WHERE UPPER(NOMBRE) LIKE '%SILLA%RUEDA%'
          OR NOMBRE LIKE '%restamo%quipo%'`,
      {}, { autoCommit: true }
    );

    // ── 7. Renombrar "Paquete de Pañales" → "Insumos médicos" ────────────────
    await conn.execute(
      `UPDATE SERVICIOS_CATALOGO
       SET NOMBRE = 'Insumos médicos', TIPO_SERVICIO = 'CONSUMIBLE'
       WHERE UPPER(NOMBRE) LIKE '%PA%AL%'
          OR UPPER(NOMBRE) LIKE '%INSUMO%'`,
      {}, { autoCommit: true }
    );
    console.log("[migration-014] ✅ Catálogo de servicios limpio.");

    console.log("[migration-014] ✅ Migration completa.");
  } catch (err) {
    console.error("[migration-014] ❌ Error:", err?.message ?? err);
  } finally {
    if (conn) await conn.close().catch(() => {});
  }
}
