import { getConnection } from "../config/db.js";

export async function runMigration012() {
  let conn;
  try {
    conn = await getConnection();

    const { rows } = await conn.execute(
      `SELECT COUNT(*) AS CNT FROM USER_TABLES WHERE TABLE_NAME = 'AUDITORIA_OPERACIONES'`
    );

    if (Number(rows[0].CNT ?? rows[0][0]) === 0) {
      await conn.execute(`
        CREATE TABLE AUDITORIA_OPERACIONES (
          ID_AUDITORIA NUMBER         PRIMARY KEY,
          ID_ADMIN     NUMBER         NOT NULL,
          OPERACION    VARCHAR2(100)  NOT NULL,
          ENTIDAD      VARCHAR2(50),
          ENTIDAD_ID   VARCHAR2(100),
          DETALLE      CLOB,
          FECHA        TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
          CONSTRAINT FK_AUDIT_ADMIN FOREIGN KEY (ID_ADMIN)
            REFERENCES ADMINISTRADORES(ID_ADMIN) ON DELETE CASCADE
        )
      `);

      await conn.execute(
        `CREATE SEQUENCE SEQ_AUDITORIA START WITH 1 INCREMENT BY 1`
      );

      await conn.execute(`
        CREATE OR REPLACE TRIGGER TRG_AUDITORIA_BI
        BEFORE INSERT ON AUDITORIA_OPERACIONES
        FOR EACH ROW
        BEGIN
          IF :NEW.ID_AUDITORIA IS NULL THEN
            SELECT SEQ_AUDITORIA.NEXTVAL INTO :NEW.ID_AUDITORIA FROM DUAL;
          END IF;
        END;
      `);

      await conn.execute(
        `CREATE INDEX IDX_AUDIT_ADMIN ON AUDITORIA_OPERACIONES (ID_ADMIN)`
      );
      await conn.execute(
        `CREATE INDEX IDX_AUDIT_FECHA ON AUDITORIA_OPERACIONES (FECHA)`
      );

      await conn.commit();
      console.log("[migration-012] ✅ Tabla AUDITORIA_OPERACIONES creada.");
    } else {
      console.log("[migration-012] AUDITORIA_OPERACIONES ya existe.");
    }
  } catch (err) {
    console.error("[migration-012] ❌ Error:", err?.message ?? err);
  } finally {
    if (conn) await conn.close().catch(() => {});
  }
}
