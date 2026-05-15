import { Router } from "express";
import { getConnection } from "../config/db.js";
import { toCamel } from "../utils/dbTransform.js";
import { verifyToken } from "../middleware/auth.js";

const router = Router();

/** GET /configuracion — valores de configuración del sistema (público) */
router.get("/", async (req, res, next) => {
  const conn = await getConnection();
  try {
    const { rows } = await conn.execute(
      `SELECT CLAVE, VALOR FROM CONFIGURACION ORDER BY CLAVE`
    );
    const config = {};
    rows.forEach((r) => { config[r.CLAVE] = r.VALOR; });
    res.json(config);
  } catch (err) {
    next(err);
  } finally {
    await conn.close();
  }
});

/** GET /configuracion/cuentas-bancarias — datos para transferencias (público) */
router.get("/cuentas-bancarias", async (req, res, next) => {
  const conn = await getConnection();
  try {
    const { rows } = await conn.execute(
      `SELECT CLAVE, VALOR FROM CONFIGURACION
       WHERE CLAVE IN ('BANCO_NOMBRE','BANCO_NUMERO_CUENTA','BANCO_CLABE')`
    );
    const data = {};
    rows.forEach((r) => { data[r.CLAVE] = r.VALOR; });
    res.json({
      banco:        data.BANCO_NOMBRE        ?? null,
      numeroCuenta: data.BANCO_NUMERO_CUENTA ?? null,
      clabe:        data.BANCO_CLABE         ?? null,
    });
  } catch (err) {
    next(err);
  } finally {
    await conn.close();
  }
});

/** GET /configuracion/resumen-financiero?mes=YYYY-MM — totales de membresías (requiere auth) */
router.get("/resumen-financiero", verifyToken, async (req, res, next) => {
  const mes       = req.query.mes ?? new Date().toISOString().slice(0, 7); // YYYY-MM
  const [y, m]    = mes.split("-").map(Number);
  const mesAnteriorStr = m === 1
    ? `${y - 1}-12`
    : `${y}-${String(m - 1).padStart(2, "0")}`;

  const conn = await getConnection();
  try {
    const query = (mesStr) => conn.execute(
      `SELECT
         NVL(SUM(MONTO), 0)                                                                     AS TOTAL,
         NVL(SUM(CASE WHEN METODO_PAGO='efectivo'      THEN MONTO ELSE 0 END), 0)               AS EFECTIVO,
         NVL(SUM(CASE WHEN METODO_PAGO='transferencia' THEN MONTO ELSE 0 END), 0)               AS TRANSFERENCIA,
         NVL(SUM(CASE WHEN METODO_PAGO='tarjeta'       THEN MONTO ELSE 0 END), 0)               AS TARJETA,
         COUNT(*)                                                                                 AS CANTIDAD
       FROM CREDENCIALES
       WHERE TO_CHAR(NVL(FECHA_ULTIMO_PAGO, FECHA_EMISION), 'YYYY-MM') = :mes
         AND MONTO IS NOT NULL`,
      { mes: mesStr }
    );

    const [resActual, resAnterior] = await Promise.all([query(mes), query(mesAnteriorStr)]);
    const actual   = resActual.rows[0];
    const anterior = resAnterior.rows[0];

    const totalActual   = Number(actual?.TOTAL   ?? 0);
    const totalAnterior = Number(anterior?.TOTAL ?? 0);
    const diff = totalAnterior > 0
      ? ((totalActual - totalAnterior) / totalAnterior) * 100
      : 0;

    res.json({
      mes,
      mesAnterior:     mesAnteriorStr,
      totalActual,
      totalAnterior,
      porcentajeCambio: parseFloat(diff.toFixed(1)),
      cantidadPagos:   Number(actual?.CANTIDAD ?? 0),
      desglosePorMetodo: {
        efectivo:      Number(actual?.EFECTIVO      ?? 0),
        transferencia: Number(actual?.TRANSFERENCIA ?? 0),
        tarjeta:       Number(actual?.TARJETA       ?? 0),
      },
    });
  } catch (err) {
    next(err);
  } finally {
    await conn.close();
  }
});

export default router;
