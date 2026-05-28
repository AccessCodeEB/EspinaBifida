import { Router } from "express";
import * as Ctrl from "../controllers/notificaciones.controller.js";
import { verifyToken, checkRole } from "../middleware/auth.js";

const router = Router();

router.get(  "/",              verifyToken,              Ctrl.getAll);
router.get(  "/pendientes",    verifyToken,              Ctrl.getPendientes);
router.get(  "/count",         verifyToken,              Ctrl.getCount);
router.patch("/:id/leer",      verifyToken,              Ctrl.marcarLeida);
router.patch("/leer-todas",    verifyToken,              Ctrl.marcarTodasLeidas);
router.post( "/run-job",       verifyToken, checkRole(1), Ctrl.runJob);

export default router;
