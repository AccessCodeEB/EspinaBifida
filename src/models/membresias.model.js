import oracledb from "oracledb";
import { getConnection } from "../config/db.js";
import { HttpError } from "../utils/httpErrors.js";

export async function findAll() {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT c.CURP,
              b.NOMBRES || ' ' || b.APELLIDO_PATERNO || ' ' || NVL(b.APELLIDO_MATERNO, '') AS NOMBRE_COMPLETO,
              c.NUMERO_CREDENCIAL,
              c.FECHA_VIGENCIA_INICIO,
              c.FECHA_VIGENCIA_FIN,
              c.FECHA_ULTIMO_PAGO,
              c.OBSERVACIONES,
              c.MONTO,
              c.METODO_PAGO,
              c.REFERENCIA,
              (c.FECHA_VIGENCIA_FIN - TRUNC(SYSDATE)) AS DIAS_RESTANTES,
              CASE
                WHEN c.FECHA_VIGENCIA_FIN >= TRUNC(SYSDATE) AND c.FECHA_VIGENCIA_FIN - TRUNC(SYSDATE) > 30 THEN 'Activa'
                WHEN c.FECHA_VIGENCIA_FIN >= TRUNC(SYSDATE) AND c.FECHA_VIGENCIA_FIN - TRUNC(SYSDATE) <= 30 THEN 'Por vencer'
                ELSE 'Vencida'
              END AS ESTATUS_MEMBRESIA
       FROM CREDENCIALES c
       JOIN BENEFICIARIOS b ON b.CURP = c.CURP
       WHERE c.ID_CREDENCIAL = (
         SELECT MAX(c2.ID_CREDENCIAL)
         FROM CREDENCIALES c2
         WHERE c2.CURP = c.CURP
       )
       ORDER BY c.FECHA_VIGENCIA_FIN ASC`
    );
    return result.rows;
  } finally {
    await conn.close();
  }
}

export async function findPagosRecientes(limit = 20) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT c.ID_CREDENCIAL,
              c.CURP,
              b.NOMBRES || ' ' || b.APELLIDO_PATERNO || ' ' || NVL(b.APELLIDO_MATERNO, '') AS NOMBRE_COMPLETO,
              c.FECHA_EMISION,
              c.FECHA_VIGENCIA_INICIO,
              c.FECHA_VIGENCIA_FIN,
              c.FECHA_ULTIMO_PAGO,
              c.MONTO,
              c.METODO_PAGO,
              c.REFERENCIA,
              c.OBSERVACIONES
       FROM CREDENCIALES c
       JOIN BENEFICIARIOS b ON b.CURP = c.CURP
       ORDER BY c.FECHA_EMISION DESC, c.ID_CREDENCIAL DESC
       FETCH FIRST :limit ROWS ONLY`,
      { limit }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
}

export async function findBeneficiarioByCurp(curp) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT CURP
       FROM BENEFICIARIOS
       WHERE CURP = :curp`,
      { curp }
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
}

export async function findLastByCurp(curp) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         ID_CREDENCIAL,
         CURP,
         NUMERO_CREDENCIAL,
         FECHA_EMISION,
         FECHA_VIGENCIA_INICIO,
         FECHA_VIGENCIA_FIN,
         FECHA_ULTIMO_PAGO,
         OBSERVACIONES
       FROM CREDENCIALES
       WHERE CURP = :curp
       ORDER BY FECHA_EMISION DESC, ID_CREDENCIAL DESC
       FETCH FIRST 1 ROWS ONLY`,
      { curp }
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
}

export async function hasPeriodOverlap(curp, fechaInicio, fechaFin) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT COUNT(1) AS TOTAL
       FROM CREDENCIALES
       WHERE CURP = :curp
         AND FECHA_VIGENCIA_INICIO <= TO_DATE(:fechaFin, 'YYYY-MM-DD')
         AND NVL(FECHA_VIGENCIA_FIN, DATE '9999-12-31') >= TO_DATE(:fechaInicio, 'YYYY-MM-DD')`,
      {
        curp,
        fechaInicio,
        fechaFin,
      }
    );
    return Number(result.rows?.[0]?.TOTAL ?? 0) > 0;
  } finally {
    await conn.close();
  }
}

export async function findMembresiaActivaByCurp(curp) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         ID_CREDENCIAL,
         CURP,
         NUMERO_CREDENCIAL,
         FECHA_EMISION,
         FECHA_VIGENCIA_INICIO,
         FECHA_VIGENCIA_FIN,
         FECHA_ULTIMO_PAGO,
         OBSERVACIONES
       FROM CREDENCIALES
       WHERE CURP = :curp
         AND TRUNC(SYSDATE) BETWEEN FECHA_VIGENCIA_INICIO AND FECHA_VIGENCIA_FIN
       ORDER BY FECHA_VIGENCIA_FIN DESC, ID_CREDENCIAL DESC
       FETCH FIRST 1 ROWS ONLY`,
      { curp }
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
}

export async function setBeneficiarioInactivo(curp) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE BENEFICIARIOS
       SET ESTATUS = 'Inactivo'
       WHERE CURP = :curp
         AND NVL(ESTATUS, 'Activo') NOT IN ('Inactivo', 'Baja')`,
      { curp },
      { autoCommit: true }
    );
    return result.rowsAffected ?? 0;
  } finally {
    await conn.close();
  }
}

export async function setBeneficiarioBaja(curp) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE BENEFICIARIOS
       SET ESTATUS = 'Baja'
       WHERE CURP = :curp
         AND ESTATUS NOT IN ('Baja')`,
      { curp },
      { autoCommit: true }
    );
    return result.rowsAffected ?? 0;
  } finally {
    await conn.close();
  }
}

/** Sincroniza ESTATUS de todos los beneficiarios según días vencidos de su membresía. */
export async function syncEstados() {
  const conn = await getConnection();
  try {
    // Credencial vencida (cualquier antigüedad) → Inactivo
    // Solo aplica a beneficiarios con al menos una credencial registrada
    await conn.execute(
      `UPDATE BENEFICIARIOS b
       SET ESTATUS = 'Inactivo'
       WHERE ESTATUS = 'Activo'
         AND NOT EXISTS (
           SELECT 1 FROM CREDENCIALES c
           WHERE c.CURP = b.CURP
             AND c.FECHA_VIGENCIA_FIN >= TRUNC(SYSDATE)
         )
         AND EXISTS (
           SELECT 1 FROM CREDENCIALES c
           WHERE c.CURP = b.CURP
         )`,
      {},
      { autoCommit: true }
    );

    // Inactivo con credencial vencida hace más de 30 días → Baja
    await conn.execute(
      `UPDATE BENEFICIARIOS b
       SET ESTATUS = 'Baja'
       WHERE ESTATUS = 'Inactivo'
         AND EXISTS (
           SELECT 1 FROM CREDENCIALES c WHERE c.CURP = b.CURP
         )
         AND (
           SELECT MAX(c.FECHA_VIGENCIA_FIN)
           FROM CREDENCIALES c
           WHERE c.CURP = b.CURP
         ) < TRUNC(SYSDATE) - 30`,
      {},
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
}

export async function cancelarPorCurp(curp) {
  const conn = await getConnection();
  try {
    await conn.execute(
      `UPDATE CREDENCIALES
       SET FECHA_VIGENCIA_FIN = TRUNC(SYSDATE),
           OBSERVACIONES = 'Cancelada por baja de beneficiario'
       WHERE CURP = :curp
         AND (FECHA_VIGENCIA_FIN IS NULL OR FECHA_VIGENCIA_FIN > TRUNC(SYSDATE))`,
      { curp },
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
}

export async function create({
  curp,
  numeroCredencial,
  fechaEmision,
  fechaVigenciaInicio,
  fechaVigenciaFin,
  fechaUltimoPago,
  observaciones,
  monto,
  metodoPago,
  referencia,
}) {
  const toDate = (v) => {
    if (!v) return null;
    return v instanceof Date ? v : new Date(v);
  };

  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `BEGIN
         SP_REGISTRAR_MEMBRESIA(
           p_curp           => :curp,
           p_num_credencial => :num,
           p_fecha_inicio   => :ini,
           p_fecha_fin      => :fin,
           p_fecha_pago     => :pago,
           p_fecha_emision  => :emision,
           p_observaciones  => :obs,
           p_id_credencial  => :id_out,
           p_monto          => :monto,
           p_metodo_pago    => :metodo_pago,
           p_referencia     => :referencia
         );
       END;`,
      {
        curp:        curp,
        num:         numeroCredencial,
        ini:         { val: toDate(fechaVigenciaInicio), type: oracledb.DB_TYPE_DATE },
        fin:         { val: toDate(fechaVigenciaFin),    type: oracledb.DB_TYPE_DATE },
        pago:        { val: toDate(fechaUltimoPago),     type: oracledb.DB_TYPE_DATE },
        emision:     { val: toDate(fechaEmision),        type: oracledb.DB_TYPE_DATE },
        obs:         observaciones ?? null,
        id_out:      { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        monto:       monto ?? null,
        metodo_pago: metodoPago ?? null,
        referencia:  referencia ?? null,
      }
    );
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    if (err.errorNum === 20003) {
      throw new HttpError(403, "Beneficiario en Baja", "BENEFICIARIO_BAJA");
    }
    if (err.errorNum === 20004) {
      throw new HttpError(404, "Beneficiario no encontrado", "NOT_FOUND");
    }
    throw err;
  } finally {
    await conn.close();
  }
}
