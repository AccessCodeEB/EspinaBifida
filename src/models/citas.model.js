import { getConnection } from "../config/db.js";

export const findAll = async () => {
  const connection = await getConnection();

  try {
    const result = await connection.execute(`
      SELECT
        ID_CITA,
        CURP,
        ID_TIPO_SERVICIO,
        ESPECIALISTA,
        FECHA,
        ESTATUS,
        NOTAS
      FROM CITAS
      ORDER BY FECHA DESC
    `);

    return result.rows;
  } finally {
    await connection.close();
  }
};

export const findById = async (id) => {
  const connection = await getConnection();

  try {
    const result = await connection.execute(
      `
      SELECT
        ID_CITA,
        CURP,
        ID_TIPO_SERVICIO,
        ESPECIALISTA,
        FECHA,
        ESTATUS,
        NOTAS
      FROM CITAS
      WHERE ID_CITA = :id
      `,
      { id }
    );

    return result.rows[0];
  } finally {
    await connection.close();
  }
};

export const create = async ({
  curp,
  idTipoServicio,
  especialista,
  fecha,
  estatus,
  notas,
}) => {
  const connection = await getConnection();

  try {
    const result = await connection.execute(
      `
      INSERT INTO CITAS (
        CURP,
        ID_TIPO_SERVICIO,
        ESPECIALISTA,
        FECHA,
        ESTATUS,
        NOTAS
      )
      VALUES (
        :curp,
        :idTipoServicio,
        :especialista,
        TO_TIMESTAMP(:fecha, 'YYYY-MM-DD HH24:MI:SS'),
        :estatus,
        :notas
      )
      `,
      {
        curp,
        idTipoServicio,
        especialista,
        fecha,
        estatus,
        notas,
      },
      { autoCommit: true }
    );

    return result;
  } finally {
    await connection.close();
  }
};

export const update = async (
  id,
  { curp, idTipoServicio, especialista, fecha, estatus, notas }
) => {
  const connection = await getConnection();

  try {
    const result = await connection.execute(
      `
      UPDATE CITAS
      SET
        CURP = :curp,
        ID_TIPO_SERVICIO = :idTipoServicio,
        ESPECIALISTA = :especialista,
        FECHA = TO_TIMESTAMP(:fecha, 'YYYY-MM-DD HH24:MI:SS'),
        ESTATUS = :estatus,
        NOTAS = :notas
      WHERE ID_CITA = :id
      `,
      {
        id,
        curp,
        idTipoServicio,
        especialista,
        fecha,
        estatus,
        notas,
      },
      { autoCommit: true }
    );

    return result;
  } finally {
    await connection.close();
  }
};

export const remove = async (id) => {
  const connection = await getConnection();

  try {
    const result = await connection.execute(
      `
      UPDATE CITAS
      SET ESTATUS = 'CANCELADA'
      WHERE ID_CITA = :id
      `,
      { id },
      { autoCommit: true }
    );

    return result;
  } finally {
    await connection.close();
  }
};