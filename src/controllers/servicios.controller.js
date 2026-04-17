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
    const d = r.fecha instanceof Date ? r.fecha : new Date(r.fecha);
    fechaStr = isNaN(d.getTime()) ? String(r.fecha).slice(0, 10) : d.toISOString().slice(0, 10);
  }
  return {
    id:        r.idServicio,
    folio:     r.curp,
    nombre:    r.nombreBeneficiario?.trim() ?? r.curp,
    servicio:  r.tipoServicio ?? "Servicio",
    fecha:     fechaStr,
    monto:     formatMonto(r.costo),
    membresia: r.membresiaEstatus ?? "Vencida",
    notas:     safeClobString(r.notas),
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
    
    if (!curp) {
      throw badRequest("CURP requerido");
    }

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
    const { curp, idTipoServicio, costo, montoPagado, referenciaId, referenciaTipo, notas } = req.body;

    // Validar campos requeridos
    if (!curp || !idTipoServicio || costo === undefined) {
      throw badRequest("CURP, idTipoServicio y costo son requeridos");
    }

    const resultado = await ServiciosService.createConValidacion({
      curp,
      idTipoServicio,
      costo,
      montoPagado: montoPagado ?? 0,
      referenciaId: referenciaId || null,
      referenciaTipo: referenciaTipo || null,
      notas: notas || null
    });

    res.status(201).json(resultado);
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const idServicio = parseIdServicio(req.params.idServicio);

    if (!idServicio) {
      throw badRequest("ID de servicio requerido");
    }

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

    if (!idServicio) {
      throw badRequest("ID de servicio requerido");
    }

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

    if (!idServicio) {
      throw badRequest("ID de servicio requerido");
    }

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
