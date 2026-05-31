import { Router } from "express";
import * as ServiciosController from "../controllers/servicios.controller.js";
import { verifyToken, checkRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { crearServicioSchema, actualizarServicioSchema } from "../validators/servicios.schema.js";

const router = Router();

/**
 * @openapi
 * /servicios:
 *   get:
 *     operationId: getServicios
 *     tags:
 *       - Servicios
 *     summary: Listar todos los servicios
 *     description: >
 *       Ruta pública (sin autenticación). Devuelve una lista paginada de servicios
 *       registrados. Soporta filtros opcionales por CURP del beneficiario y tipo de servicio.
 *     security: []
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
 *         name: curp
 *         schema:
 *           type: string
 *           minLength: 18
 *           maxLength: 18
 *         description: Filtrar por CURP del beneficiario
 *       - in: query
 *         name: tipo
 *         schema:
 *           type: integer
 *         description: Filtrar por ID de tipo de servicio
 *     responses:
 *       '200':
 *         description: Lista paginada de servicios
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       '500':
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */
router.get("/", ServiciosController.getAll);

/**
 * @openapi
 * /servicios:
 *   post:
 *     operationId: createServicio
 *     tags:
 *       - Servicios
 *     summary: Crear nuevo servicio
 *     description: >
 *       Registra un nuevo servicio para un beneficiario. Requiere autenticación y rol 1 o 2.
 *
 *       **Regla crítica de negocio:** antes de insertar el registro, el sistema valida que el
 *       beneficiario tenga una membresía activa (SYSDATE entre FECHA_VIGENCIA_INICIO y
 *       FECHA_VIGENCIA_FIN en CREDENCIALES). Si la membresía está vencida o inexistente,
 *       la operación es rechazada con HTTP 403.
 *
 *       Para préstamos de equipo (comodatos), usar `referenciaTipo: "COMODATO"` junto con
 *       el `referenciaId` del comodato correspondiente.
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
 *               - idTipoServicio
 *               - fecha
 *               - costo
 *               - montoPagado
 *             properties:
 *               curp:
 *                 type: string
 *                 minLength: 18
 *                 maxLength: 18
 *                 description: CURP del beneficiario (FK → BENEFICIARIOS)
 *                 example: GOCL900101HDFNRN09
 *               idTipoServicio:
 *                 type: integer
 *                 description: ID del tipo de servicio (FK → SERVICIOS_CATALOGO)
 *                 example: 3
 *               fecha:
 *                 type: string
 *                 format: date-time
 *                 description: Fecha y hora del servicio
 *                 example: '2024-06-15T10:00:00Z'
 *               costo:
 *                 type: number
 *                 format: float
 *                 description: Costo total del servicio
 *                 example: 150.00
 *               montoPagado:
 *                 type: number
 *                 format: float
 *                 description: Monto efectivamente pagado
 *                 example: 150.00
 *               referenciaId:
 *                 type: integer
 *                 nullable: true
 *                 description: ID del objeto referenciado (p. ej. comodato)
 *                 example: null
 *               referenciaTipo:
 *                 type: string
 *                 nullable: true
 *                 description: >
 *                   Tipo de referencia polimórfica. Usar "COMODATO" para préstamos de equipo.
 *                 example: COMODATO
 *     responses:
 *       '201':
 *         description: Servicio registrado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Servicio'
 *       '400':
 *         description: Datos de entrada inválidos (campos requeridos ausentes o mal formados)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error400'
 *       '401':
 *         description: Token JWT ausente o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       '403':
 *         description: >
 *           Membresía inactiva — el beneficiario debe tener una membresía vigente para
 *           registrar servicios. Validar membresía antes de registrar servicios.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error403'
 *       '404':
 *         description: Beneficiario no encontrado con la CURP proporcionada
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
// POST /servicios - Crear nuevo servicio (con validación de membresía activa)
router.post("/", verifyToken, checkRole(1, 2), validate(crearServicioSchema), ServiciosController.create);

/**
 * @openapi
 * /servicios/detalle/{idServicio}:
 *   get:
 *     operationId: getServicioById
 *     tags:
 *       - Servicios
 *     summary: Obtener servicio por ID
 *     description: Devuelve el detalle completo de un servicio identificado por su ID numérico.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idServicio
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID numérico del servicio (ID_SERVICIO)
 *         example: 42
 *     responses:
 *       '200':
 *         description: Detalle del servicio
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Servicio'
 *       '401':
 *         description: Token JWT ausente o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       '404':
 *         description: Servicio no encontrado
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
router.get("/detalle/:idServicio", verifyToken, ServiciosController.getById);

/**
 * @openapi
 * /servicios/detalle:
 *   get:
 *     operationId: getServiciosDetallados
 *     tags:
 *       - Servicios
 *     summary: Consulta detallada de servicios con filtros
 *     description: >
 *       Devuelve una lista paginada de servicios con soporte para múltiples filtros simultáneos:
 *       CURP del beneficiario, tipo de servicio y rango de fechas. Útil para reportes operativos
 *       y búsquedas avanzadas.
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
 *         name: curp
 *         schema:
 *           type: string
 *           minLength: 18
 *           maxLength: 18
 *         description: Filtrar por CURP del beneficiario
 *       - in: query
 *         name: idTipoServicio
 *         schema:
 *           type: integer
 *         description: Filtrar por ID de tipo de servicio
 *       - in: query
 *         name: fechaDesde
 *         schema:
 *           type: string
 *           format: date
 *         description: 'Fecha de inicio del rango (inclusive). Formato: YYYY-MM-DD'
 *         example: '2024-01-01'
 *       - in: query
 *         name: fechaHasta
 *         schema:
 *           type: string
 *           format: date
 *         description: 'Fecha de fin del rango (inclusive). Formato: YYYY-MM-DD'
 *         example: '2024-12-31'
 *     responses:
 *       '200':
 *         description: Lista paginada de servicios con detalle
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       '401':
 *         description: Token JWT ausente o inválido
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
router.get("/detalle", verifyToken, ServiciosController.getDetailed);

/**
 * @openapi
 * /servicios/{curp}:
 *   get:
 *     operationId: getServiciosByCurp
 *     tags:
 *       - Servicios
 *     summary: Obtener servicios de un beneficiario por CURP
 *     description: >
 *       Devuelve todos los servicios registrados para el beneficiario identificado por su CURP.
 *       Retorna 404 si no existe ningún beneficiario con esa CURP.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: curp
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 18
 *           maxLength: 18
 *         description: CURP del beneficiario (18 caracteres)
 *         example: GOCL900101HDFNRN09
 *     responses:
 *       '200':
 *         description: Lista de servicios del beneficiario
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Servicio'
 *       '401':
 *         description: Token JWT ausente o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       '404':
 *         description: Beneficiario no encontrado con la CURP proporcionada
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
router.get("/comodatos",                   verifyToken,              ServiciosController.getComodatos);
router.patch("/:idServicio/devolucion",    verifyToken, checkRole(1,2), ServiciosController.confirmarDevolucion);

router.get("/:curp", verifyToken, ServiciosController.getByCurp);

/**
 * @openapi
 * /servicios/{idServicio}:
 *   put:
 *     operationId: updateServicio
 *     tags:
 *       - Servicios
 *     summary: Actualizar servicio
 *     description: >
 *       Actualiza los campos editables de un servicio existente. Requiere autenticación y rol 1 o 2.
 *       Solo se pueden modificar `montoPagado` y `notas`; los demás campos del servicio son
 *       inmutables tras su creación.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idServicio
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID numérico del servicio (ID_SERVICIO)
 *         example: 42
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               montoPagado:
 *                 type: number
 *                 format: float
 *                 description: Nuevo monto pagado por el servicio
 *                 example: 200.00
 *               notas:
 *                 type: string
 *                 description: Observaciones o notas adicionales del servicio
 *                 example: Paciente pagó con transferencia bancaria
 *     responses:
 *       '200':
 *         description: Servicio actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Servicio'
 *       '400':
 *         description: Datos de entrada inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error400'
 *       '401':
 *         description: Token JWT ausente o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       '403':
 *         description: Sin permisos para modificar este servicio (se requiere rol 1 o 2)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error403'
 *       '404':
 *         description: Servicio no encontrado
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
// PUT /servicios/:idServicio - Actualizar servicio (monto pagado, notas)
router.put("/:idServicio", verifyToken, checkRole(1, 2), validate(actualizarServicioSchema), ServiciosController.update);

/**
 * @openapi
 * /servicios/{idServicio}:
 *   delete:
 *     operationId: deleteServicio
 *     tags:
 *       - Servicios
 *     summary: Eliminar servicio
 *     description: >
 *       Elimina permanentemente un servicio del sistema. Requiere autenticación y rol 1 o 2.
 *       Esta operación es irreversible.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idServicio
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID numérico del servicio a eliminar (ID_SERVICIO)
 *         example: 42
 *     responses:
 *       '200':
 *         description: Servicio eliminado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Servicio eliminado correctamente
 *       '401':
 *         description: Token JWT ausente o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       '403':
 *         description: Sin permisos para eliminar este servicio (se requiere rol 1 o 2)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error403'
 *       '404':
 *         description: Servicio no encontrado
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
router.delete("/:idServicio", verifyToken, checkRole(1, 2), ServiciosController.deleteById);

export default router;
