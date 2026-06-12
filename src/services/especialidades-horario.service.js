import * as model from "../models/especialidades-horario.model.js";
import { badRequest, conflict, notFound } from "../utils/httpErrors.js";

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
  const norm = (t) => t.split(":").map((p, i) => i === 0 ? p.padStart(2, "0") : p).join(":");
  const h = norm(hora);
  const inicio = norm(esp.HORA_INICIO);
  if (!esp.HORA_FIN) return h >= inicio;
  return h >= inicio && h < norm(esp.HORA_FIN);
}

/**
 * Genera los slots de tiempo válidos para una especialidad según su horario y duración.
 * Garantiza que el último slot cabe completamente dentro de la ventana.
 *
 * @param {object} esp - Fila de ESPECIALIDADES_HORARIO
 * @returns {string[]} - Array de strings 'HH:MM'
 */
export function generateSlots(esp) {
  if (!esp.DURACION_CITA || esp.DURACION_CITA <= 0) return [];
  const [startH, startM] = esp.HORA_INICIO.split(":").map(Number);
  const startMins = startH * 60 + startM;
  const endMins = esp.HORA_FIN
    ? (() => { const [h, m] = esp.HORA_FIN.split(":").map(Number); return h * 60 + m; })()
    : startMins + 240; // 4h máximo si no hay HORA_FIN
  // latestStart garantiza que el slot completo cabe en la ventana
  const latestStart = endMins - esp.DURACION_CITA;
  const slots = [];
  for (let m = startMins; m <= latestStart; m += esp.DURACION_CITA) {
    const h = Math.floor(m / 60), min = m % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
  }
  return slots;
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

  const { diaSemana, horaInicio, horaFin, capacidadMax, tipoFrecuencia, activo, notas, duracionCita } = data;

  // Validación básica de formato
  if (horaInicio !== undefined && !/^\d{2}:\d{2}$/.test(horaInicio)) {
    throw badRequest("horaInicio debe tener formato HH:MM");
  }
  if (horaFin !== undefined && horaFin !== null && !/^\d{2}:\d{2}$/.test(horaFin)) {
    throw badRequest("horaFin debe tener formato HH:MM");
  }
  if (tipoFrecuencia !== undefined && !["SEMANAL", "MENSUAL_PRIMER_DIA"].includes(tipoFrecuencia)) {
    throw badRequest("tipoFrecuencia inválido. Valores permitidos: SEMANAL, MENSUAL_PRIMER_DIA");
  }

  // Validar que horaFin > horaInicio cuando ambas están presentes
  const inicioEfectivo = horaInicio !== undefined ? horaInicio : existing.HORA_INICIO;
  const finEfectivo    = horaFin    !== undefined ? horaFin    : existing.HORA_FIN;
  if (finEfectivo && inicioEfectivo && finEfectivo <= inicioEfectivo) {
    throw badRequest("La hora de fin debe ser posterior a la hora de inicio.");
  }

  // Regla de negocio: no se puede desactivar una especialidad con citas futuras pendientes
  if (activo === false && existing.ACTIVO === 1) {
    const citasFuturas = await model.countCitasFuturasActivas(existing.NOMBRE);
    if (citasFuturas > 0) {
      throw badRequest(
        `No se puede desactivar "${existing.NOMBRE}" porque tiene ${citasFuturas} cita${citasFuturas !== 1 ? "s" : ""} pendiente${citasFuturas !== 1 ? "s" : ""} próxima${citasFuturas !== 1 ? "s" : ""}. Cancélalas primero en la sección de Citas y luego desactiva la especialidad.`,
        "ESPECIALIDAD_CON_CITAS"
      );
    }
  }

  await model.update(id, { diaSemana, horaInicio, horaFin, capacidadMax, tipoFrecuencia, activo, notas, duracionCita });
  return model.findById(id).then(mapEspecialidad);
};

// ─── Consultas de impacto ────────────────────────────────────────────────────

export const countCitasFuturas = async (nombre) =>
  model.countCitasFuturasActivas(nombre);

export const countCitasEnFecha = async (nombre, fecha) =>
  model.countCitasActivasPorFecha(nombre, fecha);

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
    throw conflict(`Ya existe una excepción para esta especialidad en la fecha ${fecha}`, "EXCEPCION_DUPLICADA");
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
async function validarCapacidad(esp, fecha, hora, excludeId = null) {
  if (esp.CAPACIDAD_MAX == null) return;
  if (!hora) return; // sin hora = sin validación de slot
  const ocupados = await model.countCitasBySlot(esp.NOMBRE, fecha, hora, esp.DURACION_CITA, excludeId);
  if (ocupados >= esp.CAPACIDAD_MAX) {
    throw badRequest(
      `${esp.NOMBRE} ya tiene el máximo de ${esp.CAPACIDAD_MAX} paciente(s) para el slot de las ${hora} del ${fecha}.`,
      "CAPACIDAD_LLENA"
    );
  }
}

export const validarSlotEspecialidad = async (nombreEspecialidad, fecha, hora, excludeId = null) => {
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

  // 2.5 Validar que hora corresponde a un slot válido
  if (hora) {
    const slots = generateSlots(esp);
    if (slots.length > 0 && !slots.includes(hora)) {
      throw badRequest(
        `${esp.NOMBRE} solo acepta citas en intervalos de ${esp.DURACION_CITA} min a partir de las ${esp.HORA_INICIO}. Slots válidos: ${slots.join(", ")}.`,
        "SLOT_NO_VALIDO"
      );
    }
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
  await validarCapacidad(esp, fecha, hora, excludeId);
};

// ─── Disponibilidad de slots ─────────────────────────────────────────────────

/**
 * Devuelve todos los slots de una especialidad para una fecha dada,
 * indicando cuántos lugares están ocupados y si el slot está lleno.
 *
 * @param {number} idEspecialidad
 * @param {string} fecha - 'YYYY-MM-DD'
 * @returns {object} { slots } | { inactiva: true } | { bloqueada: true, motivo }
 */
export const getSlotsConDisponibilidad = async (idEspecialidad, fecha, excludeId = null) => {
  const esp = await model.findById(idEspecialidad);
  if (!esp) throw notFound(`Especialidad con ID ${idEspecialidad} no encontrada`);

  if (!esp.ACTIVO) {
    return { inactiva: true };
  }

  // Verificar excepción (fecha bloqueada)
  const excepcion = await model.findExcepcionByFecha(esp.ID_ESPECIALIDAD, fecha);
  if (excepcion) {
    return { bloqueada: true, motivo: excepcion.MOTIVO ?? null };
  }

  const slotHoras = generateSlots(esp);

  const slots = await Promise.all(
    slotHoras.map(async (hora) => {
      const ocupados = await model.countCitasBySlot(esp.NOMBRE, fecha, hora, esp.DURACION_CITA, excludeId);
      const capacidad = esp.CAPACIDAD_MAX ?? null;
      const lleno = capacidad != null && ocupados >= capacidad;
      return { hora, ocupados, capacidad, lleno };
    })
  );

  return { slots };
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
    duracionCita:    r.DURACION_CITA ?? null,
  };
}
