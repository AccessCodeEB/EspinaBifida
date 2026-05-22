import { Router } from "express";
import * as AdminController from "../controllers/administradores.controller.js";
import { verifyToken, checkRole } from "../middleware/auth.js";
import { uploadProfilePhoto } from "../middleware/uploadProfilePhoto.js";
import { adminSelfOrSuper } from "../middleware/adminSelfOrSuper.js";

const router = Router();

// Pública — no requiere token
router.post("/login", AdminController.login);

// Públicas — recuperación de contraseña (sin token)
router.post("/forgot-password",        AdminController.solicitarRecuperacion);
router.patch("/forgot-password/reset", AdminController.resetPasswordPublico);

// Protegidas — requieren token válido
router.get("/",                     verifyToken, checkRole(1),    AdminController.getAll);
router.post(
  "/:idAdmin/foto-perfil",
  verifyToken,
  adminSelfOrSuper,
  (req, _res, next) => {
    req._profileFilePrefix = `adm-${req.params.idAdmin}`;
    next();
  },
  uploadProfilePhoto.single("foto"),
  AdminController.uploadFotoPerfil
);
router.get("/:idAdmin",             verifyToken,                  AdminController.getById);
router.post("/",                    verifyToken, checkRole(1),    AdminController.create);
router.put("/:idAdmin",             verifyToken, checkRole(1),    AdminController.update);
router.patch("/:idAdmin/password",        verifyToken,                  AdminController.changePassword);
router.post("/:idAdmin/solicitar-codigo", verifyToken,                  AdminController.solicitarCodigo);
router.patch("/:idAdmin/telefono",        verifyToken, adminSelfOrSuper, AdminController.updateTelefono);
router.delete("/:idAdmin",               verifyToken, checkRole(1),    AdminController.deactivate);

export default router;
