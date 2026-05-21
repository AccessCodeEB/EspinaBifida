import { Router } from "express";
import { getEspecialistas } from "../controllers/especialistas.controller.js";

const router = Router();

/** GET /especialistas — lista activa de especialistas (público) */
router.get("/", getEspecialistas);

export default router;
