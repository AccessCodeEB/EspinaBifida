import * as svc from "../services/especialidades-horario.service.js";

export const getEspecialidades = async (req, res, next) => {
  try {
    const soloActivos = req.query.todos !== "true";
    const data = await svc.getEspecialidadesHorario({ soloActivos });
    res.json(data);
  } catch (err) { next(err); }
};

export const getEspecialidadById = async (req, res, next) => {
  try {
    const data = await svc.getEspecialidadById(Number(req.params.id));
    res.json(data);
  } catch (err) { next(err); }
};

export const updateEspecialidad = async (req, res, next) => {
  try {
    const data = await svc.updateEspecialidad(Number(req.params.id), req.body);
    res.json({ message: "Especialidad actualizada", data });
  } catch (err) { next(err); }
};

// ─── Consultas de impacto (para avisos en frontend) ───────────────

export const getCitasFuturas = async (req, res, next) => {
  try {
    const esp = await svc.getEspecialidadById(Number(req.params.id));
    const count = await svc.countCitasFuturas(esp.nombre);
    res.json({ count });
  } catch (err) { next(err); }
};

export const getCitasEnFecha = async (req, res, next) => {
  try {
    const { fecha } = req.query;
    if (!fecha) return res.status(400).json({ error: "fecha es obligatoria" });
    const esp = await svc.getEspecialidadById(Number(req.params.id));
    const count = await svc.countCitasEnFecha(esp.nombre, fecha);
    res.json({ count });
  } catch (err) { next(err); }
};

// ─── Slots de disponibilidad ──────────────────────────────────────

export const getSlotsHandler = async (req, res, next) => {
  try {
    const { fecha } = req.query;
    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({ error: "fecha es obligatoria y debe tener formato YYYY-MM-DD" });
    }
    const result = await svc.getSlotsConDisponibilidad(Number(req.params.id), fecha);
    res.json(result);
  } catch (err) { next(err); }
};

// ─── Excepciones ─────────────────────────────────────────────────

export const getExcepciones = async (req, res, next) => {
  try {
    const data = await svc.getExcepciones(Number(req.params.id));
    res.json(data);
  } catch (err) { next(err); }
};

export const createExcepcion = async (req, res, next) => {
  try {
    const { fecha, motivo } = req.body;
    if (!fecha) return res.status(400).json({ error: "fecha es obligatoria" });
    const data = await svc.createExcepcion(Number(req.params.id), fecha, motivo);
    res.status(201).json({ message: "Excepción creada", data });
  } catch (err) { next(err); }
};

export const deleteExcepcion = async (req, res, next) => {
  try {
    await svc.deleteExcepcion(Number(req.params.idExc));
    res.json({ message: "Excepción eliminada" });
  } catch (err) { next(err); }
};
