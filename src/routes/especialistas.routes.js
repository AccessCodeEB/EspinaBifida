import { Router } from "express";
import { getEspecialistas } from "../controllers/especialistas.controller.js";

const router = Router();

/**
 * @openapi
 * /especialistas:
 *   get:
 *     summary: Lista activa de especialistas
 *     description: Retorna todos los especialistas activos registrados en el sistema. Endpoint público, no requiere autenticación.
 *     operationId: getEspecialistas
 *     tags:
 *       - Catálogos
 *     security: []
 *     responses:
 *       '200':
 *         description: Lista de especialistas obtenida exitosamente
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
 *                       ID:
 *                         type: integer
 *                         example: 1
 *                       NOMBRE:
 *                         type: string
 *                         example: Dra. María López
 *                       ESPECIALIDAD:
 *                         type: string
 *                         example: Neurología
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
router.get("/", getEspecialistas);

export default router;
