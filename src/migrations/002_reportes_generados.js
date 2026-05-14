import { getConnection } from "../config/db.js";

/**
 * Crea la tabla REPORTES_GENERADOS y sus índices si no existen.
 * Idempotente: verifica USER_TABLES / USER_INDEXES antes de cada DDL.
 */
export async function runMigration002() {
  let connection;
  try {
    connection = await getConnection();

    // ── 1. Tabla REPORTES_GENERADOS ──────────────────────────────────────────
    const { rows: tablas } = await connection.execute(
      `SELECT COUNT(*) AS CNT FROM USER_TABLES WHERE TABLE_NAME = 'REPORTES_GENERADOS'`
    );
    const tablaExiste = (tablas[0]?.CNT ?? tablas[0]?.[0] ?? 0) > 0;

    if (tablaExiste) {
      console.log("[migration-002] REPORTES_GENERADOS ya existe. Sin cambios en tabla.");
    } else {
      await connection.execute(`
        CREATE TABLE REPORTES_GENERADOS (
          ID_REPORTE    NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          TIPO          VARCHAR2(20)  NOT NULL,
          FECHA_INICIO  DATE          NOT NULL,
          FECHA_FIN     DATE          NOT NULL,
          FECHA_GEN     TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL,
          RUTA_PDF      VARCHAR2(500),
          RUTA_XLSX     VARCHAR2(500),
          GENERADO_POR  NUMBER REFERENCES ADMINISTRADORES(ID_ADMIN)
        )
      `);
      console.log("[migration-002] ✅ Tabla REPORTES_GENERADOS creada.");
    }

    // ── 2. Índice IDX_REPORTES_FECHA ─────────────────────────────────────────
    const { rows: idx1 } = await connection.execute(
      `SELECT COUNT(*) AS CNT FROM USER_INDEXES WHERE INDEX_NAME = 'IDX_REPORTES_FECHA'`
    );
    const idx1Existe = (idx1[0]?.CNT ?? idx1[0]?.[0] ?? 0) > 0;

    if (idx1Existe) {
      console.log("[migration-002] IDX_REPORTES_FECHA ya existe.");
    } else {
      await connection.execute(
        `CREATE INDEX IDX_REPORTES_FECHA ON REPORTES_GENERADOS (FECHA_GEN)`
      );
      console.log("[migration-002] ✅ Índice IDX_REPORTES_FECHA creado.");
    }

    // ── 3. Índice IDX_SA_SERVICIO (SERVICIO_ARTICULOS) ───────────────────────
    const { rows: idx2 } = await connection.execute(
      `SELECT COUNT(*) AS CNT FROM USER_INDEXES WHERE INDEX_NAME = 'IDX_SA_SERVICIO'`
    );
    const idx2Existe = (idx2[0]?.CNT ?? idx2[0]?.[0] ?? 0) > 0;

    if (idx2Existe) {
      console.log("[migration-002] IDX_SA_SERVICIO ya existe.");
    } else {
      await connection.execute(
        `CREATE INDEX IDX_SA_SERVICIO ON SERVICIO_ARTICULOS (ID_SERVICIO)`
      );
      console.log("[migration-002] ✅ Índice IDX_SA_SERVICIO creado.");
    }

  } catch (err) {
    console.error("[migration-002] ❌ Error en migración:", err?.message ?? err);
  } finally {
    if (connection) await connection.close().catch(() => {});
  }
}
