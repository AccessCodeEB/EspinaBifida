import { Router } from "express";
import * as BeneficiarioController from "../controllers/beneficiarios.controller.js";

const router = Router();

router.get("/",                    BeneficiarioController.getAll);
router.get("/:curp",               BeneficiarioController.getById);
router.post("/",                   BeneficiarioController.create);
router.put("/:curp",               BeneficiarioController.update);
router.patch("/:curp/estatus",     BeneficiarioController.updateEstatus);
router.delete("/:curp",            BeneficiarioController.deactivate);
router.delete("/:curp/eliminar",   BeneficiarioController.hardDelete);

export default router;
