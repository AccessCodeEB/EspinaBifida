import * as InventarioService from "../services/inventario.service.js";
import { toCamel } from "../utils/dbTransform.js";

function formatCuota(valor) {
  const n = Number(valor ?? 0);
  return `$${n.toFixed(2)}`;
}

function mapArticulo(row) {
  const r = toCamel(row);
  return {
    clave:       r.idArticulo,
    descripcion: r.descripcion ?? "",
    unidad:      r.unidad ?? "Pieza",
    cuota:       formatCuota(r.cuotaRecuperacion),
    cantidad:    Number(r.inventarioActual ?? 0),
    minimo:      0,
  };
}

function mapMovimiento(row) {
  const r = toCamel(row);
  let fechaStr = "";
  if (r.fecha) {
    const d = r.fecha instanceof Date ? r.fecha : new Date(r.fecha);
    fechaStr = isNaN(d.getTime()) ? String(r.fecha).slice(0, 10) : d.toISOString().slice(0, 10);
  }
  return {
    id:          r.idMovimiento,
    idArticulo:  r.idArticulo,
    descripcion: r.descripcion,
    tipo:        r.tipoMovimiento,
    cantidad:    Number(r.cantidad ?? 0),
    motivo:      r.motivo,
    fecha:       fechaStr,
  };
}

export async function createMovimiento(req, res, next) {
  try {
    const data = await InventarioService.createMovimiento(req.body);
    res.status(201).json({ message: "Movimiento registrado exitosamente", data });
  } catch (err) {
    next(err);
  }
}

export async function getInventario(req, res, next) {
  try {
    const rows = await InventarioService.getInventarioActual();
    res.json(rows.map(mapArticulo));
  } catch (err) {
    next(err);
  }
}

export async function getMovimientos(req, res, next) {
  try {
    const rows = await InventarioService.getMovimientos();
    res.json(rows.map(mapMovimiento));
  } catch (err) {
    next(err);
  }
}
