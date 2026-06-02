import { getConnection } from "../config/db.js";

/**
 * Migración 029 — Tablas ESPECIALIDADES_HORARIO y ESPECIALIDADES_EXCEPCIONES
 *
 * Crea las tablas de horarios y excepciones de especialidades si no existen,
 * e inserta los datos iniciales de las 4 especialidades reales.
 *
 * Idempotente: verifica USER_TABLES antes de CREATE TABLE.
 */
export async function runMigration029() {
  let conn;
  try {
    conn = await getConnection();

    // ── 1. Tabla principal ──────────────────────────────────────────────────
    const { rows: tablaHorario } = await conn.execute(
      `SELECT COUNT(*) AS CNT FROM USER_TABLES WHERE TABLE_NAME = 'ESPECIALIDADES_HORARIO'`
    );
    const existeHorario = Number(tablaHorario[0]?.CNT ?? tablaHorario[0]?.[0] ?? 0) > 0;

    if (!existeHorario) {
      await conn.execute(`
        CREATE TABLE ESPECIALIDADES_HORARIO (
          ID_ESPECIALIDAD   NUMBER          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          NOMBRE            VARCHAR2(100)   NOT NULL,
          DIA_SEMANA        NUMBER(1)       NOT NULL,
          HORA_INICIO       VARCHAR2(5)     NOT NULL,
          HORA_FIN          VARCHAR2(5)     NULL,
          CAPACIDAD_MAX     NUMBER          NULL,
          TIPO_FRECUENCIA   VARCHAR2(30)    DEFAULT 'SEMANAL' NOT NULL
            CONSTRAINT CHK_ESP_HOR_FRECUENCIA
              CHECK (TIPO_FRECUENCIA IN ('SEMANAL', 'MENSUAL_PRIMER_DIA')),
          ACTIVO            NUMBER(1,0)     DEFAULT 1 NOT NULL
            CONSTRAINT CHK_ESP_HOR_ACTIVO CHECK (ACTIVO IN (0, 1)),
          NOTAS             VARCHAR2(500)   NULL
        )
      `);
      console.log("[migration-029] ✅ Tabla ESPECIALIDADES_HORARIO creada.");

      // Datos iniciales
      const especialidades = [
        { nombre: "Gastroenterología", dia: 4, inicio: "10:00", fin: null,    cap: 2,    frec: "SEMANAL",            notas: "Dr. Lines — Jueves a partir de las 10am" },
        { nombre: "Urología",          dia: 4, inicio: "09:30", fin: "12:00", cap: null, frec: "SEMANAL",            notas: null },
        { nombre: "Psicología",        dia: 5, inicio: "10:00", fin: "12:00", cap: 3,    frec: "SEMANAL",            notas: null },
        { nombre: "Cirugía",           dia: 3, inicio: "08:00", fin: null,    cap: null, frec: "MENSUAL_PRIMER_DIA", notas: "Dr. Lines — primer miércoles del mes" },
      ];
      for (const esp of especialidades) {
        await conn.execute(
          `INSERT INTO ESPECIALIDADES_HORARIO
             (NOMBRE, DIA_SEMANA, HORA_INICIO, HORA_FIN, CAPACIDAD_MAX, TIPO_FRECUENCIA, NOTAS)
           VALUES
             (:nombre, :dia, :inicio, :fin, :cap, :frec, :notas)`,
          { nombre: esp.nombre, dia: esp.dia, inicio: esp.inicio, fin: esp.fin ?? null,
            cap: esp.cap ?? null, frec: esp.frec, notas: esp.notas ?? null },
          { autoCommit: false }
        );
      }
      await conn.execute("COMMIT");
      console.log("[migration-029] ✅ Datos iniciales de especialidades insertados.");
    } else {
      console.log("[migration-029] ESPECIALIDADES_HORARIO ya existe.");
    }

    // ── 2. Tabla de excepciones ─────────────────────────────────────────────
    const { rows: tablaExc } = await conn.execute(
      `SELECT COUNT(*) AS CNT FROM USER_TABLES WHERE TABLE_NAME = 'ESPECIALIDADES_EXCEPCIONES'`
    );
    const existeExc = Number(tablaExc[0]?.CNT ?? tablaExc[0]?.[0] ?? 0) > 0;

    if (!existeExc) {
      await conn.execute(`
        CREATE TABLE ESPECIALIDADES_EXCEPCIONES (
          ID_EXCEPCION      NUMBER        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          ID_ESPECIALIDAD   NUMBER        NOT NULL
            CONSTRAINT FK_ESP_EXC_ESP REFERENCES ESPECIALIDADES_HORARIO(ID_ESPECIALIDAD),
          FECHA             DATE          NOT NULL,
          MOTIVO            VARCHAR2(500) NULL,
          CREATED_AT        TIMESTAMP     DEFAULT SYSTIMESTAMP
        )
      `);
      await conn.execute(`
        CREATE INDEX IDX_ESP_EXC_ESP_FECHA
          ON ESPECIALIDADES_EXCEPCIONES(ID_ESPECIALIDAD, FECHA)
      `);
      console.log("[migration-029] ✅ Tabla ESPECIALIDADES_EXCEPCIONES creada.");
    } else {
      console.log("[migration-029] ESPECIALIDADES_EXCEPCIONES ya existe.");
    }

    console.log("[migration-029] ✅ Migración completa.");
  } catch (err) {
    console.error("[migration-029] ❌ Error:", err?.message ?? err);
    throw err;
  } finally {
    if (conn) await conn.close().catch(() => {});
  }
}
