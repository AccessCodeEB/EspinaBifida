import * as membresiasService from "../services/membresias.service.js";
import { toCamel } from "../utils/dbTransform.js";

function mapMembresia(row) {
  const r = toCamel(row);
  const estatus = r.estatusMembresia ?? "Vencida";
  return {
    folio:       r.curp,
    nombre:      r.nombreCompleto ?? "",
    fechaInicio: r.fechaVigenciaInicio,
    vigencia:    r.fechaVigenciaFin,
    estatus,
    ultimoPago:  r.fechaUltimoPago ?? r.fechaVigenciaInicio,
    monto:       "$500.00",
    porPagar:    estatus === "Activa" ? "$0.00" : "$500.00",
    numeroCredencial: r.numeroCredencial,
    observaciones:    r.observaciones,
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
