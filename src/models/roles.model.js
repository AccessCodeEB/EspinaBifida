import { getConnection } from "../config/db.js";

export async function findAll() {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT ID_ROL, NOMBRE_ROL, DESCRIPCION FROM ROLES ORDER BY ID_ROL`
    );
    return result.rows;
  } finally {
    await conn.close();
  }
}

export async function findById(idRol) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT ID_ROL, NOMBRE_ROL, DESCRIPCION FROM ROLES WHERE ID_ROL = :idRol`,
      { idRol }
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
}
