import { Router } from "express";
import * as BeneficiarioController from "../controllers/beneficiarios.controller.js";
import { verifyToken, checkRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  crearBeneficiarioSchema,
  actualizarBeneficiarioSchema,
  actualizarEstatusSchema,
} from "../validators/beneficiarios.schema.js";

const router = Router();

router.use(verifyToken);

/**
 * @openapi
 * /api/v1/beneficiarios:
 *   get:
 *     operationId: getBeneficiariosV1
 *     tags:
 *       - Beneficiarios v1
 *     summary: Listar beneficiarios con paginación y filtros (v1)
 *     description: >
 *       Devuelve una lista paginada de beneficiarios. Admite filtros opcionales
 *       por estatus y nombre. Requiere token JWT válido (aplicado globalmente
 *       a todas las rutas de este router).
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
 *       - in: query
 *         name: estatus
 *         schema:
 *           type: string
 *           enum: [Activo, Inactivo, Baja]
 *         description: Filtrar por estatus del beneficiario
 *       - in: query
 *         name: nombre
 *         schema:
 *           type: string
 *         description: Filtrar por nombre (búsqueda parcial en NOMBRES, APELLIDO_PATERNO, APELLIDO_MATERNO)
 *     responses:
 *       '200':
 *         description: Lista paginada de beneficiarios
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
 */
router.get("/", BeneficiarioController.getAll);

/**
 * @openapi
 * /api/v1/beneficiarios/{curp}:
 *   get:
 *     operationId: getBeneficiarioByIdV1
 *     tags:
 *       - Beneficiarios v1
 *     summary: Obtener beneficiario por CURP (v1)
 *     description: Devuelve el detalle completo de un beneficiario por su CURP.
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
 *     responses:
 *       '200':
 *         description: Datos del beneficiario
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Beneficiario'
 *       '401':
 *         description: Token JWT ausente o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       '404':
 *         description: Beneficiario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error404'
 */
router.get("/:curp", BeneficiarioController.getById);

/**
 * @openapi
 * /api/v1/beneficiarios:
 *   post:
 *     operationId: createBeneficiarioV1
 *     tags:
 *       - Beneficiarios v1
 *     summary: Registrar un nuevo beneficiario (v1)
 *     description: >
 *       Crea un nuevo registro de beneficiario en el sistema. La CURP es el
 *       identificador único; si ya existe un beneficiario con la misma CURP
 *       se devuelve 409.
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
 *               - nombres
 *               - apellidoPaterno
 *               - fechaNacimiento
 *               - genero
 *             properties:
 *               curp:
 *                 type: string
 *                 minLength: 18
 *                 maxLength: 18
 *                 pattern: '^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$'
 *                 example: GOCL900101HDFNRN09
 *               nombres:
 *                 type: string
 *                 example: Juan Carlos
 *               apellidoPaterno:
 *                 type: string
 *                 example: González
 *               apellidoMaterno:
 *                 type: string
 *                 example: López
 *               fechaNacimiento:
 *                 type: string
 *                 format: date
 *                 example: '1990-01-01'
 *               genero:
 *                 type: string
 *                 example: Masculino
 *               ciudad:
 *                 type: string
 *                 example: Ciudad de México
 *               municipio:
 *                 type: string
 *                 example: Coyoacán
 *               estado:
 *                 type: string
 *                 example: Ciudad de México
 *               tipoSangre:
 *                 type: string
 *                 example: O+
 *               usaValvula:
 *                 type: string
 *                 enum: [S, N]
 *                 example: N
 *               estatus:
 *                 type: string
 *                 enum: [Activo, Inactivo, Baja]
 *                 default: Activo
 *                 example: Activo
 *     responses:
 *       '201':
 *         description: Beneficiario creado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Beneficiario'
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
 *       '409':
 *         description: Ya existe un beneficiario con la misma CURP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error409'
 */
router.post("/", validate(crearBeneficiarioSchema), BeneficiarioController.create);

/**
 * @openapi
 * /api/v1/beneficiarios/{curp}:
 *   put:
 *     operationId: updateBeneficiarioV1
 *     tags:
 *       - Beneficiarios v1
 *     summary: Actualizar datos del beneficiario (v1)
 *     description: >
 *       Actualiza los datos personales de un beneficiario existente. La CURP
 *       no puede modificarse (es la PK). Todos los campos enviados en el body
 *       sobreescriben los valores actuales.
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombres:
 *                 type: string
 *                 example: Juan Carlos
 *               apellidoPaterno:
 *                 type: string
 *                 example: González
 *               apellidoMaterno:
 *                 type: string
 *                 example: López
 *               fechaNacimiento:
 *                 type: string
 *                 format: date
 *                 example: '1990-01-01'
 *               genero:
 *                 type: string
 *                 example: Masculino
 *               ciudad:
 *                 type: string
 *                 example: Ciudad de México
 *               municipio:
 *                 type: string
 *                 example: Coyoacán
 *               estado:
 *                 type: string
 *                 example: Ciudad de México
 *               tipoSangre:
 *                 type: string
 *                 example: O+
 *               usaValvula:
 *                 type: string
 *                 enum: [S, N]
 *                 example: N
 *     responses:
 *       '200':
 *         description: Beneficiario actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Beneficiario'
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
 *       '404':
 *         description: Beneficiario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error404'
 */
router.put("/:curp", validate(actualizarBeneficiarioSchema), BeneficiarioController.update);

/**
 * @openapi
 * /api/v1/beneficiarios/{curp}/estatus:
 *   patch:
 *     operationId: updateEstatusBeneficiarioV1
 *     tags:
 *       - Beneficiarios v1
 *     summary: Cambiar estatus del beneficiario (v1)
 *     description: >
 *       Actualiza únicamente el campo ESTATUS del beneficiario. Los valores
 *       permitidos son `Activo`, `Inactivo` y `Baja`. El cambio a `Baja` es
 *       equivalente a una baja administrativa (no elimina el registro).
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - estatus
 *             properties:
 *               estatus:
 *                 type: string
 *                 enum: [Activo, Inactivo, Baja]
 *                 example: Inactivo
 *     responses:
 *       '200':
 *         description: Estatus actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Estatus actualizado a Inactivo
 *                 data:
 *                   $ref: '#/components/schemas/Beneficiario'
 *       '400':
 *         description: Valor de estatus inválido
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
 *       '404':
 *         description: Beneficiario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error404'
 */
router.patch("/:curp/estatus", validate(actualizarEstatusSchema), BeneficiarioController.updateEstatus);

/**
 * @openapi
 * /api/v1/beneficiarios/{curp}:
 *   delete:
 *     operationId: deactivateBeneficiarioV1
 *     tags:
 *       - Beneficiarios v1
 *     summary: Dar de baja lógica al beneficiario (v1, solo Rol 1)
 *     description: >
 *       Realiza una baja lógica del beneficiario cambiando su ESTATUS a `Baja`.
 *       El registro se conserva en la base de datos. Requiere rol de administrador
 *       (checkRole 1).
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
 *     responses:
 *       '200':
 *         description: Beneficiario dado de baja correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Beneficiario dado de baja correctamente
 *       '401':
 *         description: Token JWT ausente o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       '403':
 *         description: El usuario no tiene el rol de administrador requerido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error403'
 *       '404':
 *         description: Beneficiario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error404'
 */
router.delete("/:curp", checkRole(1), BeneficiarioController.deactivate);

/**
 * @openapi
 * /api/v1/beneficiarios/{curp}/eliminar:
 *   delete:
 *     operationId: hardDeleteBeneficiarioV1
 *     tags:
 *       - Beneficiarios v1
 *     summary: Eliminación permanente del beneficiario (v1, solo Rol 1)
 *     description: >
 *       Elimina de forma permanente e irreversible al beneficiario y todos sus
 *       registros asociados de la base de datos. Operación destructiva que requiere
 *       rol de administrador (checkRole 1). No puede deshacerse.
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
 *     responses:
 *       '200':
 *         description: Beneficiario eliminado permanentemente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Beneficiario eliminado permanentemente
 *       '401':
 *         description: Token JWT ausente o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       '403':
 *         description: El usuario no tiene el rol de administrador requerido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error403'
 *       '404':
 *         description: Beneficiario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error404'
 */
router.delete("/:curp/eliminar", checkRole(1), BeneficiarioController.hardDelete);

export default router;
