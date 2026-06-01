import * as citasModel from "../models/citas.model.js";
import { badRequest, notFound } from "../utils/httpErrors.js";

const ESTATUS_VALIDOS = new Set(["PROGRAMADA", "CONFIRMADA", "COMPLETADA", "CANCELADA"]);

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

  return await citasModel.create({
    curp: curp.toUpperCase(),
    idTipoServicio,
    especialista: data.especialista || null,
    fecha: fechaDatetime,
    estatus: (estatus || "PROGRAMADA").toUpperCase(),
    notas: data.notas || null,
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