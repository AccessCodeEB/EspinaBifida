import { Router } from "express";
import * as BeneficiarioController from "../controllers/beneficiarios.controller.js";
import { uploadProfilePhoto } from "../middleware/uploadProfilePhoto.js";
import { verifyToken, checkRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  crearBeneficiarioSchema,
  actualizarBeneficiarioSchema,
  actualizarEstatusSchema,
  solicitudPublicaSchema,
} from "../validators/beneficiarios.schema.js";

const router = Router();

// Ruta pública: formulario de pre-registro externo (sin autenticación)
router.post("/solicitud-publica", validate(solicitudPublicaSchema), BeneficiarioController.createPublicSolicitud);

// Todas las demás rutas requieren autenticación
router.get("/",                    verifyToken, BeneficiarioController.getAll);
router.post(
  "/:curp/foto-perfil",
  verifyToken,
  (req, _res, next) => {
    req._profileFilePrefix = `ben-${req.params.curp}`;
    next();
  },
  uploadProfilePhoto.single("foto"),
  BeneficiarioController.uploadFotoPerfil
);
router.delete("/:curp/foto-perfil", verifyToken, BeneficiarioController.deleteFotoPerfil);
router.get("/:curp",               verifyToken, BeneficiarioController.getById);
router.post("/",                   verifyToken, validate(crearBeneficiarioSchema), BeneficiarioController.create);
router.put("/:curp",               verifyToken, validate(actualizarBeneficiarioSchema), BeneficiarioController.update);
router.patch("/:curp/estatus",     verifyToken, validate(actualizarEstatusSchema), BeneficiarioController.updateEstatus);
router.delete("/:curp",            verifyToken, checkRole(1), BeneficiarioController.deactivate);
router.post("/:curp/aprobar-pre-registro", verifyToken, BeneficiarioController.approvePreRegistro);
router.delete("/:curp/pre-registro",       verifyToken, BeneficiarioController.rejectPreRegistro);
router.delete("/:curp/eliminar",   verifyToken, checkRole(1), BeneficiarioController.hardDelete);

export default router;
