import { Router } from "express";
import * as Ctrl from "../controllers/notificaciones.controller.js";
import { verifyToken, checkRole } from "../middleware/auth.js";

const router = Router();

/**
 * @openapi
 * /notificaciones:
 *   get:
 *     tags:
 *       - Notificaciones
 *     summary: Panel de notificaciones
 *     description: Devuelve la lista paginada de todas las notificaciones del sistema. Soporta filtro por estado de lectura.
 *     operationId: getNotificaciones
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
 *       - in: query
 *         name: leida
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Filtrar por estado de lectura (true = leídas, false = no leídas)
 *     responses:
 *       200:
 *         description: Lista paginada de notificaciones
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
router.get(  "/",              verifyToken,              Ctrl.getAll);

/**
 * @openapi
 * /notificaciones/pendientes:
 *   get:
 *     tags:
 *       - Notificaciones
 *     summary: Notificaciones no leídas
 *     description: Devuelve todas las notificaciones pendientes (no leídas) del sistema sin paginación.
 *     operationId: getNotificacionesPendientes
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de notificaciones no leídas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Notificacion'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 */
router.get(  "/pendientes",    verifyToken,              Ctrl.getPendientes);

/**
 * @openapi
 * /notificaciones/count:
 *   get:
 *     tags:
 *       - Notificaciones
 *     summary: Cantidad de notificaciones pendientes
 *     description: Devuelve el número total de notificaciones no leídas. Útil para badges en la UI.
 *     operationId: getNotificacionesCount
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Contador de notificaciones pendientes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   description: Número de notificaciones no leídas
 *                   example: 5
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 */
router.get(  "/count",         verifyToken,              Ctrl.getCount);

/**
 * @openapi
 * /notificaciones/{id}/leer:
 *   patch:
 *     tags:
 *       - Notificaciones
 *     summary: Marca una notificación como leída
 *     description: Actualiza el campo `LEIDA` de la notificación indicada a `true`.
 *     operationId: marcarNotificacionLeida
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la notificación a marcar como leída
 *     responses:
 *       200:
 *         description: Notificación marcada como leída exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Notificacion'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       404:
 *         description: Notificación no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error404'
 */
router.patch("/:id/leer",      verifyToken,              Ctrl.marcarLeida);

/**
 * @openapi
 * /notificaciones/run-job:
 *   post:
 *     tags:
 *       - Notificaciones
 *     summary: Ejecuta el job de notificaciones manualmente (solo admin)
 *     description: >
 *       Dispara de forma manual el job que genera notificaciones de stock bajo
 *       y membresías próximas a vencer o vencidas. Requiere rol de administrador (rol 1).
 *     operationId: runNotificacionesJob
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Job ejecutado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   example: Job de notificaciones ejecutado correctamente
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       403:
 *         description: Sin permisos — se requiere rol de administrador
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error403'
 */
router.post( "/run-job",       verifyToken, checkRole(1), Ctrl.runJob);

export default router;
