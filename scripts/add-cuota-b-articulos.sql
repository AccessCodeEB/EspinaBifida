-- Agrega CUOTA_B a ARTICULOS para artículos con doble precio.
-- CUOTA_RECUPERACION existente = precio cuota A (sin renombrar).
-- CUOTA_B = precio cuota B (beneficiarios con mayor capacidad económica).
-- Si CUOTA_B es NULL, el sistema usa CUOTA_RECUPERACION como fallback.
ALTER TABLE ARTICULOS
  ADD (CUOTA_B NUMBER(10,2));

-- Rollback:
-- ALTER TABLE ARTICULOS DROP COLUMN CUOTA_B;
