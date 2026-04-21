import { Router } from "express";
import * as ServiciosController from "../controllers/servicios.controller.js";
import { verifyToken, checkRole } from "../middleware/auth.js";

const router = Router();

// GET /servicios - Listar todos los servicios
router.get("/", ServiciosController.getAll);

// POST /servicios - Crear nuevo servicio (con validación de membresía activa)
router.post("/", verifyToken, checkRole(1, 2), ServiciosController.create);

// GET /servicios/detalle/:idServicio - Obtener servicio por ID
router.get("/detalle/:idServicio", verifyToken, ServiciosController.getById);

// GET /servicios/detalle - Consulta detallada con filtros y paginación
router.get("/detalle", verifyToken, ServiciosController.getDetailed);

// GET /servicios/:curp - Obtener todos los servicios de un beneficiario
router.get("/:curp", verifyToken, ServiciosController.getByCurp);

// PUT /servicios/:idServicio - Actualizar servicio (monto pagado, notas)
router.put("/:idServicio", verifyToken, checkRole(1, 2), ServiciosController.update);

// DELETE /servicios/:idServicio - Eliminar servicio
router.delete("/:idServicio", verifyToken, checkRole(1), ServiciosController.deleteById);

export default router;
