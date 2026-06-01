import { getConnection } from "../config/db.js";

async function tableExists(conn, table) {
  const { rows } = await conn.execute(
    `SELECT COUNT(*) AS CNT FROM USER_TABLES WHERE TABLE_NAME = :t`,
    { t: table }
  );
  return Number(rows[0].CNT ?? 0) > 0;
}

async function sequenceExists(conn, seq) {
  const { rows } = await conn.execute(
    `SELECT COUNT(*) AS CNT FROM USER_SEQUENCES WHERE SEQUENCE_NAME = :s`,
    { s: seq }
  );
  return Number(rows[0].CNT ?? 0) > 0;
}

async function triggerExists(conn, trg) {
  const { rows } = await conn.execute(
    `SELECT COUNT(*) AS CNT FROM USER_TRIGGERS WHERE TRIGGER_NAME = :t`,
    { t: trg }
  );
  return Number(rows[0].CNT ?? 0) > 0;
}

async function indexExists(conn, idx) {
  const { rows } = await conn.execute(
    `SELECT COUNT(*) AS CNT FROM USER_INDEXES WHERE INDEX_NAME = :i`,
    { i: idx }
  );
  return Number(rows[0].CNT ?? 0) > 0;
}

/**
 * Migración 021 — Módulo de Comodatos
 *
 * Crea:
 *   COMODATOS          — financiamiento de equipo médico por beneficiario
 *   COMODATOS_PAGOS    — historial inmutable de pagos y exenciones
 *   Secuencias y triggers BEFORE INSERT para PKs automáticos
 *   Índices de performance
 *
 * Idempotente: verifica existencia antes de crear cada objeto.
 */
export async function runMigration021() {
  let conn;
  try {
    conn = await getConnection();

    // ── 1. Tabla COMODATOS ───────────────────────────────────────────────────
    if (!(await tableExists(conn, "COMODATOS"))) {
      await conn.execute(`
        CREATE TABLE COMODATOS (
          ID_COMODATO   NUMBER        NOT NULL,
          CURP          VARCHAR2(18)  NOT NULL,
          ID_ARTICULO   NUMBER        NOT NULL,
          MONTO_TOTAL   NUMBER(10,2),
          MONTO_PAGADO  NUMBER(10,2) DEFAULT 0 NOT NULL,
          MONTO_EXENTO  NUMBER(10,2) DEFAULT 0 NOT NULL,
          ESTATUS       VARCHAR2(20)  DEFAULT 'Activo' NOT NULL,
          FECHA_ALTA    DATE          DEFAULT SYSDATE NOT NULL,
          NOTAS         CLOB,
          CONSTRAINT PK_COMODATOS         PRIMARY KEY (ID_COMODATO),
          CONSTRAINT FK_COMODATOS_CURP    FOREIGN KEY (CURP)        REFERENCES BENEFICIARIOS(CURP),
          CONSTRAINT FK_COMODATOS_ART     FOREIGN KEY (ID_ARTICULO) REFERENCES ARTICULOS(ID_ARTICULO),
          CONSTRAINT CK_COMODATOS_ESTATUS CHECK (ESTATUS IN ('Activo', 'Pagado', 'Cancelado')),
          CONSTRAINT CK_COMODATOS_PAGADO  CHECK (MONTO_PAGADO >= 0),
          CONSTRAINT CK_COMODATOS_EXENTO  CHECK (MONTO_EXENTO >= 0)
        )
      `);
      console.log("[migration-021] ✅ Tabla COMODATOS creada.");
    } else {
      console.log("[migration-021] COMODATOS ya existe.");
    }

    // ── 2. Tabla COMODATOS_PAGOS ─────────────────────────────────────────────
    if (!(await tableExists(conn, "COMODATOS_PAGOS"))) {
      await conn.execute(`
        CREATE TABLE COMODATOS_PAGOS (
          ID_PAGO       NUMBER        NOT NULL,
          ID_COMODATO   NUMBER        NOT NULL,
          MONTO         NUMBER(10,2)  NOT NULL,
          ES_EXENTO     CHAR(1)       DEFAULT 'N' NOT NULL,
          FECHA         DATE          DEFAULT SYSDATE NOT NULL,
          NOTAS         CLOB,
          CONSTRAINT PK_COMODATOS_PAGOS PRIMARY KEY (ID_PAGO),
          CONSTRAINT FK_CPAGOS_COMODATO FOREIGN KEY (ID_COMODATO) REFERENCES COMODATOS(ID_COMODATO),
          CONSTRAINT CK_CPAGOS_EXENTO   CHECK (ES_EXENTO IN ('S', 'N')),
          CONSTRAINT CK_CPAGOS_MONTO    CHECK (MONTO > 0)
        )
      `);
      console.log("[migration-021] ✅ Tabla COMODATOS_PAGOS creada.");
    } else {
      console.log("[migration-021] COMODATOS_PAGOS ya existe.");
    }

    // ── 3. Secuencias ────────────────────────────────────────────────────────
    if (!(await sequenceExists(conn, "SEQ_COMODATOS"))) {
      await conn.execute(`CREATE SEQUENCE SEQ_COMODATOS START WITH 1 INCREMENT BY 1 NOCACHE`);
      console.log("[migration-021] ✅ SEQ_COMODATOS creada.");
    }
    if (!(await sequenceExists(conn, "SEQ_COMODATOS_PAGOS"))) {
      await conn.execute(`CREATE SEQUENCE SEQ_COMODATOS_PAGOS START WITH 1 INCREMENT BY 1 NOCACHE`);
      console.log("[migration-021] ✅ SEQ_COMODATOS_PAGOS creada.");
    }

    // ── 4. Triggers BEFORE INSERT ────────────────────────────────────────────
    if (!(await triggerExists(conn, "TRG_COMODATOS_BI"))) {
      await conn.execute(`
        CREATE TRIGGER TRG_COMODATOS_BI
          BEFORE INSERT ON COMODATOS
          FOR EACH ROW
        BEGIN
          IF :NEW.ID_COMODATO IS NULL THEN
            :NEW.ID_COMODATO := SEQ_COMODATOS.NEXTVAL;
          END IF;
        END;
      `);
      console.log("[migration-021] ✅ TRG_COMODATOS_BI creado.");
    }
    if (!(await triggerExists(conn, "TRG_COMODATOS_PAGOS_BI"))) {
      await conn.execute(`
        CREATE TRIGGER TRG_COMODATOS_PAGOS_BI
          BEFORE INSERT ON COMODATOS_PAGOS
          FOR EACH ROW
        BEGIN
          IF :NEW.ID_PAGO IS NULL THEN
            :NEW.ID_PAGO := SEQ_COMODATOS_PAGOS.NEXTVAL;
          END IF;
        END;
      `);
      console.log("[migration-021] ✅ TRG_COMODATOS_PAGOS_BI creado.");
    }

    // ── 5. Índices ───────────────────────────────────────────────────────────
    const indexes = [
      { name: "IDX_COMODATOS_CURP",     ddl: `CREATE INDEX IDX_COMODATOS_CURP     ON COMODATOS(CURP)` },
      { name: "IDX_COMODATOS_ARTICULO", ddl: `CREATE INDEX IDX_COMODATOS_ARTICULO ON COMODATOS(ID_ARTICULO)` },
      { name: "IDX_CPAGOS_COMODATO",   ddl: `CREATE INDEX IDX_CPAGOS_COMODATO    ON COMODATOS_PAGOS(ID_COMODATO)` },
      { name: "IDX_CPAGOS_FECHA",      ddl: `CREATE INDEX IDX_CPAGOS_FECHA       ON COMODATOS_PAGOS(FECHA)` },
    ];
    for (const { name, ddl } of indexes) {
      if (!(await indexExists(conn, name))) {
        await conn.execute(ddl);
        console.log(`[migration-021] ✅ Índice ${name} creado.`);
      }
    }

    console.log("[migration-021] ✅ Migración completa.");
  } finally {
    if (conn) await conn.close();
  }
}
