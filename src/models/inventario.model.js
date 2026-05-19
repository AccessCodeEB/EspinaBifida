import oracledb from "oracledb";
import { getConnection, withConnection } from "../config/db.js";
import { HttpError } from "../utils/httpErrors.js";

/**
 * Registra movimiento via SP. Recibe conexión existente — caller hace commit/rollback.
 */
export async function applyMovimientoConConexion(conn, data) {
  let stockResultante;
  try {
    const result = await conn.execute(
      `BEGIN
         SP_REGISTRAR_MOVIMIENTO_INVENTARIO(:art, :tipo, :cant, :motivo, :stock_out);
       END;`,
      {
        art:       data.idArticulo,
        tipo:      data.tipo,
        cant:      data.cantidad,
        motivo:    data.motivo ?? null,
        stock_out: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      }
    );
    stockResultante = result.outBinds.stock_out;
  } catch (err) {
    if (err.errorNum === 20002 || err.errorNum === 20001)
      throw new HttpError(422, "Stock insuficiente", "INSUFFICIENT_STOCK", {});
    if (err.errorNum === 20006)
      throw new HttpError(404, "Producto no encontrado", "PRODUCT_NOT_FOUND");
    if (err.errorNum === 20005)
      throw new HttpError(400, "Tipo de movimiento inválido", "INVALID_MOVIMIENTO_TIPO");
    throw err;
  }
  return {
    idProducto: data.idArticulo, tipo: data.tipo, cantidad: data.cantidad,
    fecha: new Date().toISOString(), stockResultante, stockActual: stockResultante,
  };
}

/**
 * Versión standalone con su propia conexión y rollback.
 * No usa withConnection porque necesita rollback explícito en caso de error.
 */
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

export const findInventarioActual = () =>
  withConnection(conn =>
    conn.execute(
      `SELECT ID_ARTICULO, DESCRIPCION, UNIDAD,
              CUOTA_RECUPERACION, INVENTARIO_ACTUAL, NVL(STOCK_MINIMO, 5) AS STOCK_MINIMO
       FROM ARTICULOS ORDER BY DESCRIPCION`
    ).then(r => r?.rows ?? [])
  );

export const findMovimientos = () =>
  withConnection(conn =>
    conn.execute(
      `SELECT M.ID_MOVIMIENTO, M.ID_ARTICULO, A.DESCRIPCION,
              M.TIPO_MOVIMIENTO, M.CANTIDAD, M.MOTIVO, M.FECHA, M.STOCK_RESULTANTE
       FROM MOVIMIENTOS_INVENTARIO M
       JOIN ARTICULOS A ON A.ID_ARTICULO = M.ID_ARTICULO
       ORDER BY M.FECHA DESC, M.ID_MOVIMIENTO DESC`
    ).then(r => r?.rows ?? [])
  );

export const countMovimientosByArticulo = (idArticulo) =>
  withConnection(conn =>
    conn.execute(
      `SELECT COUNT(*) AS TOTAL FROM MOVIMIENTOS_INVENTARIO WHERE ID_ARTICULO = :idArticulo`,
      { idArticulo }
    ).then(r => Number(r.rows[0].TOTAL || 0))
  );
