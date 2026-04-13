import { Router } from "express";
import * as AdminController from "../controllers/administradores.controller.js";
import { verifyToken, checkRole } from "../middleware/auth.js";

const router = Router();

// Pública — no requiere token
router.post("/login", AdminController.login);

// Protegidas — requieren token válido
router.get("/",                     verifyToken, checkRole(1),    AdminController.getAll);
router.get("/:idAdmin",             verifyToken,                  AdminController.getById);
router.post("/",                    verifyToken, checkRole(1),    AdminController.create);
router.put("/:idAdmin",             verifyToken, checkRole(1),    AdminController.update);
router.patch("/:idAdmin/password",  verifyToken,                  AdminController.changePassword);
router.delete("/:idAdmin",          verifyToken, checkRole(1),    AdminController.deactivate);

export default router;
