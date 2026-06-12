import { Router } from "express";
import { verifyToken, checkRole } from "../middleware/auth.js";
import * as ctrl from "../controllers/comodatos.controller.js";

const router = Router();

// Todas las rutas requieren autenticación
router.use(verifyToken);

// ── Rutas estáticas ANTES de /:id para evitar conflictos de Express ──────────

/**
 * @openapi
 * /comodatos/reportes/exenciones:
 *   get:
 *     tags:
 *       - Comodatos
 *     summary: Reporte de exenciones (deudas perdonadas)
 *     description: Devuelve un listado de pagos marcados como exentos, con filtro opcional por rango de fechas.
 *     operationId: getReporteExenciones
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fechaInicio
 *         schema:
 *           type: string
 *           format: date
 *           example: '2025-01-01'
 *       - in: query
 *         name: fechaFin
 *         schema:
 *           type: string
 *           format: date
 *           example: '2025-12-31'
 *     responses:
 *       200:
 *         description: Lista de exenciones
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         $ref: '#/components/schemas/Error401'
 */
router.get("/reportes/exenciones", ctrl.getReporteExenciones);

/**
 * @openapi
 * /comodatos/beneficiario/{curp}:
 *   get:
 *     tags:
 *       - Comodatos
 *     summary: Comodatos de un beneficiario
 *     description: Devuelve todos los comodatos (activos y cancelados) asociados a una CURP.
 *     operationId: getComodatosByCurp
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: curp
 *         required: true
 *         schema:
 *           type: string
 *         example: GOCL900101HDFNRN09
 *     responses:
 *       200:
 *         description: Lista de comodatos del beneficiario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Comodato'
 *       401:
 *         $ref: '#/components/schemas/Error401'
 */
router.get("/beneficiario/:curp",  ctrl.getByCurp);

// ── Rutas generales ───────────────────────────────────────────────────────────

/**
 * @openapi
 * /comodatos:
 *   get:
 *     tags:
 *       - Comodatos
 *     summary: Lista paginada de comodatos
 *     description: Devuelve todos los préstamos de equipo médico. Soporta filtros por estatus y CURP.
 *     operationId: getComodatos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: estatus
 *         schema:
 *           type: string
 *           enum: [Activo, Cancelado]
 *       - in: query
 *         name: curp
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista paginada de comodatos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         $ref: '#/components/schemas/Error401'
 */
router.get("/",    ctrl.getAll);

/**
 * @openapi
 * /comodatos/{id}:
 *   get:
 *     tags:
 *       - Comodatos
 *     summary: Obtiene un comodato por ID
 *     description: Devuelve el detalle del comodato incluyendo su historial completo de pagos.
 *     operationId: getComodatoById
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Comodato con historial de pagos
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Comodato'
 *                 - type: object
 *                   properties:
 *                     pagos:
 *                       type: array
 *                       items:
 *                         type: object
 *       404:
 *         $ref: '#/components/schemas/Error404'
 *       401:
 *         $ref: '#/components/schemas/Error401'
 */
router.get("/:id", ctrl.getById);

/**
 * @openapi
 * /comodatos:
 *   post:
 *     tags:
 *       - Comodatos
 *     summary: Crea un nuevo comodato
 *     description: Registra el préstamo de un equipo médico a un beneficiario. Descuenta automáticamente el artículo del inventario (SALIDA).
 *     operationId: createComodato
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - curp
 *               - idArticulo
 *             properties:
 *               curp:
 *                 type: string
 *                 example: GOCL900101HDFNRN09
 *               idArticulo:
 *                 type: integer
 *                 description: ID del artículo (debe ser de categoría Equipos Médicos)
 *                 example: 3
 *               montoTotal:
 *                 type: number
 *                 nullable: true
 *                 description: null = donación sin costo
 *                 example: 500
 *               notas:
 *                 type: string
 *                 nullable: true
 *                 example: Paciente de bajos recursos
 *               fechaDevolucionEsperada:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *                 example: '2025-12-31'
 *     responses:
 *       201:
 *         description: Comodato creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comodato'
 *       400:
 *         $ref: '#/components/schemas/Error400'
 *       401:
 *         $ref: '#/components/schemas/Error401'
 *       403:
 *         $ref: '#/components/schemas/Error403'
 */
router.post(  "/",          checkRole(1, 2), ctrl.create);

/**
 * @openapi
 * /comodatos/{id}:
 *   patch:
 *     tags:
 *       - Comodatos
 *     summary: Actualiza las notas de un comodato
 *     operationId: updateComodatoNotas
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notas:
 *                 type: string
 *                 example: Se actualizó el acuerdo de pago
 *     responses:
 *       200:
 *         description: Notas actualizadas
 *       404:
 *         $ref: '#/components/schemas/Error404'
 *       401:
 *         $ref: '#/components/schemas/Error401'
 */
router.patch( "/:id",       checkRole(1, 2), ctrl.updateNotas);

/**
 * @openapi
 * /comodatos/{id}:
 *   delete:
 *     tags:
 *       - Comodatos
 *     summary: Cancela un comodato
 *     description: Cambia el estatus del comodato a Cancelado. No elimina el registro.
 *     operationId: cancelComodato
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Comodato cancelado exitosamente
 *       409:
 *         description: El comodato ya estaba cancelado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error409'
 *       404:
 *         $ref: '#/components/schemas/Error404'
 *       401:
 *         $ref: '#/components/schemas/Error401'
 */
router.delete("/:id",       checkRole(1, 2), ctrl.cancel);

/**
 * @openapi
 * /comodatos/{id}/pagos:
 *   post:
 *     tags:
 *       - Comodatos
 *     summary: Registra un pago o exención en un comodato
 *     description: Abona al saldo pendiente del comodato. Si `esExento=true`, el monto se descuenta como deuda perdonada sin pago real.
 *     operationId: addPagoComodato
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - monto
 *             properties:
 *               monto:
 *                 type: number
 *                 example: 200
 *               esExento:
 *                 type: boolean
 *                 default: false
 *                 description: true = perdonar deuda (no es pago real)
 *               notas:
 *                 type: string
 *                 nullable: true
 *                 example: Pago parcial en efectivo
 *     responses:
 *       200:
 *         description: Pago registrado. Si `liquidado=true` el comodato quedó saldado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 liquidado:
 *                   type: boolean
 *       400:
 *         $ref: '#/components/schemas/Error400'
 *       409:
 *         description: No se puede pagar un comodato cancelado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error409'
 *       401:
 *         $ref: '#/components/schemas/Error401'
 */
router.post(  "/:id/pagos",      checkRole(1, 2), ctrl.addPago);

/**
 * @openapi
 * /comodatos/{id}/devolucion:
 *   patch:
 *     tags:
 *       - Comodatos
 *     summary: Registra la devolución física del equipo
 *     description: |
 *       Marca el comodato como devuelto y registra la `FECHA_DEVOLUCION_REAL`.
 *       El sistema detecta automáticamente el tipo de devolución:
 *       - `anticipada` — antes de la fecha esperada
 *       - `aTiempo` — en la fecha esperada
 *       - `tarde` — después de la fecha esperada
 *       - `sinFechaEsperada` — el comodato no tenía fecha de devolución asignada
 *     operationId: registerDevolucionComodato
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Devolución registrada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 tipoDevolucion:
 *                   type: string
 *                   enum: [anticipada, aTiempo, tarde, sinFechaEsperada]
 *                 fechaDevolucionReal:
 *                   type: string
 *                   format: date
 *       409:
 *         description: El comodato ya fue devuelto previamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error409'
 *       404:
 *         $ref: '#/components/schemas/Error404'
 *       401:
 *         $ref: '#/components/schemas/Error401'
 */
router.patch( "/:id/devolucion", checkRole(1, 2), ctrl.registerDevolucion);

export default router;
