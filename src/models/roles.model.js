import { withConnection } from "../config/db.js";

export const findAll = () =>
  withConnection(conn =>
    conn.execute(`SELECT ID_ROL, NOMBRE_ROL, DESCRIPCION FROM ROLES ORDER BY ID_ROL`)
      .then(r => r.rows)
  );

export const findById = (idRol) =>
  withConnection(conn =>
    conn.execute(
      `SELECT ID_ROL, NOMBRE_ROL, DESCRIPCION FROM ROLES WHERE ID_ROL = :idRol`,
      { idRol }
    ).then(r => r.rows[0] ?? null)
  );
