import { Router } from "express";
import * as BeneficiarioController from "../controllers/beneficiarios.controller.js";
import { verifyToken, checkRole } from "../middleware/auth.js";

const router = Router();

router.use(verifyToken);

router.get("/", BeneficiarioController.getAll);
router.get("/:curp", BeneficiarioController.getById);
router.post("/", BeneficiarioController.create);
router.put("/:curp", BeneficiarioController.update);
router.patch("/:curp/estatus", BeneficiarioController.updateEstatus);
router.delete("/:curp", checkRole(1), BeneficiarioController.deactivate);
router.delete("/:curp/eliminar", checkRole(1), BeneficiarioController.hardDelete);

export default router;