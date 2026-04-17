import { Router } from "express";
import * as InventarioController from "../controllers/inventario.controller.js";

const router = Router();

router.get("/",             InventarioController.getInventario);
router.get("/movimientos",  InventarioController.getMovimientos);
router.post("/movimientos", InventarioController.createMovimiento);

export default router;
