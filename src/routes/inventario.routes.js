import { Router } from "express";
import * as InventarioController from "../controllers/inventario.controller.js";
import { verifyToken, checkRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { crearMovimientoSchema } from "../validators/inventario.schema.js";

const router = Router();

/**
 * @openapi
 * /inventario:
 *   get:
 *     tags:
 *       - Inventario
 *     summary: Resumen del inventario actual
 *     description: >
 *       Devuelve el stock actual de todos los artículos. Con `?alertas=true`
 *       filtra únicamente los artículos con stock bajo el umbral mínimo.
 *     operationId: getInventario
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: alertas
 *         schema:
 *           type: boolean
 *         description: "Si es true, retorna solo artículos con stock bajo"
 *     responses:
 *       '200':
 *         description: Inventario obtenido correctamente
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
 *                   example: Inventario obtenido correctamente
 *       '401':
 *         description: Token no proporcionado o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 */
router.get("/",             verifyToken, InventarioController.getInventario);

/**
 * @openapi
 * /inventario/movimientos:
 *   get:
 *     tags:
 *       - Inventario
 *     summary: Historial de movimientos de inventario
 *     description: >
 *       Devuelve el historial paginado de movimientos ENTRADA/SALIDA del inventario.
 *       Permite filtrar por artículo, tipo de movimiento y rango de fechas.
 *     operationId: getMovimientosInventario
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
 *         name: idArticulo
 *         schema:
 *           type: integer
 *         description: Filtrar por ID de artículo
 *       - in: query
 *         name: tipo
 *         schema:
 *           type: string
 *           enum:
 *             - ENTRADA
 *             - SALIDA
 *         description: Filtrar por tipo de movimiento
 *       - in: query
 *         name: fechaDesde
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio del rango (YYYY-MM-DD)
 *       - in: query
 *         name: fechaHasta
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin del rango (YYYY-MM-DD)
 *     responses:
 *       '200':
 *         description: Historial de movimientos obtenido correctamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/MovimientoInventario'
 *       '401':
 *         description: Token no proporcionado o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 */
router.get("/movimientos",  verifyToken, InventarioController.getMovimientos);

/**
 * @openapi
 * /inventario/movimientos:
 *   post:
 *     tags:
 *       - Inventario
 *     summary: Registrar movimiento de inventario
 *     description: >
 *       Crea un nuevo movimiento ENTRADA o SALIDA en el inventario.
 *       Si el artículo tiene `MANEJA_INVENTARIO = 'S'`, actualiza `INVENTARIO_ACTUAL`
 *       en `ARTICULOS` y registra el log en `MOVIMIENTOS_INVENTARIO`.
 *       Requiere rol 1 (Admin) o 2 (Staff).
 *     operationId: createMovimientoInventario
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idArticulo
 *               - tipoMovimiento
 *               - cantidad
 *             properties:
 *               idArticulo:
 *                 type: integer
 *                 description: ID del artículo al que corresponde el movimiento
 *                 example: 10
 *               tipoMovimiento:
 *                 type: string
 *                 enum:
 *                   - ENTRADA
 *                   - SALIDA
 *                 description: "ENTRADA = ingreso de stock, SALIDA = consumo"
 *                 example: ENTRADA
 *               cantidad:
 *                 type: integer
 *                 minimum: 1
 *                 description: Cantidad de unidades del movimiento (debe ser mayor a 0)
 *                 example: 5
 *               motivo:
 *                 type: string
 *                 description: Descripción o razón del movimiento
 *                 example: Compra mensual de insumos
 *     responses:
 *       '201':
 *         description: Movimiento registrado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/MovimientoInventario'
 *                 message:
 *                   type: string
 *                   example: Movimiento registrado correctamente
 *       '400':
 *         description: Datos de entrada inválidos (p.ej. cantidad <= 0 o tipo inválido)
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
router.post("/movimientos", verifyToken, checkRole(1, 2), validate(crearMovimientoSchema), InventarioController.createMovimiento);

export default router;
