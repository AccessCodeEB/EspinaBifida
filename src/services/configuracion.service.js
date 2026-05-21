import { withConnection } from "../config/db.js";

/**
 * Retorna todos los pares CLAVE/VALOR de CONFIGURACION como un objeto plano.
 */
export async function getConfiguracion() {
  return withConnection(async (conn) => {
    const { rows } = await conn.execute(
      `SELECT CLAVE, VALOR FROM CONFIGURACION ORDER BY CLAVE`
    );
    const config = {};
    rows.forEach((r) => { config[r.CLAVE] = r.VALOR; });
    return config;
  });
}

/**
 * Retorna los datos bancarios necesarios para transferencias.
 */
export async function getCuentasBancarias() {
  return withConnection(async (conn) => {
    const { rows } = await conn.execute(
      `SELECT CLAVE, VALOR FROM CONFIGURACION
       WHERE CLAVE IN ('BANCO_NOMBRE','BANCO_NUMERO_CUENTA','BANCO_CLABE')`
    );
    const data = {};
    rows.forEach((r) => { data[r.CLAVE] = r.VALOR; });
    return {
      banco:        data.BANCO_NOMBRE        ?? null,
      numeroCuenta: data.BANCO_NUMERO_CUENTA ?? null,
      clabe:        data.BANCO_CLABE         ?? null,
    };
  });
}

/**
 * Calcula el resumen financiero de membresías para un mes dado y el mes anterior.
 * Ambas queries se lanzan en paralelo con Promise.all sobre la misma conexión.
 * @param {string} mes - Formato "YYYY-MM"
 */
export async function getResumenFinanciero(mes) {
  const [y, m] = mes.split("-").map(Number);
  const mesAnteriorStr = m === 1
    ? `${y - 1}-12`
    : `${y}-${String(m - 1).padStart(2, "0")}`;

  const SQL = `SELECT
     NVL(SUM(MONTO), 0)                                                                     AS TOTAL,
     NVL(SUM(CASE WHEN METODO_PAGO='efectivo'      THEN MONTO ELSE 0 END), 0)               AS EFECTIVO,
     NVL(SUM(CASE WHEN METODO_PAGO='transferencia' THEN MONTO ELSE 0 END), 0)               AS TRANSFERENCIA,
     NVL(SUM(CASE WHEN METODO_PAGO='tarjeta'       THEN MONTO ELSE 0 END), 0)               AS TARJETA,
     COUNT(*)                                                                                 AS CANTIDAD
   FROM CREDENCIALES
   WHERE TO_CHAR(NVL(FECHA_ULTIMO_PAGO, FECHA_EMISION), 'YYYY-MM') = :mes
     AND MONTO IS NOT NULL`;

  return withConnection(async (conn) => {
    const query = (mesStr) => conn.execute(SQL, { mes: mesStr });

    const [resActual, resAnterior] = await Promise.all([
      query(mes),
      query(mesAnteriorStr),
    ]);

    const actual   = resActual.rows[0];
    const anterior = resAnterior.rows[0];

    const totalActual   = Number(actual?.TOTAL   ?? 0);
    const totalAnterior = Number(anterior?.TOTAL ?? 0);
    const diff = totalAnterior > 0
      ? ((totalActual - totalAnterior) / totalAnterior) * 100
      : 0;

    return {
      mes,
      mesAnterior:      mesAnteriorStr,
      totalActual,
      totalAnterior,
      porcentajeCambio: parseFloat(diff.toFixed(1)),
      cantidadPagos:    Number(actual?.CANTIDAD ?? 0),
      desglosePorMetodo: {
        efectivo:      Number(actual?.EFECTIVO      ?? 0),
        transferencia: Number(actual?.TRANSFERENCIA ?? 0),
        tarjeta:       Number(actual?.TARJETA       ?? 0),
      },
    };
  });
}
