import * as citasService from "../services/citas.service.js";
import { toCamel, safeClobString } from "../utils/dbTransform.js";

const ESTATUS_MAP = {
  PROGRAMADA:  "Pendiente",
  CONFIRMADA:  "Confirmada",
  COMPLETADA:  "Completada",
  CANCELADA:   "Cancelada",
};

function mapCita(row) {
  const r = toCamel(row);

  // FECHA comes as JS Date from Oracle or as ISO string
  let fechaStr = "";
  let horaStr  = "";
  if (r.fecha) {
    const d = r.fecha instanceof Date ? r.fecha : new Date(r.fecha);
    if (!isNaN(d.getTime())) {
      fechaStr = d.toISOString().slice(0, 10);
      horaStr  = d.toISOString().slice(11, 16);
    } else {
      const parts = String(r.fecha).split("T");
      fechaStr = parts[0] ?? "";
      horaStr  = (parts[1] ?? "").slice(0, 5);
    }
  }

  const estatusRaw = String(r.estatus ?? "").toUpperCase();
  const estatus = ESTATUS_MAP[estatusRaw] ?? r.estatus ?? "Pendiente";

  return {
    id:            r.idCita,
    folio:         r.curp,
    beneficiario:  r.nombreBeneficiario?.trim() ?? r.curp,
    especialista:  r.especialista ?? "",
    fecha:         fechaStr,
    hora:          horaStr,
    estatus,
    notas:         safeClobString(r.notas),
  };
}

export const getCitas = async (req, res, next) => {
  try {
    const citas = await citasService.getAllCitas();
    res.status(200).json(citas.map(mapCita));
  } catch (error) {
    next(error);
  }
};

export const getCitaById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cita = await citasService.getCitaById(id);
    res.status(200).json(mapCita(cita));
  } catch (error) {
    next(error);
  }
};

export const createCita = async (req, res, next) => {
  try {
    const result = await citasService.createCita(req.body);
    res.status(201).json({ message: "Cita creada correctamente", result });
  } catch (error) {
    next(error);
  }
};

export const updateCita = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await citasService.updateCita(id, req.body);
    res.status(200).json({ message: "Cita actualizada correctamente", result });
  } catch (error) {
    next(error);
  }
};

export const deleteCita = async (req, res, next) => {
  try {
    const { id } = req.params;
    await citasService.deleteCita(id);
    res.status(200).json({ message: "Cita cancelada correctamente" });
  } catch (error) {
    next(error);
  }
};
