import * as citasModel from "../models/citas.model.js";
import { validarSlotEspecialidad } from "./especialidades-horario.service.js";
import { createConValidacion as crearServicio } from "./servicios.service.js";
import { badRequest, notFound } from "../utils/httpErrors.js";
import { PRECIO_PRIMERA_CITA, PRECIO_SUBSECUENTE_CITA } from "../config/precios.js";

const ESTATUS_VALIDOS = new Set(["PROGRAMADA", "CONFIRMADA", "COMPLETADA", "CANCELADA"]);

export const COSTO_PRIMERA_CITA     = PRECIO_PRIMERA_CITA;
export const COSTO_SUBSECUENTE_CITA = PRECIO_SUBSECUENTE_CITA;

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
    // FECHA is now returned as 'YYYY-MM-DD HH24:MI:SS' from findById
    fechaFinal = cita.FECHA;
  }

  // Re-validate slot when scheduling fields change
  if (data.fecha || data.hora || data.especialista) {
    const fechaPart = data.fecha ?? (fechaFinal ? fechaFinal.slice(0, 10) : null);
    const horaPart  = (data.hora ?? (fechaFinal ? fechaFinal.slice(11, 16) : "00:00"));
    const espFinal  = data.especialista ?? cita.ESPECIALISTA ?? null;
    if (fechaPart) await validarSlotEspecialidad(espFinal, fechaPart, horaPart, id);
  }

  const estatus = data.estatus
    ? data.estatus.toUpperCase()
    : String(cita.ESTATUS ?? "PROGRAMADA").toUpperCase();

  if (!ESTATUS_VALIDOS.has(estatus)) {
    throw badRequest("Estatus no válido");
  }

  // Bloquear marcar como COMPLETADA si la cita es futura (REMOTO para permitir pruebas y flexibilidad)
  if (estatus === "COMPLETADA") {
    if (!cita.FECHA) {
      throw badRequest("La cita no tiene fecha registrada", "CITA_SIN_FECHA");
    }
  }

  await citasModel.update(id, {
    curp:          data.curp          ? data.curp.toUpperCase() : cita.CURP,
    idTipoServicio: data.idTipoServicio ?? cita.ID_TIPO_SERVICIO,
    especialista:  data.especialista  ?? cita.ESPECIALISTA,
    fecha:         fechaFinal,
    estatus,
    notas:         data.notas         ?? cita.NOTAS,
  });

  let idServicio = null;
  // Auto-create servicio when completing a cita (only if not already linked)
  if (estatus === "COMPLETADA") {
    const prevEstatus = String(cita.ESTATUS ?? "").toUpperCase();
    if (prevEstatus !== "COMPLETADA") {
      try {
        const curpFinal = data.curp ? data.curp.toUpperCase() : cita.CURP;
        const idTipoFinal = data.idTipoServicio ?? cita.ID_TIPO_SERVICIO;
        const costoFinal = cita.COSTO != null ? Number(cita.COSTO) : 0;
        const notasFinal = cita.ESPECIALISTA
          ? `Cita completada · ${cita.ESPECIALISTA}`
          : "Cita completada";
        const result = await crearServicio({
          curp: curpFinal,
          idTipoServicio: idTipoFinal,
          costo: costoFinal,
          montoPagado: 0,
          notas: notasFinal,
          estatus: "PENDIENTE",
          referenciaId: Number(id),
          referenciaTipo: "CITA",
          fecha: cita.FECHA ? cita.FECHA.slice(0, 10) : null,
        });
        idServicio = result.idServicio ?? null;
      } catch (_err) {
        // Revertir el estatus para que el usuario pueda corregir el error (ej. asignar cuota) y volver a intentar
        await citasModel.update(id, {
          curp:          cita.CURP,
          idTipoServicio: cita.ID_TIPO_SERVICIO,
          especialista:  cita.ESPECIALISTA,
          fecha:         cita.FECHA,
          estatus:       prevEstatus,
          notas:         cita.NOTAS,
          costo:         cita.COSTO,
        });
        throw _err;
      }
    }
  }

  // Also auto-delete servicio if Cancelled
  if (estatus === "CANCELADA") {
    try {
      await serviciosModel.deleteByReferencia(id, "CITA");
    } catch (e) {
      console.warn("[citas.service] Failed to delete linked servicio on Cancelada:", e);
    }
  }

  return { idServicio };
};

export const deleteCita = async (id) => {
  const cita = await citasModel.findById(id);

  if (!cita) {
    throw notFound("Cita no encontrada");
  }

  await citasModel.remove(id);
  try {
    await serviciosModel.deleteByReferencia(id, "CITA");
  } catch (e) {
    console.warn("[citas.service] Failed to delete linked servicio on remove:", e);
  }
  return true;
};

export const hardDeleteCita = async (id) => {
  const cita = await citasModel.findById(id);

  if (!cita) {
    throw notFound("Cita no encontrada");
  }

  await citasModel.hardRemove(id);
  try {
    await serviciosModel.deleteByReferencia(id, "CITA");
  } catch (e) {
    console.warn("[citas.service] Failed to delete linked servicio on hardRemove:", e);
  }
  return true;
};

export const deleteE2ECitas = () => citasModel.deleteE2ECitas();