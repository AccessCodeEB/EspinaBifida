import { getConnection } from "../config/db.js";

function isInvalidIdentifierError(err) {
  return err?.errorNum === 904 || /ORA-00904/i.test(String(err?.message ?? ""));
}

export async function findAll() {
  const conn = await getConnection();
  try {
    try {
      const result = await conn.execute(
        `SELECT ID_ARTICULO, DESCRIPCION, UNIDAD, CUOTA_RECUPERACION,
                INVENTARIO_ACTUAL, MANEJA_INVENTARIO, ID_CATEGORIA, STOCK_MINIMO, NVL(ACTIVO, 'S') AS ACTIVO
         FROM ARTICULOS
         WHERE NVL(ACTIVO, 'S') = 'S'
         ORDER BY DESCRIPCION`
      );
      return result.rows;
    } catch (err) {
      if (!isInvalidIdentifierError(err)) throw err;
      const fallback = await conn.execute(
        `SELECT ID_ARTICULO, DESCRIPCION, UNIDAD, CUOTA_RECUPERACION,
                INVENTARIO_ACTUAL, MANEJA_INVENTARIO, ID_CATEGORIA, STOCK_MINIMO
         FROM ARTICULOS
         ORDER BY DESCRIPCION`
      );
      return fallback.rows;
    }
  } finally {
    await conn.close();
  }
}

export async function findById(id) {
  const conn = await getConnection();
  try {
    try {
      const result = await conn.execute(
        `SELECT ID_ARTICULO, DESCRIPCION, UNIDAD, CUOTA_RECUPERACION,
                INVENTARIO_ACTUAL, MANEJA_INVENTARIO, ID_CATEGORIA, STOCK_MINIMO, NVL(ACTIVO, 'S') AS ACTIVO
         FROM ARTICULOS
         WHERE ID_ARTICULO = :id
           AND NVL(ACTIVO, 'S') = 'S'`,
        { id }
      );
      return result.rows[0] ?? null;
    } catch (err) {
      if (!isInvalidIdentifierError(err)) throw err;
      const fallback = await conn.execute(
        `SELECT ID_ARTICULO, DESCRIPCION, UNIDAD, CUOTA_RECUPERACION,
                INVENTARIO_ACTUAL, MANEJA_INVENTARIO, ID_CATEGORIA, STOCK_MINIMO
         FROM ARTICULOS
         WHERE ID_ARTICULO = :id`,
        { id }
      );
      return fallback.rows[0] ?? null;
    }
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
           INVENTARIO_ACTUAL, MANEJA_INVENTARIO, ID_CATEGORIA, STOCK_MINIMO
       ) VALUES (
         :idArticulo, :descripcion, :unidad, :cuotaRecuperacion,
         :inventarioActual, :manejaInventario, :idCategoria, :stockMinimo
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
    
    const dbColumnMap = {
      descripcion: "DESCRIPCION",
      unidad: "UNIDAD",
      cuotaRecuperacion: "CUOTA_RECUPERACION",
      inventarioActual: "INVENTARIO_ACTUAL",
      manejaInventario: "MANEJA_INVENTARIO",
      idCategoria: "ID_CATEGORIA",
      stockMinimo: "STOCK_MINIMO",
      activo: "ACTIVO",
    };

    // Construir SET dinámicamente solo con los campos que no sean null/undefined
    const setClause = Object.entries(updateData)
      .filter(([key, value]) => {
        if (value === null || value === undefined) return false;
        if (!(key in dbColumnMap)) {
          console.warn(`Campo desconocido en update: ${key}`);
          return false;
        }
        return true;
      })
      .map(([key]) => `${dbColumnMap[key]} = :${key}`);

    if (setClause.length === 0) return; // Si no hay nada que actualizar

    await conn.execute(
      `UPDATE ARTICULOS SET ${setClause.join(", ")} WHERE ID_ARTICULO = :id`,
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
    try {
      await conn.execute(
        `UPDATE ARTICULOS
            SET ACTIVO = 'N'
          WHERE ID_ARTICULO = :id`,
        { id },
        { autoCommit: true }
      );
    } catch (err) {
      if (!isInvalidIdentifierError(err)) throw err;
      await conn.execute(
        `DELETE FROM ARTICULOS WHERE ID_ARTICULO = :id`,
        { id },
        { autoCommit: true }
      );
    }
  } finally {
    await conn.close();
  }
}
