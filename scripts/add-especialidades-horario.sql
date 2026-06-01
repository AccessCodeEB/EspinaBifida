-- Migración: tablas de horarios y excepciones de especialidades
-- Ejecutar una sola vez en producción/staging
-- Fecha: 2026-06-01

-- ─────────────────────────────────────────────────────────────────
-- 1. Tabla principal: horario base por especialidad
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE ESPECIALIDADES_HORARIO (
  ID_ESPECIALIDAD   NUMBER          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  NOMBRE            VARCHAR2(100)   NOT NULL,
  DIA_SEMANA        NUMBER(1)       NOT NULL,
  -- 0=Dom 1=Lun 2=Mar 3=Mié 4=Jue 5=Vie 6=Sáb
  HORA_INICIO       VARCHAR2(5)     NOT NULL,   -- 'HH:MM', ej. '09:30'
  HORA_FIN          VARCHAR2(5)     NULL,        -- NULL = sin límite de fin
  CAPACIDAD_MAX     NUMBER          NULL,        -- NULL = sin límite
  TIPO_FRECUENCIA   VARCHAR2(30)    DEFAULT 'SEMANAL' NOT NULL
    CONSTRAINT CHK_ESP_HOR_FRECUENCIA
      CHECK (TIPO_FRECUENCIA IN ('SEMANAL', 'MENSUAL_PRIMER_DIA')),
  ACTIVO            NUMBER(1,0)     DEFAULT 1   NOT NULL
    CONSTRAINT CHK_ESP_HOR_ACTIVO CHECK (ACTIVO IN (0, 1)),
  NOTAS             VARCHAR2(500)   NULL
);

-- ─────────────────────────────────────────────────────────────────
-- 2. Tabla de excepciones: fechas bloqueadas por doctor ausente
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE ESPECIALIDADES_EXCEPCIONES (
  ID_EXCEPCION      NUMBER          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ID_ESPECIALIDAD   NUMBER          NOT NULL
    CONSTRAINT FK_ESP_EXC_ESP REFERENCES ESPECIALIDADES_HORARIO(ID_ESPECIALIDAD),
  FECHA             DATE            NOT NULL,
  MOTIVO            VARCHAR2(500)   NULL,
  CREATED_AT        TIMESTAMP       DEFAULT SYSTIMESTAMP
);

CREATE INDEX IDX_ESP_EXC_ESP_FECHA
  ON ESPECIALIDADES_EXCEPCIONES(ID_ESPECIALIDAD, FECHA);

-- ─────────────────────────────────────────────────────────────────
-- 3. Datos iniciales — las 4 especialidades reales
-- ─────────────────────────────────────────────────────────────────
-- DIA_SEMANA: 3=Miércoles, 4=Jueves, 5=Viernes

INSERT INTO ESPECIALIDADES_HORARIO
  (NOMBRE, DIA_SEMANA, HORA_INICIO, HORA_FIN, CAPACIDAD_MAX, TIPO_FRECUENCIA, NOTAS)
VALUES
  ('Gastroenterología', 4, '10:00', NULL,    2,    'SEMANAL',             'Dr. Lines — Jueves a partir de las 10am');

INSERT INTO ESPECIALIDADES_HORARIO
  (NOMBRE, DIA_SEMANA, HORA_INICIO, HORA_FIN, CAPACIDAD_MAX, TIPO_FRECUENCIA, NOTAS)
VALUES
  ('Urología',          4, '09:30', '12:00',  NULL, 'SEMANAL',             NULL);

INSERT INTO ESPECIALIDADES_HORARIO
  (NOMBRE, DIA_SEMANA, HORA_INICIO, HORA_FIN, CAPACIDAD_MAX, TIPO_FRECUENCIA, NOTAS)
VALUES
  ('Psicología',        5, '10:00', '12:00',  3,    'SEMANAL',             NULL);

INSERT INTO ESPECIALIDADES_HORARIO
  (NOMBRE, DIA_SEMANA, HORA_INICIO, HORA_FIN, CAPACIDAD_MAX, TIPO_FRECUENCIA, NOTAS)
VALUES
  ('Cirugía',           3, '08:00', NULL,     NULL, 'MENSUAL_PRIMER_DIA',  'Dr. Lines — primer miércoles del mes');

COMMIT;
