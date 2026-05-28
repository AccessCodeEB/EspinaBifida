import { Router } from "express";
import * as RolesController from "../controllers/roles.controller.js";
import { verifyToken, checkRole } from "../middleware/auth.js";

const router = Router();

/**
 * @openapi
 * /roles:
 *   get:
 *     summary: Lista todos los roles del sistema
 *     description: Retorna todos los roles registrados. Requiere autenticación y privilegios de administrador (rol 1).
 *     operationId: getRoles
 *     tags:
 *       - Roles
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Lista de roles obtenida exitosamente
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
 *                       ID_ROL:
 *                         type: integer
 *                         example: 1
 *                       NOMBRE_ROL:
 *                         type: string
 *                         example: Administrador
 *                 message:
 *                   type: string
 *                   example: OK
 *       '401':
 *         description: Token de autenticación ausente o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       '403':
 *         description: El usuario no tiene permisos suficientes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error403'
 *       '500':
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */
router.get("/", verifyToken, checkRole(1), RolesController.getAll);

/**
 * @openapi
 * /roles/{idRol}:
 *   get:
 *     summary: Obtiene un rol por ID
 *     description: Retorna los datos de un rol específico según su identificador. Requiere autenticación y privilegios de administrador (rol 1).
 *     operationId: getRolById
 *     tags:
 *       - Roles
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idRol
 *         required: true
 *         description: Identificador numérico del rol
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       '200':
 *         description: Rol obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     ID_ROL:
 *                       type: integer
 *                       example: 1
 *                     NOMBRE_ROL:
 *                       type: string
 *                       example: Administrador
 *                 message:
 *                   type: string
 *                   example: OK
 *       '401':
 *         description: Token de autenticación ausente o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       '403':
 *         description: El usuario no tiene permisos suficientes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error403'
 *       '404':
 *         description: Rol no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error404'
 *       '500':
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */
router.get("/:idRol", verifyToken, checkRole(1), RolesController.getById);

export default router;
