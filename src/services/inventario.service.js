import * as InventarioModel from "../models/inventario.model.js";
import { badRequest, conflict } from "../utils/httpErrors.js";

function normalizeMovimientoData(data = {}) {
  const idArticulo = Number(data.idArticulo);
  if (Number.isNaN(idArticulo)) {
    throw badRequest("idArticulo debe ser numérico", "INVALID_ID");
  }

  const tipo = String(data.tipo || "").trim().toUpperCase();
  if (!["ENTRADA", "SALIDA"].includes(tipo)) {
    throw badRequest("tipo debe ser ENTRADA o SALIDA", "INVALID_MOVIMIENTO_TIPO");
  }

  const cantidad = Number(data.cantidad);
  if (Number.isNaN(cantidad) || cantidad <= 0) {
    throw badRequest("cantidad debe ser un número mayor a 0", "INVALID_CANTIDAD");
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
    idArticulo:       row.ID_ARTICULO,
    descripcion:      row.DESCRIPCION,
    unidad:           row.UNIDAD,
    cuotaRecuperacion: row.CUOTA_RECUPERACION,
    inventarioActual,
    // Compatibilidad legacy para consumidores que aún esperan esta forma.
    nombre:           row.DESCRIPCION,
    stock:            inventarioActual,
  };
}

function mapMovimientoRow(row) {
  const cantidad = Number(row.CANTIDAD || 0);

  return {
    idMovimiento:  row.ID_MOVIMIENTO,
    idArticulo:    row.ID_ARTICULO,
    descripcion:   row.DESCRIPCION,
    tipoMovimiento: row.TIPO_MOVIMIENTO,
    cantidad,
    motivo:        row.MOTIVO,
    fecha:         row.FECHA,
    // Compatibilidad legacy para consumidores que aún esperan esta forma.
    articulo:      row.DESCRIPCION,
    tipo:          row.TIPO_MOVIMIENTO,
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
  const total = await InventarioModel.countMovimientosByArticulo(idArticulo);
  if (total > 0) {
    throw conflict(
      "No se puede eliminar el artículo porque tiene movimientos registrados",
      "ARTICULO_HAS_MOVIMIENTOS"
    );
  }
}
