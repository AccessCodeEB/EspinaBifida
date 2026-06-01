import { Router } from "express";
import * as CategoriasController from "../controllers/categorias-articulo.controller.js";
import { verifyToken, checkRole } from "../middleware/auth.js";

const router = Router();

/**
 * @openapi
 * /categorias-articulo:
 *   get:
 *     tags:
 *       - Catálogos
 *     summary: Listar categorías de artículos
 *     description: Devuelve el catálogo de categorías disponibles para artículos del inventario.
 *     operationId: getCategoriasArticulo
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Lista de categorías obtenida correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   idCategoria:
 *                     type: integer
 *                     example: 2
 *                   nombre:
 *                     type: string
 *                     example: Medicamentos
 *                   descripcion:
 *                     type: string
 *                     nullable: true
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/",  verifyToken,             CategoriasController.getAll);

/**
 * @openapi
 * /categorias-articulo:
 *   post:
 *     tags:
 *       - Catálogos
 *     summary: Crear categoría de artículo
 *     description: Registra una nueva categoría en el catálogo. Requiere rol Admin (1) o Staff (2).
 *     operationId: createCategoriaArticulo
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: Servicios y Estudios
 *               descripcion:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       '201':
 *         description: Categoría creada correctamente
 *       '400':
 *         description: Nombre requerido
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post("/", verifyToken, checkRole(1, 2), CategoriasController.create);

export default router;
