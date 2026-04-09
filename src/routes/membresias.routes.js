import express from "express";
import {
  createMembresia,
  getMembresiaStatus,
} from "../controllers/membresias.controller.js";

const router = express.Router();

router.post("/", createMembresia);
router.get("/:curp", getMembresiaStatus);

export default router;

