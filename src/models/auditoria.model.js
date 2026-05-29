import { getConnection } from "../config/db.js";

/**
 * Registra una operación sensible en AUDITORIA_OPERACIONES.
 * Fire-and-forget — el caller debe envolver en .catch(() => {}) para no bloquear la respuesta.
 *
 * @param {number} idAdmin    - ID del administrador que ejecutó la acción
 * @param {string} operacion  - Clave de la operación (ej. 'BAJA_LOGICA', 'ELIMINACION_PERMANENTE')
 * @param {string} [entidad]  - Tipo de entidad afectada (ej. 'BENEFICIARIO', 'ADMINISTRADOR')
 * @param {string|number} [entidadId] - Identificador de la entidad (CURP, ID_ADMIN, etc.)
 * @param {object} [detalle]  - Datos extra serializados como JSON (ej. { estatus: 'Baja' })
 */
export async function registrar(idAdmin, operacion, entidad = null, entidadId = null, detalle = null) {
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `INSERT INTO AUDITORIA_OPERACIONES (ID_ADMIN, OPERACION, ENTIDAD, ENTIDAD_ID, DETALLE)
       VALUES (:idAdmin, :operacion, :entidad, :entidadId, :detalle)`,
      {
        idAdmin,
        operacion,
        entidad,
        entidadId: entidadId == null ? null : String(entidadId),
        detalle:   detalle   == null ? null : JSON.stringify(detalle),
      }
    );
    await conn.commit();
  } finally {
    if (conn) await conn.close().catch(() => {});
  }
}
