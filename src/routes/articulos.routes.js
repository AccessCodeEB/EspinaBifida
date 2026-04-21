import { Router } from "express";
import * as ArticulosController from "../controllers/articulos.controller.js";
import { verifyToken, checkRole } from "../middleware/auth.js";

const router = Router();

router.get("/",    verifyToken,                  ArticulosController.getAll);
router.get("/:id", verifyToken,                  ArticulosController.getById);
router.post("/",   verifyToken, checkRole(1, 2), ArticulosController.create);
router.put("/:id", verifyToken, checkRole(1, 2), ArticulosController.update);
router.delete("/:id", verifyToken, checkRole(1), ArticulosController.deleteById);

export default router;
