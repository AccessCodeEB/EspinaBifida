import * as membresiasService from "../services/membresias.service.js";
import { toCamel } from "../utils/dbTransform.js";

function formatMonto(valor) {
  if (valor == null) return null;
  const n = Number(valor);
  return Number.isNaN(n) ? null : parseFloat(n.toFixed(2));
}

function mapMembresia(row) {
  const r = toCamel(row);
  const estatus = r.estatusMembresia ?? "Vencida";
  const diasRestantes = r.diasRestantes != null ? Math.floor(Number(r.diasRestantes)) : null;
  return {
    folio:            r.curp,
    nombre:           r.nombreCompleto ?? "",
    fechaInicio:      r.fechaVigenciaInicio,
    vigencia:         r.fechaVigenciaFin,
    estatus,
    diasRestantes,
    ultimoPago:       r.fechaUltimoPago ?? r.fechaVigenciaInicio,
    monto:            formatMonto(r.monto),
    metodoPago:       r.metodoPago ?? null,
    referencia:       r.referencia ?? null,
    numeroCredencial: r.numeroCredencial,
    observaciones:    r.observaciones,
  };
}

function mapPago(row) {
  const r = toCamel(row);
  return {
    idCredencial:    r.idCredencial,
    curp:            r.curp,
    nombre:          r.nombreCompleto ?? "",
    fechaEmision:    r.fechaEmision,
    fechaInicio:     r.fechaVigenciaInicio,
    vigencia:        r.fechaVigenciaFin,
    ultimoPago:      r.fechaUltimoPago,
    monto:           formatMonto(r.monto),
    metodoPago:      r.metodoPago ?? null,
    referencia:      r.referencia ?? null,
    observaciones:   r.observaciones ?? null,
  };
}

export const getAll = async (req, res, next) => {
  try {
    const rows = await membresiasService.getAll();
    res.json(rows.map(mapMembresia));
  } catch (error) {
    next(error);
  }
};

export const postSyncEstados = async (req, res, next) => {
  try {
    await membresiasService.syncEstados();
    res.json({ message: "Estados sincronizados" });
  } catch (error) {
    next(error);
  }
};

export const getPagosRecientes = async (req, res, next) => {
  try {
    const limit = req.query.limit ?? 20;
    const rows = await membresiasService.getPagosRecientes(limit);
    res.json(rows.map(mapPago));
  } catch (error) {
    next(error);
  }
};

export const createMembresia = async (req, res, next) => {
  try {
    const result = await membresiasService.registrarMembresia(req.body);
    res.status(201).json({ message: "Membresía registrada correctamente", result });
  } catch (error) {
    next(error);
  }
};

export const getMembresiaStatus = async (req, res, next) => {
  try {
    const { curp } = req.params;
    const estatus = await membresiasService.getEstatusMembresia(curp);
    res.status(200).json(estatus);
  } catch (error) {
    next(error);
  }
};

export const validarMembresiaActiva = async (req, res, next) => {
  try {
    const { curp } = req.params;
    const result = await membresiasService.validarMembresiaActivaPorCurp(curp);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
