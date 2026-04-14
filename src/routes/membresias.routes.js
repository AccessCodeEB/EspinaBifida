import express from "express";
import {
  createMembresia,
  getMembresiaStatus,
  validarMembresiaActiva,
} from "../controllers/membresias.controller.js";

const router = express.Router();

router.post("/", createMembresia);
router.get("/:curp/activa", validarMembresiaActiva);
router.get("/:curp", getMembresiaStatus);

export default router;

