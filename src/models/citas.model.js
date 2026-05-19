import { withConnection } from "../config/db.js";

export const findAll = () =>
  withConnection(conn =>
    conn.execute(`
      SELECT
        c.ID_CITA, c.CURP, c.ID_TIPO_SERVICIO, c.ESPECIALISTA,
        TO_CHAR(c.FECHA, 'YYYY-MM-DD') AS FECHA,
        TO_CHAR(c.FECHA, 'HH24:MI')    AS HORA,
        c.ESTATUS, c.NOTAS,
        b.NOMBRES || ' ' || b.APELLIDO_PATERNO || ' ' || NVL(b.APELLIDO_MATERNO,'') AS NOMBRE_BENEFICIARIO
      FROM CITAS c
      LEFT JOIN BENEFICIARIOS b ON b.CURP = c.CURP
      ORDER BY c.FECHA DESC
    `).then(r => r.rows)
  );

export const findById = (id) =>
  withConnection(conn =>
    conn.execute(
      `SELECT ID_CITA, CURP, ID_TIPO_SERVICIO, ESPECIALISTA, FECHA, ESTATUS, NOTAS
       FROM CITAS WHERE ID_CITA = :id`,
      { id }
    ).then(r => r.rows[0])
  );

export const create = ({ curp, idTipoServicio, especialista, fecha, estatus, notas }) =>
  withConnection(conn =>
    conn.execute(
      `INSERT INTO CITAS (
        ID_CITA, CURP, ID_TIPO_SERVICIO, ESPECIALISTA,
        FECHA, ESTATUS, NOTAS
      ) VALUES (
        SEQ_CITAS.NEXTVAL, :curp, :idTipoServicio, :especialista,
        TO_TIMESTAMP(:fecha, 'YYYY-MM-DD HH24:MI:SS'), :estatus, :notas
      )`,
      { curp, idTipoServicio, especialista, fecha, estatus, notas },
      { autoCommit: true }
    )
  );

export const update = (id, { curp, idTipoServicio, especialista, fecha, estatus, notas }) =>
  withConnection(conn =>
    conn.execute(
      `UPDATE CITAS SET
        CURP = :curp, ID_TIPO_SERVICIO = :idTipoServicio,
        ESPECIALISTA = :especialista,
        FECHA = TO_TIMESTAMP(:fecha, 'YYYY-MM-DD HH24:MI:SS'),
        ESTATUS = :estatus, NOTAS = :notas
       WHERE ID_CITA = :id`,
      { id, curp, idTipoServicio, especialista, fecha, estatus, notas },
      { autoCommit: true }
    )
  );

export const remove = (id) =>
  withConnection(conn =>
    conn.execute(
      `UPDATE CITAS SET ESTATUS = 'CANCELADA' WHERE ID_CITA = :id`,
      { id },
      { autoCommit: true }
    )
  );