import { Router } from "express";
import * as AdminController from "../controllers/administradores.controller.js";
import { verifyToken, checkRole } from "../middleware/auth.js";
import { uploadProfilePhoto } from "../middleware/uploadProfilePhoto.js";
import { adminSelfOrSuper } from "../middleware/adminSelfOrSuper.js";
import { validate } from "../middleware/validate.js";
import {
  loginSchema,
  refreshSchema,
  logoutSchema,
  crearAdminSchema,
  actualizarAdminSchema,
  cambiarPasswordSchema,
  recuperarPasswordSchema,
  resetPasswordSchema,
  actualizarTelefonoSchema,
} from "../validators/administradores.schema.js";

const router = Router();

// Pública — no requiere token

/**
 * @swagger
 * /administradores/login:
 *   post:
 *     operationId: loginAdmin
 *     tags: ['Auth']
 *     summary: Iniciar sesión como administrador
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@espinabifida.org
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "S3cur3P@ss!"
 *     responses:
 *       200:
 *         description: Autenticación exitosa — devuelve token JWT y datos del administrador
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 admin:
 *                   type: object
 *                   properties:
 *                     ID_ADMIN:
 *                       type: integer
 *                       example: 1
 *                     EMAIL:
 *                       type: string
 *                       example: admin@espinabifida.org
 *                     ID_ROL:
 *                       type: integer
 *                       example: 1
 *       400:
 *         description: Datos inválidos o faltantes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error400'
 *       401:
 *         description: Credenciales incorrectas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 */
router.post("/login",   validate(loginSchema),   AdminController.login);
router.post("/refresh", validate(refreshSchema), AdminController.refresh);
router.post("/logout",  validate(logoutSchema),  AdminController.logout);

// Públicas — recuperación de contraseña (sin token)

/**
 * @swagger
 * /administradores/forgot-password:
 *   post:
 *     operationId: solicitarRecuperacionAdmin
 *     tags: ['Auth']
 *     summary: Solicitar código de recuperación de contraseña
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@espinabifida.org
 *     responses:
 *       200:
 *         description: Código de recuperación enviado al correo registrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Código de recuperación enviado
 *       400:
 *         description: Email inválido o faltante
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error400'
 *       404:
 *         description: No existe administrador con ese email
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error404'
 *       429:
 *         description: Demasiadas solicitudes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error429'
 */
router.post("/forgot-password",        validate(recuperarPasswordSchema), AdminController.solicitarRecuperacion);

/**
 * @swagger
 * /administradores/forgot-password/reset:
 *   patch:
 *     operationId: resetPasswordAdmin
 *     tags: ['Auth']
 *     summary: Restablecer contraseña mediante código OTP
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, codigo, nuevaPassword]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@espinabifida.org
 *               codigo:
 *                 type: string
 *                 example: "483920"
 *               nuevaPassword:
 *                 type: string
 *                 format: password
 *                 example: "NuevaP@ss123!"
 *     responses:
 *       200:
 *         description: Contraseña restablecida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Contraseña restablecida correctamente
 *       400:
 *         description: Datos inválidos, código incorrecto o expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error400'
 *       401:
 *         description: Código OTP inválido o expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       429:
 *         description: Demasiadas solicitudes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error429'
 */
router.patch("/forgot-password/reset", validate(resetPasswordSchema),     AdminController.resetPasswordPublico);

// Protegidas — requieren token válido

/**
 * @swagger
 * /administradores:
 *   get:
 *     operationId: getAdmins
 *     tags: ['Administradores']
 *     summary: Obtener lista de todos los administradores
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
 *     responses:
 *       200:
 *         description: Lista de administradores
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Administrador'
 *                 message:
 *                   type: string
 *                   example: OK
 *       401:
 *         description: Token ausente o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       403:
 *         description: Sin permisos suficientes (se requiere rol 1)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error403'
 */
router.get("/", verifyToken, checkRole(1), AdminController.getAll);

/**
 * @swagger
 * /administradores/{idAdmin}/foto-perfil:
 *   post:
 *     operationId: uploadFotoPerfilAdmin
 *     tags: ['Administradores']
 *     summary: Subir o actualizar foto de perfil de un administrador
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idAdmin
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del administrador
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/FileUploadSchema'
 *     responses:
 *       200:
 *         description: Foto de perfil actualizada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Foto de perfil actualizada
 *                 data:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                       example: https://storage.example.com/adm-1/foto.jpg
 *       400:
 *         description: Archivo inválido o no proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error400'
 *       401:
 *         description: Token ausente o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       403:
 *         description: Sin permisos — solo el propio admin o superadmin puede subir foto
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error403'
 */
router.post(
  "/:idAdmin/foto-perfil",
  verifyToken,
  adminSelfOrSuper,
  (req, _res, next) => {
    req._profileFilePrefix = `adm-${req.params.idAdmin}`;
    next();
  },
  uploadProfilePhoto.single("foto"),
  AdminController.uploadFotoPerfil
);

/**
 * @swagger
 * /administradores/{idAdmin}:
 *   get:
 *     operationId: getAdminById
 *     tags: ['Administradores']
 *     summary: Obtener un administrador por ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idAdmin
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del administrador
 *     responses:
 *       200:
 *         description: Datos del administrador
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Administrador'
 *                 message:
 *                   type: string
 *                   example: OK
 *       401:
 *         description: Token ausente o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       404:
 *         description: Administrador no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error404'
 */
router.get("/:idAdmin",             verifyToken,                  AdminController.getById);

/**
 * @swagger
 * /administradores:
 *   post:
 *     operationId: createAdmin
 *     tags: ['Administradores']
 *     summary: Crear un nuevo administrador
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, idRol]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: nuevo@espinabifida.org
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "P@ssw0rd!"
 *               idRol:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       201:
 *         description: Administrador creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Administrador'
 *                 message:
 *                   type: string
 *                   example: Administrador creado
 *       400:
 *         description: Datos inválidos o faltantes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error400'
 *       401:
 *         description: Token ausente o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       403:
 *         description: Sin permisos suficientes (se requiere rol 1)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error403'
 *       409:
 *         description: Ya existe un administrador con ese email
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error409'
 */
router.post("/",                    verifyToken, checkRole(1),    validate(crearAdminSchema), AdminController.create);

/**
 * @swagger
 * /administradores/{idAdmin}:
 *   put:
 *     operationId: updateAdmin
 *     tags: ['Administradores']
 *     summary: Actualizar datos de un administrador
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idAdmin
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del administrador
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: actualizado@espinabifida.org
 *               idRol:
 *                 type: integer
 *                 example: 2
 *               activo:
 *                 type: integer
 *                 enum: [0, 1]
 *                 example: 1
 *     responses:
 *       200:
 *         description: Administrador actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Administrador'
 *                 message:
 *                   type: string
 *                   example: Administrador actualizado
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error400'
 *       401:
 *         description: Token ausente o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       403:
 *         description: Sin permisos suficientes (se requiere rol 1)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error403'
 *       404:
 *         description: Administrador no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error404'
 */
router.put("/:idAdmin",             verifyToken, checkRole(1),    validate(actualizarAdminSchema), AdminController.update);

/**
 * @swagger
 * /administradores/{idAdmin}/password:
 *   patch:
 *     operationId: changePasswordAdmin
 *     tags: ['Administradores']
 *     summary: Cambiar contraseña de un administrador (autenticado)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idAdmin
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del administrador
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [passwordActual, nuevaPassword]
 *             properties:
 *               passwordActual:
 *                 type: string
 *                 format: password
 *                 example: "P@ssw0rdActual!"
 *               nuevaPassword:
 *                 type: string
 *                 format: password
 *                 example: "NuevaP@ss123!"
 *     responses:
 *       200:
 *         description: Contraseña actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Contraseña actualizada correctamente
 *       400:
 *         description: Datos inválidos o contraseña actual incorrecta
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error400'
 *       401:
 *         description: Token ausente o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       404:
 *         description: Administrador no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error404'
 */
router.patch("/:idAdmin/password",        verifyToken,                  validate(cambiarPasswordSchema), AdminController.changePassword);

/**
 * @swagger
 * /administradores/{idAdmin}/solicitar-codigo:
 *   post:
 *     operationId: solicitarCodigoAdmin
 *     tags: ['Administradores']
 *     summary: Solicitar código OTP para verificación de teléfono
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idAdmin
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del administrador
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Cuerpo vacío o sin campos requeridos
 *     responses:
 *       200:
 *         description: Código OTP enviado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Código OTP enviado al teléfono registrado
 *       401:
 *         description: Token ausente o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       404:
 *         description: Administrador no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error404'
 *       429:
 *         description: Demasiadas solicitudes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error429'
 */
router.post("/:idAdmin/solicitar-codigo", verifyToken,                  AdminController.solicitarCodigo);

/**
 * @swagger
 * /administradores/{idAdmin}/telefono:
 *   patch:
 *     operationId: updateTelefonoAdmin
 *     tags: ['Administradores']
 *     summary: Actualizar número de teléfono de un administrador
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idAdmin
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del administrador
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [telefono]
 *             properties:
 *               telefono:
 *                 type: string
 *                 example: "+525512345678"
 *     responses:
 *       200:
 *         description: Teléfono actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Teléfono actualizado correctamente
 *       400:
 *         description: Número de teléfono inválido o faltante
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error400'
 *       401:
 *         description: Token ausente o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       403:
 *         description: Sin permisos — solo el propio admin o superadmin puede actualizar el teléfono
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error403'
 *       404:
 *         description: Administrador no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error404'
 */
router.patch("/:idAdmin/telefono",        verifyToken, adminSelfOrSuper, validate(actualizarTelefonoSchema), AdminController.updateTelefono);

/**
 * @swagger
 * /administradores/{idAdmin}:
 *   delete:
 *     operationId: deactivateAdmin
 *     tags: ['Administradores']
 *     summary: Desactivar un administrador (baja lógica, no eliminación física)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idAdmin
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del administrador a desactivar
 *     responses:
 *       200:
 *         description: Administrador desactivado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Administrador desactivado correctamente
 *       401:
 *         description: Token ausente o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       403:
 *         description: Sin permisos suficientes (se requiere rol 1)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error403'
 *       404:
 *         description: Administrador no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error404'
 */
router.delete("/:idAdmin",               verifyToken, checkRole(1),    AdminController.deactivate);

export default router;
