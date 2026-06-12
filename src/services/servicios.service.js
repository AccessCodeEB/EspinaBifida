import * as ServiciosModel from "../models/servicios.model.js";
import * as ArticulosModel from "../models/articulos.model.js";
import { badRequest, conflict, notFound } from "../utils/httpErrors.js";
import { parseISODate } from "../utils/validators.js";

// Solo Baja bloquea el registro. Inactivo (sin credencial activa) permite con advertencia.
const ESTATUS_BLOQUEADOS = new Set(["Baja"]);

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

function parseOptionalNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw badRequest("costo debe ser numerico");
  }
  return parsed;
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

function validarBeneficiario(beneficiario) {
  if (!beneficiario) {
    throw notFound("Beneficiario no encontrado");
  }
  if (ESTATUS_BLOQUEADOS.has(beneficiario.ESTATUS)) {
    throw conflict(
      `No se puede asignar un servicio a un beneficiario con estatus '${beneficiario.ESTATUS}'`
    );
  }
  if (!beneficiario.TIPO_CUOTA) {
    throw badRequest(
      "El beneficiario no tiene cuota asignada (A o B). Asígnale la cuota antes de registrar un servicio.",
      "CUOTA_NO_ASIGNADA"
    );
  }
}

async function resolverCosto(consumos, beneficiario, costoProvisto) {
  if (consumos.length === 0) return costoProvisto;
  if (costoProvisto !== null) {
    for (const consumo of consumos) {
      const articulo = await ArticulosModel.findById(consumo.idProducto);
      if (!articulo) throw notFound(`Artículo ${consumo.idProducto} no encontrado`);
    }
    return costoProvisto;
  }
  let costo = 0;
  for (const consumo of consumos) {
    const articulo = await ArticulosModel.findById(consumo.idProducto);
    if (!articulo) throw notFound(`Artículo ${consumo.idProducto} no encontrado`);
    costo += precioSegunCuota(articulo, beneficiario.TIPO_CUOTA) * consumo.cantidad;
  }
  return Number(costo.toFixed(2));
}

export const getAll = () => ServiciosModel.findAll();

export async function createConValidacion(data) {
  const curp = String(data.curp ?? "").trim().toUpperCase();
  const idTipoServicio = parseNumber(data.idTipoServicio, "idTipoServicio");
  const montoPagado = parseNumber(data.montoPagado ?? 0, "montoPagado");
  const costoProvisto = parseOptionalNumber(data.costo);

  if (!curp) {
    throw badRequest("curp es requerido");
  }

  if (!Number.isInteger(idTipoServicio) || idTipoServicio <= 0) {
    throw badRequest("idTipoServicio debe ser entero positivo");
  }

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

  if (consumos.length === 0) {
    if (costoProvisto === null) {
      throw badRequest("costo es requerido cuando no hay consumos");
    }
    validateMontoReglas(costoProvisto, montoPagado);
  }

  // Single query: check beneficiary status + active membership atomically (no TOCTOU gap)
  const beneficiario = await ServiciosModel.findBeneficiarioActivoConMembresia(curp);
  validarBeneficiario(beneficiario);

  const costo = await resolverCosto(consumos, beneficiario, costoProvisto);

  validateMontoReglas(costo, montoPagado);

  const payload = {
    curp,
    idTipoServicio,
    costo,
    montoPagado,
    referenciaId,
    referenciaTipo,
    fecha:                   data.fecha ?? null,
    notas:                   data.notas ?? null,
    estatus:                 data.estatus ?? "COMPLETADO",
    fechaDevolucionEsperada: data.fechaDevolucionEsperada ?? null,
  };

  let idServicio;
  if (consumos.length > 0) {
    const result = await ServiciosModel.createWithInventarioTransaction(payload, consumos);
    idServicio = result.idServicio;
  } else {
    idServicio = await ServiciosModel.create(payload);
  }

  const resultado = {
    message: "Servicio creado exitosamente",
    idServicio,
    beneficiario: beneficiario.NOMBRES,
  };

  // Asociación sin fines de lucro: beneficiarios con membresía vencida (Inactivo)
  // pueden seguir recibiendo servicios. Solo se emite una advertencia para que
  // el personal recuerde invitar al beneficiario a renovar.
  if (!beneficiario.ID_CREDENCIAL) {
    resultado.warning = "El beneficiario no tiene membresía activa. Se recomienda renovar antes del próximo servicio.";
  }

  return resultado;
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

  const estatus = data.estatus === undefined ? String(servicio.ESTATUS_SERVICIO ?? servicio.ESTATUS ?? "COMPLETADO").toUpperCase() : String(data.estatus).trim().toUpperCase();

  return ServiciosModel.update(idServicio, {
    montoPagado,
    notas: data.notas ?? servicio.NOTAS ?? null,
    estatus,
  });
}

function normalizeFilters(filters) {
  return {
    curp: filters.curp ? String(filters.curp).trim().toUpperCase() : null,
    idTipoServicio:
      filters.idTipoServicio === undefined ? null : parseNumber(filters.idTipoServicio, "idTipoServicio"),
    fechaDesde: parseISODate(filters.fechaDesde, "fechaDesde")?.toISOString().split("T")[0] ?? null,
    fechaHasta: parseISODate(filters.fechaHasta, "fechaHasta")?.toISOString().split("T")[0] ?? null,
    costoMin: filters.costoMin === undefined ? null : parseNumber(filters.costoMin, "costoMin"),
    costoMax: filters.costoMax === undefined ? null : parseNumber(filters.costoMax, "costoMax"),
    montoPagadoMin:
      filters.montoPagadoMin === undefined
        ? null
        : parseNumber(filters.montoPagadoMin, "montoPagadoMin"),
    montoPagadoMax:
      filters.montoPagadoMax === undefined
        ? null
        : parseNumber(filters.montoPagadoMax, "montoPagadoMax"),
    page: filters.page === undefined ? 1 : parseNumber(filters.page, "page"),
    limit: filters.limit === undefined ? 10 : parseNumber(filters.limit, "limit"),
  };
}

function validateFilters(normalized) {
  if (normalized.fechaDesde && normalized.fechaHasta && normalized.fechaDesde > normalized.fechaHasta) {
    throw badRequest("fechaDesde no puede ser mayor que fechaHasta");
  }
  if (normalized.costoMin !== null && normalized.costoMin < 0) {
    throw badRequest("costoMin no puede ser negativo");
  }
  if (normalized.costoMax !== null && normalized.costoMax < 0) {
    throw badRequest("costoMax no puede ser negativo");
  }
  if (normalized.costoMin !== null && normalized.costoMax !== null && normalized.costoMin > normalized.costoMax) {
    throw badRequest("costoMin no puede ser mayor que costoMax");
  }
  if (normalized.page < 1 || !Number.isInteger(normalized.page)) {
    throw badRequest("page debe ser entero positivo");
  }
  if (normalized.limit < 1 || !Number.isInteger(normalized.limit) || normalized.limit > 100) {
    throw badRequest("limit debe ser entero positivo y menor o igual a 100");
  }
}

export async function getDetailed(filters) {
  const normalized = normalizeFilters(filters);
  validateFilters(normalized);
  return ServiciosModel.findDetailed(normalized);
}

export const deleteById = (idServicio) =>
  ServiciosModel.deleteById(idServicio);

/**
 * Selects the article price based on the beneficiary's cuota type.
 * - tipoCuota 'B' and cuotaB != null → returns cuotaB
 * - otherwise → returns cuotaRecuperacion (cuota A / default)
 */
export function precioSegunCuota(articulo, tipoCuota) {
  if (tipoCuota === "B" && articulo.CUOTA_B != null) {
    return Number(articulo.CUOTA_B);
  }
  return Number(articulo.CUOTA_RECUPERACION ?? 0);
}

