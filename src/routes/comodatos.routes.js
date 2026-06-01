import { Router } from "express";
import { verifyToken, checkRole } from "../middleware/auth.js";
import * as ctrl from "../controllers/comodatos.controller.js";

const router = Router();

// Todas las rutas requieren autenticación
router.use(verifyToken);

// ── Rutas estáticas ANTES de /:id para evitar conflictos de Express ──────────
router.get("/reportes/exenciones", ctrl.getReporteExenciones);
router.get("/beneficiario/:curp",  ctrl.getByCurp);

// ── Rutas generales ───────────────────────────────────────────────────────────
router.get("/",    ctrl.getAll);
router.get("/:id", ctrl.getById);

router.post(  "/",          checkRole(1, 2), ctrl.create);
router.patch( "/:id",       checkRole(1, 2), ctrl.updateNotas);
router.delete("/:id",       checkRole(1, 2), ctrl.cancel);
router.post(  "/:id/pagos", checkRole(1, 2), ctrl.addPago);

export default router;
