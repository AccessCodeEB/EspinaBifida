import * as CategoriasModel from "../models/categorias-articulo.model.js";
import { toCamel } from "../utils/dbTransform.js";

export async function getAll(req, res, next) {
  try {
    const rows = await CategoriasModel.findAll();
    res.json(rows.map(toCamel));
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { nombre, descripcion } = req.body;
    if (!nombre || String(nombre).trim() === "") {
      return res.status(400).json({ error: "El campo nombre es requerido" });
    }
    const data = await CategoriasModel.create({ nombre: String(nombre).trim(), descripcion });
    res.status(201).json({ message: "Categoría creada exitosamente", data });
  } catch (err) {
    next(err);
  }
}
