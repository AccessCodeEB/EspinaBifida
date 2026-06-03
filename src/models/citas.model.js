import { withConnection } from "../config/db.js";

export const findAll = () =>
  withConnection(conn =>
    conn.execute(`
      SELECT
        c.ID_CITA, c.CURP, c.ID_TIPO_SERVICIO, c.ESPECIALISTA,
        TO_CHAR(c.FECHA, 'YYYY-MM-DD') AS FECHA,
        TO_CHAR(c.FECHA, 'HH24:MI')    AS HORA,
        c.ESTATUS, c.NOTAS, c.COSTO,
        b.NOMBRES || ' ' || b.APELLIDO_PATERNO || ' ' || NVL(b.APELLIDO_MATERNO,'') AS NOMBRE_BENEFICIARIO
      FROM CITAS c
      LEFT JOIN BENEFICIARIOS b ON b.CURP = c.CURP
      ORDER BY c.FECHA DESC
    `).then(r => r.rows)
  );

export const findById = (id) =>
  withConnection(conn =>
    conn.execute(
      `SELECT ID_CITA, CURP, ID_TIPO_SERVICIO, ESPECIALISTA, FECHA, ESTATUS, NOTAS, COSTO
       FROM CITAS WHERE ID_CITA = :id`,
      { id }
    ).then(r => r.rows[0])
  );

/** Cuenta citas no canceladas previas de un beneficiario (para detectar primera vs. subsecuente) */
export const countCitasByCurp = (curp) =>
  withConnection(conn =>
    conn.execute(
      `SELECT COUNT(1) AS TOTAL FROM CITAS WHERE CURP = :curp AND ESTATUS <> 'CANCELADA'`,
      { curp }
    ).then(r => Number(r.rows?.[0]?.TOTAL ?? 0))
  );

export const create = async ({ curp, idTipoServicio, especialista, fecha, estatus, notas, costo }) =>
  withConnection(async conn => {
    const idResult = await conn.execute(`SELECT SEQ_CITAS.NEXTVAL AS NEXT_ID FROM DUAL`);
    const idCita = Number(idResult.rows?.[0]?.NEXT_ID ?? 0);

    if (!Number.isInteger(idCita) || idCita <= 0) {
      throw new Error("No se pudo generar ID_CITA");
    }

    await conn.execute(
      `INSERT INTO CITAS (
        ID_CITA, CURP, ID_TIPO_SERVICIO, ESPECIALISTA,
        FECHA, ESTATUS, NOTAS, COSTO
      ) VALUES (
        :idCita, :curp, :idTipoServicio, :especialista,
        TO_TIMESTAMP(:fecha, 'YYYY-MM-DD HH24:MI:SS'), :estatus, :notas, :costo
      )`,
      { idCita, curp, idTipoServicio, especialista, fecha, estatus, notas, costo },
      { autoCommit: true }
    );

    return { idCita };
  });

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

export const deleteE2ECitas = () =>
  withConnection(async conn => {
    await conn.execute(
      `DELETE FROM CITAS WHERE ESPECIALISTA = 'Dr. E2E Playwright'`
    );
    await conn.commit();
  });