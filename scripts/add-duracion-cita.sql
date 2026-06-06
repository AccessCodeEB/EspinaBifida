-- Migración: agregar columna DURACION_CITA a ESPECIALIDADES_HORARIO
-- Ejecutar UNA SOLA VEZ en producción/staging antes de desplegar la versión con slots
-- Fecha: 2026-06-05

ALTER TABLE ESPECIALIDADES_HORARIO
  ADD DURACION_CITA NUMBER NULL;

-- Valores iniciales para las especialidades existentes (60 min por defecto).
-- Ajustar según la duración real de cada especialidad.
UPDATE ESPECIALIDADES_HORARIO SET DURACION_CITA = 60;

COMMIT;
