import { getConnection } from "../config/db.js";

export async function runMigration009() {
  let conn;
  try {
    conn = await getConnection();

    const { rows: tableExists } = await conn.execute(
      `SELECT COUNT(*) AS CNT FROM USER_TABLES WHERE TABLE_NAME = 'NOTIFICACIONES'`
    );

    if (Number(tableExists[0].CNT) === 0) {
      await conn.execute(`
        CREATE TABLE NOTIFICACIONES (
          ID_NOTIFICACION NUMBER         PRIMARY KEY,
          TIPO            VARCHAR2(50)   NOT NULL,
          ESTATUS         VARCHAR2(20)   DEFAULT 'PENDIENTE' NOT NULL,
          REFERENCIA_ID   NUMBER,
          REFERENCIA_TIPO VARCHAR2(50),
          CURP            VARCHAR2(18),
          MENSAJE         VARCHAR2(500)  NOT NULL,
          FECHA_CREACION  DATE           DEFAULT SYSDATE NOT NULL,
          FECHA_LECTURA   DATE,
          CONSTRAINT CHK_NOTIF_TIPO   CHECK (TIPO   IN ('STOCK_BAJO','MEMBRESIA_PROXIMA','MEMBRESIA_VENCIDA')),
          CONSTRAINT CHK_NOTIF_STATUS CHECK (ESTATUS IN ('PENDIENTE','LEIDA'))
        )
      `);

      await conn.execute(`CREATE SEQUENCE SEQ_NOTIFICACIONES START WITH 1 INCREMENT BY 1`);

      await conn.execute(`
        CREATE OR REPLACE TRIGGER TRG_NOTIFICACIONES_BI
        BEFORE INSERT ON NOTIFICACIONES
        FOR EACH ROW
        BEGIN
          IF :NEW.ID_NOTIFICACION IS NULL THEN
            SELECT SEQ_NOTIFICACIONES.NEXTVAL INTO :NEW.ID_NOTIFICACION FROM DUAL;
          END IF;
        END;
      `);

      console.log("[migration-009] ✅ Tabla NOTIFICACIONES creada con secuencia y trigger.");
    } else {
      console.log("[migration-009] NOTIFICACIONES ya existe.");
    }

    await conn.commit();
  } finally {
    if (conn) await conn.close();
  }
}
