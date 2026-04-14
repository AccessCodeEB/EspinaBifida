import { getConnection } from "../config/db.js";

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
}) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO CREDENCIALES (
         CURP,
         NUMERO_CREDENCIAL,
         FECHA_EMISION,
         FECHA_VIGENCIA_INICIO,
         FECHA_VIGENCIA_FIN,
         FECHA_ULTIMO_PAGO,
         OBSERVACIONES
       ) VALUES (
         :curp,
         :numeroCredencial,
         TO_DATE(:fechaEmision, 'YYYY-MM-DD'),
         TO_DATE(:fechaVigenciaInicio, 'YYYY-MM-DD'),
         TO_DATE(:fechaVigenciaFin, 'YYYY-MM-DD'),
         CASE WHEN :fechaUltimoPago IS NULL THEN NULL ELSE TO_DATE(:fechaUltimoPago, 'YYYY-MM-DD') END,
         :observaciones
       )`,
      {
        curp,
        numeroCredencial,
        fechaEmision,
        fechaVigenciaInicio,
        fechaVigenciaFin,
        fechaUltimoPago: fechaUltimoPago ?? null,
        observaciones: observaciones ?? null,
      },
      { autoCommit: true }
    );

    return result;
  } finally {
    await conn.close();
  }
}
