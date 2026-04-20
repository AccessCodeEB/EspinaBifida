import * as InventarioService from "../services/inventario.service.js";

function pickValue(row, keys) {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null) return row[key];
  }
  return undefined;
}

function formatCuota(valor) {
  const n = Number(valor ?? 0);
  return `$${n.toFixed(2)}`;
}

function normalizeUnidad(valor) {
  const raw = String(valor ?? "").trim();
  if (!raw) return "PZA.";


























  
  const upper = raw.toUpperCase();
  if (upper === "PIEZA" || upper === "PZA" || upper === "PZA.") {
    return "PZA.";
  }

  return raw;
}

function mapArticulo(row) {
  const idProducto = pickValue(row, ["idProducto", "idArticulo", "ID_ARTICULO", "idarticulo"]);
  const nombre = pickValue(row, ["nombre", "NOMBRE", "descripcion", "DESCRIPCION"]);
  const unidad = pickValue(row, ["unidad", "UNIDAD"]);
  const cuotaRecuperacion = pickValue(row, [
    "cuotaRecuperacion",
    "CUOTA_RECUPERACION",
    "cuotarecuperacion",
  ]);
  const inventarioActual = pickValue(row, [
    "inventarioActual",
    "INVENTARIO_ACTUAL",
    "inventarioactual",
    "stock",
    "STOCK",
  ]);

  return {
    idProducto,
    nombre:      nombre ?? "",
    stockActual: Number(inventarioActual ?? 0),
    unidad:      normalizeUnidad(unidad),
    // Compatibilidad legacy
    clave:       idProducto,
    descripcion: nombre ?? "",
    cuota:       formatCuota(cuotaRecuperacion),
    cantidad:    Number(inventarioActual ?? 0),
    stock:       Number(inventarioActual ?? 0),
    minimo:      0,
  };
}

function mapMovimiento(row) {
  const fechaRaw = pickValue(row, ["fecha", "FECHA"]);
  let fechaStr = "";
  if (fechaRaw) {
    const d = fechaRaw instanceof Date ? fechaRaw : new Date(fechaRaw);
    fechaStr = isNaN(d.getTime()) ? String(fechaRaw).slice(0, 10) : d.toISOString().slice(0, 10);
  }

  const idMovimiento = pickValue(row, ["idMovimiento", "ID_MOVIMIENTO", "idmovimiento"]);

  return {
    id:          idMovimiento,
    idMovimiento,
    idProducto:  pickValue(row, ["idProducto", "idArticulo", "ID_ARTICULO", "idarticulo"]),
    idArticulo:  pickValue(row, ["idArticulo", "ID_ARTICULO", "idarticulo"]),
    descripcion: pickValue(row, ["descripcion", "DESCRIPCION", "articulo", "ARTICULO"]),
    tipo:        pickValue(row, ["tipoMovimiento", "TIPO_MOVIMIENTO", "tipomovimiento", "tipo", "TIPO"]),
    cantidad:    Number(pickValue(row, ["cantidad", "CANTIDAD"]) ?? 0),
    motivo:      pickValue(row, ["motivo", "MOTIVO"]),
    fecha:       fechaStr,
    stockResultante: Number(
      pickValue(row, ["stockResultante", "STOCK_RESULTANTE", "stock_resultante"]) ?? 0
    ),
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
    res.json(rows.map(mapArticulo).sort((a, b) => a.nombre.localeCompare(b.nombre, "es")));
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
