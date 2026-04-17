import { Router } from "express";
import * as ServiciosController from "../controllers/servicios.controller.js";

const router = Router();

// GET /servicios - Listar todos los servicios
router.get("/", ServiciosController.getAll);

// POST /servicios - Crear nuevo servicio (con validación de membresía activa)
router.post("/", ServiciosController.create);

// GET /servicios/detalle/:idServicio - Obtener servicio por ID
router.get("/detalle/:idServicio", ServiciosController.getById);

// GET /servicios/detalle - Consulta detallada con filtros y paginación
router.get("/detalle", ServiciosController.getDetailed);

// GET /servicios/:curp - Obtener todos los servicios de un beneficiario
router.get("/:curp", ServiciosController.getByCurp);

// PUT /servicios/:idServicio - Actualizar servicio (monto pagado, notas)
router.put("/:idServicio", ServiciosController.update);

// DELETE /servicios/:idServicio - Eliminar servicio
router.delete("/:idServicio", ServiciosController.deleteById);

export default router;
