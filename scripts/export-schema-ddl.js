import fs from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import oracledb from "oracledb";

dotenv.config();

const OUTPUT_FILE = process.argv[2] || "schema_ddl_export.sql";
const RETRYABLE_ERROR_CODES = new Set([17008, 3113, 3114, 3135]);

function getOracleErrorCode(error) {
  if (!error) return null;
  if (typeof error.errorNum === "number") return error.errorNum;
  const match = String(error.message || "").match(/ORA-(\d{5})/);
  return match ? Number(match[1]) : null;
}

function isRetryableConnectionError(error) {
  const code = getOracleErrorCode(error);
  return code !== null && RETRYABLE_ERROR_CODES.has(code);
}

function getConnectConfig() {
  const { DB_USER, DB_PASSWORD, DB_CONNECTION_STRING } = process.env;
  if (!DB_USER || !DB_PASSWORD || !DB_CONNECTION_STRING) {
    throw new Error(
      "Faltan variables DB_USER, DB_PASSWORD o DB_CONNECTION_STRING en el entorno/.env"
    );
  }

  return {
    user: DB_USER,
    password: DB_PASSWORD,
    connectString: DB_CONNECTION_STRING,
  };
}

function initOracleClientIfNeeded() {
  if (process.env.TNS_ADMIN == null) {
    process.env.TNS_ADMIN = path.join(process.cwd(), "wallet");
  }

  if (process.env.ORACLE_CLIENT_PATH) {
    try {
      oracledb.initOracleClient({ libDir: process.env.ORACLE_CLIENT_PATH });
    } catch (error) {
      // Ignore DPI-1047 already initialized / or client setup races; surface real failures later.
      if (!String(error.message || "").includes("DPI-1047")) {
        throw error;
      }
    }
  }

  oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
}

async function queryObjectNames(connection, sql) {
  const result = await connection.execute(sql);
  return result.rows.map((row) => row.OBJECT_NAME);
}

async function fetchDdl(connection, objectType, objectName) {
  const result = await connection.execute(
    `SELECT DBMS_METADATA.GET_DDL(:objectType, :objectName) AS DDL FROM dual`,
    { objectType, objectName },
    { fetchInfo: { DDL: { type: oracledb.STRING } } }
  );

  return result.rows?.[0]?.DDL || "";
}

async function fetchDependentDdl(connection, dependentType, baseObjectName) {
  const result = await connection.execute(
    `SELECT DBMS_METADATA.GET_DEPENDENT_DDL(:dependentType, :baseObjectName) AS DDL FROM dual`,
    { dependentType, baseObjectName },
    { fetchInfo: { DDL: { type: oracledb.STRING } } }
  );

  return result.rows?.[0]?.DDL || "";
}

async function setMetadataTransformParams(connection) {
  await connection.execute(`
    BEGIN
      DBMS_METADATA.SET_TRANSFORM_PARAM(DBMS_METADATA.SESSION_TRANSFORM, 'PRETTY', TRUE);
      DBMS_METADATA.SET_TRANSFORM_PARAM(DBMS_METADATA.SESSION_TRANSFORM, 'SQLTERMINATOR', TRUE);
      DBMS_METADATA.SET_TRANSFORM_PARAM(DBMS_METADATA.SESSION_TRANSFORM, 'SEGMENT_ATTRIBUTES', FALSE);
      DBMS_METADATA.SET_TRANSFORM_PARAM(DBMS_METADATA.SESSION_TRANSFORM, 'STORAGE', FALSE);
      DBMS_METADATA.SET_TRANSFORM_PARAM(DBMS_METADATA.SESSION_TRANSFORM, 'TABLESPACE', FALSE);
      DBMS_METADATA.SET_TRANSFORM_PARAM(DBMS_METADATA.SESSION_TRANSFORM, 'EMIT_SCHEMA', FALSE);
      DBMS_METADATA.SET_TRANSFORM_PARAM(DBMS_METADATA.SESSION_TRANSFORM, 'CONSTRAINTS', TRUE);
      DBMS_METADATA.SET_TRANSFORM_PARAM(DBMS_METADATA.SESSION_TRANSFORM, 'REF_CONSTRAINTS', TRUE);
    END;
  `);
}

function makeSectionHeader(title) {
  return `\n-- =========================\n-- ${title}\n-- =========================\n\n`;
}

async function appendSection(outputPath, sectionTitle, entries) {
  await fs.appendFile(outputPath, makeSectionHeader(sectionTitle), "utf8");

  for (const entry of entries) {
    await fs.appendFile(outputPath, `${entry}\n\n`, "utf8");
  }
}

async function exportByObjectType(connection, { title, objectType, listSql }) {
  const names = await queryObjectNames(connection, listSql);
  const ddls = [];

  for (const name of names) {
    try {
      const ddl = await fetchDdl(connection, objectType, name);
      if (ddl.trim()) ddls.push(ddl.trim());
    } catch (error) {
      ddls.push(`-- ERROR ${objectType} ${name}: ${error.message}`);
    }
  }

  return { title, ddls };
}

async function exportProgramUnits(connection) {
  const result = await connection.execute(`
    SELECT object_type AS OBJECT_TYPE, object_name AS OBJECT_NAME
    FROM user_objects
    WHERE object_type IN ('PROCEDURE', 'FUNCTION', 'PACKAGE', 'PACKAGE BODY', 'TYPE', 'TYPE BODY')
    ORDER BY object_type, object_name
  `);

  const rows = result.rows;

  const ddls = [];

  for (const row of rows) {
    try {
      const ddl = await fetchDdl(connection, row.OBJECT_TYPE, row.OBJECT_NAME);
      if (ddl.trim()) ddls.push(ddl.trim());
    } catch (error) {
      ddls.push(`-- ERROR ${row.OBJECT_TYPE} ${row.OBJECT_NAME}: ${error.message}`);
    }
  }

  return { title: "PROGRAM UNITS", ddls };
}

async function exportDependentForTables(connection, { title, dependentType }) {
  const tableNames = await queryObjectNames(
    connection,
    `SELECT table_name AS OBJECT_NAME FROM user_tables ORDER BY table_name`
  );
  const ddls = [];

  for (const tableName of tableNames) {
    try {
      const ddl = await fetchDependentDdl(connection, dependentType, tableName);
      if (ddl.trim()) ddls.push(ddl.trim());
    } catch (error) {
      ddls.push(`-- ERROR ${dependentType} ${tableName}: ${error.message}`);
    }
  }

  return { title, ddls };
}

async function main() {
  initOracleClientIfNeeded();

  const outputPath = path.resolve(process.cwd(), OUTPUT_FILE);
  const connectConfig = getConnectConfig();

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    let connection;

    try {
      await fs.writeFile(outputPath, "-- Oracle schema DDL export\n", "utf8");

      connection = await oracledb.getConnection(connectConfig);
      await setMetadataTransformParams(connection);

      const sections = [
        {
          title: "TABLES",
          objectType: "TABLE",
          listSql: `SELECT table_name AS OBJECT_NAME FROM user_tables ORDER BY table_name`,
        },
        {
          title: "SEQUENCES",
          objectType: "SEQUENCE",
          listSql: `SELECT sequence_name AS OBJECT_NAME FROM user_sequences ORDER BY sequence_name`,
        },
        {
          title: "VIEWS",
          objectType: "VIEW",
          listSql: `SELECT view_name AS OBJECT_NAME FROM user_views ORDER BY view_name`,
        },
        {
          title: "SYNONYMS",
          objectType: "SYNONYM",
          listSql: `SELECT synonym_name AS OBJECT_NAME FROM user_synonyms ORDER BY synonym_name`,
        },
        {
          title: "TRIGGERS",
          objectType: "TRIGGER",
          listSql: `SELECT trigger_name AS OBJECT_NAME FROM user_triggers ORDER BY trigger_name`,
        },
        {
          title: "INDEXES",
          objectType: "INDEX",
          listSql: `SELECT index_name AS OBJECT_NAME FROM user_indexes WHERE generated = 'N' ORDER BY index_name`,
        },
        // NOTE: Constraints are exported as part of TABLE DDL above (CONSTRAINTS=TRUE
        // and REF_CONSTRAINTS=TRUE are set via DBMS_METADATA.SET_TRANSFORM_PARAM).
        // GET_DDL('CONSTRAINT', ...) is not a valid standalone Oracle API call and
        // would produce error-comment lines for every constraint.
      ];

      for (const section of sections) {
        const { title, ddls } = await exportByObjectType(connection, section);
        await appendSection(outputPath, title, ddls);
      }

      const programUnits = await exportProgramUnits(connection);
      await appendSection(outputPath, programUnits.title, programUnits.ddls);

      const comments = await exportDependentForTables(connection, {
        title: "COMMENTS",
        dependentType: "COMMENT",
      });
      await appendSection(outputPath, comments.title, comments.ddls);

      const grants = await exportDependentForTables(connection, {
        title: "GRANTS",
        dependentType: "OBJECT_GRANT",
      });
      await appendSection(outputPath, grants.title, grants.ddls);

      console.log(`DDL exportado en: ${outputPath}`);
      return;
    } catch (error) {
      const retryable = isRetryableConnectionError(error);
      const hasAttemptsLeft = attempt < 3;

      if (!(retryable && hasAttemptsLeft)) {
        throw error;
      }
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch {
          // ignore close errors after export attempts
        }
      }
    }
  }
}

main().catch((error) => {
  console.error(`Fallo al exportar DDL: ${error.message}`);
  process.exit(1);
});
