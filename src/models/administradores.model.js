import { withConnection } from "../config/db.js";

const SELECT_CON_ROL = `
  SELECT a.ID_ADMIN, a.ID_ROL, a.NOMBRE_COMPLETO, a.EMAIL,
         a.ACTIVO, a.FECHA_CREACION, a.FOTO_PERFIL_URL, r.NOMBRE_ROL
  FROM   ADMINISTRADORES a
  JOIN   ROLES r ON r.ID_ROL = a.ID_ROL
`;

export const findAll = () =>
  withConnection(conn =>
    conn.execute(`${SELECT_CON_ROL} ORDER BY a.NOMBRE_COMPLETO`).then(r => r.rows)
  );

export const findById = (idAdmin) =>
  withConnection(conn =>
    conn.execute(`${SELECT_CON_ROL} WHERE a.ID_ADMIN = :idAdmin`, { idAdmin })
      .then(r => r.rows[0] ?? null)
  );

export const findByEmail = (email) =>
  withConnection(conn =>
    conn.execute(
      `SELECT a.ID_ADMIN, a.ID_ROL, a.NOMBRE_COMPLETO, a.EMAIL,
              a.PASSWORD_HASH, a.ACTIVO, a.FOTO_PERFIL_URL, r.NOMBRE_ROL
       FROM   ADMINISTRADORES a
       JOIN   ROLES r ON r.ID_ROL = a.ID_ROL
       WHERE  LOWER(TRIM(a.EMAIL)) = :email`,
      { email }
    ).then(r => r.rows[0] ?? null)
  );

export const create = ({ idRol, nombreCompleto, email, passwordHash }) =>
  withConnection(conn =>
    conn.execute(
      `INSERT INTO ADMINISTRADORES
         (ID_ROL, NOMBRE_COMPLETO, EMAIL, PASSWORD_HASH, ACTIVO, FECHA_CREACION)
       VALUES (:idRol, :nombreCompleto, :email, :passwordHash, 1, SYSDATE)`,
      { idRol, nombreCompleto, email, passwordHash },
      { autoCommit: true }
    )
  );

export const update = (idAdmin, { idRol, nombreCompleto, email }) =>
  withConnection(conn =>
    conn.execute(
      `UPDATE ADMINISTRADORES SET
         ID_ROL = :idRol, NOMBRE_COMPLETO = :nombreCompleto, EMAIL = :email
       WHERE ID_ADMIN = :idAdmin`,
      { idRol, nombreCompleto, email, idAdmin },
      { autoCommit: true }
    )
  );

export const updatePassword = (idAdmin, passwordHash) =>
  withConnection(conn =>
    conn.execute(
      `UPDATE ADMINISTRADORES
       SET PASSWORD_HASH = :passwordHash WHERE ID_ADMIN = :idAdmin`,
      { passwordHash, idAdmin },
      { autoCommit: true }
    )
  );

export const updateFotoPerfilUrl = (idAdmin, fotoPerfilUrl) =>
  withConnection(conn =>
    conn.execute(
      `UPDATE ADMINISTRADORES
       SET FOTO_PERFIL_URL = :fotoPerfilUrl WHERE ID_ADMIN = :idAdmin`,
      { idAdmin, fotoPerfilUrl },
      { autoCommit: true }
    )
  );

export const deactivate = (idAdmin) =>
  withConnection(conn =>
    conn.execute(
      `UPDATE ADMINISTRADORES SET ACTIVO = 0 WHERE ID_ADMIN = :idAdmin`,
      { idAdmin },
      { autoCommit: true }
    )
  );
