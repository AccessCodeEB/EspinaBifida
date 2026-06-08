import oracledb from 'oracledb';
import { withConnection } from '../config/db.js';
import { buildInClause } from '../utils/reporteHelpers.js';
import { CAPITALES_ESTADOS } from '../utils/municipiosAMM.js';

// IDs de SERVICIOS_CATALOGO que corresponden a estudios médicos.
// Ejecutar: SELECT ID_TIPO_SERVICIO, NOMBRE FROM SERVICIOS_CATALOGO
// y llenar con los IDs correctos antes del primer despliegue.
export const ESTUDIOS_IDS = [];

// Precalculado una vez al cargar el módulo: CAPITALES_ESTADOS es constante.
// Evita regenerar los 32 placeholders/binds en cada petición de reporte.
const { placeholders: AMM_PH, binds: AMM_BINDS } = buildInClause(CAPITALES_ESTADOS, 'm');

// ── 1. Resumen estadístico del periodo ────────────────────────────────────────
// Nota: usa :ff (fecha fin del periodo) para grupos de edad — NO SYSDATE.
// Un paciente que cumplió 18 en febrero no debe aparecer como Adulto en enero.
export const getResumenPeriodo = (fechaInicio, fechaFin) => {
  const ammPH    = AMM_PH;
  const ammBinds = AMM_BINDS;

  // Todas las comparaciones usan TO_DATE con strings para evitar el bug de timezone:
  // new Date("YYYY-MM-DD") crea midnight UTC → node-oracledb lo envía como día
  // anterior a las 18:00 en UTC-6, corriendo el rango un día.

  // credenciales: COUNT DISTINCT CURP para que muestre beneficiarios únicos,
  // no múltiples registros si la misma persona renovó varias veces en el periodo.
  const credPromise = withConnection(conn =>
    conn.execute(
      `SELECT COUNT(DISTINCT CURP) AS CANT_CREDENCIALES FROM CREDENCIALES
       WHERE FECHA_VIGENCIA_INICIO >= TO_DATE(:fi, 'YYYY-MM-DD') AND FECHA_VIGENCIA_INICIO < TO_DATE(:ff, 'YYYY-MM-DD') + 1`,
      { fi: fechaInicio, ff: fechaFin },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    ).then(r => r.rows[0]?.CANT_CREDENCIALES ?? 0)
  );

  const statsPromise = withConnection(conn =>
    conn.execute(`
      SELECT
        COUNT(S.ID_SERVICIO)                              AS CANT_SERVICIOS,
        COUNT(CASE WHEN S.MONTO_PAGADO = 0 THEN 1 END)   AS EXENTOS,
        COUNT(CASE WHEN S.MONTO_PAGADO > 0 THEN 1 END)   AS CON_CUOTA,

        COUNT(DISTINCT CASE WHEN UPPER(B.GENERO) IN ('M', 'MASCULINO', 'HOMBRE', 'MALE')
                             THEN B.CURP END)             AS HOMBRES,
        COUNT(DISTINCT CASE WHEN UPPER(B.GENERO) IN ('F', 'FEMENINO', 'MUJER', 'FEMALE')
                             THEN B.CURP END)             AS MUJERES,

        COUNT(DISTINCT CASE WHEN B.MUNICIPIO IN (${ammPH})
                             THEN B.CURP END)             AS URBANO,
        -- NULL municipio se incluye en RURAL para que URBANO + RURAL = total atendidos
        COUNT(DISTINCT CASE WHEN B.MUNICIPIO IS NULL OR B.MUNICIPIO NOT IN (${ammPH})
                             THEN B.CURP END)             AS RURAL,

        COUNT(DISTINCT CASE WHEN
          TRUNC(MONTHS_BETWEEN(TO_DATE(:ffr, 'YYYY-MM-DD'), B.FECHA_NACIMIENTO)/12) BETWEEN 0 AND 2
          THEN B.CURP END)                                AS LACTANTES,
        COUNT(DISTINCT CASE WHEN
          TRUNC(MONTHS_BETWEEN(TO_DATE(:ffr, 'YYYY-MM-DD'), B.FECHA_NACIMIENTO)/12) BETWEEN 3 AND 11
          THEN B.CURP END)                                AS NINOS,
        COUNT(DISTINCT CASE WHEN
          TRUNC(MONTHS_BETWEEN(TO_DATE(:ffr, 'YYYY-MM-DD'), B.FECHA_NACIMIENTO)/12) BETWEEN 12 AND 17
          THEN B.CURP END)                                AS ADOLESCENTES,
        COUNT(DISTINCT CASE WHEN
          TRUNC(MONTHS_BETWEEN(TO_DATE(:ffr, 'YYYY-MM-DD'), B.FECHA_NACIMIENTO)/12) >= 18
          THEN B.CURP END)                                AS ADULTOS

      FROM SERVICIOS S
      JOIN BENEFICIARIOS B ON S.CURP = B.CURP
      WHERE S.FECHA >= TO_DATE(:fi, 'YYYY-MM-DD') AND S.FECHA < TO_DATE(:ff, 'YYYY-MM-DD') + 1
    `,
    { fi: fechaInicio, ff: fechaFin, ffr: fechaFin, ...ammBinds },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
    ).then(r => r.rows[0])
  );

  return Promise.all([credPromise, statsPromise]).then(([CANT_CREDENCIALES, stats]) => ({
    CANT_CREDENCIALES,
    ...stats,
  }));
};

// ── 2. Detalle de servicios consumidos (artículos + tipos de servicio) ────────
// UNION ALL: artículos con cantidades + tipos de servicio sin artículos (consultas)
export const getDetalleServicios = (fechaInicio, fechaFin) =>
  withConnection(conn =>
    conn.execute(`
      SELECT NOMBRE, CANTIDAD, UNIDAD FROM (
        SELECT A.DESCRIPCION AS NOMBRE, SUM(SA.CANTIDAD) AS CANTIDAD, A.UNIDAD
        FROM SERVICIO_ARTICULOS SA
        JOIN ARTICULOS A ON SA.ID_ARTICULO = A.ID_ARTICULO
        JOIN SERVICIOS S  ON SA.ID_SERVICIO = S.ID_SERVICIO
        WHERE S.FECHA >= TO_DATE(:fi, 'YYYY-MM-DD') AND S.FECHA < TO_DATE(:ff, 'YYYY-MM-DD') + 1
        GROUP BY A.DESCRIPCION, A.UNIDAD

        UNION ALL

        SELECT SC.NOMBRE, COUNT(S.ID_SERVICIO) AS CANTIDAD, 'CITA' AS UNIDAD
        FROM SERVICIOS S
        JOIN SERVICIOS_CATALOGO SC ON S.ID_TIPO_SERVICIO = SC.ID_TIPO_SERVICIO
        WHERE S.FECHA >= TO_DATE(:fi, 'YYYY-MM-DD') AND S.FECHA < TO_DATE(:ff, 'YYYY-MM-DD') + 1
          AND NOT EXISTS (SELECT 1 FROM SERVICIO_ARTICULOS SA2 WHERE SA2.ID_SERVICIO = S.ID_SERVICIO)
          -- Excluir membresías: ya se cuentan en CANT_CREDENCIALES del resumen
          AND UPPER(SC.NOMBRE) NOT LIKE '%MEMBRES%'
        GROUP BY SC.NOMBRE
      )
      ORDER BY CANTIDAD DESC
    `,
    { fi: fechaInicio, ff: fechaFin },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
    ).then(r => r.rows)
  );

// ── 3. Distribución de pacientes atendidos por municipio ──────────────────────
export const getDistribucionCiudades = (fechaInicio, fechaFin) =>
  withConnection(conn =>
    conn.execute(`
      SELECT NVL(B.MUNICIPIO, 'Sin datos') AS CIUDAD, COUNT(DISTINCT B.CURP) AS CANTIDAD
      FROM SERVICIOS S
      JOIN BENEFICIARIOS B ON S.CURP = B.CURP
      WHERE S.FECHA >= TO_DATE(:fi, 'YYYY-MM-DD') AND S.FECHA < TO_DATE(:ff, 'YYYY-MM-DD') + 1
      GROUP BY NVL(B.MUNICIPIO, 'Sin datos')
      ORDER BY CANTIDAD DESC
    `,
    { fi: fechaInicio, ff: fechaFin },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
    ).then(r => r.rows)
  );

// ── 4. Atenciones agrupadas por mes ──────────────────────────────────────────
export const getAtencionesPorMes = (fechaInicio, fechaFin) =>
  withConnection(conn =>
    conn.execute(`
      SELECT
        TO_CHAR(TRUNC(S.FECHA, 'MM'), 'YYYY-MM') AS MES,
        COUNT(DISTINCT S.CURP)                    AS PACIENTES,
        COUNT(S.ID_SERVICIO)                      AS SERVICIOS
      FROM SERVICIOS S
      WHERE S.FECHA >= TO_DATE(:fi, 'YYYY-MM-DD') AND S.FECHA < TO_DATE(:ff, 'YYYY-MM-DD') + 1
      GROUP BY TRUNC(S.FECHA, 'MM')
      ORDER BY TRUNC(S.FECHA, 'MM')
    `,
    { fi: fechaInicio, ff: fechaFin },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
    ).then(r => r.rows)
  );

// ── 5. Estudios médicos (subconjunto de SERVICIOS_CATALOGO) ───────────────────
// Retorna [] si ESTUDIOS_IDS no está configurado.
export const getEstudios = (fechaInicio, fechaFin) => {
  if (ESTUDIOS_IDS.length === 0) return Promise.resolve([]);

  return withConnection(conn => {
    const { placeholders, binds } = buildInClause(ESTUDIOS_IDS, 'e');
    return conn.execute(`
      SELECT SC.NOMBRE, COUNT(S.ID_SERVICIO) AS CANTIDAD
      FROM SERVICIOS S
      JOIN SERVICIOS_CATALOGO SC ON S.ID_TIPO_SERVICIO = SC.ID_TIPO_SERVICIO
      WHERE S.FECHA >= TO_DATE(:fi, 'YYYY-MM-DD') AND S.FECHA < TO_DATE(:ff, 'YYYY-MM-DD') + 1
        AND S.ID_TIPO_SERVICIO IN (${placeholders})
      GROUP BY SC.NOMBRE
      ORDER BY CANTIDAD DESC
    `,
    { fi: fechaInicio, ff: fechaFin, ...binds },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
    ).then(r => r.rows);
  });
};

// ── 6. Beneficiarios con servicio en el periodo ───────────────────────────────
export const getBeneficiariosPeriodo = (fechaInicio, fechaFin) =>
  withConnection(conn =>
    conn.execute(`
      SELECT DISTINCT
        B.CURP,
        B.APELLIDO_PATERNO,
        B.NOMBRES,
        B.NOMBRES || ' ' || B.APELLIDO_PATERNO || ' ' || B.APELLIDO_MATERNO AS NOMBRE_COMPLETO,
        B.GENERO,
        B.MUNICIPIO,
        B.ESTADO,
        B.ESTATUS
      FROM BENEFICIARIOS B
      JOIN SERVICIOS S ON B.CURP = S.CURP
      WHERE S.FECHA >= TO_DATE(:fi, 'YYYY-MM-DD') AND S.FECHA < TO_DATE(:ff, 'YYYY-MM-DD') + 1
      ORDER BY B.APELLIDO_PATERNO, B.NOMBRES
    `,
    { fi: fechaInicio, ff: fechaFin },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
    ).then(r => r.rows)
  );

// ── 7. Membresías vigentes o que se superponen con el periodo ─────────────────
export const getMembresias = (fechaInicio, fechaFin) =>
  withConnection(conn =>
    conn.execute(`
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
      WHERE (C.FECHA_VIGENCIA_INICIO >= TO_DATE(:fi, 'YYYY-MM-DD') AND C.FECHA_VIGENCIA_INICIO < TO_DATE(:ff, 'YYYY-MM-DD') + 1)
         OR (C.FECHA_VIGENCIA_FIN    >= TO_DATE(:fi, 'YYYY-MM-DD') AND C.FECHA_VIGENCIA_FIN    < TO_DATE(:ff, 'YYYY-MM-DD') + 1)
         OR (C.FECHA_VIGENCIA_INICIO <= TO_DATE(:fi, 'YYYY-MM-DD') AND C.FECHA_VIGENCIA_FIN    >= TO_DATE(:ff, 'YYYY-MM-DD'))
      ORDER BY C.FECHA_VIGENCIA_FIN DESC
    `,
    { fi: fechaInicio, ff: fechaFin },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
    ).then(r => r.rows)
  );

// ── 8. Detalle de servicios individuales del periodo ─────────────────────────
export const getServiciosPeriodo = (fechaInicio, fechaFin) =>
  withConnection(conn =>
    conn.execute(`
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
      WHERE S.FECHA >= TO_DATE(:fi, 'YYYY-MM-DD') AND S.FECHA < TO_DATE(:ff, 'YYYY-MM-DD') + 1
      ORDER BY S.FECHA DESC
    `,
    { fi: fechaInicio, ff: fechaFin },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
    ).then(r => r.rows)
  );

// ── 9. Stock actual de todos los artículos ────────────────────────────────────
export const getArticulosStock = () =>
  withConnection(conn =>
    conn.execute(`
      SELECT
        A.ID_ARTICULO,
        A.DESCRIPCION,
        A.UNIDAD,
        A.INVENTARIO_ACTUAL,
        A.CUOTA_RECUPERACION,
        A.MANEJA_INVENTARIO,
        NVL(A.STOCK_MINIMO, 5) AS STOCK_MINIMO
      FROM ARTICULOS A
      WHERE NVL(A.ACTIVO, 'S') = 'S'
      ORDER BY A.DESCRIPCION
    `,
    {},
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
    ).then(r => r.rows)
  );

// ── 10. Movimientos de inventario en el periodo ───────────────────────────────
export const getMovimientosPeriodo = (fechaInicio, fechaFin) =>
  withConnection(conn =>
    conn.execute(`
      SELECT
        A.DESCRIPCION AS ARTICULO,
        M.TIPO_MOVIMIENTO,
        M.CANTIDAD,
        TO_CHAR(M.FECHA, 'YYYY-MM-DD') AS FECHA,
        M.MOTIVO
      FROM MOVIMIENTOS_INVENTARIO M
      JOIN ARTICULOS A ON M.ID_ARTICULO = A.ID_ARTICULO
      WHERE M.FECHA >= TO_DATE(:fi, 'YYYY-MM-DD') AND M.FECHA < TO_DATE(:ff, 'YYYY-MM-DD') + 1
      ORDER BY M.FECHA DESC
    `,
    { fi: fechaInicio, ff: fechaFin },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
    ).then(r => r.rows)
  );

// ── 11. Citas del periodo ─────────────────────────────────────────────────────
export const getCitasPeriodo = (fechaInicio, fechaFin) =>
  withConnection(conn =>
    conn.execute(`
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
      WHERE C.FECHA >= TO_DATE(:fi, 'YYYY-MM-DD') AND C.FECHA < TO_DATE(:ff, 'YYYY-MM-DD') + 1
      ORDER BY C.FECHA DESC
    `,
    { fi: fechaInicio, ff: fechaFin },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
    ).then(r => r.rows)
  );

// ── 5. Persistencia de reportes generados ────────────────────────────────────
export const guardarRegistro = ({ tipo, fechaInicio, fechaFin, rutaPdf, rutaXlsx, generadoPor = null }) =>
  withConnection(async conn => {
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
  });

export const findHistorico = (page, limit) =>
  withConnection(conn => {
    const offset = (page - 1) * limit;
    return conn.execute(`
      SELECT ID_REPORTE, TIPO, FECHA_INICIO, FECHA_FIN, FECHA_GEN AS FECHA_GENERACION, RUTA_PDF, RUTA_XLSX
      FROM REPORTES_GENERADOS
      ORDER BY FECHA_GEN DESC
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `, { offset, limit }, { outFormat: oracledb.OUT_FORMAT_OBJECT }).then(r => r.rows);
  });

export const findById = (id) =>
  withConnection(conn =>
    conn.execute(
      `SELECT * FROM REPORTES_GENERADOS WHERE ID_REPORTE = :id`,
      { id }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
    ).then(r => r.rows[0] ?? null)
  );
