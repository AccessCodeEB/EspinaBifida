import { getConnection } from "../config/db.js";

/**
 * Agrega columnas de pago a CREDENCIALES y actualiza SP_REGISTRAR_MEMBRESIA.
 * Idempotente: verifica USER_TAB_COLUMNS antes de cada ALTER TABLE.
 */
export async function runMigration004() {
  let conn;
  try {
    conn = await getConnection();

    // ── 1. MONTO ─────────────────────────────────────────────────────────────
    const { rows: r1 } = await conn.execute(
      `SELECT COUNT(*) AS CNT FROM USER_TAB_COLUMNS
       WHERE TABLE_NAME = 'CREDENCIALES' AND COLUMN_NAME = 'MONTO'`
    );
    if ((r1[0]?.CNT ?? r1[0]?.[0] ?? 0) === 0) {
      await conn.execute(`ALTER TABLE CREDENCIALES ADD MONTO NUMBER(10,2)`);
      console.log("[migration-004] ✅ Columna MONTO agregada a CREDENCIALES.");
    } else {
      console.log("[migration-004] MONTO ya existe en CREDENCIALES.");
    }

    // ── 2. METODO_PAGO ───────────────────────────────────────────────────────
    const { rows: r2 } = await conn.execute(
      `SELECT COUNT(*) AS CNT FROM USER_TAB_COLUMNS
       WHERE TABLE_NAME = 'CREDENCIALES' AND COLUMN_NAME = 'METODO_PAGO'`
    );
    if ((r2[0]?.CNT ?? r2[0]?.[0] ?? 0) === 0) {
      await conn.execute(`ALTER TABLE CREDENCIALES ADD METODO_PAGO VARCHAR2(30)`);
      console.log("[migration-004] ✅ Columna METODO_PAGO agregada a CREDENCIALES.");
    } else {
      console.log("[migration-004] METODO_PAGO ya existe en CREDENCIALES.");
    }

    // ── 3. REFERENCIA ────────────────────────────────────────────────────────
    const { rows: r3 } = await conn.execute(
      `SELECT COUNT(*) AS CNT FROM USER_TAB_COLUMNS
       WHERE TABLE_NAME = 'CREDENCIALES' AND COLUMN_NAME = 'REFERENCIA'`
    );
    if ((r3[0]?.CNT ?? r3[0]?.[0] ?? 0) === 0) {
      await conn.execute(`ALTER TABLE CREDENCIALES ADD REFERENCIA VARCHAR2(100)`);
      console.log("[migration-004] ✅ Columna REFERENCIA agregada a CREDENCIALES.");
    } else {
      console.log("[migration-004] REFERENCIA ya existe en CREDENCIALES.");
    }

    // ── 4. SP_REGISTRAR_MEMBRESIA — actualizar con nuevos campos de pago ─────
    await conn.execute(`
      CREATE OR REPLACE PROCEDURE SP_REGISTRAR_MEMBRESIA(
        p_curp            IN  VARCHAR2,
        p_num_credencial  IN  VARCHAR2,
        p_fecha_inicio    IN  DATE,
        p_fecha_fin       IN  DATE,
        p_fecha_pago      IN  DATE,
        p_fecha_emision   IN  DATE,
        p_observaciones   IN  VARCHAR2,
        p_id_credencial   OUT NUMBER,
        p_monto           IN  NUMBER   DEFAULT NULL,
        p_metodo_pago     IN  VARCHAR2 DEFAULT NULL,
        p_referencia      IN  VARCHAR2 DEFAULT NULL
      ) AS
        v_estatus VARCHAR2(10);
      BEGIN
        SELECT ESTATUS INTO v_estatus
        FROM BENEFICIARIOS
        WHERE CURP = p_curp;

        IF v_estatus = 'Baja' THEN
          RAISE_APPLICATION_ERROR(-20003,
            'Beneficiario en Baja: no puede registrar membresia');
        END IF;

        UPDATE CREDENCIALES
        SET FECHA_VIGENCIA_FIN = TRUNC(SYSDATE) - 1
        WHERE CURP = p_curp
          AND FECHA_VIGENCIA_FIN >= TRUNC(SYSDATE);

        INSERT INTO CREDENCIALES (
          CURP, NUMERO_CREDENCIAL,
          FECHA_VIGENCIA_INICIO, FECHA_VIGENCIA_FIN,
          FECHA_ULTIMO_PAGO, FECHA_EMISION, OBSERVACIONES,
          MONTO, METODO_PAGO, REFERENCIA
        ) VALUES (
          p_curp, p_num_credencial,
          p_fecha_inicio, p_fecha_fin,
          p_fecha_pago, p_fecha_emision, p_observaciones,
          p_monto, p_metodo_pago, p_referencia
        )
        RETURNING ID_CREDENCIAL INTO p_id_credencial;

        UPDATE BENEFICIARIOS
        SET ESTATUS = 'Activo'
        WHERE CURP = p_curp AND ESTATUS = 'Inactivo';

      EXCEPTION
        WHEN NO_DATA_FOUND THEN
          RAISE_APPLICATION_ERROR(-20004, 'Beneficiario no encontrado: ' || p_curp);
        WHEN OTHERS THEN
          RAISE;
      END SP_REGISTRAR_MEMBRESIA;
    `);
    console.log("[migration-004] ✅ SP_REGISTRAR_MEMBRESIA actualizado con campos de pago.");

    // ── 5. TRIGGER TRG_CREDENCIALES_BI — asigna ID via SEQ_CREDENCIALES ─────
    await conn.execute(`
      CREATE OR REPLACE TRIGGER TRG_CREDENCIALES_BI
      BEFORE INSERT ON CREDENCIALES
      FOR EACH ROW
      BEGIN
        IF :NEW.ID_CREDENCIAL IS NULL THEN
          SELECT SEQ_CREDENCIALES.NEXTVAL INTO :NEW.ID_CREDENCIAL FROM DUAL;
        END IF;
      END;
    `);
    console.log("[migration-004] ✅ Trigger TRG_CREDENCIALES_BI creado/actualizado.");

  } catch (err) {
    console.error("[migration-004] ❌ Error en migración:", err?.message ?? err);
  } finally {
    if (conn) await conn.close().catch(() => {});
  }
}
