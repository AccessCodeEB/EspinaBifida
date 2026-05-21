import { withConnection } from "../config/db.js";

/**
 * Retorna la lista activa de especialistas ordenada por nombre.
 */
export async function getEspecialistas() {
  return withConnection(async (conn) => {
    const { rows } = await conn.execute(
      `SELECT ID_ESPECIALISTA, NOMBRE, ESPECIALIDAD
       FROM ESPECIALISTAS
       WHERE ACTIVO = 1
       ORDER BY NOMBRE`
    );
    return rows.map((r) => ({
      id:           r.ID_ESPECIALISTA,
      nombre:       r.NOMBRE,
      especialidad: r.ESPECIALIDAD ?? null,
      label:        r.ESPECIALIDAD ? `${r.NOMBRE} - ${r.ESPECIALIDAD}` : r.NOMBRE,
    }));
  });
}
