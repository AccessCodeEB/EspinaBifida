import * as InventarioModel from "../models/inventario.model.js";
import * as ArticulosModel from "../models/articulos.model.js";
import * as ArticulosLogModel from "../models/articulos-log.model.js";
import { badRequest, conflict } from "../utils/httpErrors.js";
import { checkStockBajo } from "./notificaciones.service.js";

function normalizeMovimientoData(data = {}) {
  const rawIdProducto = data.idProducto ?? data.idArticulo;
  const idArticulo = Number(rawIdProducto);
  if (Number.isNaN(idArticulo)) {
    throw badRequest("idProducto debe ser numérico", "INVALID_ID");
  }

  const tipo = String(data.tipo || "").trim().toUpperCase();
  if (!["ENTRADA", "SALIDA"].includes(tipo)) {
    throw badRequest("tipo debe ser ENTRADA o SALIDA", "INVALID_MOVIMIENTO_TIPO");
  }

  const cantidad = Number(data.cantidad);
  if (Number.isNaN(cantidad) || !Number.isInteger(cantidad) || cantidad <= 0) {
    throw badRequest("cantidad debe ser un entero mayor a 0", "INVALID_CANTIDAD");
  }

  const motivo =
    data.motivo === undefined || data.motivo === null
      ? null
      : String(data.motivo).trim();

  return { idArticulo, tipo, cantidad, motivo };
}

function mapInventarioRow(row) {
  const inventarioActual = Number(row.INVENTARIO_ACTUAL || 0);

  return {
    idProducto:       row.ID_ARTICULO,
    nombre:           row.DESCRIPCION,
    stockActual:      inventarioActual,
    unidad:           row.UNIDAD,
    idArticulo:       row.ID_ARTICULO,
    descripcion:      row.DESCRIPCION,
    cuotaRecuperacion: row.CUOTA_RECUPERACION,
    cuotaB:           row.CUOTA_B != null ? Number(row.CUOTA_B) : null,
    inventarioActual,
    stock:            inventarioActual,
    minimo:           Number(row.STOCK_MINIMO ?? 5),
    idCategoria:      row.ID_CATEGORIA == null ? undefined : Number(row.ID_CATEGORIA),
    nombreCategoria:  row.NOMBRE_CATEGORIA ?? undefined,
  };
}

function mapMovimientoRow(row) {
  const cantidad = Number(row.CANTIDAD || 0);

  return {
    idProducto:    row.ID_ARTICULO,
    idMovimiento:  row.ID_MOVIMIENTO,
    idArticulo:    row.ID_ARTICULO,
    descripcion:   row.DESCRIPCION,
    tipoMovimiento: row.TIPO_MOVIMIENTO,
    cantidad,
    motivo:        row.MOTIVO,
    fecha:         row.FECHA,
    stockResultante: Number(row.STOCK_RESULTANTE ?? 0),
    articulo:      row.DESCRIPCION,
    tipo:          row.TIPO_MOVIMIENTO,
  };
}

export async function createMovimiento(data) {
  const normalized = normalizeMovimientoData(data);
  const result = await InventarioModel.createMovimientoConTransaccion(normalized);
  // Actualiza notificación de stock en segundo plano tras cada movimiento
  checkStockBajo().catch(() => {});
  return result;
}

export async function getInventarioActual() {
  const rows = await InventarioModel.findInventarioActual();
  return rows.map(mapInventarioRow);
}

export async function getMovimientos(days = null) {
  const rows = await InventarioModel.findMovimientos(days);
  return rows.map(mapMovimientoRow);
}

/* istanbul ignore next */
export const deleteE2EMovimientos = () => InventarioModel.deleteE2EMovimientos();

/* istanbul ignore next */
export async function deleteE2EInventario() {
  await ArticulosLogModel.deleteE2ELogs();
  await ArticulosModel.deleteE2EArticulos();
  await InventarioModel.deleteE2EMovimientos();
}

export async function assertArticuloSinMovimientos(idArticulo) {
  const total = await InventarioModel.countMovimientosByArticulo(idArticulo);
  if (total > 0) {
    throw conflict(
      "No se puede eliminar el artículo porque ya tiene entradas o salidas registradas.",
      "ARTICULO_HAS_MOVIMIENTOS"
    );
  }
}
