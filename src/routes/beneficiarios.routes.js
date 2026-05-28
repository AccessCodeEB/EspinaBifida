import { Router } from "express";
import * as BeneficiarioController from "../controllers/beneficiarios.controller.js";
import { uploadProfilePhoto } from "../middleware/uploadProfilePhoto.js";
import { verifyToken, checkRole } from "../middleware/auth.js";

const router = Router();

/**
 * @openapi
 * /beneficiarios/solicitud-publica:
 *   post:
 *     operationId: createSolicitudPublica
 *     tags:
 *       - Beneficiarios
 *     summary: Enviar solicitud pública de pre-registro
 *     description: >
 *       Ruta pública (sin autenticación). Permite a un paciente externo enviar
 *       sus datos para solicitar registro en la asociación. Requiere token
 *       Cloudflare Turnstile para protección anti-bot. El administrador deberá
 *       aprobar o rechazar la solicitud posteriormente.
 *     security: []
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
 *               - turnstileToken
 *             properties:
 *               curp:
 *                 type: string
 *                 minLength: 18
 *                 maxLength: 18
 *                 pattern: '^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$'
 *                 description: Clave Única de Registro de Población
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
 *               turnstileToken:
 *                 type: string
 *                 description: Token de validación Cloudflare Turnstile
 *                 example: XXXX.DUMMY.TOKEN.XXXX
 *     responses:
 *       '201':
 *         description: Solicitud de pre-registro enviada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Solicitud enviada correctamente. Un administrador revisará tu solicitud.
 *                 folio:
 *                   type: string
 *                   example: GOCL900101HDFNRN09
 *       '400':
 *         description: Datos de entrada inválidos o token Turnstile faltante/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error400'
 */
// Ruta pública: formulario de pre-registro externo (sin autenticación)
router.post("/solicitud-publica",   BeneficiarioController.createPublicSolicitud);

/**
 * @openapi
 * /beneficiarios:
 *   get:
 *     operationId: getBeneficiarios
 *     tags:
 *       - Beneficiarios
 *     summary: Listar beneficiarios con paginación y filtros
 *     description: >
 *       Devuelve una lista paginada de beneficiarios. Admite filtros opcionales
 *       por estatus y nombre. Solo accesible con token JWT válido.
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
router.get("/",                    verifyToken, BeneficiarioController.getAll);

/**
 * @openapi
 * /beneficiarios/{curp}/foto-perfil:
 *   post:
 *     operationId: uploadFotoPerfilBeneficiario
 *     tags:
 *       - Beneficiarios
 *     summary: Subir o reemplazar foto de perfil del beneficiario
 *     description: >
 *       Sube una imagen de perfil (JPG o PNG, máx 5 MB) para el beneficiario
 *       identificado por su CURP. Si ya existe una foto, se reemplaza.
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
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/FileUploadSchema'
 *     responses:
 *       '200':
 *         description: Foto de perfil actualizada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Foto de perfil actualizada correctamente
 *                 fotoUrl:
 *                   type: string
 *                   example: /profile-photos/ben-GOCL900101HDFNRN09.jpg
 *       '400':
 *         description: Archivo no enviado, formato inválido o tamaño excedido
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
router.post(
  "/:curp/foto-perfil",
  verifyToken,
  (req, _res, next) => {
    req._profileFilePrefix = `ben-${req.params.curp}`;
    next();
  },
  uploadProfilePhoto.single("foto"),
  BeneficiarioController.uploadFotoPerfil
);

/**
 * @openapi
 * /beneficiarios/{curp}/foto-perfil:
 *   delete:
 *     operationId: deleteFotoPerfilBeneficiario
 *     tags:
 *       - Beneficiarios
 *     summary: Eliminar foto de perfil del beneficiario
 *     description: >
 *       Elimina la foto de perfil asociada al beneficiario. Si no tiene foto
 *       asignada, devuelve 404.
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
 *         description: Foto de perfil eliminada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Foto de perfil eliminada correctamente
 *       '401':
 *         description: Token JWT ausente o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       '404':
 *         description: Beneficiario o foto no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error404'
 */
router.delete("/:curp/foto-perfil", verifyToken, BeneficiarioController.deleteFotoPerfil);

/**
 * @openapi
 * /beneficiarios/{curp}:
 *   get:
 *     operationId: getBeneficiarioById
 *     tags:
 *       - Beneficiarios
 *     summary: Obtener beneficiario por CURP
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
router.get("/:curp",               verifyToken, BeneficiarioController.getById);

/**
 * @openapi
 * /beneficiarios:
 *   post:
 *     operationId: createBeneficiario
 *     tags:
 *       - Beneficiarios
 *     summary: Registrar un nuevo beneficiario
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
router.post("/",                   verifyToken, BeneficiarioController.create);

/**
 * @openapi
 * /beneficiarios/{curp}:
 *   put:
 *     operationId: updateBeneficiario
 *     tags:
 *       - Beneficiarios
 *     summary: Actualizar datos del beneficiario
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
router.put("/:curp",               verifyToken, BeneficiarioController.update);

/**
 * @openapi
 * /beneficiarios/{curp}/estatus:
 *   patch:
 *     operationId: updateEstatusBeneficiario
 *     tags:
 *       - Beneficiarios
 *     summary: Cambiar estatus del beneficiario
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
router.patch("/:curp/estatus",     verifyToken, BeneficiarioController.updateEstatus);

/**
 * @openapi
 * /beneficiarios/{curp}:
 *   delete:
 *     operationId: deactivateBeneficiario
 *     tags:
 *       - Beneficiarios
 *     summary: Dar de baja lógica al beneficiario (solo Rol 1)
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
router.delete("/:curp",            verifyToken, checkRole(1), BeneficiarioController.deactivate);

/**
 * @openapi
 * /beneficiarios/{curp}/aprobar-pre-registro:
 *   post:
 *     operationId: aprobarPreRegistro
 *     tags:
 *       - Beneficiarios
 *     summary: Aprobar solicitud de pre-registro
 *     description: >
 *       Aprueba una solicitud pública de pre-registro e incorpora al solicitante
 *       como beneficiario oficial en el sistema. La solicitud debe estar en
 *       estado pendiente.
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
 *         description: CURP de la solicitud de pre-registro a aprobar
 *     responses:
 *       '200':
 *         description: Solicitud aprobada y beneficiario creado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Pre-registro aprobado. Beneficiario creado correctamente.
 *                 data:
 *                   $ref: '#/components/schemas/Beneficiario'
 *       '401':
 *         description: Token JWT ausente o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       '404':
 *         description: Solicitud de pre-registro no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error404'
 */
router.post("/:curp/aprobar-pre-registro", verifyToken, BeneficiarioController.approvePreRegistro);

/**
 * @openapi
 * /beneficiarios/{curp}/pre-registro:
 *   delete:
 *     operationId: rechazarPreRegistro
 *     tags:
 *       - Beneficiarios
 *     summary: Rechazar solicitud de pre-registro
 *     description: >
 *       Rechaza y elimina una solicitud pública de pre-registro. El solicitante
 *       no es incorporado como beneficiario. La solicitud debe estar en estado
 *       pendiente.
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
 *         description: CURP de la solicitud de pre-registro a rechazar
 *     responses:
 *       '200':
 *         description: Solicitud de pre-registro rechazada y eliminada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Solicitud de pre-registro rechazada correctamente
 *       '401':
 *         description: Token JWT ausente o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       '404':
 *         description: Solicitud de pre-registro no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error404'
 */
router.delete("/:curp/pre-registro",       verifyToken, BeneficiarioController.rejectPreRegistro);

/**
 * @openapi
 * /beneficiarios/{curp}/eliminar:
 *   delete:
 *     operationId: hardDeleteBeneficiario
 *     tags:
 *       - Beneficiarios
 *     summary: Eliminación permanente del beneficiario (solo Rol 1)
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
 *         description: CURP del beneficiario a eliminar permanentemente
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
router.delete("/:curp/eliminar",   verifyToken, checkRole(1), BeneficiarioController.hardDelete);

export default router;
