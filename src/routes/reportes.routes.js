import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import * as ReportesController from '../controllers/reportes.controller.js';

const router = Router();

router.use(verifyToken); // Todos los endpoints requieren JWT de admin

/**
 * @openapi
 * /api/v1/reportes/periodo:
 *   get:
 *     tags:
 *       - Reportes
 *     summary: Genera reporte del período
 *     description: >
 *       Genera un reporte de datos del período indicado. Puede devolver un archivo
 *       binario (PDF/XLSX) o un objeto JSON con los datos, según el formato solicitado.
 *     operationId: getReportePeriodo
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tipo
 *         required: true
 *         schema:
 *           type: string
 *           enum: [beneficiarios, membresias, servicios, inventario]
 *         description: Tipo de reporte a generar
 *       - in: query
 *         name: formato
 *         required: true
 *         schema:
 *           type: string
 *           enum: [pdf, xlsx]
 *         description: Formato de salida del reporte
 *       - in: query
 *         name: fechaDesde
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *           example: '2024-01-01'
 *         description: Fecha de inicio del período (ISO 8601)
 *       - in: query
 *         name: fechaHasta
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *           example: '2024-12-31'
 *         description: Fecha de fin del período (ISO 8601)
 *     responses:
 *       200:
 *         description: Reporte generado exitosamente
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 message:
 *                   type: string
 *                   example: Reporte generado correctamente
 *       400:
 *         description: Tipo o formato inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error400'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 */
router.get('/periodo',       ReportesController.getPeriodo);

/**
 * @openapi
 * /api/v1/reportes/historico:
 *   get:
 *     tags:
 *       - Reportes
 *     summary: Historial de reportes generados
 *     description: Devuelve la lista paginada de reportes que han sido generados anteriormente.
 *     operationId: getReporteHistorico
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Registros por página
 *     responses:
 *       200:
 *         description: Lista paginada de reportes históricos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 */
router.get('/historico',     ReportesController.getHistorico);

/**
 * @openapi
 * /api/v1/reportes/{id}/descargar:
 *   get:
 *     tags:
 *       - Reportes
 *     summary: Descarga un reporte por ID
 *     description: >
 *       Descarga el archivo generado de un reporte existente. La respuesta es el
 *       contenido binario del archivo (PDF u otro formato exportable).
 *     operationId: descargarReporte
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del reporte a descargar
 *     responses:
 *       200:
 *         description: Archivo del reporte descargado exitosamente
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       404:
 *         description: Reporte no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error404'
 */
router.get('/:id/descargar', ReportesController.descargar);

export default router;
