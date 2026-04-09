import * as ArticulosModel from "../models/articulos.model.js";

function normalizeData(data = {}) {
  const normalized = {
    descripcion: data.descripcion ?? null,
    unidad: data.unidad ?? null,
    cuotaRecuperacion: data.cuotaRecuperacion ?? null,
    inventarioActual: data.inventarioActual ?? null,
    manejaInventario: data.manejaInventario ?? null,
    idCategoria: data.idCategoria ?? null
  };

  if (normalized.manejaInventario !== null && normalized.manejaInventario !== undefined) {
    normalized.manejaInventario = String(normalized.manejaInventario).trim().toUpperCase();
    if (!["S", "N"].includes(normalized.manejaInventario)) {
      throw new Error("manejaInventario debe ser 'S' o 'N'");
    }
  }

  if (normalized.cuotaRecuperacion !== null && normalized.cuotaRecuperacion !== undefined) {
    const cuota = Number(normalized.cuotaRecuperacion);
    if (Number.isNaN(cuota) || cuota < 0) {
      throw new Error("cuotaRecuperacion debe ser un numero mayor o igual a 0");
    }
    normalized.cuotaRecuperacion = cuota;
  }

  if (normalized.inventarioActual !== null && normalized.inventarioActual !== undefined) {
    const inventario = Number(normalized.inventarioActual);
    if (Number.isNaN(inventario) || inventario < 0) {
      throw new Error("inventarioActual debe ser un numero mayor o igual a 0");
    }
    normalized.inventarioActual = inventario;
  }

  if (normalized.idCategoria !== null && normalized.idCategoria !== undefined) {
    const categoria = Number(normalized.idCategoria);
    if (Number.isNaN(categoria)) {
      throw new Error("idCategoria debe ser numerico");
    }
    normalized.idCategoria = categoria;
  }

  return normalized;
}

export const getAll = () =>
  ArticulosModel.findAll();

export const getById = (id) =>
  ArticulosModel.findById(id);

export const create = (data) =>
  ArticulosModel.create(normalizeData(data));

export const update = (id, data) =>
  ArticulosModel.update(id, normalizeData(data));

export const deleteById = (id) =>
  ArticulosModel.deleteById(id);
