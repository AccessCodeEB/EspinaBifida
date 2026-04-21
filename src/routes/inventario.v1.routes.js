import { Router } from "express";
import * as InventarioController from "../controllers/inventario.controller.js";
import { verifyToken, checkRole } from "../middleware/auth.js";

const router = Router();

// Contrato v1 esperado por clientes externos.
router.get("/inventario", verifyToken, InventarioController.getInventario);
router.get("/movimientos", verifyToken, InventarioController.getMovimientos);
router.post("/movimientos", verifyToken, checkRole(1, 2), InventarioController.createMovimiento);

export default router;
