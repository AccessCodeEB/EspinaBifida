import express from "express";
import {
  getCitas,
  getCitaById,
  createCita,
  updateCita,
  deleteCita,
  e2eCleanup,
} from "../controllers/citas.controller.js";
import { validate } from "../middleware/validate.js";
import { crearCitaSchema, actualizarCitaSchema } from "../validators/citas.schema.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// Todas las rutas requieren autenticación (datos médicos sensibles: CURP, especialista, fechas)
router.use(verifyToken);

/**
 * @openapi
 * /citas:
 *   get:
 *     tags:
 *       - Citas
 *     summary: Lista paginada de citas
 *     description: Devuelve todas las citas registradas. Soporta filtros opcionales por CURP, estatus y fecha.
 *     operationId: getCitas
 *     security: []
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Registros por página
 *       - in: query
 *         name: curp
 *         required: false
 *         schema:
 *           type: string
 *         description: Filtrar por CURP del beneficiario
 *       - in: query
 *         name: estatus
 *         required: false
 *         schema:
 *           type: string
 *           enum: [Pendiente, Confirmada, Cancelada]
 *         description: Filtrar por estatus de la cita
 *       - in: query
 *         name: fecha
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *           example: '2024-06-15'
 *         description: Filtrar por fecha (ISO 8601)
 *     responses:
 *       200:
 *         description: Lista paginada de citas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
router.get("/", getCitas);

/**
 * @openapi
 * /citas/{id}:
 *   get:
 *     tags:
 *       - Citas
 *     summary: Obtiene una cita por ID
 *     description: Devuelve los datos completos de una cita específica.
 *     operationId: getCitaById
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la cita
 *     responses:
 *       200:
 *         description: Datos de la cita
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cita'
 *       404:
 *         description: Cita no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error404'
 */
router.get("/:id", getCitaById);

/**
 * @openapi
 * /citas:
 *   post:
 *     tags:
 *       - Citas
 *     summary: Crea una nueva cita
 *     description: Registra una nueva cita para un beneficiario.
 *     operationId: createCita
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - curp
 *               - idTipoServicio
 *               - especialista
 *               - fecha
 *               - estatus
 *             properties:
 *               curp:
 *                 type: string
 *                 description: CURP del beneficiario (FK → BENEFICIARIOS)
 *                 example: GOCL900101HDFNRN09
 *               idTipoServicio:
 *                 type: integer
 *                 description: ID del tipo de servicio (FK → SERVICIOS_CATALOGO)
 *                 example: 2
 *               especialista:
 *                 type: string
 *                 description: Nombre del especialista
 *                 example: Dr. Martínez
 *               fecha:
 *                 type: string
 *                 format: date-time
 *                 description: Fecha y hora de la cita (ISO 8601)
 *                 example: '2024-06-15T10:00:00Z'
 *               estatus:
 *                 type: string
 *                 enum: [Pendiente, Confirmada, Cancelada]
 *                 description: Estatus inicial de la cita
 *                 example: Pendiente
 *     responses:
 *       201:
 *         description: Cita creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cita'
 *       400:
 *         description: Datos de entrada inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error400'
 *       404:
 *         description: Beneficiario o tipo de servicio no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error404'
 */
router.post("/", validate(crearCitaSchema), createCita);

/**
 * @openapi
 * /citas/{id}:
 *   put:
 *     tags:
 *       - Citas
 *     summary: Actualiza una cita completa
 *     description: Reemplaza todos los campos de una cita existente con los valores proporcionados.
 *     operationId: updateCita
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la cita a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - curp
 *               - idTipoServicio
 *               - especialista
 *               - fecha
 *               - estatus
 *             properties:
 *               curp:
 *                 type: string
 *                 description: CURP del beneficiario (FK → BENEFICIARIOS)
 *                 example: GOCL900101HDFNRN09
 *               idTipoServicio:
 *                 type: integer
 *                 description: ID del tipo de servicio (FK → SERVICIOS_CATALOGO)
 *                 example: 2
 *               especialista:
 *                 type: string
 *                 description: Nombre del especialista
 *                 example: Dr. Martínez
 *               fecha:
 *                 type: string
 *                 format: date-time
 *                 description: Fecha y hora de la cita (ISO 8601)
 *                 example: '2024-06-15T10:00:00Z'
 *               estatus:
 *                 type: string
 *                 enum: [Pendiente, Confirmada, Cancelada]
 *                 description: Estatus de la cita
 *                 example: Confirmada
 *     responses:
 *       200:
 *         description: Cita actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cita'
 *       400:
 *         description: Datos de entrada inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error400'
 *       404:
 *         description: Cita no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error404'
 */
router.put("/:id", validate(actualizarCitaSchema), updateCita);

/**
 * @openapi
 * /citas/{id}:
 *   patch:
 *     tags:
 *       - Citas
 *     summary: Actualiza parcialmente una cita (solo estatus)
 *     description: Actualiza únicamente el campo `estatus` de una cita existente.
 *     operationId: patchCita
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la cita a actualizar parcialmente
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
 *                 enum: [Pendiente, Confirmada, Cancelada]
 *                 description: Nuevo estatus de la cita
 *                 example: Cancelada
 *     responses:
 *       200:
 *         description: Estatus de la cita actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cita'
 *       400:
 *         description: Estatus inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error400'
 *       404:
 *         description: Cita no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error404'
 */
router.patch("/:id", validate(actualizarCitaSchema), updateCita); // alias: partial update (e.g. only estatus)

/**
 * @openapi
 * /citas/{id}:
 *   delete:
 *     tags:
 *       - Citas
 *     summary: Elimina una cita
 *     description: Elimina permanentemente una cita del sistema.
 *     operationId: deleteCita
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la cita a eliminar
 *     responses:
 *       200:
 *         description: Cita eliminada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Cita eliminada correctamente
 *       404:
 *         description: Cita no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error404'
 */
router.delete("/e2e-cleanup", e2eCleanup);
router.delete("/:id", deleteCita);

export default router;
