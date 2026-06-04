import { getConnection } from "../config/db.js";

/**
 * Migración 030 — Tabla ARTICULOS_LOG
 *
 * Registra el ciclo de vida de artículos: altas (creación) y bajas (eliminación).
 * Guarda un snapshot de la descripción para que persista aunque el artículo se borre.
 *
 * Idempotente: verifica USER_TABLES antes de CREATE TABLE.
 */
export async function runMigration030() {
  let conn;
  try {
    conn = await getConnection();

    const { rows } = await conn.execute(
      `SELECT COUNT(*) AS CNT FROM USER_TABLES WHERE TABLE_NAME = 'ARTICULOS_LOG'`
    );
    const existe = Number(rows[0]?.CNT ?? rows[0]?.[0] ?? 0) > 0;

    if (!existe) {
      await conn.execute(`
        CREATE TABLE ARTICULOS_LOG (
          ID_LOG               NUMBER,
          ID_ARTICULO          NUMBER,
          DESCRIPCION_ARTICULO VARCHAR2(150) NOT NULL,
          TIPO                 VARCHAR2(4)   NOT NULL CHECK (TIPO IN ('ALTA','BAJA')),
          MOTIVO               VARCHAR2(500),
          FECHA                DATE DEFAULT SYSDATE NOT NULL,
          CONSTRAINT PK_ARTICULOS_LOG PRIMARY KEY (ID_LOG)
        )
      `);
      console.log("[migration-030] ✅ Tabla ARTICULOS_LOG creada.");

      await conn.execute(`
        CREATE SEQUENCE SEQ_ARTICULOS_LOG
          START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE
      `);

      await conn.execute(`
        CREATE OR REPLACE TRIGGER TRG_ARTICULOS_LOG_BI
          BEFORE INSERT ON ARTICULOS_LOG
          FOR EACH ROW
        BEGIN
          IF :NEW.ID_LOG IS NULL THEN
            :NEW.ID_LOG := SEQ_ARTICULOS_LOG.NEXTVAL;
          END IF;
        END;
      `);
      console.log("[migration-030] ✅ Secuencia y trigger ARTICULOS_LOG creados.");
    } else {
      console.log("[migration-030] ARTICULOS_LOG ya existe — sin cambios.");
    }

    await conn.commit();
  } catch (err) {
    console.error("[migration-030] ❌ Error:", err.message);
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (conn) await conn.close();
  }
}
