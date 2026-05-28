import { Router } from "express";
import { getServiciosCatalogo } from "../controllers/servicios-catalogo.controller.js";

const router = Router();

/**
 * @openapi
 * /servicios-catalogo:
 *   get:
 *     summary: Lista de tipos de servicio con montos sugeridos
 *     description: Retorna todos los tipos de servicio registrados en el catálogo, incluyendo sus montos sugeridos. Endpoint público, no requiere autenticación.
 *     operationId: getServiciosCatalogo
 *     tags:
 *       - Catálogos
 *     security: []
 *     responses:
 *       '200':
 *         description: Lista de tipos de servicio obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       ID_TIPO_SERVICIO:
 *                         type: integer
 *                         example: 1
 *                       NOMBRE:
 *                         type: string
 *                         example: Consulta médica
 *                 message:
 *                   type: string
 *                   example: OK
 *       '500':
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */
router.get("/", getServiciosCatalogo);

export default router;
