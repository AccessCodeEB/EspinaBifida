import { getConnection } from "../config/db.js";

export async function findAll() {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT ID_ARTICULO, DESCRIPCION, UNIDAD, CUOTA_RECUPERACION,
              INVENTARIO_ACTUAL, MANEJA_INVENTARIO, ID_CATEGORIA
       FROM ARTICULOS
       ORDER BY DESCRIPCION`
    );
    return result.rows;
  } finally {
    await conn.close();
  }
}

export async function findById(id) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT ID_ARTICULO, DESCRIPCION, UNIDAD, CUOTA_RECUPERACION,
              INVENTARIO_ACTUAL, MANEJA_INVENTARIO, ID_CATEGORIA
       FROM ARTICULOS
       WHERE ID_ARTICULO = :id`,
      { id }
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
}

export async function create(data) {
  const conn = await getConnection();
  try {
    await conn.execute(
      `INSERT INTO ARTICULOS (
         ID_ARTICULO, DESCRIPCION, UNIDAD, CUOTA_RECUPERACION,
         INVENTARIO_ACTUAL, MANEJA_INVENTARIO, ID_CATEGORIA
       ) VALUES (
         :idArticulo, :descripcion, :unidad, :cuotaRecuperacion,
         :inventarioActual, :manejaInventario, :idCategoria
       )`,
      data,
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
}

export async function update(id, data) {
  const conn = await getConnection();
  try {
    const { idArticulo: _idArticulo, ...updateData } = data;

    await conn.execute(
      `UPDATE ARTICULOS SET
         DESCRIPCION = :descripcion,
         UNIDAD = :unidad,
         CUOTA_RECUPERACION = :cuotaRecuperacion,
         INVENTARIO_ACTUAL = :inventarioActual,
         MANEJA_INVENTARIO = :manejaInventario,
         ID_CATEGORIA = :idCategoria
       WHERE ID_ARTICULO = :id`,
      { ...updateData, id },
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
}

export async function deleteById(id) {
  const conn = await getConnection();
  try {
    await conn.execute(
      `DELETE FROM ARTICULOS WHERE ID_ARTICULO = :id`,
      { id },
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
}
