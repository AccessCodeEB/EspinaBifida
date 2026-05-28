import express from "express";
import {
  getAll,
  createMembresia,
  getMembresiaStatus,
  validarMembresiaActiva,
  getPagosRecientes,
  postSyncEstados,
} from "../controllers/membresias.controller.js";
import { verifyToken } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { crearMembresiaSchema } from "../validators/membresias.schema.js";

const router = express.Router();

router.use(verifyToken);

/**
 * @openapi
 * /api/v1/membresias:
 *   get:
 *     tags:
 *       - Membresías v1
 *     summary: Listar membresías
 *     description: Retorna una lista paginada de todas las membresías registradas en el sistema.
 *     operationId: getMembresiasV1
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Cantidad de registros por página
 *     responses:
 *       200:
 *         description: Lista de membresías obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Credencial'
 *                 message:
 *                   type: string
 *                   example: Membresías obtenidas exitosamente
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 */
router.get("/", getAll);

/**
 * @openapi
 * /api/v1/membresias:
 *   post:
 *     tags:
 *       - Membresías v1
 *     summary: Crear membresía
 *     description: Crea una nueva membresía (credencial) para un beneficiario existente.
 *     operationId: createMembresiaV1
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
 *               - numeroCredencial
 *               - fechaVigenciaInicio
 *               - fechaVigenciaFin
 *             properties:
 *               curp:
 *                 type: string
 *                 minLength: 18
 *                 maxLength: 18
 *                 description: CURP del beneficiario
 *                 example: GOML900101HDFNZS09
 *               numeroCredencial:
 *                 type: string
 *                 description: Número identificador de la credencial
 *                 example: CRED-2024-001
 *               fechaVigenciaInicio:
 *                 type: string
 *                 format: date
 *                 description: Fecha de inicio de vigencia
 *                 example: "2024-01-01"
 *               fechaVigenciaFin:
 *                 type: string
 *                 format: date
 *                 description: Fecha de fin de vigencia
 *                 example: "2024-12-31"
 *               fechaUltimoPago:
 *                 type: string
 *                 format: date
 *                 description: Fecha del último pago registrado
 *                 example: "2024-01-01"
 *     responses:
 *       201:
 *         description: Membresía creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Credencial'
 *                 message:
 *                   type: string
 *                   example: Membresía creada exitosamente
 *       400:
 *         description: Datos de entrada inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error400'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       404:
 *         description: Beneficiario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error404'
 *       409:
 *         description: Ya existe una membresía activa para este beneficiario
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error409'
 */
router.post("/", validate(crearMembresiaSchema), createMembresia);

/**
 * @openapi
 * /api/v1/membresias/sync-estados:
 *   post:
 *     tags:
 *       - Membresías v1
 *     summary: Sincronizar estados de membresías
 *     description: >
 *       Actualiza masivamente el estado de los beneficiarios cuyas membresías han vencido,
 *       estableciendo su ESTATUS a `Inactivo` en la tabla BENEFICIARIOS.
 *       Requiere rol de administrador.
 *     operationId: syncEstadosMembresiasV1
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Sincronización ejecutada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     actualizados:
 *                       type: integer
 *                       description: Número de registros actualizados
 *                       example: 5
 *                 message:
 *                   type: string
 *                   example: Estados sincronizados exitosamente
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       403:
 *         description: Acceso prohibido — se requiere rol de administrador
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error403'
 */
router.post("/sync-estados", postSyncEstados);

/**
 * @openapi
 * /api/v1/membresias/pagos/recientes:
 *   get:
 *     tags:
 *       - Membresías v1
 *     summary: Obtener pagos recientes
 *     description: Retorna las membresías con los pagos más recientes, ordenadas por fecha de último pago descendente.
 *     operationId: getPagosRecientesV1
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Cantidad máxima de registros a retornar
 *     responses:
 *       200:
 *         description: Pagos recientes obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Credencial'
 *                 message:
 *                   type: string
 *                   example: Pagos recientes obtenidos exitosamente
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 */
router.get("/pagos/recientes", getPagosRecientes);

/**
 * @openapi
 * /api/v1/membresias/{curp}/activa:
 *   get:
 *     tags:
 *       - Membresías v1
 *     summary: Verificar membresía activa
 *     description: >
 *       Verifica si un beneficiario tiene una membresía vigente.
 *       Una membresía es activa cuando `SYSDATE BETWEEN FECHA_VIGENCIA_INICIO AND FECHA_VIGENCIA_FIN`.
 *     operationId: validarMembresiaActivaV1
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: curp
 *         required: true
 *         description: CURP del beneficiario (18 caracteres)
 *         schema:
 *           type: string
 *           minLength: 18
 *           maxLength: 18
 *         example: GOML900101HDFNZS09
 *     responses:
 *       200:
 *         description: Resultado de validación de membresía
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     activa:
 *                       type: boolean
 *                       description: Indica si la membresía está vigente
 *                       example: true
 *                     credencial:
 *                       nullable: true
 *                       allOf:
 *                         - $ref: '#/components/schemas/Credencial'
 *                       description: Datos de la credencial activa, o null si no existe
 *                     mensaje:
 *                       type: string
 *                       example: El beneficiario tiene una membresía activa
 *                 message:
 *                   type: string
 *                   example: Validación completada
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       404:
 *         description: Beneficiario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error404'
 */
router.get("/:curp/activa", validarMembresiaActiva);

/**
 * @openapi
 * /api/v1/membresias/{curp}:
 *   get:
 *     tags:
 *       - Membresías v1
 *     summary: Historial de membresías por CURP
 *     description: Retorna el historial completo de membresías (credenciales) de un beneficiario identificado por su CURP.
 *     operationId: getMembresiasByCurpV1
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: curp
 *         required: true
 *         description: CURP del beneficiario (18 caracteres)
 *         schema:
 *           type: string
 *           minLength: 18
 *           maxLength: 18
 *         example: GOML900101HDFNZS09
 *     responses:
 *       200:
 *         description: Historial de membresías obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Credencial'
 *                 message:
 *                   type: string
 *                   example: Historial de membresías obtenido exitosamente
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       404:
 *         description: Beneficiario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error404'
 */
router.get("/:curp", getMembresiaStatus);

export default router;
