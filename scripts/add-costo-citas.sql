-- Agrega columna COSTO a CITAS para registrar el cobro de la consulta.
-- Primera cita del beneficiario: $350 (COSTO_PRIMERA_CITA)
-- Citas subsecuentes:            $300 (COSTO_SUBSECUENTE_CITA)
ALTER TABLE CITAS ADD (COSTO NUMBER(10,2));
