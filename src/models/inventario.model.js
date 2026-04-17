import { getConnection } from "../config/db.js";
import { AppError } from "../middleware/errorHandler.js";

function calcularNuevoStock(stockActual, tipo, cantidad) {
  if (tipo === "ENTRADA") {
    return stockActual + cantidad;
  }

  if (stockActual < cantidad) {
    throw new AppError("Stock insuficiente para registrar la salida", 409);
  }

  return stockActual - cantidad;
}

export async function createMovimientoConTransaccion(data) {
  let conn;
  try {
    conn = await getConnection();

    const articuloResult = await conn.execute(
      `SELECT ID_ARTICULO, INVENTARIO_ACTUAL
       FROM ARTICULOS
       WHERE ID_ARTICULO = :idArticulo
       FOR UPDATE`,
      { idArticulo: data.idArticulo }
    );

    const articulo = articuloResult.rows[0];
    if (!articulo) {
      throw new AppError("Articulo no encontrado", 404);
    }

    const stockActual = Number(articulo.INVENTARIO_ACTUAL || 0);
    const nuevoStock = calcularNuevoStock(stockActual, data.tipo, data.cantidad);

    await conn.execute(
      `INSERT INTO MOVIMIENTOS_INVENTARIO (
         ID_ARTICULO,
         TIPO_MOVIMIENTO,
         CANTIDAD,
         MOTIVO,
         FECHA
       ) VALUES (
         :idArticulo,
         :tipo,
         :cantidad,
         :motivo,
         SYSDATE
       )`,
      {
        idArticulo: data.idArticulo,
        tipo: data.tipo,
        cantidad: data.cantidad,
        motivo: data.motivo
      }
    );

    await conn.execute(
      `UPDATE ARTICULOS
       SET INVENTARIO_ACTUAL = :nuevoStock
       WHERE ID_ARTICULO = :idArticulo`,
      {
        idArticulo: data.idArticulo,
        nuevoStock
      }
    );

    await conn.commit();

    return {
      idArticulo: data.idArticulo,
      tipo: data.tipo,
      cantidad: data.cantidad,
      stockAnterior: stockActual,
      stockActual: nuevoStock
    };
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (conn) await conn.close();
  }
}

export async function findInventarioActual() {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT ID_ARTICULO, DESCRIPCION, UNIDAD,
              CUOTA_RECUPERACION, INVENTARIO_ACTUAL
       FROM ARTICULOS
       ORDER BY DESCRIPCION`
    );
    return result.rows;
  } finally {
    await conn.close();
  }
}

export async function findMovimientos() {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT M.ID_MOVIMIENTO,
              M.ID_ARTICULO,
              A.DESCRIPCION,
              M.TIPO_MOVIMIENTO,
              M.CANTIDAD,
              M.MOTIVO,
              M.FECHA
      FROM MOVIMIENTOS_INVENTARIO M
       JOIN ARTICULOS A ON A.ID_ARTICULO = M.ID_ARTICULO
       ORDER BY M.FECHA DESC, M.ID_MOVIMIENTO DESC`
    );
    return result.rows;
  } finally {
    await conn.close();
  }
}

export async function countMovimientosByArticulo(idArticulo) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT COUNT(*) AS TOTAL
      FROM MOVIMIENTOS_INVENTARIO
       WHERE ID_ARTICULO = :idArticulo`,
      { idArticulo }
    );

    return Number(result.rows[0].TOTAL || 0);
  } finally {
    await conn.close();
  }
}