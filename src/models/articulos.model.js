import oracledb from "oracledb";
import { withConnection } from "../config/db.js";

function isInvalidIdentifierError(err) {
  return err?.errorNum === 904 || /ORA-00904/i.test(String(err?.message ?? ""));
}

export const findAll = () =>
  withConnection(async conn => {
    try {
      return (await conn.execute(
        `SELECT ID_ARTICULO, DESCRIPCION, UNIDAD, CUOTA_RECUPERACION,
                INVENTARIO_ACTUAL, MANEJA_INVENTARIO, ID_CATEGORIA,
                STOCK_MINIMO, NVL(ACTIVO, 'S') AS ACTIVO
         FROM ARTICULOS WHERE NVL(ACTIVO, 'S') = 'S' ORDER BY DESCRIPCION`
      )).rows;
    } catch (err) {
      if (!isInvalidIdentifierError(err)) throw err;
      return (await conn.execute(
        `SELECT ID_ARTICULO, DESCRIPCION, UNIDAD, CUOTA_RECUPERACION,
                INVENTARIO_ACTUAL, MANEJA_INVENTARIO, ID_CATEGORIA, STOCK_MINIMO
         FROM ARTICULOS ORDER BY DESCRIPCION`
      )).rows;
    }
  });

export const findById = (id) =>
  withConnection(async conn => {
    try {
      return (await conn.execute(
        `SELECT ID_ARTICULO, DESCRIPCION, UNIDAD, CUOTA_RECUPERACION,
                INVENTARIO_ACTUAL, MANEJA_INVENTARIO, ID_CATEGORIA,
                STOCK_MINIMO, NVL(ACTIVO, 'S') AS ACTIVO
         FROM ARTICULOS WHERE ID_ARTICULO = :id AND NVL(ACTIVO, 'S') = 'S'`,
        { id }
      )).rows[0] ?? null;
    } catch (err) {
      if (!isInvalidIdentifierError(err)) throw err;
      return (await conn.execute(
        `SELECT ID_ARTICULO, DESCRIPCION, UNIDAD, CUOTA_RECUPERACION,
                INVENTARIO_ACTUAL, MANEJA_INVENTARIO, ID_CATEGORIA, STOCK_MINIMO
         FROM ARTICULOS WHERE ID_ARTICULO = :id`,
        { id }
      )).rows[0] ?? null;
    }
  });

export const create = (data) =>
  withConnection(async conn => {
    const result = await conn.execute(
      `INSERT INTO ARTICULOS (
         ID_ARTICULO, DESCRIPCION, UNIDAD, CUOTA_RECUPERACION,
         INVENTARIO_ACTUAL, MANEJA_INVENTARIO, ID_CATEGORIA, STOCK_MINIMO
       ) VALUES (
         SEQ_ARTICULOS.NEXTVAL, :descripcion, :unidad, :cuotaRecuperacion,
         :inventarioActual, :manejaInventario, :idCategoria, :stockMinimo
       ) RETURNING ID_ARTICULO INTO :newId`,
      {
        descripcion: data.descripcion, unidad: data.unidad,
        cuotaRecuperacion: data.cuotaRecuperacion, inventarioActual: data.inventarioActual,
        manejaInventario: data.manejaInventario, idCategoria: data.idCategoria,
        stockMinimo: data.stockMinimo,
        newId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: true }
    );
    // DML RETURNING always gives an array; extract the single generated ID
    return Array.isArray(result.outBinds.newId)
      ? result.outBinds.newId[0]
      : result.outBinds.newId;
  });

export async function update(id, data) {
  return withConnection(async conn => {
    // Exclude idArticulo from the update payload; only the rest fields are used.
    const updateData = Object.fromEntries(
      Object.entries(data).filter(([k]) => k !== "idArticulo")
    );
    const dbColumnMap = {
      descripcion: "DESCRIPCION", unidad: "UNIDAD",
      cuotaRecuperacion: "CUOTA_RECUPERACION", inventarioActual: "INVENTARIO_ACTUAL",
      manejaInventario: "MANEJA_INVENTARIO", idCategoria: "ID_CATEGORIA",
      stockMinimo: "STOCK_MINIMO", activo: "ACTIVO",
    };
    const setClause = Object.entries(updateData)
      .filter(([key, value]) => {
        if (value === null || value === undefined) return false;
        if (!(key in dbColumnMap)) { console.warn(`Campo desconocido en update: ${key}`); return false; }
        return true;
      })
      .map(([key]) => `${dbColumnMap[key]} = :${key}`);
    if (setClause.length === 0) return;
    await conn.execute(
      `UPDATE ARTICULOS SET ${setClause.join(", ")} WHERE ID_ARTICULO = :id`,
      { ...updateData, id }, { autoCommit: true }
    );
  });
}

export const findAllCategorias = () =>
  withConnection(async conn =>
    (await conn.execute(
      `SELECT ID_CATEGORIA, NOMBRE FROM CATEGORIAS_ARTICULO ORDER BY NOMBRE`
    )).rows
  );

export const deleteById = (id) =>
  withConnection(async conn => {
    try {
      await conn.execute(
        `UPDATE ARTICULOS SET ACTIVO = 'N' WHERE ID_ARTICULO = :id`,
        { id }, { autoCommit: true }
      );
    } catch (err) {
      if (!isInvalidIdentifierError(err)) throw err;
      await conn.execute(
        `DELETE FROM ARTICULOS WHERE ID_ARTICULO = :id`,
        { id }, { autoCommit: true }
      );
    }
  });
