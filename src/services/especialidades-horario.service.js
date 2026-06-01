import * as model from "../models/especialidades-horario.model.js";
import { badRequest, notFound } from "../utils/httpErrors.js";

// ─── Helpers de validación de horario ──────────────────────────────────────

/**
 * Verifica si una fecha cae en el día de la semana correcto para la especialidad,
 * considerando la frecuencia (semanal vs. primer día del mes).
 *
 * @param {object} esp - Fila de ESPECIALIDADES_HORARIO
 * @param {Date}   fecha - Objeto Date local
 * @returns {boolean}
 */
export function esFechaValida(esp, fecha) {
  const diaSemana = fecha.getDay(); // 0=Dom, 1=Lun, ..., 6=Sáb

  if (esp.TIPO_FRECUENCIA === "SEMANAL") {
    return diaSemana === esp.DIA_SEMANA;
  }

  if (esp.TIPO_FRECUENCIA === "MENSUAL_PRIMER_DIA") {
    // Es el primer [DIA_SEMANA] del mes si el día de la semana coincide
    // y el día del mes está en el rango 1-7.
    return diaSemana === esp.DIA_SEMANA && fecha.getDate() <= 7;
  }

  return false;
}

/**
 * Verifica si una hora 'HH:MM' cae dentro del rango de la especialidad.
 * Si HORA_FIN es null, solo se comprueba que sea >= HORA_INICIO.
 */
export function esDentroDeHorario(esp, hora) {
  if (!hora) return false;
  if (!esp.HORA_FIN) return hora >= esp.HORA_INICIO;
  return hora >= esp.HORA_INICIO && hora <= esp.HORA_FIN;
}

// ─── Servicios CRUD ─────────────────────────────────────────────────────────

/** Lista todas las especialidades (solo activas por defecto). */
export const getEspecialidadesHorario = async ({ soloActivos = true } = {}) => {
  const rows = await model.findAll({ soloActivos });
  return rows.map(mapEspecialidad);
};

/** Devuelve una especialidad por ID. Lanza 404 si no existe. */
export const getEspecialidadById = async (id) => {
  const row = await model.findById(id);
  if (!row) throw notFound(`Especialidad con ID ${id} no encontrada`);
  return mapEspecialidad(row);
};

/** Devuelve una especialidad por nombre (para validación interna). */
export const getEspecialidadByNombre = async (nombre) => {
  return model.findByNombre(nombre);
};

/** Actualiza el horario base. Lanza 404 si no existe. */
export const updateEspecialidad = async (id, data) => {
  const existing = await model.findById(id);
  if (!existing) throw notFound(`Especialidad con ID ${id} no encontrada`);

  const { diaSemana, horaInicio, horaFin, capacidadMax, tipoFrecuencia, activo, notas } = data;

  // Validación básica
  if (horaInicio !== undefined && !/^\d{2}:\d{2}$/.test(horaInicio)) {
    throw badRequest("horaInicio debe tener formato HH:MM");
  }
  if (horaFin !== undefined && horaFin !== null && !/^\d{2}:\d{2}$/.test(horaFin)) {
    throw badRequest("horaFin debe tener formato HH:MM");
  }
  if (tipoFrecuencia !== undefined && !["SEMANAL", "MENSUAL_PRIMER_DIA"].includes(tipoFrecuencia)) {
    throw badRequest("tipoFrecuencia inválido. Valores permitidos: SEMANAL, MENSUAL_PRIMER_DIA");
  }

  await model.update(id, { diaSemana, horaInicio, horaFin, capacidadMax, tipoFrecuencia, activo, notas });
  return model.findById(id).then(mapEspecialidad);
};

// ─── Excepciones ─────────────────────────────────────────────────────────────

/** Lista las fechas bloqueadas de una especialidad. */
export const getExcepciones = async (idEspecialidad) => {
  const existing = await model.findById(idEspecialidad);
  if (!existing) throw notFound(`Especialidad con ID ${idEspecialidad} no encontrada`);
  const rows = await model.findExcepciones(idEspecialidad);
  return rows.map(r => ({
    idExcepcion:    r.ID_EXCEPCION,
    idEspecialidad: r.ID_ESPECIALIDAD,
    fecha:          r.FECHA,
    motivo:         r.MOTIVO ?? null,
    createdAt:      r.CREATED_AT,
  }));
};

/** Crea una fecha bloqueada. Lanza 409 si ya existe esa fecha. */
export const createExcepcion = async (idEspecialidad, fecha, motivo) => {
  const existing = await model.findById(idEspecialidad);
  if (!existing) throw notFound(`Especialidad con ID ${idEspecialidad} no encontrada`);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    throw badRequest("fecha debe tener formato YYYY-MM-DD");
  }

  const dup = await model.findExcepcionByFecha(idEspecialidad, fecha);
  if (dup) {
    throw { statusCode: 409, message: `Ya existe una excepción para esta especialidad en la fecha ${fecha}` };
  }

  await model.createExcepcion(idEspecialidad, fecha, motivo);
  return { idEspecialidad, fecha, motivo: motivo ?? null };
};

/** Elimina una excepción por ID. */
export const deleteExcepcion = async (idExcepcion) => {
  await model.deleteExcepcion(idExcepcion);
};

// ─── Validación completa de slot ─────────────────────────────────────────────

/**
 * Valida que una cita pueda ser agendada según las reglas de la especialidad.
 * Lanza badRequest con mensaje descriptivo si alguna regla no se cumple.
 *
 * @param {string} nombreEspecialidad
 * @param {string} fecha   - 'YYYY-MM-DD'
 * @param {string} hora    - 'HH:MM'
 */
export const validarSlotEspecialidad = async (nombreEspecialidad, fecha, hora) => {
  if (!nombreEspecialidad) return; // Especialista opcional: sin restricción

  const esp = await model.findByNombre(nombreEspecialidad);
  if (!esp) return; // Especialista libre (no configurado): sin restricción

  if (!esp.ACTIVO) {
    throw badRequest(
      `La especialidad "${esp.NOMBRE}" no está disponible en este momento.`,
      "ESPECIALIDAD_INACTIVA"
    );
  }

  // 1. Validar día / frecuencia
  const [y, mo, d] = fecha.split("-").map(Number);
  const fechaObj = new Date(y, mo - 1, d);

  if (!esFechaValida(esp, fechaObj)) {
    const diasNombre = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
    const diaEsp     = diasNombre[esp.DIA_SEMANA];
    const frecTxt    = esp.TIPO_FRECUENCIA === "MENSUAL_PRIMER_DIA"
      ? `el primer ${diaEsp} de cada mes`
      : `los ${diaEsp}s`;

    throw badRequest(
      `${esp.NOMBRE} solo atiende ${frecTxt}. La fecha ${fecha} no corresponde a ese día.`,
      "DIA_NO_PERMITIDO"
    );
  }

  // 2. Validar horario
  if (hora && !esDentroDeHorario(esp, hora)) {
    const hasta = esp.HORA_FIN ? ` a ${esp.HORA_FIN}` : " en adelante";
    throw badRequest(
      `${esp.NOMBRE} atiende a partir de las ${esp.HORA_INICIO}${hasta}. El horario ${hora} está fuera del rango.`,
      "HORARIO_NO_PERMITIDO"
    );
  }

  // 3. Verificar excepción (doctor ausente)
  const excepcion = await model.findExcepcionByFecha(esp.ID_ESPECIALIDAD, fecha);
  if (excepcion) {
    const motivo = excepcion.MOTIVO ? ` Motivo: ${excepcion.MOTIVO}` : "";
    throw badRequest(
      `${esp.NOMBRE} no atiende el ${fecha}.${motivo}`,
      "FECHA_BLOQUEADA"
    );
  }

  // 4. Verificar capacidad
  if (esp.CAPACIDAD_MAX !== null && esp.CAPACIDAD_MAX !== undefined) {
    const ocupados = await model.countCitasActivasPorFecha(esp.NOMBRE, fecha);
    if (ocupados >= esp.CAPACIDAD_MAX) {
      throw badRequest(
        `${esp.NOMBRE} ya tiene el máximo de ${esp.CAPACIDAD_MAX} paciente(s) para el ${fecha}.`,
        "CAPACIDAD_LLENA"
      );
    }
  }
};

// ─── Mapper ──────────────────────────────────────────────────────────────────

function mapEspecialidad(r) {
  return {
    idEspecialidad:  r.ID_ESPECIALIDAD,
    nombre:          r.NOMBRE,
    diaSemana:       r.DIA_SEMANA,
    horaInicio:      r.HORA_INICIO,
    horaFin:         r.HORA_FIN ?? null,
    capacidadMax:    r.CAPACIDAD_MAX ?? null,
    tipoFrecuencia:  r.TIPO_FRECUENCIA,
    activo:          r.ACTIVO === 1,
    notas:           r.NOTAS ?? null,
  };
}
