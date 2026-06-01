import { Router } from "express";
import {
  getEspecialidades,
  getEspecialidadById,
  updateEspecialidad,
  getExcepciones,
  createExcepcion,
  deleteExcepcion,
} from "../controllers/especialidades-horario.controller.js";
import { verifyToken } from "../middleware/auth.js";

const router = Router();

/**
 * GET /especialidades-horario
 * Público — el formulario de nueva cita lo consume sin auth.
 * ?todos=true incluye especialidades inactivas (solo para admins, sin restricción formal aquí).
 */
router.get("/", getEspecialidades);
router.get("/:id", getEspecialidadById);

// Las rutas de modificación requieren autenticación
router.put("/:id", verifyToken, updateEspecialidad);
router.patch("/:id", verifyToken, updateEspecialidad);

// Excepciones (fechas bloqueadas)
router.get("/:id/excepciones", verifyToken, getExcepciones);
router.post("/:id/excepciones", verifyToken, createExcepcion);
router.delete("/:id/excepciones/:idExc", verifyToken, deleteExcepcion);

export default router;
