-- =============================================================================
-- EspinaBifida — Stored Procedures
-- Run once against Oracle DB:
--   sqlplus user/pass@connection @scripts/stored-procedures.sql
--
-- PREREQUISITE: scripts/add-stock-resultante-column.sql must run first.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- SP 1: Registrar movimiento de inventario (ENTRADA o SALIDA)
-- Replaces: src/models/inventario.model.js > applyMovimientoConConexion
-- -----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE SP_REGISTRAR_MOVIMIENTO_INVENTARIO(
  p_id_articulo    IN  NUMBER,
  p_tipo           IN  VARCHAR2,   -- 'ENTRADA' o 'SALIDA'
  p_cantidad       IN  NUMBER,
  p_motivo         IN  VARCHAR2,
  p_stock_nuevo    OUT NUMBER
) AS
  v_stock_actual NUMBER;
  v_maneja       CHAR(1);
BEGIN
  IF p_tipo NOT IN ('ENTRADA', 'SALIDA') THEN
    RAISE_APPLICATION_ERROR(-20005, 'TIPO_MOVIMIENTO invalido: ' || p_tipo);
  END IF;

  SELECT INVENTARIO_ACTUAL, MANEJA_INVENTARIO
  INTO v_stock_actual, v_maneja
  FROM ARTICULOS
  WHERE ID_ARTICULO = p_id_articulo
  FOR UPDATE;

  -- Articulos sin trazabilidad: devolver stock sin cambio y salir
  IF v_maneja != 'S' THEN
    p_stock_nuevo := v_stock_actual;
    RETURN;
  END IF;

  IF p_tipo = 'SALIDA' AND v_stock_actual < p_cantidad THEN
    RAISE_APPLICATION_ERROR(-20002, 'Stock insuficiente para SALIDA');
  END IF;

  IF p_tipo = 'ENTRADA' THEN
    p_stock_nuevo := v_stock_actual + p_cantidad;
  ELSE
    p_stock_nuevo := v_stock_actual - p_cantidad;
  END IF;

  UPDATE ARTICULOS SET INVENTARIO_ACTUAL = p_stock_nuevo
  WHERE ID_ARTICULO = p_id_articulo;

  -- TRG_MOV_INV_BI asigna ID_MOVIMIENTO
  INSERT INTO MOVIMIENTOS_INVENTARIO
    (ID_ARTICULO, TIPO_MOVIMIENTO, CANTIDAD, FECHA, MOTIVO, STOCK_RESULTANTE)
  VALUES
    (p_id_articulo, p_tipo, p_cantidad, SYSDATE, p_motivo, p_stock_nuevo);

  -- NO COMMIT: el caller (Node.js) hace conn.commit()
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    RAISE_APPLICATION_ERROR(-20006, 'Articulo no encontrado: ' || p_id_articulo);
  WHEN OTHERS THEN
    RAISE;
END SP_REGISTRAR_MOVIMIENTO_INVENTARIO;
/

-- -----------------------------------------------------------------------------
-- SP 2: Registrar membresia
-- Replaces: src/models/membresias.model.js > create
-- -----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE SP_REGISTRAR_MEMBRESIA(
  p_curp            IN  VARCHAR2,
  p_num_credencial  IN  VARCHAR2,
  p_fecha_inicio    IN  DATE,
  p_fecha_fin       IN  DATE,
  p_fecha_pago      IN  DATE,
  p_fecha_emision   IN  DATE,
  p_observaciones   IN  VARCHAR2,
  p_id_credencial   OUT NUMBER
) AS
  v_estatus VARCHAR2(10);
BEGIN
  SELECT ESTATUS INTO v_estatus
  FROM BENEFICIARIOS
  WHERE CURP = p_curp;

  IF v_estatus = 'Baja' THEN
    RAISE_APPLICATION_ERROR(-20003,
      'Beneficiario en Baja: no puede registrar membresia');
  END IF;

  -- Cancelar membresías previas activas
  UPDATE CREDENCIALES
  SET FECHA_VIGENCIA_FIN = TRUNC(SYSDATE) - 1
  WHERE CURP = p_curp
    AND FECHA_VIGENCIA_FIN >= TRUNC(SYSDATE);

  -- Trigger SEQ_CREDENCIALES asigna ID_CREDENCIAL
  INSERT INTO CREDENCIALES (
    CURP, NUMERO_CREDENCIAL,
    FECHA_VIGENCIA_INICIO, FECHA_VIGENCIA_FIN,
    FECHA_ULTIMO_PAGO, FECHA_EMISION, OBSERVACIONES
  ) VALUES (
    p_curp, p_num_credencial,
    p_fecha_inicio, p_fecha_fin,
    p_fecha_pago, p_fecha_emision, p_observaciones
  )
  RETURNING ID_CREDENCIAL INTO p_id_credencial;

  UPDATE BENEFICIARIOS
  SET ESTATUS = 'Activo'
  WHERE CURP = p_curp AND ESTATUS = 'Inactivo';

  -- NO COMMIT: el caller hace conn.commit()
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    RAISE_APPLICATION_ERROR(-20004, 'Beneficiario no encontrado: ' || p_curp);
  WHEN OTHERS THEN
    RAISE;
END SP_REGISTRAR_MEMBRESIA;
/

-- -----------------------------------------------------------------------------
-- SP 3: Registrar servicio con un articulo consumido
-- Used by: src/models/servicios.model.js > createWithInventarioTransaction (1st item)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE SP_REGISTRAR_SERVICIO(
  p_curp          IN  VARCHAR2,
  p_tipo_servicio IN  NUMBER,
  p_costo         IN  NUMBER,
  p_monto_pagado  IN  NUMBER,
  p_notas         IN  VARCHAR2,
  p_referencia_id IN  NUMBER,
  p_ref_tipo      IN  VARCHAR2,
  p_id_articulo   IN  NUMBER,
  p_cantidad      IN  NUMBER,
  p_id_servicio   OUT NUMBER
) AS
  v_stock_actual   NUMBER;
  v_stock_nuevo    NUMBER;
  v_maneja         CHAR(1);
BEGIN
  -- Trigger SEQ_SERVICIOS asigna ID_SERVICIO
  INSERT INTO SERVICIOS (
    CURP, ID_TIPO_SERVICIO, FECHA, COSTO, MONTO_PAGADO,
    NOTAS, REFERENCIA_ID, REFERENCIA_TIPO
  ) VALUES (
    p_curp, p_tipo_servicio, SYSDATE, p_costo, p_monto_pagado,
    p_notas, p_referencia_id, p_ref_tipo
  )
  RETURNING ID_SERVICIO INTO p_id_servicio;

  IF p_id_articulo IS NOT NULL AND p_cantidad IS NOT NULL THEN
    SELECT INVENTARIO_ACTUAL, MANEJA_INVENTARIO
    INTO v_stock_actual, v_maneja
    FROM ARTICULOS
    WHERE ID_ARTICULO = p_id_articulo
    FOR UPDATE;

    IF v_maneja = 'S' THEN
      IF v_stock_actual < p_cantidad THEN
        RAISE_APPLICATION_ERROR(-20001,
          'Stock insuficiente para articulo ' || p_id_articulo);
      END IF;

      v_stock_nuevo := v_stock_actual - p_cantidad;

      UPDATE ARTICULOS SET INVENTARIO_ACTUAL = v_stock_nuevo
      WHERE ID_ARTICULO = p_id_articulo;

      INSERT INTO SERVICIO_ARTICULOS (ID_SERVICIO, ID_ARTICULO, CANTIDAD)
      VALUES (p_id_servicio, p_id_articulo, p_cantidad);

      INSERT INTO MOVIMIENTOS_INVENTARIO
        (ID_ARTICULO, TIPO_MOVIMIENTO, CANTIDAD, FECHA, MOTIVO, STOCK_RESULTANTE)
      VALUES
        (p_id_articulo, 'SALIDA', p_cantidad, SYSDATE,
         'Servicio ID: ' || p_id_servicio, v_stock_nuevo);
    END IF;
  END IF;
  -- NO COMMIT
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END SP_REGISTRAR_SERVICIO;
/
