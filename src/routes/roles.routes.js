import { Router } from "express";
import * as RolesController from "../controllers/roles.controller.js";
import { verifyToken, checkRole } from "../middleware/auth.js";

const router = Router();

router.get("/",          verifyToken, checkRole(1), RolesController.getAll);
router.get("/:idRol",    verifyToken, checkRole(1), RolesController.getById);

export default router;
