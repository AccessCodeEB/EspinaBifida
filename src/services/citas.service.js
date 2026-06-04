import * as citasModel from "../models/citas.model.js";
import { validarSlotEspecialidad } from "./especialidades-horario.service.js";
import { badRequest, notFound } from "../utils/httpErrors.js";

const ESTATUS_VALIDOS = new Set(["PROGRAMADA", "CONFIRMADA", "COMPLETADA", "CANCELADA"]);

export const COSTO_PRIMERA_CITA     = 350;
export const COSTO_SUBSECUENTE_CITA = 300;

export const getAllCitas = async () => {
  return await citasModel.findAll();
};

export const getCitaById = async (id) => {
  const cita = await citasModel.findById(id);

  if (!cita) {
    throw notFound("Cita no encontrada");
  }

  return cita;
};

export const createCita = async (data) => {
  const { curp, idTipoServicio, fecha, hora, estatus } = data;

  if (!curp || !idTipoServicio || !fecha) {
    throw badRequest("CURP, idTipoServicio y fecha son obligatorios");
  }

  if (estatus && !ESTATUS_VALIDOS.has(estatus.toUpperCase())) {
    throw badRequest("Estatus no válido");
  }

  // Combine fecha + hora into a single datetime string for Oracle TO_TIMESTAMP
  const horaFinal = hora ?? "00:00";
  const fechaDatetime = `${fecha} ${horaFinal}:00`;

  const curpUpper = curp.toUpperCase();

  // Validar reglas de horario de la especialidad (bloqueo duro)
  await validarSlotEspecialidad(data.especialista || null, fecha, horaFinal.slice(0, 5));

  // Costo: primera cita $350, subsecuentes $300. Permite override explícito.
  let costo;
  if (data.costo == null) {
    const previas = await citasModel.countCitasByCurp(curpUpper);
    costo = previas === 0 ? COSTO_PRIMERA_CITA : COSTO_SUBSECUENTE_CITA;
  } else {
    costo = Number(data.costo);
    if (Number.isNaN(costo) || costo < 0) throw badRequest("costo debe ser un número positivo");
  }

  return await citasModel.create({
    curp: curpUpper,
    idTipoServicio,
    especialista: data.especialista || null,
    fecha: fechaDatetime,
    estatus: (estatus || "PROGRAMADA").toUpperCase(),
    notas: data.notas || null,
    costo,
  });
};

export const updateCita = async (id, data) => {
  const cita = await citasModel.findById(id);

  if (!cita) {
    throw notFound("Cita no encontrada");
  }

  // Merge incoming fecha+hora into a single datetime string
  let fechaFinal = data.fecha ?? null;
  if (fechaFinal) {
    const hora = data.hora ?? "00:00";
    fechaFinal = `${fechaFinal} ${hora}:00`;
  } else if (cita.FECHA) {
    const d = cita.FECHA instanceof Date ? cita.FECHA : new Date(cita.FECHA);
    fechaFinal = d.toISOString().replace("T", " ").slice(0, 19);
  }

  // Re-validate slot when scheduling fields change
  if (data.fecha || data.hora || data.especialista) {
    const fechaPart = data.fecha ?? (fechaFinal ? fechaFinal.slice(0, 10) : null);
    const horaPart  = (data.hora ?? (fechaFinal ? fechaFinal.slice(11, 16) : "00:00"));
    const espFinal  = data.especialista ?? cita.ESPECIALISTA ?? null;
    if (fechaPart) await validarSlotEspecialidad(espFinal, fechaPart, horaPart);
  }

  const estatus = data.estatus
    ? data.estatus.toUpperCase()
    : String(cita.ESTATUS ?? "PROGRAMADA").toUpperCase();

  if (!ESTATUS_VALIDOS.has(estatus)) {
    throw badRequest("Estatus no válido");
  }

  return await citasModel.update(id, {
    curp:          data.curp          ? data.curp.toUpperCase() : cita.CURP,
    idTipoServicio: data.idTipoServicio ?? cita.ID_TIPO_SERVICIO,
    especialista:  data.especialista  ?? cita.ESPECIALISTA,
    fecha:         fechaFinal,
    estatus,
    notas:         data.notas         ?? cita.NOTAS,
  });
};

export const deleteCita = async (id) => {
  const cita = await citasModel.findById(id);

  if (!cita) {
    throw notFound("Cita no encontrada");
  }

  return await citasModel.remove(id);
};

export const deleteE2ECitas = () => citasModel.deleteE2ECitas();