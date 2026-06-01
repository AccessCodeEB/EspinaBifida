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
