import { withConnection } from "../config/db.js";

/**
 * Retorna todos los tipos de servicio del catálogo con sus montos sugeridos.
 */
export async function getServiciosCatalogo() {
  return withConnection(async (conn) => {
    const { rows } = await conn.execute(
      `SELECT ID_TIPO_SERVICIO, NOMBRE, DESCRIPCION, MONTO_SUGERIDO,
              NVL(TIPO_SERVICIO, 'SERVICIO') AS TIPO_SERVICIO
       FROM SERVICIOS_CATALOGO
       ORDER BY ID_TIPO_SERVICIO`
    );
    return rows.map((r) => ({
      idTipoServicio: r.ID_TIPO_SERVICIO,
      nombre:         r.NOMBRE,
      descripcion:    r.DESCRIPCION ?? null,
      montoSugerido:  r.MONTO_SUGERIDO == null ? null : Number(r.MONTO_SUGERIDO),
      tipoServicio:   r.TIPO_SERVICIO ?? "SERVICIO",
    }));
  });
}
