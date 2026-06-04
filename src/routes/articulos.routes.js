import { Router } from "express";
import * as ArticulosController from "../controllers/articulos.controller.js";
import { verifyToken, checkRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { crearArticuloSchema, actualizarArticuloSchema } from "../validators/articulos.schema.js";

const router = Router();

/**
 * @openapi
 * /articulos:
 *   get:
 *     tags:
 *       - Artículos
 *     summary: Listar artículos del catálogo
 *     description: Devuelve la lista paginada de artículos del inventario. Se puede filtrar por categoría.
 *     operationId: getArticulos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Registros por página
 *       - in: query
 *         name: categoriaId
 *         schema:
 *           type: integer
 *         description: Filtrar por ID de categoría
 *     responses:
 *       '200':
 *         description: Lista de artículos obtenida correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Articulo'
 *                 message:
 *                   type: string
 *                   example: Artículos obtenidos correctamente
 *       '401':
 *         description: Token no proporcionado o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 */
router.get("/",    verifyToken,                  ArticulosController.getAll);

router.get("/categorias", verifyToken,            ArticulosController.getCategorias);

router.get("/log",        verifyToken,            ArticulosController.getLog);

/**
 * @openapi
 * /articulos/{id}:
 *   get:
 *     tags:
 *       - Artículos
 *     summary: Obtener artículo por ID
 *     description: Devuelve el detalle de un artículo específico del catálogo.
 *     operationId: getArticuloById
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del artículo
 *     responses:
 *       '200':
 *         description: Artículo encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Articulo'
 *                 message:
 *                   type: string
 *                   example: Artículo obtenido correctamente
 *       '401':
 *         description: Token no proporcionado o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       '404':
 *         description: Artículo no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error404'
 */
router.get("/:id", verifyToken,                  ArticulosController.getById);

/**
 * @openapi
 * /articulos:
 *   post:
 *     tags:
 *       - Artículos
 *     summary: Crear nuevo artículo
 *     description: Registra un nuevo artículo en el catálogo de inventario. Requiere rol 1 (Admin) o 2 (Staff).
 *     operationId: createArticulo
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - descripcion
 *               - unidad
 *               - manejaInventario
 *             properties:
 *               descripcion:
 *                 type: string
 *                 example: Silla de ruedas estándar
 *               unidad:
 *                 type: string
 *                 example: pieza
 *               cuotaRecuperacion:
 *                 type: number
 *                 format: float
 *                 example: 200.00
 *               inventarioActual:
 *                 type: integer
 *                 example: 10
 *               manejaInventario:
 *                 type: string
 *                 enum:
 *                   - 'S'
 *                   - 'N'
 *                 description: "S = tracking activo, N = sin tracking de stock"
 *                 example: 'S'
 *               idCategoria:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       '201':
 *         description: Artículo creado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Articulo'
 *                 message:
 *                   type: string
 *                   example: Artículo creado correctamente
 *       '400':
 *         description: Datos de entrada inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error400'
 *       '401':
 *         description: Token no proporcionado o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       '403':
 *         description: Sin permisos suficientes (requiere rol 1 o 2)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error403'
 *       '409':
 *         description: Ya existe un artículo con esa descripción u otro conflicto
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error409'
 */
router.post("/",   verifyToken, checkRole(1, 2), validate(crearArticuloSchema), ArticulosController.create);

/**
 * @openapi
 * /articulos/{id}:
 *   put:
 *     tags:
 *       - Artículos
 *     summary: Actualizar artículo
 *     description: Actualiza los datos de un artículo existente. Requiere rol 1 (Admin) o 2 (Staff).
 *     operationId: updateArticulo
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del artículo a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               descripcion:
 *                 type: string
 *                 example: Silla de ruedas estándar
 *               unidad:
 *                 type: string
 *                 example: pieza
 *               cuotaRecuperacion:
 *                 type: number
 *                 format: float
 *                 example: 200.00
 *               inventarioActual:
 *                 type: integer
 *                 example: 10
 *               manejaInventario:
 *                 type: string
 *                 enum:
 *                   - 'S'
 *                   - 'N'
 *                 description: "S = tracking activo, N = sin tracking de stock"
 *                 example: 'S'
 *               idCategoria:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       '200':
 *         description: Artículo actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Articulo'
 *                 message:
 *                   type: string
 *                   example: Artículo actualizado correctamente
 *       '400':
 *         description: Datos de entrada inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error400'
 *       '401':
 *         description: Token no proporcionado o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       '403':
 *         description: Sin permisos suficientes (requiere rol 1 o 2)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error403'
 *       '404':
 *         description: Artículo no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error404'
 */
router.put("/:id", verifyToken, checkRole(1, 2), validate(actualizarArticuloSchema), ArticulosController.update);

/**
 * @openapi
 * /articulos/{id}:
 *   delete:
 *     tags:
 *       - Artículos
 *     summary: Eliminar artículo
 *     description: Elimina un artículo del catálogo por su ID. Requiere rol 1 (Admin) o 2 (Staff).
 *     operationId: deleteArticulo
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del artículo a eliminar
 *     responses:
 *       '200':
 *         description: Artículo eliminado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Artículo eliminado correctamente
 *       '401':
 *         description: Token no proporcionado o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       '403':
 *         description: Sin permisos suficientes (requiere rol 1 o 2)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error403'
 *       '404':
 *         description: Artículo no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error404'
 */
router.delete("/:id", verifyToken, checkRole(1, 2), ArticulosController.deleteById);

export default router;
