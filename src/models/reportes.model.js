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

// ── 4. Atenciones agrupadas por mes ──────────────────────────────────────────
export async function getAtencionesPorMes(fechaInicio, fechaFin) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(`
      SELECT
        TO_CHAR(TRUNC(S.FECHA, 'MM'), 'YYYY-MM') AS MES,
        COUNT(DISTINCT S.CURP)                    AS PACIENTES,
        COUNT(S.ID_SERVICIO)                      AS SERVICIOS
      FROM SERVICIOS S
      WHERE S.FECHA BETWEEN :fi AND :ff
      GROUP BY TRUNC(S.FECHA, 'MM')
      ORDER BY TRUNC(S.FECHA, 'MM')
    `,
    { fi: new Date(fechaInicio), ff: new Date(fechaFin) },
    { outFormat: oracledb.OUT_FORMAT_OBJECT });

    return result.rows;
  } finally {
    await conn.close();
  }
}

// ── 5. Estudios médicos (subconjunto de SERVICIOS_CATALOGO) ───────────────────
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

// ── 6. Beneficiarios con servicio en el periodo ───────────────────────────────
export async function getBeneficiariosPeriodo(fechaInicio, fechaFin) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(`
      SELECT DISTINCT
        B.CURP,
        B.NOMBRES || ' ' || B.APELLIDO_PATERNO || ' ' || B.APELLIDO_MATERNO AS NOMBRE_COMPLETO,
        B.GENERO,
        B.MUNICIPIO,
        B.ESTADO,
        B.ESTATUS
      FROM BENEFICIARIOS B
      JOIN SERVICIOS S ON B.CURP = S.CURP
      WHERE S.FECHA BETWEEN :fi AND :ff
      ORDER BY B.APELLIDO_PATERNO, B.NOMBRES
    `,
    { fi: new Date(fechaInicio), ff: new Date(fechaFin) },
    { outFormat: oracledb.OUT_FORMAT_OBJECT });

    return result.rows;
  } finally {
    await conn.close();
  }
}

// ── 7. Membresías vigentes o que se superponen con el periodo ─────────────────
export async function getMembresias(fechaInicio, fechaFin) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(`
      SELECT
        B.NOMBRES || ' ' || B.APELLIDO_PATERNO AS NOMBRE,
        B.CURP,
        C.NUMERO_CREDENCIAL,
        C.FECHA_VIGENCIA_INICIO,
        C.FECHA_VIGENCIA_FIN,
        C.FECHA_ULTIMO_PAGO,
        CASE
          WHEN SYSDATE BETWEEN C.FECHA_VIGENCIA_INICIO AND C.FECHA_VIGENCIA_FIN
               AND (C.FECHA_VIGENCIA_FIN - SYSDATE) <= 30 THEN 'Por vencer'
          WHEN SYSDATE BETWEEN C.FECHA_VIGENCIA_INICIO AND C.FECHA_VIGENCIA_FIN THEN 'Activa'
          WHEN C.FECHA_VIGENCIA_FIN < SYSDATE THEN 'Vencida'
          ELSE 'Futura'
        END AS ESTADO
      FROM CREDENCIALES C
      JOIN BENEFICIARIOS B ON C.CURP = B.CURP
      WHERE C.FECHA_VIGENCIA_INICIO BETWEEN :fi AND :ff
         OR C.FECHA_VIGENCIA_FIN    BETWEEN :fi AND :ff
         OR (C.FECHA_VIGENCIA_INICIO <= :fi AND C.FECHA_VIGENCIA_FIN >= :ff)
      ORDER BY C.FECHA_VIGENCIA_FIN DESC
    `,
    { fi: new Date(fechaInicio), ff: new Date(fechaFin) },
    { outFormat: oracledb.OUT_FORMAT_OBJECT });

    return result.rows;
  } finally {
    await conn.close();
  }
}

// ── 8. Detalle de servicios individuales del periodo ─────────────────────────
export async function getServiciosPeriodo(fechaInicio, fechaFin) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(`
      SELECT
        TO_CHAR(S.FECHA, 'YYYY-MM-DD') AS FECHA,
        B.NOMBRES || ' ' || B.APELLIDO_PATERNO AS NOMBRE,
        B.CURP,
        SC.NOMBRE AS TIPO_SERVICIO,
        S.COSTO,
        S.MONTO_PAGADO,
        CASE WHEN S.MONTO_PAGADO = 0 THEN 'Exento' ELSE 'Con cuota' END AS MODALIDAD
      FROM SERVICIOS S
      JOIN BENEFICIARIOS B ON S.CURP = B.CURP
      JOIN SERVICIOS_CATALOGO SC ON S.ID_TIPO_SERVICIO = SC.ID_TIPO_SERVICIO
      WHERE S.FECHA BETWEEN :fi AND :ff
      ORDER BY S.FECHA DESC
    `,
    { fi: new Date(fechaInicio), ff: new Date(fechaFin) },
    { outFormat: oracledb.OUT_FORMAT_OBJECT });

    return result.rows;
  } finally {
    await conn.close();
  }
}

// ── 9. Stock actual de todos los artículos ────────────────────────────────────
export async function getArticulosStock() {
  const conn = await getConnection();
  try {
    const result = await conn.execute(`
      SELECT
        A.ID_ARTICULO,
        A.DESCRIPCION,
        A.UNIDAD,
        A.INVENTARIO_ACTUAL,
        A.CUOTA_RECUPERACION,
        A.MANEJA_INVENTARIO
      FROM ARTICULOS A
      ORDER BY A.DESCRIPCION
    `,
    {},
    { outFormat: oracledb.OUT_FORMAT_OBJECT });

    return result.rows;
  } finally {
    await conn.close();
  }
}

// ── 10. Movimientos de inventario en el periodo ───────────────────────────────
export async function getMovimientosPeriodo(fechaInicio, fechaFin) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(`
      SELECT
        A.DESCRIPCION AS ARTICULO,
        M.TIPO_MOVIMIENTO,
        M.CANTIDAD,
        TO_CHAR(M.FECHA, 'YYYY-MM-DD') AS FECHA,
        M.MOTIVO
      FROM MOVIMIENTOS_INVENTARIO M
      JOIN ARTICULOS A ON M.ID_ARTICULO = A.ID_ARTICULO
      WHERE M.FECHA BETWEEN :fi AND :ff
      ORDER BY M.FECHA DESC
    `,
    { fi: new Date(fechaInicio), ff: new Date(fechaFin) },
    { outFormat: oracledb.OUT_FORMAT_OBJECT });

    return result.rows;
  } finally {
    await conn.close();
  }
}

// ── 11. Citas del periodo ─────────────────────────────────────────────────────
export async function getCitasPeriodo(fechaInicio, fechaFin) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(`
      SELECT
        TO_CHAR(C.FECHA, 'YYYY-MM-DD') AS FECHA,
        B.NOMBRES || ' ' || B.APELLIDO_PATERNO AS NOMBRE,
        B.CURP,
        SC.NOMBRE AS TIPO_SERVICIO,
        C.ESPECIALISTA,
        C.ESTATUS
      FROM CITAS C
      JOIN BENEFICIARIOS B ON C.CURP = B.CURP
      JOIN SERVICIOS_CATALOGO SC ON C.ID_TIPO_SERVICIO = SC.ID_TIPO_SERVICIO
      WHERE C.FECHA BETWEEN :fi AND :ff
      ORDER BY C.FECHA DESC
    `,
    { fi: new Date(fechaInicio), ff: new Date(fechaFin) },
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
      SELECT ID_REPORTE, TIPO, FECHA_INICIO, FECHA_FIN, FECHA_GEN AS FECHA_GENERACION, RUTA_PDF, RUTA_XLSX
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
