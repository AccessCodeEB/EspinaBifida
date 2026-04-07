import { Router } from "express";
import * as BeneficiarioController from "./beneficiarios.controller.js";

const router = Router();

router.get("/",      BeneficiarioController.getAll);
router.get("/:id",   BeneficiarioController.getById);
router.post("/",     BeneficiarioController.create);
router.put("/:id",   BeneficiarioController.update);
router.delete("/:id", BeneficiarioController.deactivate);

export default router;
