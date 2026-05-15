import { Router } from "express";
import { getConnection } from "../config/db.js";

const router = Router();

/** GET /especialistas — lista activa de especialistas (público) */
router.get("/", async (req, res, next) => {
  const conn = await getConnection();
  try {
    const { rows } = await conn.execute(
      `SELECT ID_ESPECIALISTA, NOMBRE, ESPECIALIDAD
       FROM ESPECIALISTAS
       WHERE ACTIVO = 1
       ORDER BY NOMBRE`
    );
    res.json(rows.map((r) => ({
      id:           r.ID_ESPECIALISTA,
      nombre:       r.NOMBRE,
      especialidad: r.ESPECIALIDAD ?? null,
      label:        r.ESPECIALIDAD ? `${r.NOMBRE} - ${r.ESPECIALIDAD}` : r.NOMBRE,
    })));
  } catch (err) {
    next(err);
  } finally {
    await conn.close();
  }
});

export default router;
