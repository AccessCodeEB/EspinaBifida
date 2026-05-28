import { Router } from "express";
import { verifyToken } from "../middleware/auth.js";
import {
  getConfiguracion,
  getCuentasBancarias,
  getResumenFinanciero,
} from "../controllers/configuracion.controller.js";

const router = Router();

/**
 * @openapi
 * /configuracion:
 *   get:
 *     summary: Valores de configuración del sistema
 *     description: Retorna los parámetros generales de configuración del sistema, como el nombre de la asociación y otros valores clave. Endpoint público, no requiere autenticación.
 *     operationId: getConfiguracion
 *     tags:
 *       - Configuración
 *     security: []
 *     responses:
 *       '200':
 *         description: Configuración obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   description: Mapa de clave-valor con los parámetros del sistema
 *                   additionalProperties:
 *                     type: string
 *                   example:
 *                     NOMBRE_ASOCIACION: Asociación Espina Bífida
 *                     TELEFONO: "5512345678"
 *                     CORREO: contacto@espinabifida.org
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
router.get("/", getConfiguracion);

/**
 * @openapi
 * /configuracion/cuentas-bancarias:
 *   get:
 *     summary: Datos bancarios para transferencias
 *     description: Retorna las cuentas bancarias disponibles para que los beneficiarios realicen pagos de membresía u otros conceptos. Endpoint público, no requiere autenticación.
 *     operationId: getCuentasBancarias
 *     tags:
 *       - Configuración
 *     security: []
 *     responses:
 *       '200':
 *         description: Cuentas bancarias obtenidas exitosamente
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
 *                       banco:
 *                         type: string
 *                         example: BBVA
 *                       cuenta:
 *                         type: string
 *                         example: "1234567890"
 *                       clabe:
 *                         type: string
 *                         example: "012345678901234567"
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
router.get("/cuentas-bancarias", getCuentasBancarias);

/**
 * @openapi
 * /configuracion/resumen-financiero:
 *   get:
 *     summary: Resumen financiero mensual
 *     description: Retorna el resumen financiero del mes indicado, incluyendo el total de membresías cobradas y el monto total recaudado. Requiere autenticación.
 *     operationId: getResumenFinanciero
 *     tags:
 *       - Configuración
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: mes
 *         required: true
 *         description: Mes a consultar en formato YYYY-MM
 *         schema:
 *           type: string
 *           pattern: '^\d{4}-\d{2}$'
 *           example: "2026-05"
 *     responses:
 *       '200':
 *         description: Resumen financiero obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalMembresias:
 *                       type: integer
 *                       description: Número de membresías cobradas en el mes
 *                       example: 42
 *                     totalRecaudado:
 *                       type: number
 *                       format: float
 *                       description: Monto total recaudado en el mes
 *                       example: 12600.00
 *                     mes:
 *                       type: string
 *                       description: Mes consultado
 *                       example: "2026-05"
 *                 message:
 *                   type: string
 *                   example: OK
 *       '400':
 *         description: Parámetro `mes` ausente o con formato inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error400'
 *       '401':
 *         description: Token de autenticación ausente o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       '500':
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */
router.get("/resumen-financiero", verifyToken, getResumenFinanciero);

export default router;
