/**
 * Migración 013 — Trazabilidad a nivel Oracle
 *
 * Agrega FECHA_CREACION y FECHA_MODIFICACION a las tablas core del sistema.
 * Los valores son mantenidos directamente por Oracle (DEFAULT + triggers BEFORE UPDATE),
 * lo que garantiza el registro aunque alguien ejecute SQL directo sin pasar por la app.
 *
 * Diseño:
 *   FECHA_CREACION  — DEFAULT SYSDATE en el DDL → Oracle lo asigna en cada INSERT automáticamente.
 *   FECHA_MODIFICACION — NULL hasta el primer UPDATE; trigger BEFORE UPDATE la actualiza.
 *
 * Casos especiales:
 *   BENEFICIARIOS          — ya tiene FECHA_ALTA como creación; solo se agrega FECHA_MODIFICACION.
 *   MOVIMIENTOS_INVENTARIO — registros inmutables (no se actualizan); solo FECHA_CREACION.
 */

import { getConnection } from "../config/db.js";

/** Tablas que reciben ambas columnas + trigger BEFORE UPDATE. */
const TABLAS_FULL = [
  "CREDENCIALES",
  "SERVICIOS",
  "ARTICULOS",
  "CITAS",
  "ADMINISTRADORES",
];

async function columnExists(conn, table, column) {
  const { rows } = await conn.execute(
    `SELECT COUNT(*) AS CNT FROM USER_TAB_COLUMNS
     WHERE TABLE_NAME = :t AND COLUMN_NAME = :c`,
    { t: table, c: column }
  );
  return Number(rows[0].CNT ?? rows[0][0]) > 0;
}

async function triggerExists(conn, triggerName) {
  const { rows } = await conn.execute(
    `SELECT COUNT(*) AS CNT FROM USER_TRIGGERS WHERE TRIGGER_NAME = :t`,
    { t: triggerName }
  );
  return Number(rows[0].CNT ?? rows[0][0]) > 0;
}

export async function runMigration013() {
  let conn;
  try {
    conn = await getConnection();

    // ── BENEFICIARIOS: solo FECHA_MODIFICACION (FECHA_ALTA = creación ya existe) ──────
    if (!(await columnExists(conn, "BENEFICIARIOS", "FECHA_MODIFICACION"))) {
      await conn.execute(
        `ALTER TABLE BENEFICIARIOS ADD FECHA_MODIFICACION DATE`
      );
      console.log("[migration-013] ✅ BENEFICIARIOS.FECHA_MODIFICACION agregada.");
    }
    if (!(await triggerExists(conn, "TRG_BENEFICIARIOS_BU"))) {
      await conn.execute(`
        CREATE OR REPLACE TRIGGER TRG_BENEFICIARIOS_BU
        BEFORE UPDATE ON BENEFICIARIOS
        FOR EACH ROW
        BEGIN
          :NEW.FECHA_MODIFICACION := SYSDATE;
        END;
      `);
      console.log("[migration-013] ✅ TRG_BENEFICIARIOS_BU creado.");
    }

    // ── MOVIMIENTOS_INVENTARIO: solo FECHA_CREACION (registros inmutables) ─────────────
    if (!(await columnExists(conn, "MOVIMIENTOS_INVENTARIO", "FECHA_CREACION"))) {
      await conn.execute(
        `ALTER TABLE MOVIMIENTOS_INVENTARIO ADD FECHA_CREACION DATE DEFAULT SYSDATE`
      );
      console.log("[migration-013] ✅ MOVIMIENTOS_INVENTARIO.FECHA_CREACION agregada.");
    }

    // ── Tablas con FECHA_CREACION + FECHA_MODIFICACION + trigger BEFORE UPDATE ─────────
    for (const tabla of TABLAS_FULL) {
      if (!(await columnExists(conn, tabla, "FECHA_CREACION"))) {
        await conn.execute(
          `ALTER TABLE ${tabla} ADD FECHA_CREACION DATE DEFAULT SYSDATE`
        );
        console.log(`[migration-013] ✅ ${tabla}.FECHA_CREACION agregada.`);
      }

      if (!(await columnExists(conn, tabla, "FECHA_MODIFICACION"))) {
        await conn.execute(
          `ALTER TABLE ${tabla} ADD FECHA_MODIFICACION DATE`
        );
        console.log(`[migration-013] ✅ ${tabla}.FECHA_MODIFICACION agregada.`);
      }

      const triggerName = `TRG_${tabla}_BU`;
      if (!(await triggerExists(conn, triggerName))) {
        await conn.execute(`
          CREATE OR REPLACE TRIGGER ${triggerName}
          BEFORE UPDATE ON ${tabla}
          FOR EACH ROW
          BEGIN
            :NEW.FECHA_MODIFICACION := SYSDATE;
          END;
        `);
        console.log(`[migration-013] ✅ ${triggerName} creado.`);
      }
    }

    await conn.commit();
    console.log("[migration-013] ✅ Trazabilidad Oracle activada en todas las tablas core.");
  } catch (err) {
    console.error("[migration-013] ❌ Error:", err?.message ?? err);
  } finally {
    if (conn) await conn.close().catch(() => {});
  }
}
