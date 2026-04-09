import { Router } from "express";
import * as ServiciosController from "../controllers/servicios.controller.js";

const router = Router();

// POST /servicios - Crear nuevo servicio (con validación de membresía activa)
router.post("/", ServiciosController.create);

// GET /servicios/:curp - Obtener todos los servicios de un beneficiario
router.get("/:curp", ServiciosController.getByCurp);

// GET /servicios/detalle/:idServicio - Obtener servicio por ID
router.get("/detalle/:idServicio", ServiciosController.getById);

// PUT /servicios/:idServicio - Actualizar servicio (monto pagado, notas)
router.put("/:idServicio", ServiciosController.update);

// DELETE /servicios/:idServicio - Eliminar servicio
router.delete("/:idServicio", ServiciosController.deleteById);

export default router;
