import { withConnection } from "../config/db.js";
import { toCamel } from "../utils/dbTransform.js";

export const findAll = ({ tipo, dias } = {}) =>
  withConnection(async (conn) => {
    const conditions = [];
    const binds = {};

    if (tipo) { conditions.push("l.TIPO = :tipo"); binds.tipo = tipo; }
    if (dias)  { conditions.push("l.FECHA >= SYSDATE - :dias"); binds.dias = dias; }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await conn.execute(
      `SELECT l.ID_LOG, l.ID_ARTICULO, l.DESCRIPCION_ARTICULO,
              l.TIPO, l.MOTIVO, l.FECHA
       FROM ARTICULOS_LOG l
       ${where}
       ORDER BY l.FECHA DESC, l.ID_LOG DESC`,
      binds
    );
    return rows.map(toCamel);
  });

/* istanbul ignore next */
export const deleteE2ELogs = () =>
  withConnection(async (conn) => {
    await conn.execute(
      `DELETE FROM ARTICULOS_LOG WHERE UPPER(DESCRIPCION_ARTICULO) LIKE '%E2E%'`
    );
    await conn.commit();
  });

export const create = ({ idArticulo, descripcionArticulo, tipo, motivo }) =>
  withConnection(async (conn) => {
    await conn.execute(
      `INSERT INTO ARTICULOS_LOG (ID_LOG, ID_ARTICULO, DESCRIPCION_ARTICULO, TIPO, MOTIVO, FECHA)
       VALUES (NULL, :idArticulo, :descripcion, :tipo, :motivo, SYSDATE)`,
      {
        idArticulo: idArticulo ?? null,
        descripcion: descripcionArticulo,
        tipo,
        motivo: motivo ?? null,
      },
      { autoCommit: true }
    );
  });
