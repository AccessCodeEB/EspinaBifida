import { Router } from "express";
import { verifyToken } from "../middleware/auth.js";
import {
  getConfiguracion,
  getCuentasBancarias,
  getResumenFinanciero,
} from "../controllers/configuracion.controller.js";

const router = Router();

/** GET /configuracion — valores de configuración del sistema (público) */
router.get("/", getConfiguracion);

/** GET /configuracion/cuentas-bancarias — datos para transferencias (público) */
router.get("/cuentas-bancarias", getCuentasBancarias);

/** GET /configuracion/resumen-financiero?mes=YYYY-MM — totales de membresías (requiere auth) */
router.get("/resumen-financiero", verifyToken, getResumenFinanciero);

export default router;
