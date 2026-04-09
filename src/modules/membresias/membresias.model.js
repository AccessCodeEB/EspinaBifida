import { getConnection } from "../../config/db.js";

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
