import { Router } from "express";
import * as BeneficiarioController from "../controllers/beneficiarios.controller.js";
import { uploadProfilePhoto } from "../middleware/uploadProfilePhoto.js";

const router = Router();

router.post("/solicitud-publica",   BeneficiarioController.createPublicSolicitud);
router.get("/",                    BeneficiarioController.getAll);
router.post(
  "/:curp/foto-perfil",
  (req, _res, next) => {
    req._profileFilePrefix = `ben-${req.params.curp}`;
    next();
  },
  uploadProfilePhoto.single("foto"),
  BeneficiarioController.uploadFotoPerfil
);
router.delete("/:curp/foto-perfil", BeneficiarioController.deleteFotoPerfil);
router.get("/:curp",               BeneficiarioController.getById);
router.post("/",                   BeneficiarioController.create);
router.put("/:curp",               BeneficiarioController.update);
router.patch("/:curp/estatus",     BeneficiarioController.updateEstatus);
router.delete("/:curp",            BeneficiarioController.deactivate);
router.post("/:curp/aprobar-pre-registro", BeneficiarioController.approvePreRegistro);
router.delete("/:curp/pre-registro",       BeneficiarioController.rejectPreRegistro);
router.delete("/:curp/eliminar",   BeneficiarioController.hardDelete);

export default router;
