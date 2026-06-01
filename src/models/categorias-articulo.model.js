import oracledb from "oracledb";
import { withConnection } from "../config/db.js";

export const findAll = () =>
  withConnection(async (conn) => {
    const { rows } = await conn.execute(
      `SELECT ID_CATEGORIA, NOMBRE, DESCRIPCION
         FROM CATEGORIAS_ARTICULO
        ORDER BY NOMBRE`
    );
    return rows;
  });

export const create = (data) =>
  withConnection(async (conn) => {
    const result = await conn.execute(
      `INSERT INTO CATEGORIAS_ARTICULO (ID_CATEGORIA, NOMBRE, DESCRIPCION)
       VALUES (SEQ_CATEGORIAS_ARTICULO.NEXTVAL, :nombre, :descripcion)
       RETURNING ID_CATEGORIA INTO :newId`,
      {
        nombre:      data.nombre,
        descripcion: data.descripcion ?? null,
        newId:       { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: true }
    );
    const idCategoria = Array.isArray(result.outBinds.newId)
      ? result.outBinds.newId[0]
      : result.outBinds.newId;
    return { idCategoria };
  });
