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

  // FECHA and HORA come as plain strings from TO_CHAR in SQL (e.g. "2026-04-23", "14:30")
  const fechaStr = typeof r.fecha === "string" ? r.fecha : "";
  const horaStr  = typeof r.hora  === "string" ? r.hora  : "";

  const estatusRaw = String(r.estatus ?? "").toUpperCase();
  const estatus = ESTATUS_MAP[estatusRaw] ?? r.estatus ?? "Pendiente";

  return {
    id:           r.idCita,
    folio:        r.curp,
    beneficiario: r.nombreBeneficiario?.trim() ?? r.curp,
    especialista: r.especialista ?? "",
    fecha:        fechaStr,
    hora:         horaStr,
    estatus,
    notas:        safeClobString(r.notas),
    costo:        r.costo == null ? null : Number(r.costo),
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

export const hardDeleteCita = async (req, res, next) => {
  try {
    const { id } = req.params;
    await citasService.hardDeleteCita(id);
    res.status(200).json({ message: "Cita eliminada permanentemente" });
  } catch (error) {
    next(error);
  }
};

export const e2eCleanup = async (req, res, next) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "No disponible en producción" });
  }
  try {
    await citasService.deleteE2ECitas();
    res.json({ message: "Citas E2E eliminadas" });
  } catch (err) {
    next(err);
  }
};
