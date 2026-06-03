import * as ServiciosService from "../services/servicios.service.js";
import { toCamel, safeClobString } from "../utils/dbTransform.js";
import { badRequest, notFound } from "../utils/httpErrors.js";

function formatMonto(valor) {
  const n = Number(valor ?? 0);
  return `$${n.toFixed(2)}`;
}

function mapServicio(row) {
  const r = toCamel(row);
  let fechaStr = "";
  if (r.fecha) {
    /* istanbul ignore next */
    const d = r.fecha instanceof Date ? r.fecha : new Date(r.fecha);
    fechaStr = Number.isNaN(d.getTime()) ? String(r.fecha).slice(0, 10) : d.toISOString().slice(0, 10);
  }
  return {
    id:                r.idServicio,
    folio:             r.curp,
    nombre:            r.nombreBeneficiario?.trim() ?? r.curp,
    servicio:          r.tipoServicio ?? "Servicio",
    fecha:             fechaStr,
    monto:             formatMonto(r.costo),
    estatus:           r.estatusServicio ?? "COMPLETADO",
    membresia:         r.membresiaEstatus ?? "Sin membresia",
    notas:             safeClobString(r.notas),
    articuloEntregado: r.articuloEntregado ?? null,
    cantidadArticulo:  r.cantidadArticulo == null ? null : Number(r.cantidadArticulo),
  };
}

export async function getAll(req, res, next) {
  try {
    const rows = await ServiciosService.getAll();
    res.json(rows.map(mapServicio));
  } catch (err) {
    next(err);
  }
}

function parseIdServicio(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw badRequest("idServicio debe ser entero positivo");
  }
  return parsed;
}

export async function getByCurp(req, res, next) {
  try {
    const { curp } = req.params;
    
    /* istanbul ignore next */
    if (!curp) throw badRequest("CURP requerido");

    const servicios = await ServiciosService.getByCurp(curp);
    
    if (!servicios || servicios.length === 0) {
      throw notFound("No hay servicios registrados para este beneficiario");
    }

    res.json({
      curp,
      total: servicios.length,
      servicios
    });
  } catch (err) {
    next(err);
  }
}

export async function getDetailed(req, res, next) {
  try {
    /* istanbul ignore next */
    const result = await ServiciosService.getDetailed(req.query ?? {});

    res.json({
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / result.limit),
      data: result.data,
    });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const {
      curp,
      idTipoServicio,
      costo,
      montoPagado,
      referenciaId,
      referenciaTipo,
      notas,
      consumos,
      estatus,
      fechaDevolucionEsperada,
    } = req.body;
    const tieneConsumos = Array.isArray(consumos) && consumos.length > 0;

    // Validar campos requeridos
    if (!curp || !idTipoServicio || (!tieneConsumos && costo === undefined)) {
      throw badRequest("CURP e idTipoServicio son requeridos; costo solo aplica cuando no hay consumos");
    }

    const resultado = await ServiciosService.createConValidacion({
      curp,
      idTipoServicio,
      costo,
      montoPagado: montoPagado ?? 0,
      referenciaId: referenciaId || null,
      referenciaTipo: referenciaTipo || null,
      notas: notas || null,
      consumos: consumos ?? [],
      estatus,
      fechaDevolucionEsperada,
    });

    res.status(201).json(resultado);
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const idServicio = parseIdServicio(req.params.idServicio);

    /* istanbul ignore next */
    if (!idServicio) throw badRequest("ID de servicio requerido");

    const servicio = await ServiciosService.getById(idServicio);

    if (!servicio) {
      throw notFound("Servicio no encontrado");
    }

    res.json(servicio);
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const idServicio = parseIdServicio(req.params.idServicio);
    const { montoPagado, notas } = req.body;

    /* istanbul ignore next */
    if (!idServicio) throw badRequest("ID de servicio requerido");

    if (montoPagado === undefined && notas === undefined) {
      throw badRequest("Debe enviar al menos un campo para actualizar");
    }

    await ServiciosService.update(idServicio, {
      montoPagado,
      notas,
    });

    res.json({ message: "Servicio actualizado exitosamente" });
  } catch (err) {
    next(err);
  }
}


export async function deleteById(req, res, next) {
  try {
    const idServicio = parseIdServicio(req.params.idServicio);

    /* istanbul ignore next */
    if (!idServicio) throw badRequest("ID de servicio requerido");

    // Validar que el servicio existe
    const servicio = await ServiciosService.getById(idServicio);
    if (!servicio) {
      throw notFound("Servicio no encontrado");
    }

    await ServiciosService.deleteById(idServicio);

    res.json({ message: "Servicio eliminado exitosamente" });
  } catch (err) {
    next(err);
  }
}
