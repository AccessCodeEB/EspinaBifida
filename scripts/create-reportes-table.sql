-- Tabla de reportes generados (on-demand y automáticos)
-- Ejecutar en Oracle antes de arrancar el módulo de reportes.
-- La migración JS equivalente es: src/migrations/002_reportes_generados.js

CREATE TABLE REPORTES_GENERADOS (
  ID_REPORTE    NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  TIPO          VARCHAR2(20) NOT NULL,   -- 'MANUAL', 'MENSUAL', 'SEMESTRAL', 'ANUAL'
  FECHA_INICIO  DATE NOT NULL,
  FECHA_FIN     DATE NOT NULL,
  FECHA_GEN     TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  RUTA_PDF      VARCHAR2(500),
  RUTA_XLSX     VARCHAR2(500),
  GENERADO_POR  NUMBER REFERENCES ADMINISTRADORES(ID_ADMIN)
);

CREATE INDEX IDX_REPORTES_FECHA ON REPORTES_GENERADOS (FECHA_GEN);

-- Índice en FK child para NOT IN subquery en getDetalleServicios
-- Oracle no crea índices automáticamente en columnas FK
CREATE INDEX IDX_SA_SERVICIO ON SERVICIO_ARTICULOS (ID_SERVICIO);
