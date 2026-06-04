import { withConnection } from "../config/db.js";
import { notFound } from "../utils/httpErrors.js";

// ── Queries de detección (usadas por el job) ──────────────────────────────────

export const findArticulosConStockBajo = () =>
  withConnection(async conn => {
    try {
      return (await conn.execute(
        `SELECT ID_ARTICULO, DESCRIPCION, INVENTARIO_ACTUAL, STOCK_MINIMO
         FROM ARTICULOS
         WHERE MANEJA_INVENTARIO = 'S'
           AND NVL(ACTIVO, 'S') = 'S'
           AND STOCK_MINIMO > 0
           AND INVENTARIO_ACTUAL > 0
           AND INVENTARIO_ACTUAL <= STOCK_MINIMO`
      )).rows;
    } catch (err) {
      if (err?.errorNum !== 904 && !/ORA-00904/i.test(String(err?.message ?? ""))) throw err;
      return (await conn.execute(
        `SELECT ID_ARTICULO, DESCRIPCION, INVENTARIO_ACTUAL, STOCK_MINIMO
         FROM ARTICULOS
         WHERE MANEJA_INVENTARIO = 'S'
           AND STOCK_MINIMO > 0
           AND INVENTARIO_ACTUAL > 0
           AND INVENTARIO_ACTUAL <= STOCK_MINIMO`
      )).rows;
    }
  });

export const findCitasHoyProgramadas = () =>
  withConnection(conn =>
    conn.execute(
      `SELECT c.ID_CITA, c.ESPECIALISTA,
              b.NOMBRES || ' ' || b.APELLIDO_PATERNO AS NOMBRE,
              TO_CHAR(c.FECHA, 'HH24:MI') AS HORA
       FROM CITAS c
       JOIN BENEFICIARIOS b ON b.CURP = c.CURP
       WHERE TRUNC(c.FECHA) = TRUNC(SYSDATE)
         AND c.ESTATUS = 'PROGRAMADA'
       ORDER BY c.FECHA`
    ).then(r => r.rows)
  );

export const syncCitasHoyConsolidado = (mensaje) =>
  withConnection(async conn => {
    await conn.execute(
      `UPDATE NOTIFICACIONES SET ESTATUS = 'LEIDA', FECHA_LECTURA = SYSDATE
       WHERE TIPO = 'CITA_HOY' AND ESTATUS = 'PENDIENTE'`
    );
    if (mensaje) {
      await conn.execute(
        `INSERT INTO NOTIFICACIONES (TIPO, REFERENCIA_TIPO, MENSAJE)
         VALUES ('CITA_HOY', 'CITA', :msg)`,
        { msg: mensaje }
      );
    }
    await conn.commit();
  });

export const findMembresiasProximas = () =>
  withConnection(conn =>
    conn.execute(
      `SELECT c.CURP,
              b.NOMBRES || ' ' || b.APELLIDO_PATERNO AS NOMBRE,
              c.FECHA_VIGENCIA_FIN,
              TRUNC(c.FECHA_VIGENCIA_FIN) - TRUNC(SYSDATE) AS DIAS_RESTANTES
       FROM CREDENCIALES c
       JOIN BENEFICIARIOS b ON b.CURP = c.CURP
       WHERE c.ID_CREDENCIAL = (
         SELECT MAX(c2.ID_CREDENCIAL) FROM CREDENCIALES c2 WHERE c2.CURP = c.CURP
       )
         AND TRUNC(c.FECHA_VIGENCIA_FIN) - TRUNC(SYSDATE) BETWEEN 0 AND 15
         AND TRUNC(c.FECHA_VIGENCIA_FIN) >= TRUNC(SYSDATE)`
    ).then(r => r.rows)
  );

export const findMembresiasVencidas = () =>
  withConnection(conn =>
    conn.execute(
      `SELECT c.CURP,
              b.NOMBRES || ' ' || b.APELLIDO_PATERNO AS NOMBRE,
              c.FECHA_VIGENCIA_FIN
       FROM CREDENCIALES c
       JOIN BENEFICIARIOS b ON b.CURP = c.CURP
       WHERE c.ID_CREDENCIAL = (
         SELECT MAX(c2.ID_CREDENCIAL) FROM CREDENCIALES c2 WHERE c2.CURP = c.CURP
       )
         AND TRUNC(c.FECHA_VIGENCIA_FIN) < TRUNC(SYSDATE)`
    ).then(r => r.rows)
  );

export const findAll = (limit = 100) =>
  withConnection(conn =>
    conn.execute(
      `SELECT ID_NOTIFICACION, TIPO, ESTATUS, REFERENCIA_ID, REFERENCIA_TIPO,
              CURP, MENSAJE, FECHA_CREACION, FECHA_LECTURA
       FROM NOTIFICACIONES
       ORDER BY FECHA_CREACION DESC
       FETCH FIRST :limit ROWS ONLY`,
      { limit }
    ).then(r => r.rows)
  );

export const findPendientes = () =>
  withConnection(conn =>
    conn.execute(
      `SELECT ID_NOTIFICACION, TIPO, ESTATUS, REFERENCIA_ID, REFERENCIA_TIPO,
              CURP, MENSAJE, FECHA_CREACION, FECHA_LECTURA
       FROM NOTIFICACIONES
       WHERE ESTATUS = 'PENDIENTE'
       ORDER BY FECHA_CREACION DESC`
    ).then(r => r.rows)
  );

export const countPendientes = () =>
  withConnection(conn =>
    conn.execute(
      `SELECT COUNT(*) AS TOTAL FROM NOTIFICACIONES WHERE ESTATUS = 'PENDIENTE'`
    ).then(r => Number(r.rows[0].TOTAL))
  );

export const markAsRead = (id) =>
  withConnection(async conn => {
    const { rows } = await conn.execute(
      `SELECT ID_NOTIFICACION FROM NOTIFICACIONES WHERE ID_NOTIFICACION = :id`,
      { id }
    );
    if (!rows.length) throw notFound("Notificación no encontrada", "NOTIFICACION_NOT_FOUND");

    await conn.execute(
      `UPDATE NOTIFICACIONES
       SET ESTATUS = 'LEIDA', FECHA_LECTURA = SYSDATE
       WHERE ID_NOTIFICACION = :id`,
      { id }
    );
    await conn.commit();
  });

export const markAllAsRead = () =>
  withConnection(async conn => {
    await conn.execute(
      `UPDATE NOTIFICACIONES SET ESTATUS = 'LEIDA', FECHA_LECTURA = SYSDATE
       WHERE ESTATUS = 'PENDIENTE'`
    );
    await conn.commit();
  });

/**
 * Sincroniza la notificación consolidada de stock bajo.
 * Marca todas las STOCK_BAJO PENDIENTE como leídas (incluye las antiguas por artículo),
 * luego inserta una sola notificación consolidada si se provee mensaje.
 * Pasar mensaje=null solo limpia las existentes (cuando no hay artículos con stock bajo).
 */
export const syncStockBajoConsolidado = (mensaje) =>
  withConnection(async conn => {
    // ¿Ya existe una notificación PENDIENTE de stock bajo?
    const { rows } = await conn.execute(
      `SELECT ID_NOTIFICACION FROM NOTIFICACIONES
       WHERE TIPO = 'STOCK_BAJO' AND ESTATUS = 'PENDIENTE'
       FETCH FIRST 1 ROWS ONLY`
    );

    if (rows.length > 0) {
      if (mensaje) {
        // Actualiza la existente en lugar de crear un duplicado
        await conn.execute(
          `UPDATE NOTIFICACIONES
           SET MENSAJE = :msg, FECHA_CREACION = SYSDATE
           WHERE ID_NOTIFICACION = :id`,
          { msg: mensaje, id: rows[0].ID_NOTIFICACION }
        );
      } else {
        // Ya no hay stock bajo: cierra la notificación
        await conn.execute(
          `UPDATE NOTIFICACIONES SET ESTATUS = 'LEIDA', FECHA_LECTURA = SYSDATE
           WHERE TIPO = 'STOCK_BAJO' AND ESTATUS = 'PENDIENTE'`
        );
      }
    } else if (mensaje) {
      await conn.execute(
        `INSERT INTO NOTIFICACIONES (TIPO, REFERENCIA_TIPO, MENSAJE)
         VALUES ('STOCK_BAJO', 'ARTICULO', :msg)`,
        { msg: mensaje }
      );
    }
    await conn.commit();
  });

export const findArticulosSinStock = () =>
  withConnection(async conn => {
    try {
      return (await conn.execute(
        `SELECT ID_ARTICULO, DESCRIPCION, INVENTARIO_ACTUAL, STOCK_MINIMO
         FROM ARTICULOS
         WHERE MANEJA_INVENTARIO = 'S'
           AND NVL(ACTIVO, 'S') = 'S'
           AND INVENTARIO_ACTUAL = 0`
      )).rows;
    } catch (err) {
      if (err?.errorNum !== 904 && !/ORA-00904/i.test(String(err?.message ?? ""))) throw err;
      return (await conn.execute(
        `SELECT ID_ARTICULO, DESCRIPCION, INVENTARIO_ACTUAL, STOCK_MINIMO
         FROM ARTICULOS
         WHERE MANEJA_INVENTARIO = 'S'
           AND INVENTARIO_ACTUAL = 0`
      )).rows;
    }
  });

export const syncSinStockConsolidado = (mensaje) =>
  withConnection(async conn => {
    const { rows } = await conn.execute(
      `SELECT ID_NOTIFICACION FROM NOTIFICACIONES
       WHERE TIPO = 'SIN_STOCK' AND ESTATUS = 'PENDIENTE'
       FETCH FIRST 1 ROWS ONLY`
    );
    if (rows.length > 0) {
      if (mensaje) {
        await conn.execute(
          `UPDATE NOTIFICACIONES
           SET MENSAJE = :msg, FECHA_CREACION = SYSDATE
           WHERE ID_NOTIFICACION = :id`,
          { msg: mensaje, id: rows[0].ID_NOTIFICACION }
        );
      } else {
        await conn.execute(
          `UPDATE NOTIFICACIONES SET ESTATUS = 'LEIDA', FECHA_LECTURA = SYSDATE
           WHERE TIPO = 'SIN_STOCK' AND ESTATUS = 'PENDIENTE'`
        );
      }
    } else if (mensaje) {
      await conn.execute(
        `INSERT INTO NOTIFICACIONES (TIPO, REFERENCIA_TIPO, MENSAJE)
         VALUES ('SIN_STOCK', 'ARTICULO', :msg)`,
        { msg: mensaje }
      );
    }
    await conn.commit();
  });

export const insertReporteGenerado = (tipo, fechaInicio, fechaFin) =>
  withConnection(async conn => {
    let label;
    if (tipo === 'MENSUAL') label = 'mensual';
    else if (tipo === 'SEMESTRAL') label = 'semestral';
    else label = 'anual';
    const msg = `Reporte ${label} generado automáticamente (${fechaInicio} – ${fechaFin}).`;
    await conn.execute(
      `INSERT INTO NOTIFICACIONES (TIPO, REFERENCIA_TIPO, MENSAJE)
       VALUES ('REPORTE_GENERADO', 'REPORTE', :msg)`,
      { msg }
    );
    await conn.commit();
  });

export const insertBeneficiarioBaja = (curp, nombre) =>
  withConnection(async conn => {
    const msg = `Beneficiario ${nombre} (CURP: ${curp}) fue dado de baja del sistema.`;
    await conn.execute(
      `INSERT INTO NOTIFICACIONES (TIPO, CURP, REFERENCIA_TIPO, MENSAJE)
       VALUES ('BENEFICIARIO_BAJA', :curp, 'BENEFICIARIO', :msg)`,
      { curp, msg }
    );
    await conn.commit();
  });

export const insertPreregistroNuevo = (curp, nombre) =>
  withConnection(async conn => {
    const msg = `Nuevo pre-registro de ${nombre} (CURP: ${curp}). Pendiente de revisión.`;
    await conn.execute(
      `INSERT INTO NOTIFICACIONES (TIPO, CURP, REFERENCIA_TIPO, MENSAJE)
       VALUES ('PREREGISTRO_NUEVO', :curp, 'BENEFICIARIO', :msg)`,
      { curp, msg }
    );
    await conn.commit();
  });

export const findComodatosPorVencer = () =>
  withConnection(conn =>
    conn.execute(
      `SELECT c.ID_COMODATO,
              c.CURP,
              b.NOMBRES || ' ' || b.APELLIDO_PATERNO AS NOMBRE,
              c.FECHA_DEVOLUCION_ESPERADA,
              TRUNC(c.FECHA_DEVOLUCION_ESPERADA) - TRUNC(SYSDATE) AS DIAS_RESTANTES,
              a.DESCRIPCION AS ARTICULO
       FROM COMODATOS c
       JOIN BENEFICIARIOS b ON b.CURP = c.CURP
       JOIN ARTICULOS a ON a.ID_ARTICULO = c.ID_ARTICULO
       WHERE c.ESTATUS = 'Activo'
         AND c.FECHA_DEVOLUCION_ESPERADA IS NOT NULL
         AND TRUNC(c.FECHA_DEVOLUCION_ESPERADA) <= TRUNC(SYSDATE) + 5
       ORDER BY c.FECHA_DEVOLUCION_ESPERADA`
    ).then(r => r.rows)
  );

export const syncComodatosPorVencer = (mensaje) =>
  withConnection(async conn => {
    const { rows } = await conn.execute(
      `SELECT ID_NOTIFICACION FROM NOTIFICACIONES
       WHERE TIPO = 'COMODATO_POR_VENCER' AND ESTATUS = 'PENDIENTE'
       FETCH FIRST 1 ROWS ONLY`
    );
    if (rows.length > 0) {
      if (mensaje) {
        await conn.execute(
          `UPDATE NOTIFICACIONES
           SET MENSAJE = :msg, FECHA_CREACION = SYSDATE
           WHERE ID_NOTIFICACION = :id`,
          { msg: mensaje, id: rows[0].ID_NOTIFICACION }
        );
      } else {
        await conn.execute(
          `UPDATE NOTIFICACIONES SET ESTATUS = 'LEIDA', FECHA_LECTURA = SYSDATE
           WHERE TIPO = 'COMODATO_POR_VENCER' AND ESTATUS = 'PENDIENTE'`
        );
      }
    } else if (mensaje) {
      await conn.execute(
        `INSERT INTO NOTIFICACIONES (TIPO, REFERENCIA_TIPO, MENSAJE)
         VALUES ('COMODATO_POR_VENCER', 'COMODATO', :msg)`,
        { msg: mensaje }
      );
    }
    await conn.commit();
  });

export const deleteE2ENotificaciones = () =>
  withConnection(async conn => {
    await conn.execute(
      `DELETE FROM NOTIFICACIONES
       WHERE CURP LIKE 'PLAW%'
          OR CURP LIKE 'UAFT%'
          OR UPPER(MENSAJE) LIKE '%PLAW%'
          OR UPPER(MENSAJE) LIKE '%UAFT%'`
    );
    await conn.commit();
  });

export const upsertMembresia = (curp, tipo, mensaje) =>
  withConnection(async conn => {
    const { rows } = await conn.execute(
      `SELECT COUNT(*) AS CNT FROM NOTIFICACIONES
       WHERE TIPO = :tipo AND CURP = :curp AND ESTATUS = 'PENDIENTE'`,
      { tipo, curp }
    );
    if (Number(rows[0].CNT) > 0) return;

    await conn.execute(
      `INSERT INTO NOTIFICACIONES (TIPO, CURP, REFERENCIA_TIPO, MENSAJE)
       VALUES (:tipo, :curp, 'CREDENCIAL', :msg)`,
      { tipo, curp, msg: mensaje }
    );
    await conn.commit();
  });

export const deleteOrphanedNotificaciones = () =>
  withConnection(async conn => {
    const result = await conn.execute(
      `DELETE FROM NOTIFICACIONES
       WHERE CURP IS NOT NULL
         AND CURP NOT IN (SELECT CURP FROM BENEFICIARIOS)`,
      {}, { autoCommit: true }
    );
    return result.rowsAffected ?? 0;
  });
