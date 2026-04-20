import { getConnection } from "../config/db.js";
import { HttpError } from "../utils/httpErrors.js";

function insufficientStockError(disponible) {
  return new HttpError(422, "Stock insuficiente", "INSUFFICIENT_STOCK", { disponible });
}

function calcularNuevoStock(stockActual, tipo, cantidad) {
  if (tipo === "ENTRADA") {
    return stockActual + cantidad;
  }

  if (stockActual < cantidad) {
    throw insufficientStockError(stockActual);
  }

  return stockActual - cantidad;
}

export async function applyMovimientoConConexion(conn, data) {
  const articuloResult = await conn.execute(
    `SELECT ID_ARTICULO, INVENTARIO_ACTUAL
     FROM ARTICULOS
     WHERE ID_ARTICULO = :idArticulo
     FOR UPDATE`,
    { idArticulo: data.idArticulo }
  );

  const articulo = articuloResult?.rows?.[0];
  if (!articulo) {
    throw new HttpError(404, "Producto no encontrado", "PRODUCT_NOT_FOUND");
  }

  const stockActual = Number(articulo.INVENTARIO_ACTUAL || 0);
  const stockResultante = calcularNuevoStock(stockActual, data.tipo, data.cantidad);

  await conn.execute(
    `INSERT INTO MOVIMIENTOS_INVENTARIO (
       ID_ARTICULO,
       TIPO_MOVIMIENTO,
       CANTIDAD,
       MOTIVO,
       FECHA,
       STOCK_RESULTANTE
     ) VALUES (
       :idArticulo,
       :tipo,
       :cantidad,
       :motivo,
       SYSDATE,
       :stockResultante
     )`,
    {
      idArticulo: data.idArticulo,
      tipo: data.tipo,
      cantidad: data.cantidad,
      motivo: data.motivo ?? null,
      stockResultante,
    }
  );

  await conn.execute(
    `UPDATE ARTICULOS
     SET INVENTARIO_ACTUAL = :stockResultante
     WHERE ID_ARTICULO = :idArticulo`,
    {
      idArticulo: data.idArticulo,
      stockResultante,
    }
  );

  return {
    idProducto: data.idArticulo,
    tipo: data.tipo,
    cantidad: data.cantidad,
    fecha: new Date().toISOString(),
    stockResultante,
    stockActual: stockResultante,
  };
}

export async function createMovimientoConTransaccion(data) {
  let conn;
  try {
    conn = await getConnection();

    const movimiento = await applyMovimientoConConexion(conn, data);

    await conn.commit();

    return movimiento;
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
    return result?.rows ?? [];
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
                    M.FECHA,
                    M.STOCK_RESULTANTE
      FROM MOVIMIENTOS_INVENTARIO M
       JOIN ARTICULOS A ON A.ID_ARTICULO = M.ID_ARTICULO
       ORDER BY M.FECHA DESC, M.ID_MOVIMIENTO DESC`
    );
    return result?.rows ?? [];
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