# Design Doc — Horarios y Restricciones de Especialidades en Citas

**Fecha:** 2026-06-01  
**Estado:** Borrador  
**Autor:** Leobardo (diseño via /office-hours)

---

## 1. Problema

El módulo de citas actual:
- Tiene 4 doctores falsos hardcodeados (`ESPECIALISTAS` array en `citas.tsx`)
- No refleja las 4 especialidades reales de la asociación
- No valida días permitidos, horarios ni capacidad por especialidad
- No permite a Lupita marcar a un doctor como no disponible en una fecha concreta
- La validación de `validateSlot` solo detecta doble-booking del mismo paciente

---

## 2. Especialidades y Horarios Actuales

| Especialidad | Día | Horario | Capacidad | Frecuencia |
|---|---|---|---|---|
| Gastroenterología | Jueves | 10:00–indefinido | 1–2 pacientes | Semanal |
| Urología | Jueves | 09:30–12:00 | Sin límite definido | Semanal |
| Psicología | Viernes | 10:00–12:00 | Máx. 3 pacientes | Semanal |
| Cirugía | Miércoles | TBD | Sin límite definido | Primer miércoles del mes |

> Cirugía tiene frecuencia **mensual** (primer miércoles de cada mes), no semanal.

---

## 3. Objetivos

1. Reemplazar doctores falsos con las 4 especialidades reales
2. Validar día + horario + capacidad antes de confirmar una cita (**bloqueo duro**)
3. Permitir a Lupita:
   - Ver y editar el horario base de cada especialidad desde la UI
   - Marcar fechas específicas como no disponibles (doctor ausente, feriado, etc.)
4. El sistema decide automáticamente cuándo aplica Cirugía (primer miércoles del mes)

---

## 4. Decisiones de Diseño

| Pregunta | Decisión | Razón |
|---|---|---|
| ¿Dónde guardar horarios? | **Tabla Oracle `ESPECIALIDADES_HORARIO`** | Lupita puede editar sin tocar código |
| ¿Cómo manejar excepciones (doctor ausente)? | **Tabla `ESPECIALIDADES_EXCEPCIONES`** | Fechas puntuales bloqueadas con motivo |
| ¿Qué pasa si viola regla? | **Bloqueo duro** — la cita no se crea | Garantiza integridad de agenda |
| ¿Cómo manejar Cirugía (mensual)? | `TIPO_FRECUENCIA = 'MENSUAL_PRIMER_DIA'` en tabla | Calculado dinámicamente en backend |

---

## 5. Cambios en Base de Datos

### 5.1 Nueva tabla: `ESPECIALIDADES_HORARIO`

```sql
CREATE TABLE ESPECIALIDADES_HORARIO (
  ID_ESPECIALIDAD   NUMBER          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  NOMBRE            VARCHAR2(100)   NOT NULL,
  DIA_SEMANA        NUMBER(1)       NULL,  -- 0=Dom, 1=Lun, ..., 3=Mié, 4=Jue, 5=Vie
  HORA_INICIO       VARCHAR2(5)     NOT NULL,  -- 'HH:MM', ej. '09:30'
  HORA_FIN          VARCHAR2(5)     NULL,      -- NULL = sin límite de fin
  CAPACIDAD_MAX     NUMBER          NULL,      -- NULL = sin límite
  TIPO_FRECUENCIA   VARCHAR2(30)    NOT NULL   -- 'SEMANAL' | 'MENSUAL_PRIMER_DIA'
    CHECK (TIPO_FRECUENCIA IN ('SEMANAL', 'MENSUAL_PRIMER_DIA')),
  ACTIVO            NUMBER(1,0)     DEFAULT 1 NOT NULL
    CHECK (ACTIVO IN (0, 1)),
  NOTAS             VARCHAR2(500)   NULL
);

-- Datos iniciales
INSERT INTO ESPECIALIDADES_HORARIO
  (NOMBRE, DIA_SEMANA, HORA_INICIO, HORA_FIN, CAPACIDAD_MAX, TIPO_FRECUENCIA, NOTAS)
VALUES
  ('Gastroenterología', 4, '10:00', NULL, 2, 'SEMANAL', 'Dr. Lines'),
  ('Urología',          4, '09:30', '12:00', NULL, 'SEMANAL', NULL),
  ('Psicología',        5, '10:00', '12:00', 3, 'SEMANAL', NULL),
  ('Cirugía',           3, '08:00', NULL, NULL, 'MENSUAL_PRIMER_DIA', 'Dr. Lines — solo primer miércoles del mes');
```

> `DIA_SEMANA`: 0=Domingo, 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado

### 5.2 Nueva tabla: `ESPECIALIDADES_EXCEPCIONES`

```sql
CREATE TABLE ESPECIALIDADES_EXCEPCIONES (
  ID_EXCEPCION      NUMBER          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ID_ESPECIALIDAD   NUMBER          NOT NULL
    REFERENCES ESPECIALIDADES_HORARIO(ID_ESPECIALIDAD),
  FECHA             DATE            NOT NULL,
  MOTIVO            VARCHAR2(500)   NULL,
  CREATED_AT        TIMESTAMP       DEFAULT SYSTIMESTAMP
);

CREATE INDEX IDX_ESP_EXC_ESP_FECHA ON ESPECIALIDADES_EXCEPCIONES(ID_ESPECIALIDAD, FECHA);
```

### 5.3 Migración de columna `ESPECIALISTA` en `CITAS`

La columna `CITAS.ESPECIALISTA` actualmente es `VARCHAR2(100)` texto libre. Se mantiene como texto pero el backend valida que el valor enviado coincida con un `NOMBRE` de `ESPECIALIDADES_HORARIO`.

> No es necesario agregar FK directa — el texto libre permite registros históricos previos a esta migración.

---

## 6. Lógica de Validación (Backend)

### 6.1 Función: `esFechaValida(especialidad, fecha)`

```js
function esFechaValida(especialidad, fecha) {
  const diaSemana = fecha.getDay(); // 0=Dom...6=Sab

  if (especialidad.TIPO_FRECUENCIA === 'SEMANAL') {
    return diaSemana === especialidad.DIA_SEMANA;
  }

  if (especialidad.TIPO_FRECUENCIA === 'MENSUAL_PRIMER_DIA') {
    // Es primer [DIA_SEMANA] del mes si:
    // - el día de la semana coincide Y
    // - el día del mes está entre 1 y 7
    return diaSemana === especialidad.DIA_SEMANA && fecha.getDate() <= 7;
  }

  return false;
}
```

### 6.2 Función: `esDentroDeHorario(especialidad, hora)`

```js
function esDentroDeHorario(especialidad, hora) {
  if (!especialidad.HORA_FIN) return hora >= especialidad.HORA_INICIO;
  return hora >= especialidad.HORA_INICIO && hora <= especialidad.HORA_FIN;
}
```

### 6.3 Función: `verificarCapacidad(idEspecialidad, fecha, db)`

```js
async function verificarCapacidad(idEspecialidad, fecha, capacidadMax) {
  if (!capacidadMax) return true; // sin límite
  const count = await countCitasActivasPorEspecialidadFecha(idEspecialidad, fecha);
  return count < capacidadMax;
}
```

### 6.4 Función: `esFechaException(idEspecialidad, fecha, db)`

```js
async function esFechaException(idEspecialidad, fecha) {
  const exc = await findExcepcion(idEspecialidad, fecha);
  return !!exc;
}
```

### 6.5 Flujo completo en `POST /citas`

```
1. Buscar especialidad por nombre → si no existe → 400
2. Verificar especialidad.ACTIVO === 1 → si no → 400
3. esFechaValida(especialidad, fecha) → si false → 400 con mensaje claro
4. esDentroDeHorario(especialidad, hora) → si false → 400
5. esFechaException(id, fecha) → si true → 400 con motivo de excepción
6. verificarCapacidad(id, fecha) → si false → 400
7. Validar no-doble-booking del paciente (lógica existente)
8. Crear cita
```

---

## 7. Nuevos Endpoints API

### Especialidades (lectura pública para UI de citas)

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/especialidades` | Lista todas las especialidades activas con horario |
| `GET` | `/especialidades/:id` | Detalle de una especialidad |

### Administración (requieren auth)

| Método | Ruta | Descripción |
|---|---|---|
| `PUT` | `/especialidades/:id` | Editar horario base (Lupita) |
| `PATCH` | `/especialidades/:id/activo` | Activar/desactivar especialidad |
| `GET` | `/especialidades/:id/excepciones` | Listar fechas bloqueadas |
| `POST` | `/especialidades/:id/excepciones` | Agregar fecha no disponible |
| `DELETE` | `/especialidades/excepciones/:idExc` | Eliminar excepción |

---

## 8. Cambios en Frontend

### 8.1 `citas.tsx` — Formulario de nueva cita

- Reemplazar array `ESPECIALISTAS` hardcodeado → llamar `GET /especialidades`
- Al seleccionar especialidad, mostrar en UI: días y horario permitido ("Jueves 9:30–12:00")
- `TIME_SLOTS`: filtrar para mostrar solo horarios válidos según especialidad seleccionada
- Al seleccionar fecha: validar día en frontend (primera capa de UX) antes de enviar

### 8.2 Nueva sección: Configuración de Especialidades (admin)

- Tabla de especialidades con columnas: Nombre, Día, Horario, Capacidad, Frecuencia, Activo
- Botón "Editar" por fila → modal con campos editables
- Tab "Fechas bloqueadas" → lista de excepciones + botón "Agregar excepción"

### 8.3 Mensaje de error en bloqueo

```
"Psicología solo atiende los viernes de 10:00 a 12:00 y tiene capacidad máxima de 3 pacientes. 
Ya no hay lugares disponibles para el viernes 6 de junio."
```

---

## 9. Consideraciones de Migración

1. **Datos históricos**: citas existentes con `ESPECIALISTA` texto libre no serán afectadas retroactivamente
2. **Horario de Cirugía**: falta confirmar el horario exacto (inicio/fin) — usar `'08:00'` como placeholder hasta confirmar con Dr. Lines
3. **Sin límite de fin para Gastro**: `HORA_FIN = NULL` — validación solo verifica `hora >= 10:00`
4. **Capacidad Urología**: no se especificó, queda `NULL` (sin límite)

---

## 10. Preguntas Abiertas

| # | Pregunta | Impacto |
|---|---|---|
| 1 | ¿Cuál es el horario exacto de Cirugía (hora fin)? | `HORA_FIN` en DB |
| 2 | ¿Urología tiene capacidad máxima de pacientes? | `CAPACIDAD_MAX` en DB |
| 3 | ¿Las excepciones solo las crea Lupita, o también pueden crearlas otros admins? | Permisos de endpoint |

---

## 11. Estimado de Implementación

| Tarea | Complejidad |
|---|---|
| Migraciones SQL (2 tablas + datos iniciales) | Baja |
| Modelo + servicio + controlador especialidades | Media |
| Validación en `POST /citas` | Media |
| Frontend: lista dinámica de especialidades | Baja |
| Frontend: filtrado de slots por horario | Media |
| Frontend: pantalla de configuración admin | Alta |
| Tests | Media |

**Total estimado:** 1 sprint completo (feature + tests + configuración admin)
