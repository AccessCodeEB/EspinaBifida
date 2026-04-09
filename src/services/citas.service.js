import * as citasModel from "../models/citas.model.js";

const ESTATUS_VALIDOS = ["PROGRAMADA", "COMPLETADA", "CANCELADA"];

export const getAllCitas = async () => {
  return await citasModel.findAll();
};

export const getCitaById = async (id) => {
  const cita = await citasModel.findById(id);

  if (!cita) {
    const error = new Error("Cita no encontrada");
    error.statusCode = 404;
    throw error;
  }

  return cita;
};

export const createCita = async (data) => {
  const { curp, idTipoServicio, fecha, estatus } = data;

  if (!curp || !idTipoServicio || !fecha) {
    const error = new Error("CURP, idTipoServicio y fecha son obligatorios");
    error.statusCode = 400;
    throw error;
  }

  if (estatus && !ESTATUS_VALIDOS.includes(estatus.toUpperCase())) {
    const error = new Error("Estatus no válido");
    error.statusCode = 400;
    throw error;
  }

  return await citasModel.create({
    curp: curp.toUpperCase(),
    idTipoServicio,
    especialista: data.especialista || null,
    fecha,
    estatus: (estatus || "PROGRAMADA").toUpperCase(),
    notas: data.notas || null,
  });
};

export const updateCita = async (id, data) => {
  const cita = await citasModel.findById(id);

  if (!cita) {
    const error = new Error("Cita no encontrada");
    error.statusCode = 404;
    throw error;
  }

  const estatus = data.estatus
    ? data.estatus.toUpperCase()
    : cita[5];

  if (estatus && !ESTATUS_VALIDOS.includes(estatus)) {
    const error = new Error("Estatus no válido");
    error.statusCode = 400;
    throw error;
  }

  return await citasModel.update(id, {
    curp: data.curp ? data.curp.toUpperCase() : cita[1],
    idTipoServicio: data.idTipoServicio ?? cita[2],
    especialista: data.especialista ?? cita[3],
    fecha: data.fecha ?? cita[4],
    estatus,
    notas: data.notas ?? cita[6],
  });
};

export const deleteCita = async (id) => {
  const cita = await citasModel.findById(id);

  if (!cita) {
    const error = new Error("Cita no encontrada");
    error.statusCode = 404;
    throw error;
  }

  return await citasModel.remove(id);
};