import * as InventarioModel from "../models/inventario.model.js";
import { AppError } from "../middleware/errorHandler.js";

function normalizeMovimientoData(data = {}) {
  const idArticulo = Number(data.idArticulo);
  if (Number.isNaN(idArticulo)) {
    throw new AppError("idArticulo debe ser numerico", 400);
  }

  const tipo = String(data.tipo || "").trim().toUpperCase();
  if (!["ENTRADA", "SALIDA"].includes(tipo)) {
    throw new AppError("tipo debe ser ENTRADA o SALIDA", 400);
  }

  const cantidad = Number(data.cantidad);
  if (Number.isNaN(cantidad) || cantidad <= 0) {
    throw new AppError("cantidad debe ser un numero mayor a 0", 400);
  }

  const motivo = data.motivo === undefined || data.motivo === null
    ? null
    : String(data.motivo).trim();

  return {
    idArticulo,
    tipo,
    cantidad,
    motivo
  };
}

function mapInventarioRow(row) {
  return {
    idArticulo: row.ID_ARTICULO,
    nombre: row.DESCRIPCION,
    stock: Number(row.INVENTARIO_ACTUAL || 0)
  };
}

function mapMovimientoRow(row) {
  return {
    idMovimiento: row.ID_MOVIMIENTO,
    idArticulo: row.ID_ARTICULO,
    articulo: row.DESCRIPCION,
    tipo: row.TIPO_MOVIMIENTO,
    cantidad: Number(row.CANTIDAD || 0),
    motivo: row.MOTIVO,
    fecha: row.FECHA
  };
}

export async function createMovimiento(data) {
  const normalized = normalizeMovimientoData(data);
  return InventarioModel.createMovimientoConTransaccion(normalized);
}

export async function getInventarioActual() {
  const rows = await InventarioModel.findInventarioActual();
  return rows.map(mapInventarioRow);
}

export async function getMovimientos() {
  const rows = await InventarioModel.findMovimientos();
  return rows.map(mapMovimientoRow);
}

export async function assertArticuloSinMovimientos(idArticulo) {
  const totalMovimientos = await InventarioModel.countMovimientosByArticulo(idArticulo);
  if (totalMovimientos > 0) {
    throw new AppError("No se puede eliminar el articulo porque tiene movimientos registrados", 409);
  }
}