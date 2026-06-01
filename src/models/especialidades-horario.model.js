import { withConnection } from "../config/db.js";

/** Devuelve todas las especialidades activas con su horario base. */
export const findAll = ({ soloActivos = true } = {}) =>
  withConnection(conn =>
    conn.execute(`
      SELECT
        ID_ESPECIALIDAD, NOMBRE, DIA_SEMANA, HORA_INICIO, HORA_FIN,
        CAPACIDAD_MAX, TIPO_FRECUENCIA, ACTIVO, NOTAS
      FROM ESPECIALIDADES_HORARIO
      ${soloActivos ? "WHERE ACTIVO = 1" : ""}
      ORDER BY ID_ESPECIALIDAD
    `).then(r => r.rows)
  );

/** Busca una especialidad por nombre exacto (case-insensitive). */
export const findByNombre = (nombre) =>
  withConnection(conn =>
    conn.execute(
      `SELECT ID_ESPECIALIDAD, NOMBRE, DIA_SEMANA, HORA_INICIO, HORA_FIN,
              CAPACIDAD_MAX, TIPO_FRECUENCIA, ACTIVO, NOTAS
       FROM ESPECIALIDADES_HORARIO
       WHERE UPPER(NOMBRE) = UPPER(:nombre)`,
      { nombre }
    ).then(r => r.rows?.[0] ?? null)
  );

/** Busca una especialidad por ID. */
export const findById = (id) =>
  withConnection(conn =>
    conn.execute(
      `SELECT ID_ESPECIALIDAD, NOMBRE, DIA_SEMANA, HORA_INICIO, HORA_FIN,
              CAPACIDAD_MAX, TIPO_FRECUENCIA, ACTIVO, NOTAS
       FROM ESPECIALIDADES_HORARIO WHERE ID_ESPECIALIDAD = :id`,
      { id }
    ).then(r => r.rows[0] ?? null)
  );

/** Actualiza el horario base de una especialidad. */
export const update = (id, { diaSemanA, horaInicio, horaFin, capacidadMax, tipoFrecuencia, activo, notas }) =>
  withConnection(conn =>
    conn.execute(
      `UPDATE ESPECIALIDADES_HORARIO SET
        DIA_SEMANA      = NVL(:diaSemana,     DIA_SEMANA),
        HORA_INICIO     = NVL(:horaInicio,    HORA_INICIO),
        HORA_FIN        = :horaFin,
        CAPACIDAD_MAX   = :capacidadMax,
        TIPO_FRECUENCIA = NVL(:tipoFrecuencia, TIPO_FRECUENCIA),
        ACTIVO          = NVL(:activo,         ACTIVO),
        NOTAS           = :notas
       WHERE ID_ESPECIALIDAD = :id`,
      { id, diaSemana: diaSemanA ?? null, horaInicio: horaInicio ?? null, horaFin: horaFin ?? null,
        capacidadMax: capacidadMax ?? null, tipoFrecuencia: tipoFrecuencia ?? null,
        activo: activo ?? null, notas: notas ?? null },
      { autoCommit: true }
    )
  );

/** Cuenta citas activas (no canceladas) de una especialidad en una fecha dada. */
export const countCitasActivasPorFecha = (nombre, fecha) =>
  withConnection(conn =>
    conn.execute(
      `SELECT COUNT(1) AS TOTAL
       FROM CITAS
       WHERE UPPER(ESPECIALISTA) = UPPER(:nombre)
         AND TRUNC(FECHA)        = TO_DATE(:fecha, 'YYYY-MM-DD')
         AND ESTATUS            <> 'CANCELADA'`,
      { nombre, fecha }
    ).then(r => Number(r.rows?.[0]?.TOTAL ?? 0))
  );

// ─── Excepciones ────────────────────────────────────────────────

/** Lista todas las excepciones de una especialidad. */
export const findExcepciones = (idEspecialidad) =>
  withConnection(conn =>
    conn.execute(
      `SELECT ID_EXCEPCION, ID_ESPECIALIDAD,
              TO_CHAR(FECHA, 'YYYY-MM-DD') AS FECHA,
              MOTIVO, TO_CHAR(CREATED_AT, 'YYYY-MM-DD') AS CREATED_AT
       FROM ESPECIALIDADES_EXCEPCIONES
       WHERE ID_ESPECIALIDAD = :idEspecialidad
       ORDER BY FECHA`,
      { idEspecialidad }
    ).then(r => r.rows)
  );

/** Busca una excepción exacta por especialidad + fecha. */
export const findExcepcionByFecha = (idEspecialidad, fecha) =>
  withConnection(conn =>
    conn.execute(
      `SELECT ID_EXCEPCION, MOTIVO
       FROM ESPECIALIDADES_EXCEPCIONES
       WHERE ID_ESPECIALIDAD = :idEspecialidad
         AND TRUNC(FECHA)    = TO_DATE(:fecha, 'YYYY-MM-DD')`,
      { idEspecialidad, fecha }
    ).then(r => r.rows[0] ?? null)
  );

/** Crea una excepción (fecha bloqueada). */
export const createExcepcion = (idEspecialidad, fecha, motivo) =>
  withConnection(conn =>
    conn.execute(
      `INSERT INTO ESPECIALIDADES_EXCEPCIONES
         (ID_ESPECIALIDAD, FECHA, MOTIVO)
       VALUES
         (:idEspecialidad, TO_DATE(:fecha, 'YYYY-MM-DD'), :motivo)`,
      { idEspecialidad, fecha, motivo: motivo ?? null },
      { autoCommit: true }
    )
  );

/** Elimina una excepción por ID. */
export const deleteExcepcion = (idExcepcion) =>
  withConnection(conn =>
    conn.execute(
      `DELETE FROM ESPECIALIDADES_EXCEPCIONES WHERE ID_EXCEPCION = :idExcepcion`,
      { idExcepcion },
      { autoCommit: true }
    )
  );
