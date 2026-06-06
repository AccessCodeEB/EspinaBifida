import { getConnection } from "../config/db.js";

/**
 * Migración 032 — Agregar DURACION_CITA a ESPECIALIDADES_HORARIO
 *
 * Añade la columna DURACION_CITA (minutos por cita) a la tabla de horarios
 * y actualiza los valores iniciales por especialidad.
 *
 * Idempotente: omite el ALTER TABLE si la columna ya existe,
 * pero siempre ejecuta los UPDATEs (son seguros de re-ejecutar).
 */
export async function runMigration032() {
  let conn;
  try {
    conn = await getConnection();

    // ── 1. Verificar si la columna ya existe ────────────────────────────────
    const { rows: colRows } = await conn.execute(
      `SELECT COUNT(*) AS CNT
         FROM USER_TAB_COLUMNS
        WHERE TABLE_NAME  = 'ESPECIALIDADES_HORARIO'
          AND COLUMN_NAME = 'DURACION_CITA'`
    );
    const existeColumna = Number(colRows[0]?.CNT ?? colRows[0]?.[0] ?? 0) > 0;

    if (!existeColumna) {
      // ── 2. Agregar columna ───────────────────────────────────────────────
      await conn.execute(
        `ALTER TABLE ESPECIALIDADES_HORARIO
           ADD DURACION_CITA NUMBER(4) DEFAULT 30 NOT NULL`
      );
      console.log("[migration-032] ✅ Columna DURACION_CITA agregada.");

      // ── 3. Comentario descriptivo ────────────────────────────────────────
      await conn.execute(
        `COMMENT ON COLUMN ESPECIALIDADES_HORARIO.DURACION_CITA IS
         'Duración en minutos de cada cita. Determina los intervalos de slots disponibles.'`
      );
      console.log("[migration-032] ✅ Comentario de columna agregado.");
    } else {
      console.log("[migration-032] Columna DURACION_CITA ya existe, se omite ALTER TABLE.");
    }

    // ── 4. Actualizar valores por especialidad ───────────────────────────────
    // Siempre se ejecutan — idempotente (asignar el mismo valor no tiene efecto).
    const updates = [
      { nombre: "Gastroenterología", duracion: 30 },
      { nombre: "Urología",          duracion: 30 },
      { nombre: "Psicología",        duracion: 60 },
      { nombre: "Cirugía",           duracion: 45 },
    ];

    for (const { nombre, duracion } of updates) {
      const { rowsAffected } = await conn.execute(
        `UPDATE ESPECIALIDADES_HORARIO
            SET DURACION_CITA = :duracion
          WHERE NOMBRE = :nombre`,
        { duracion, nombre },
        { autoCommit: false }
      );
      console.log(`[migration-032] UPDATE ${nombre}: ${rowsAffected ?? 0} fila(s) afectada(s).`);
    }

    await conn.execute("COMMIT");
    console.log("[migration-032] ✅ Migración completa.");
  } catch (err) {
    console.error("[migration-032] ❌ Error:", err?.message ?? err);
    throw err;
  } finally {
    if (conn) await conn.close().catch(() => {});
  }
}
