-- Agrega TIPO_CUOTA a BENEFICIARIOS.
-- 'A' = cuota menor (menor capacidad económica)
-- 'B' = cuota mayor (mayor capacidad económica)
-- NULL = sin asignar; bloquea registro de servicios hasta que admin la asigne.
ALTER TABLE BENEFICIARIOS
  ADD (TIPO_CUOTA VARCHAR2(1)
       CONSTRAINT CHK_BENEFICIARIOS_TIPO_CUOTA
       CHECK (TIPO_CUOTA IN ('A', 'B')));

-- NOTA PRE-DEPLOY: todos los beneficiarios existentes quedan con TIPO_CUOTA = NULL.
-- Lupita debe asignar cuota A o B a cada beneficiario activo antes de activar la
-- validación de bloqueo, o las altas de servicios quedarán bloqueadas.

-- Rollback:
-- ALTER TABLE BENEFICIARIOS DROP CONSTRAINT CHK_BENEFICIARIOS_TIPO_CUOTA;
-- ALTER TABLE BENEFICIARIOS DROP COLUMN TIPO_CUOTA;
