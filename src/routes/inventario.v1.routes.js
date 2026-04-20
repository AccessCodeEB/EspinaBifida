import { Router } from "express";
import * as InventarioController from "../controllers/inventario.controller.js";

const router = Router();

// Contrato v1 esperado por clientes externos.
router.get("/inventario", InventarioController.getInventario);
router.get("/movimientos", InventarioController.getMovimientos);
router.post("/movimientos", InventarioController.createMovimiento);

export default router;
