import express from "express";
import {
  getAll,
  createMembresia,
  getMembresiaStatus,
  validarMembresiaActiva,
} from "../controllers/membresias.controller.js";

const router = express.Router();

router.get("/",             getAll);
router.post("/",            createMembresia);
router.get("/:curp/activa", validarMembresiaActiva);
router.get("/:curp",        getMembresiaStatus);

export default router;
