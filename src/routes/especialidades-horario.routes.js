import { Router } from "express";
import {
  getEspecialidades,
  getEspecialidadById,
  updateEspecialidad,
  getCitasFuturas,
  getCitasEnFecha,
  getSlotsHandler,
  getExcepciones,
  createExcepcion,
  deleteExcepcion,
} from "../controllers/especialidades-horario.controller.js";
import { verifyToken } from "../middleware/auth.js";

const router = Router();

/**
 * @openapi
 * /especialidades-horario:
 *   get:
 *     tags:
 *       - Especialidades
 *     summary: Lista de especialidades con su horario
 *     description: |
 *       Devuelve las especialidades médicas configuradas con su horario, día de la semana y capacidad.
 *       Por defecto solo devuelve especialidades activas. Usar `?todos=true` para incluir inactivas (útil en el panel admin).
 *     operationId: getEspecialidades
 *     parameters:
 *       - in: query
 *         name: todos
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Incluir especialidades inactivas
 *     responses:
 *       200:
 *         description: Lista de especialidades
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EspecialidadHorario'
 */
router.get("/", getEspecialidades);

/**
 * @openapi
 * /especialidades-horario/{id}:
 *   get:
 *     tags:
 *       - Especialidades
 *     summary: Obtiene una especialidad por ID
 *     operationId: getEspecialidadById
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Datos de la especialidad
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EspecialidadHorario'
 *       404:
 *         $ref: '#/components/schemas/Error404'
 */
router.get("/:id", getEspecialidadById);

/**
 * @openapi
 * /especialidades-horario/{id}:
 *   put:
 *     tags:
 *       - Especialidades
 *     summary: Actualiza el horario de una especialidad
 *     description: |
 *       Actualiza los datos de horario de una especialidad. Si se desactiva una especialidad
 *       que tiene citas futuras pendientes, el sistema responde con HTTP 400 indicando cuántas citas
 *       se verían afectadas.
 *     operationId: updateEspecialidad
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
 *               nombre:
 *                 type: string
 *                 example: Gastroenterología
 *               diaSemana:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 6
 *                 description: 0=Dom … 6=Sáb
 *                 example: 4
 *               horaInicio:
 *                 type: string
 *                 example: '10:00'
 *               horaFin:
 *                 type: string
 *                 nullable: true
 *                 example: '12:00'
 *               capacidad:
 *                 type: integer
 *                 example: 2
 *               frecuencia:
 *                 type: string
 *                 enum: [SEMANAL, MENSUAL_PRIMER_DIA]
 *               activo:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Especialidad actualizada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EspecialidadHorario'
 *       400:
 *         description: No se puede desactivar — tiene citas pendientes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error400'
 *       401:
 *         $ref: '#/components/schemas/Error401'
 *       404:
 *         $ref: '#/components/schemas/Error404'
 */
router.put("/:id", verifyToken, updateEspecialidad);

/**
 * @openapi
 * /especialidades-horario/{id}:
 *   patch:
 *     tags:
 *       - Especialidades
 *     summary: Actualiza parcialmente el horario de una especialidad
 *     description: Equivalente a PUT pero acepta campos parciales.
 *     operationId: patchEspecialidad
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
 *               activo:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Especialidad actualizada
 *       400:
 *         $ref: '#/components/schemas/Error400'
 *       401:
 *         $ref: '#/components/schemas/Error401'
 */
router.patch("/:id", verifyToken, updateEspecialidad);

/**
 * @openapi
 * /especialidades-horario/{id}/citas-futuras:
 *   get:
 *     tags:
 *       - Especialidades
 *     summary: Cuenta citas futuras activas de la especialidad
 *     description: Consulta de impacto — devuelve cuántas citas pendientes/confirmadas existen para esta especialidad. Útil para mostrar un aviso antes de desactivarla.
 *     operationId: getCitasFuturas
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
 *         description: Conteo de citas futuras
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   example: 3
 *       401:
 *         $ref: '#/components/schemas/Error401'
 *       404:
 *         $ref: '#/components/schemas/Error404'
 */
router.get("/:id/citas-futuras", verifyToken, getCitasFuturas);

/**
 * @openapi
 * /especialidades-horario/{id}/citas-en-fecha:
 *   get:
 *     tags:
 *       - Especialidades
 *     summary: Citas agendadas en una fecha específica para la especialidad
 *     description: Devuelve las citas existentes en la fecha indicada. Usado para mostrar aviso antes de bloquear una fecha.
 *     operationId: getCitasEnFecha
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: fecha
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: '2025-06-05'
 *     responses:
 *       200:
 *         description: Citas en esa fecha
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   example: 1
 *       400:
 *         description: Parámetro fecha requerido
 *         $ref: '#/components/schemas/Error400'
 *       401:
 *         $ref: '#/components/schemas/Error401'
 */
router.get("/:id/citas-en-fecha", verifyToken, getCitasEnFecha);

/**
 * @openapi
 * /especialidades-horario/{id}/slots:
 *   get:
 *     tags:
 *       - Especialidades
 *     summary: Slots disponibles para agendar una cita
 *     description: Devuelve los horarios disponibles de la especialidad para una fecha dada, respetando capacidad y excepciones configuradas.
 *     operationId: getSlots
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: fecha
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: '2025-06-12'
 *     responses:
 *       200:
 *         description: Slots disponibles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 slots:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ['10:00', '11:00']
 *       401:
 *         $ref: '#/components/schemas/Error401'
 */
router.get("/:id/slots", verifyToken, getSlotsHandler);

/**
 * @openapi
 * /especialidades-horario/{id}/excepciones:
 *   get:
 *     tags:
 *       - Especialidades
 *     summary: Lista de fechas bloqueadas para una especialidad
 *     operationId: getExcepciones
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
 *         description: Lista de excepciones (fechas bloqueadas)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       ID_EXCEPCION:
 *                         type: integer
 *                       FECHA:
 *                         type: string
 *                         format: date
 *                       MOTIVO:
 *                         type: string
 *                         nullable: true
 *       401:
 *         $ref: '#/components/schemas/Error401'
 */
router.get("/:id/excepciones", verifyToken, getExcepciones);

/**
 * @openapi
 * /especialidades-horario/{id}/excepciones:
 *   post:
 *     tags:
 *       - Especialidades
 *     summary: Bloquea una fecha para una especialidad
 *     description: Agrega una excepción de fecha — ninguna cita podrá agendarse en esa fecha para esta especialidad.
 *     operationId: createExcepcion
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
 *               - fecha
 *             properties:
 *               fecha:
 *                 type: string
 *                 format: date
 *                 example: '2025-07-04'
 *               motivo:
 *                 type: string
 *                 nullable: true
 *                 example: Día feriado
 *     responses:
 *       201:
 *         description: Fecha bloqueada exitosamente
 *       400:
 *         $ref: '#/components/schemas/Error400'
 *       401:
 *         $ref: '#/components/schemas/Error401'
 */
router.post("/:id/excepciones", verifyToken, createExcepcion);

/**
 * @openapi
 * /especialidades-horario/{id}/excepciones/{idExc}:
 *   delete:
 *     tags:
 *       - Especialidades
 *     summary: Elimina una excepción (desbloquea la fecha)
 *     operationId: deleteExcepcion
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la especialidad
 *       - in: path
 *         name: idExc
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la excepción a eliminar
 *     responses:
 *       200:
 *         description: Excepción eliminada
 *       404:
 *         $ref: '#/components/schemas/Error404'
 *       401:
 *         $ref: '#/components/schemas/Error401'
 */
router.delete("/:id/excepciones/:idExc", verifyToken, deleteExcepcion);

export default router;
