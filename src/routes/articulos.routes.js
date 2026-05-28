import { Router } from "express";
import * as ArticulosController from "../controllers/articulos.controller.js";
import { verifyToken, checkRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { crearArticuloSchema, actualizarArticuloSchema } from "../validators/articulos.schema.js";

const router = Router();

router.get("/",    verifyToken,                  ArticulosController.getAll);
router.get("/:id", verifyToken,                  ArticulosController.getById);
router.post("/",   verifyToken, checkRole(1, 2), validate(crearArticuloSchema), ArticulosController.create);
router.put("/:id", verifyToken, checkRole(1, 2), validate(actualizarArticuloSchema), ArticulosController.update);
router.delete("/:id", verifyToken, checkRole(1, 2), ArticulosController.deleteById);

export default router;
