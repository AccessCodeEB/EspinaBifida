import { Router } from "express";
import * as ArticulosController from "../controllers/articulos.controller.js";

const router = Router();

router.get("/", ArticulosController.getAll);
router.get("/:id", ArticulosController.getById);
router.post("/", ArticulosController.create);
router.put("/:id", ArticulosController.update);
router.delete("/:id", ArticulosController.deleteById);

export default router;
