import * as InventarioService from "../services/inventario.service.js";

export async function createMovimiento(req, res, next) {
  try {
    const data = await InventarioService.createMovimiento(req.body);
    res.status(201).json({
      message: "Movimiento registrado exitosamente",
      data
    });
  } catch (err) {
    next(err);
  }
}

export async function getInventario(req, res, next) {
  try {
    const data = await InventarioService.getInventarioActual();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getMovimientos(req, res, next) {
  try {
    const data = await InventarioService.getMovimientos();
    res.json(data);
  } catch (err) {
    next(err);
  }
}