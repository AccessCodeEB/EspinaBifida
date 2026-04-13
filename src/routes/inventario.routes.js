import { Router } from "express";
import * as InventarioController from "../controllers/inventario.controller.js";

const router = Router();

router.post("/movimientos", InventarioController.createMovimiento);
router.get("/inventario", InventarioController.getInventario);
router.get("/movimientos", InventarioController.getMovimientos);

export default router;