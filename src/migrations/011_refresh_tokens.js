import { getConnection } from "../config/db.js";

export async function runMigration011() {
  let conn;
  try {
    conn = await getConnection();

    const { rows } = await conn.execute(
      `SELECT COUNT(*) AS CNT FROM USER_TABLES WHERE TABLE_NAME = 'REFRESH_TOKENS'`
    );

    if (Number(rows[0].CNT) === 0) {
      await conn.execute(`
        CREATE TABLE REFRESH_TOKENS (
          ID_TOKEN   NUMBER         PRIMARY KEY,
          ID_ADMIN   NUMBER         NOT NULL,
          TOKEN_HASH VARCHAR2(64)   NOT NULL,
          EXPIRES_AT DATE           NOT NULL,
          REVOCADO   NUMBER(1)      DEFAULT 0 NOT NULL,
          CREATED_AT DATE           DEFAULT SYSDATE NOT NULL,
          CONSTRAINT UQ_REFRESH_HASH UNIQUE (TOKEN_HASH),
          CONSTRAINT FK_RT_ADMIN FOREIGN KEY (ID_ADMIN)
            REFERENCES ADMINISTRADORES(ID_ADMIN) ON DELETE CASCADE
        )
      `);

      await conn.execute(
        `CREATE SEQUENCE SEQ_REFRESH_TOKENS START WITH 1 INCREMENT BY 1`
      );

      await conn.execute(`
        CREATE OR REPLACE TRIGGER TRG_REFRESH_TOKENS_BI
        BEFORE INSERT ON REFRESH_TOKENS
        FOR EACH ROW
        BEGIN
          IF :NEW.ID_TOKEN IS NULL THEN
            SELECT SEQ_REFRESH_TOKENS.NEXTVAL INTO :NEW.ID_TOKEN FROM DUAL;
          END IF;
        END;
      `);

      await conn.execute(
        `CREATE INDEX IDX_RT_ADMIN ON REFRESH_TOKENS (ID_ADMIN)`
      );

      console.log("[migration-011] ✅ Tabla REFRESH_TOKENS creada.");
    } else {
      console.log("[migration-011] REFRESH_TOKENS ya existe.");
    }

    await conn.commit();
  } finally {
    if (conn) await conn.close();
  }
}
