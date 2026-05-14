import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import * as ReportesController from '../controllers/reportes.controller.js';

const router = Router();

router.use(verifyToken); // Todos los endpoints requieren JWT de admin

router.get('/periodo',       ReportesController.getPeriodo);
router.get('/historico',     ReportesController.getHistorico);
router.get('/:id/descargar', ReportesController.descargar);

export default router;
