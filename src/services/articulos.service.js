import * as ArticulosModel from "../models/articulos.model.js";
import { badRequest, conflict } from "../utils/httpErrors.js";
import { checkStockBajo } from "./notificaciones.service.js";

function normalizeData(data = {}) {
  // Solo normalizar los campos que efectivamente vienen en el request
  const normalized = {};
  
  // Mapeo de campos a validar
  const fieldValidators = {
    idArticulo: (val) => {
      if (val === null || val === undefined) return null;
      const num = Number(val);
      if (Number.isNaN(num)) throw badRequest("idArticulo debe ser numerico");
      return num;
    },
    descripcion: (val) => val === null || val === undefined ? null : String(val).trim(),
    unidad: (val) => val === null || val === undefined ? null : String(val).trim(),
    cuotaRecuperacion: (val) => {
      if (val === null || val === undefined) return null;
      const num = Number(val);
      if (Number.isNaN(num) || num < 0) throw badRequest("cuotaRecuperacion debe ser un numero >= 0");
      return num;
    },
    inventarioActual: (val) => {
      if (val === null || val === undefined) return null;
      const num = Number(val);
      if (Number.isNaN(num) || num < 0) throw badRequest("inventarioActual debe ser un numero >= 0");
      return num;
    },
    manejaInventario: (val) => {
      if (val === null || val === undefined) return null;
      const str = String(val).trim().toUpperCase();
      if (!["S", "N"].includes(str)) throw badRequest("manejaInventario debe ser 'S' o 'N'");
      return str;
    },
    idCategoria: (val) => {
      if (val === null || val === undefined) return null;
      const num = Number(val);
      if (Number.isNaN(num)) throw badRequest("idCategoria debe ser numerico");
      return num;
    },
    stockMinimo: (val) => {
      if (val === null || val === undefined) return null;
      const num = Number(val);
      if (Number.isNaN(num) || num < 0) throw badRequest("stockMinimo debe ser un numero >= 0");
      return num;
    },
    cuotaB: (val) => {
      if (val === null) return null;
      if (val === undefined) return null;
      const num = Number(val);
      if (Number.isNaN(num) || num < 0) throw badRequest("cuotaB debe ser un numero >= 0");
      return num;
    }
  };
  
  // Aplicar validaciones solo a los campos que vienen en el request
  for (const [key, validator] of Object.entries(fieldValidators)) {
    if (key in data) {
      normalized[key] = validator(data[key]);
    }
  }



  return normalized;
}

export const getAll = () =>
  ArticulosModel.findAll();

export const getAllCategorias = () =>
  ArticulosModel.findAllCategorias();

export const getById = (id) =>
  ArticulosModel.findById(id);

export const create = (data) => {
  const normalized = normalizeData(data);
  // Asegurar que todos los binds tienen valor (null si no viene en body)
  // para que el trigger TRG_ARTICULOS_BI asigne SEQ_ARTICULOS.NEXTVAL cuando idArticulo=null
  const bindings = {
    idArticulo: null, descripcion: null, unidad: null,
    cuotaRecuperacion: null, cuotaB: null, inventarioActual: null,
    manejaInventario: null, idCategoria: null, stockMinimo: null,
    ...normalized,
  };
  return ArticulosModel.create(bindings);
};

export async function update(id, data) {
  const result = await ArticulosModel.update(id, normalizeData(data));
  // Actualiza notificación de stock en segundo plano (no bloquea la respuesta)
  checkStockBajo().catch(() => {});
  return result;
}

export async function deleteById(id) {
  const articulo = await ArticulosModel.findById(id);
  if (!articulo) return null;

  const stockActual = Number(articulo.INVENTARIO_ACTUAL || 0);
  if (stockActual > 0) {
    throw conflict(
      "No se puede eliminar el artículo porque todavía tiene stock disponible.",
      "ARTICULO_CON_STOCK"
    );
  }

  return ArticulosModel.deleteById(id);
}
