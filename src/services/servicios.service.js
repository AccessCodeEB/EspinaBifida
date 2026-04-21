import * as ServiciosModel from "../models/servicios.model.js";
import { badRequest, conflict, notFound } from "../utils/httpErrors.js";

// Validar beneficiario activo y crear servicio
const ESTATUS_BLOQUEADOS = ["Inactivo", "Baja"];

function parseNumber(value, fieldName) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw badRequest(`${fieldName} debe ser numerico`);
  }
  return parsed;
}

function validateMontoReglas(costo, montoPagado) {
  if (costo < 0) {
    throw badRequest("costo no puede ser negativo");
  }

  if (montoPagado < 0) {
    throw badRequest("montoPagado no puede ser negativo");
  }

  if (montoPagado > costo) {
    throw badRequest("montoPagado no puede ser mayor que costo");
  }
}

function parseAndValidateDate(dateStr, fieldName) {
  if (!dateStr) return null;
  if (typeof dateStr !== "string") {
    throw badRequest(`${fieldName} debe tener formato YYYY-MM-DD`);
  }

  const value = dateStr.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw badRequest(`${fieldName} debe tener formato YYYY-MM-DD`);
  }

  return value;
}

function normalizeConsumos(consumos) {
  if (consumos === undefined || consumos === null) return [];
  if (!Array.isArray(consumos)) {
    throw badRequest("consumos debe ser un arreglo");
  }

  return consumos.map((item, index) => {
    const idProducto = Number(item?.idProducto ?? item?.idArticulo);
    const cantidad = Number(item?.cantidad);

    if (!Number.isInteger(idProducto) || idProducto <= 0) {
      throw badRequest(`consumos[${index}].idProducto debe ser entero positivo`);
    }

    if (Number.isNaN(cantidad) || cantidad <= 0) {
      throw badRequest(`consumos[${index}].cantidad debe ser mayor a 0`);
    }

    return {
      idProducto,
      cantidad,
      motivo: item?.motivo ? String(item.motivo).trim() : null,
    };
  });
}

export const getAll = () => ServiciosModel.findAll();

export async function createConValidacion(data) {
  const curp = String(data.curp ?? "").trim().toUpperCase();
  const idTipoServicio = parseNumber(data.idTipoServicio, "idTipoServicio");
  const costo = parseNumber(data.costo, "costo");
  const montoPagado = parseNumber(data.montoPagado ?? 0, "montoPagado");

  if (!curp) {
    throw badRequest("curp es requerido");
  }

  if (!Number.isInteger(idTipoServicio) || idTipoServicio <= 0) {
    throw badRequest("idTipoServicio debe ser entero positivo");
  }

  validateMontoReglas(costo, montoPagado);

  if (data.referenciaTipo && (data.referenciaId === undefined || data.referenciaId === null)) {
    throw badRequest("referenciaId es requerido cuando referenciaTipo existe");
  }

  let referenciaId = null;
  if (data.referenciaId !== undefined && data.referenciaId !== null) {
    referenciaId = parseNumber(data.referenciaId, "referenciaId");
  }

  const referenciaTipo =
    data.referenciaTipo !== undefined && data.referenciaTipo !== null
      ? String(data.referenciaTipo).trim().toUpperCase()
      : null;
  const consumos = normalizeConsumos(data.consumos);

  // Single query: check beneficiary status + active membership atomically (no TOCTOU gap)
  const beneficiario = await ServiciosModel.findBeneficiarioActivoConMembresia(curp);

  if (!beneficiario) {
    throw notFound("Beneficiario no encontrado");
  }

  if (ESTATUS_BLOQUEADOS.includes(beneficiario.ESTATUS)) {
    throw conflict(
      `No se puede asignar un servicio a un beneficiario con estatus '${beneficiario.ESTATUS}'`
    );
  }

  if (!beneficiario.ID_CREDENCIAL) {
    throw conflict("El beneficiario no tiene membresia activa");
  }

  const payload = {
    curp,
    idTipoServicio,
    costo,
    montoPagado,
    referenciaId,
    referenciaTipo,
    notas: data.notas ?? null,
  };

  let idServicio;
  if (consumos.length > 0) {
    const result = await ServiciosModel.createWithInventarioTransaction(payload, consumos);
    idServicio = result.idServicio;
  } else {
    idServicio = await ServiciosModel.create(payload);
  }

  return {
    message: "Servicio creado exitosamente",
    idServicio,
    beneficiario: beneficiario.NOMBRES,
  };
}

export const getByCurp = (curp) =>
  ServiciosModel.findByCurp(curp);

export const getByCurpPaginated = (curp, page, limit) =>
  ServiciosModel.findByCurpPaginated(curp, page, limit);

export const getById = (idServicio) =>
  ServiciosModel.findById(idServicio);

export async function update(idServicio, data) {
  const servicio = await ServiciosModel.findById(idServicio);
  if (!servicio) {
    throw notFound("Servicio no encontrado");
  }

  let montoPagado = servicio.MONTO_PAGADO;

  if (data.montoPagado !== undefined) {
    montoPagado = parseNumber(data.montoPagado, "montoPagado");

    if (montoPagado < 0) {
      throw badRequest("montoPagado no puede ser negativo");
    }

    const costo = Number(servicio.COSTO ?? 0);
    if (montoPagado > costo) {
      throw badRequest("montoPagado no puede ser mayor que costo");
    }
  }

  return ServiciosModel.update(idServicio, {
    montoPagado,
    notas: data.notas ?? servicio.NOTAS ?? null,
  });
}

export async function getDetailed(filters) {
  const normalized = {
    curp: filters.curp ? String(filters.curp).trim().toUpperCase() : null,
    idTipoServicio:
      filters.idTipoServicio !== undefined ? parseNumber(filters.idTipoServicio, "idTipoServicio") : null,
    fechaDesde: parseAndValidateDate(filters.fechaDesde, "fechaDesde"),
    fechaHasta: parseAndValidateDate(filters.fechaHasta, "fechaHasta"),
    costoMin: filters.costoMin !== undefined ? parseNumber(filters.costoMin, "costoMin") : null,
    costoMax: filters.costoMax !== undefined ? parseNumber(filters.costoMax, "costoMax") : null,
    montoPagadoMin:
      filters.montoPagadoMin !== undefined
        ? parseNumber(filters.montoPagadoMin, "montoPagadoMin")
        : null,
    montoPagadoMax:
      filters.montoPagadoMax !== undefined
        ? parseNumber(filters.montoPagadoMax, "montoPagadoMax")
        : null,
    page: filters.page !== undefined ? parseNumber(filters.page, "page") : 1,
    limit: filters.limit !== undefined ? parseNumber(filters.limit, "limit") : 10,
  };

  if (normalized.fechaDesde && normalized.fechaHasta && normalized.fechaDesde > normalized.fechaHasta) {
    throw badRequest("fechaDesde no puede ser mayor que fechaHasta");
  }

  if (normalized.costoMin !== null && normalized.costoMin < 0) {
    throw badRequest("costoMin no puede ser negativo");
  }

  if (normalized.costoMax !== null && normalized.costoMax < 0) {
    throw badRequest("costoMax no puede ser negativo");
  }

  if (
    normalized.costoMin !== null &&
    normalized.costoMax !== null &&
    normalized.costoMin > normalized.costoMax
  ) {
    throw badRequest("costoMin no puede ser mayor que costoMax");
  }

  if (normalized.page < 1 || !Number.isInteger(normalized.page)) {
    throw badRequest("page debe ser entero positivo");
  }

  if (normalized.limit < 1 || !Number.isInteger(normalized.limit) || normalized.limit > 100) {
    throw badRequest("limit debe ser entero positivo y menor o igual a 100");
  }

  return ServiciosModel.findDetailed(normalized);
}

export const deleteById = (idServicio) =>
  ServiciosModel.deleteById(idServicio);
