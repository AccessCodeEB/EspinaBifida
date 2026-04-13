import { getConnection } from "../config/db.js";

const SELECT_CON_ROL = `
  SELECT a.ID_ADMIN, a.ID_ROL, a.NOMBRE_COMPLETO, a.EMAIL,
         a.ACTIVO, a.FECHA_CREACION, r.NOMBRE_ROL
  FROM   ADMINISTRADORES a
  JOIN   ROLES r ON r.ID_ROL = a.ID_ROL
`;

export async function findAll() {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `${SELECT_CON_ROL} ORDER BY a.NOMBRE_COMPLETO`
    );
    return result.rows;
  } finally {
    await conn.close();
  }
}

export async function findById(idAdmin) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `${SELECT_CON_ROL} WHERE a.ID_ADMIN = :idAdmin`,
      { idAdmin }
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
}

export async function findByEmail(email) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT a.ID_ADMIN, a.ID_ROL, a.NOMBRE_COMPLETO, a.EMAIL,
              a.PASSWORD_HASH, a.ACTIVO, r.NOMBRE_ROL
       FROM   ADMINISTRADORES a
       JOIN   ROLES r ON r.ID_ROL = a.ID_ROL
       WHERE  a.EMAIL = :email`,
      { email }
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
}

export async function create({ idRol, nombreCompleto, email, passwordHash }) {
  const conn = await getConnection();
  try {
    await conn.execute(
      `INSERT INTO ADMINISTRADORES (ID_ROL, NOMBRE_COMPLETO, EMAIL, PASSWORD_HASH, ACTIVO, FECHA_CREACION)
       VALUES (:idRol, :nombreCompleto, :email, :passwordHash, 1, SYSDATE)`,
      { idRol, nombreCompleto, email, passwordHash },
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
}

export async function update(idAdmin, { idRol, nombreCompleto, email }) {
  const conn = await getConnection();
  try {
    await conn.execute(
      `UPDATE ADMINISTRADORES SET
         ID_ROL          = :idRol,
         NOMBRE_COMPLETO = :nombreCompleto,
         EMAIL           = :email
       WHERE ID_ADMIN = :idAdmin`,
      { idRol, nombreCompleto, email, idAdmin },
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
}

export async function updatePassword(idAdmin, passwordHash) {
  const conn = await getConnection();
  try {
    await conn.execute(
      `UPDATE ADMINISTRADORES SET PASSWORD_HASH = :passwordHash WHERE ID_ADMIN = :idAdmin`,
      { passwordHash, idAdmin },
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
}

export async function deactivate(idAdmin) {
  const conn = await getConnection();
  try {
    await conn.execute(
      `UPDATE ADMINISTRADORES SET ACTIVO = 0 WHERE ID_ADMIN = :idAdmin`,
      { idAdmin },
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
}
