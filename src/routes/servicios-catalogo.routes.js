import { Router } from "express";
import { getServiciosCatalogo } from "../controllers/servicios-catalogo.controller.js";

const router = Router();

/** GET /servicios-catalogo — tipos de servicio con montos sugeridos (público) */
router.get("/", getServiciosCatalogo);

export default router;
