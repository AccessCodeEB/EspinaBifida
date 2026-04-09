import * as ArticulosService from "../services/articulos.service.js";

export async function getAll(req, res, next) {
  try {
    const data = await ArticulosService.getAll();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const data = await ArticulosService.getById(req.params.id);
    if (!data) return res.status(404).json({ error: "Articulo no encontrado" });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    await ArticulosService.create(req.body);
    res.status(201).json({ message: "Articulo creado exitosamente" });
  } catch (err) {
    if (err.message.includes("manejaInventario") || err.message.includes("cuotaRecuperacion") || err.message.includes("inventarioActual") || err.message.includes("idCategoria")) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const existente = await ArticulosService.getById(req.params.id);
    if (!existente) return res.status(404).json({ error: "Articulo no encontrado" });

    await ArticulosService.update(req.params.id, req.body);
    res.json({ message: "Articulo actualizado exitosamente" });
  } catch (err) {
    if (err.message.includes("manejaInventario") || err.message.includes("cuotaRecuperacion") || err.message.includes("inventarioActual") || err.message.includes("idCategoria")) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
}

export async function deleteById(req, res, next) {
  try {
    const existente = await ArticulosService.getById(req.params.id);
    if (!existente) return res.status(404).json({ error: "Articulo no encontrado" });

    await ArticulosService.deleteById(req.params.id);
    res.json({ message: "Articulo eliminado exitosamente" });
  } catch (err) {
    next(err);
  }
}
