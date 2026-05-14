import oracledb from 'oracledb';
import { getConnection } from '../config/db.js';
import { buildInClause } from '../utils/reporteHelpers.js';
import { MUNICIPIOS_AMM } from '../utils/municipiosAMM.js';

// IDs de SERVICIOS_CATALOGO que corresponden a estudios médicos.
// Ejecutar: SELECT ID_TIPO_SERVICIO, NOMBRE FROM SERVICIOS_CATALOGO
// y llenar con los IDs correctos antes del primer despliegue.
export const ESTUDIOS_IDS = [];

// ── 1. Resumen estadístico del periodo ────────────────────────────────────────
// Nota: usa :ff (fecha fin del periodo) para grupos de edad — NO SYSDATE.
// Un paciente que cumplió 18 en febrero no debe aparecer como Adulto en enero.
export async function getResumenPeriodo(fechaInicio, fechaFin) {
  const conn = await getConnection();
  try {
    const { placeholders: ammPH, binds: ammBinds } = buildInClause(MUNICIPIOS_AMM, 'm');

    const result = await conn.execute(`
      SELECT
        (SELECT COUNT(*) FROM CREDENCIALES
         WHERE FECHA_VIGENCIA_INICIO BETWEEN :fi AND :ff) AS CANT_CREDENCIALES,

        COUNT(S.ID_SERVICIO)                              AS CANT_SERVICIOS,
        COUNT(CASE WHEN S.MONTO_PAGADO = 0 THEN 1 END)   AS EXENTOS,
        COUNT(CASE WHEN S.MONTO_PAGADO > 0 THEN 1 END)   AS CON_CUOTA,

        COUNT(DISTINCT CASE WHEN B.GENERO = 'Masculino' THEN B.CURP END) AS HOMBRES,
        COUNT(DISTINCT CASE WHEN B.GENERO = 'Femenino'  THEN B.CURP END) AS MUJERES,

        COUNT(DISTINCT CASE WHEN B.MUNICIPIO IN (${ammPH})
                             THEN B.CURP END)             AS URBANO,
        COUNT(DISTINCT CASE WHEN B.MUNICIPIO NOT IN (${ammPH})
                             THEN B.CURP END)             AS RURAL,

        COUNT(DISTINCT CASE WHEN
          TRUNC(MONTHS_BETWEEN(:ff, B.FECHA_NACIMIENTO)/12) BETWEEN 0 AND 2
          THEN B.CURP END)                                AS LACTANTES,
        COUNT(DISTINCT CASE WHEN
          TRUNC(MONTHS_BETWEEN(:ff, B.FECHA_NACIMIENTO)/12) BETWEEN 3 AND 11
          THEN B.CURP END)                                AS NINOS,
        COUNT(DISTINCT CASE WHEN
          TRUNC(MONTHS_BETWEEN(:ff, B.FECHA_NACIMIENTO)/12) BETWEEN 12 AND 17
          THEN B.CURP END)                                AS ADOLESCENTES,
        COUNT(DISTINCT CASE WHEN
          TRUNC(MONTHS_BETWEEN(:ff, B.FECHA_NACIMIENTO)/12) >= 18
          THEN B.CURP END)                                AS ADULTOS

      FROM SERVICIOS S
      JOIN BENEFICIARIOS B ON S.CURP = B.CURP
      WHERE S.FECHA BETWEEN :fi AND :ff
    `,
    { fi: new Date(fechaInicio), ff: new Date(fechaFin), ...ammBinds },
    { outFormat: oracledb.OUT_FORMAT_OBJECT });

    return result.rows[0];
  } finally {
    await conn.close();
  }
}

// ── 2. Detalle de servicios consumidos (artículos + tipos de servicio) ────────
// UNION ALL: artículos con cantidades + tipos de servicio sin artículos (consultas)
export async function getDetalleServicios(fechaInicio, fechaFin) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(`
      SELECT NOMBRE, CANTIDAD, UNIDAD FROM (
        SELECT A.DESCRIPCION AS NOMBRE, SUM(SA.CANTIDAD) AS CANTIDAD, A.UNIDAD
        FROM SERVICIO_ARTICULOS SA
        JOIN ARTICULOS A ON SA.ID_ARTICULO = A.ID_ARTICULO
        JOIN SERVICIOS S  ON SA.ID_SERVICIO = S.ID_SERVICIO
        WHERE S.FECHA BETWEEN :fi AND :ff
        GROUP BY A.DESCRIPCION, A.UNIDAD

        UNION ALL

        SELECT SC.NOMBRE, COUNT(S.ID_SERVICIO) AS CANTIDAD, 'CITA' AS UNIDAD
        FROM SERVICIOS S
        JOIN SERVICIOS_CATALOGO SC ON S.ID_TIPO_SERVICIO = SC.ID_TIPO_SERVICIO
        WHERE S.FECHA BETWEEN :fi AND :ff
          AND S.ID_SERVICIO NOT IN (SELECT ID_SERVICIO FROM SERVICIO_ARTICULOS)
        GROUP BY SC.NOMBRE
      )
      ORDER BY CANTIDAD DESC
    `,
    { fi: new Date(fechaInicio), ff: new Date(fechaFin) },
    { outFormat: oracledb.OUT_FORMAT_OBJECT });

    return result.rows;
  } finally {
    await conn.close();
  }
}

// ── 3. Distribución de pacientes atendidos por municipio ──────────────────────
export async function getDistribucionCiudades(fechaInicio, fechaFin) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(`
      SELECT B.MUNICIPIO AS CIUDAD, COUNT(DISTINCT B.CURP) AS CANTIDAD
      FROM SERVICIOS S
      JOIN BENEFICIARIOS B ON S.CURP = B.CURP
      WHERE S.FECHA BETWEEN :fi AND :ff
      GROUP BY B.MUNICIPIO
      ORDER BY CANTIDAD DESC
    `,
    { fi: new Date(fechaInicio), ff: new Date(fechaFin) },
    { outFormat: oracledb.OUT_FORMAT_OBJECT });

    return result.rows;
  } finally {
    await conn.close();
  }
}

// ── 4. Estudios médicos (subconjunto de SERVICIOS_CATALOGO) ───────────────────
// Retorna [] si ESTUDIOS_IDS no está configurado.
export async function getEstudios(fechaInicio, fechaFin) {
  if (ESTUDIOS_IDS.length === 0) return [];

  const conn = await getConnection();
  try {
    const { placeholders, binds } = buildInClause(ESTUDIOS_IDS, 'e');
    const result = await conn.execute(`
      SELECT SC.NOMBRE, COUNT(S.ID_SERVICIO) AS CANTIDAD
      FROM SERVICIOS S
      JOIN SERVICIOS_CATALOGO SC ON S.ID_TIPO_SERVICIO = SC.ID_TIPO_SERVICIO
      WHERE S.FECHA BETWEEN :fi AND :ff
        AND S.ID_TIPO_SERVICIO IN (${placeholders})
      GROUP BY SC.NOMBRE
      ORDER BY CANTIDAD DESC
    `,
    { fi: new Date(fechaInicio), ff: new Date(fechaFin), ...binds },
    { outFormat: oracledb.OUT_FORMAT_OBJECT });

    return result.rows;
  } finally {
    await conn.close();
  }
}

// ── 5. Persistencia de reportes generados ────────────────────────────────────
export async function guardarRegistro({ tipo, fechaInicio, fechaFin, rutaPdf, rutaXlsx, generadoPor = null }) {
  const conn = await getConnection();
  try {
    await conn.execute(`
      INSERT INTO REPORTES_GENERADOS (TIPO, FECHA_INICIO, FECHA_FIN, RUTA_PDF, RUTA_XLSX, GENERADO_POR)
      VALUES (:tipo, :fi, :ff, :pdf, :xlsx, :admin)
    `, {
      tipo,
      fi:    new Date(fechaInicio),
      ff:    new Date(fechaFin),
      pdf:   rutaPdf  ?? null,
      xlsx:  rutaXlsx ?? null,
      admin: generadoPor,
    });
    await conn.commit();
  } finally {
    await conn.close();
  }
}

export async function findHistorico(page, limit) {
  const conn = await getConnection();
  try {
    const offset = (page - 1) * limit;
    const result = await conn.execute(`
      SELECT ID_REPORTE, TIPO, FECHA_INICIO, FECHA_FIN, FECHA_GEN, RUTA_PDF, RUTA_XLSX
      FROM REPORTES_GENERADOS
      ORDER BY FECHA_GEN DESC
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `, { offset, limit }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

    return result.rows;
  } finally {
    await conn.close();
  }
}

export async function findById(id) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT * FROM REPORTES_GENERADOS WHERE ID_REPORTE = :id`,
      { id }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
}
