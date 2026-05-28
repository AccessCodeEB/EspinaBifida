import { Router } from "express";
import * as AdminController from "../controllers/administradores.controller.js";
import { verifyToken, checkRole } from "../middleware/auth.js";
import { uploadProfilePhoto } from "../middleware/uploadProfilePhoto.js";
import { adminSelfOrSuper } from "../middleware/adminSelfOrSuper.js";
import { validate } from "../middleware/validate.js";
import {
  loginSchema,
  refreshSchema,
  logoutSchema,
  crearAdminSchema,
  actualizarAdminSchema,
  cambiarPasswordSchema,
  recuperarPasswordSchema,
  resetPasswordSchema,
  actualizarTelefonoSchema,
} from "../validators/administradores.schema.js";

const router = Router();

// Pública — no requiere token
router.post("/login",   validate(loginSchema),   AdminController.login);
router.post("/refresh", validate(refreshSchema), AdminController.refresh);
router.post("/logout",  validate(logoutSchema),  AdminController.logout);

// Públicas — recuperación de contraseña (sin token)
router.post("/forgot-password",        validate(recuperarPasswordSchema), AdminController.solicitarRecuperacion);
router.patch("/forgot-password/reset", validate(resetPasswordSchema),     AdminController.resetPasswordPublico);

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
router.post("/",                    verifyToken, checkRole(1),    validate(crearAdminSchema), AdminController.create);
router.put("/:idAdmin",             verifyToken, checkRole(1),    validate(actualizarAdminSchema), AdminController.update);
router.patch("/:idAdmin/password",        verifyToken,                  validate(cambiarPasswordSchema), AdminController.changePassword);
router.post("/:idAdmin/solicitar-codigo", verifyToken,                  AdminController.solicitarCodigo);
router.patch("/:idAdmin/telefono",        verifyToken, adminSelfOrSuper, validate(actualizarTelefonoSchema), AdminController.updateTelefono);
router.delete("/:idAdmin",               verifyToken, checkRole(1),    AdminController.deactivate);

export default router;
