import { Router } from "express";
import { getConnection } from "../config/db.js";

const router = Router();

/** GET /servicios-catalogo — tipos de servicio con montos sugeridos (público) */
router.get("/", async (req, res, next) => {
  const conn = await getConnection();
  try {
    const { rows } = await conn.execute(
      `SELECT ID_TIPO_SERVICIO, NOMBRE, DESCRIPCION, MONTO_SUGERIDO
       FROM SERVICIOS_CATALOGO
       ORDER BY ID_TIPO_SERVICIO`
    );
    res.json(rows.map((r) => ({
      idTipoServicio: r.ID_TIPO_SERVICIO,
      nombre:         r.NOMBRE,
      descripcion:    r.DESCRIPCION ?? null,
      montoSugerido:  r.MONTO_SUGERIDO != null ? Number(r.MONTO_SUGERIDO) : null,
    })));
  } catch (err) {
    next(err);
  } finally {
    await conn.close();
  }
});

export default router;
