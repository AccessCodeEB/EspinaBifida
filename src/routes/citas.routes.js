import express from "express";
import {
  getCitas,
  getCitaById,
  createCita,
  updateCita,
  deleteCita,
} from "../controllers/citas.controller.js";
import { validate } from "../middleware/validate.js";
import { crearCitaSchema, actualizarCitaSchema } from "../validators/citas.schema.js";

const router = express.Router();

router.get("/", getCitas);
router.get("/:id", getCitaById);
router.post("/", validate(crearCitaSchema), createCita);
router.put("/:id", validate(actualizarCitaSchema), updateCita);
router.patch("/:id", validate(actualizarCitaSchema), updateCita); // alias: partial update (e.g. only estatus)
router.delete("/:id", deleteCita);

export default router;