import { Router } from "express";
import * as InventarioController from "../controllers/inventario.controller.js";
import { verifyToken, checkRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { crearMovimientoSchema } from "../validators/inventario.schema.js";

const router = Router();

router.get("/",             verifyToken, InventarioController.getInventario);
router.get("/movimientos",  verifyToken, InventarioController.getMovimientos);
router.post("/movimientos", verifyToken, checkRole(1, 2), validate(crearMovimientoSchema), InventarioController.createMovimiento);

export default router;
