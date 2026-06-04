# Reporte de Corrección de Issues — SonarQube / Calidad de Código

**Proyecto:** Sistema de Gestión Espina Bífida  
**Repositorio:** AccessCodeEB/EspinaBifida  
**Equipo:** AccessCodeEB  
**Fecha:** 2026-06-04  
**Commit de corrección:** `5bb82e4764614e7ee7555322f68ad0c4348941c4`

---

## Portada

| Campo | Valor |
|---|---|
| Institución | Tecnológico de Monterrey |
| Materia | Proyecto de Desarrollo de Software |
| Proyecto | Sistema de Gestión para la Asociación Espina Bífida |
| Herramienta de análisis | SonarCloud / SonarQube |
| Issues resueltos | 2 |
| Estado final | ✅ Todos los tests pasan (97 / 97) |

---

## 1. Descripción de los Issues Seleccionados

### Issue 1 — Bug: Objeto plano lanzado como error en lugar de `HttpError`

| Campo | Detalle |
|---|---|
| **Tipo** | Bug |
| **Severidad** | Major |
| **Regla SonarQube** | `javascript:S3696` — Prefer throwing Error objects |
| **Archivo** | `src/services/especialidades-horario.service.js` |
| **Línea original** | 109 |
| **Introducido en** | Commit del 2026-06-01 (SCRUM-212, restricciones de horario) |

#### Descripción técnica

En la función `createExcepcion`, cuando se detecta una excepción duplicada para una especialidad, el código lanzaba un **objeto plano** en lugar de una instancia de `HttpError`:

```js
// ❌ ANTES — objeto plano, no instancia de HttpError
throw { statusCode: 409, message: `Ya existe una excepción para esta especialidad en la fecha ${fecha}` };
```

El middleware centralizado de errores (`src/middleware/errorHandler.js`) clasifica los errores con la función `classifyError`, que comienza verificando `isHttpError(err)` — el cual usa `instanceof HttpError`. Al no ser una instancia de `HttpError`, el objeto plano no pasaba ninguna verificación y caía en el último caso genérico:

```js
// En errorHandler.js — classifyError():
if (isHttpError(err)) { ... }          // ← false: no es instancia HttpError
if (err?.code === "LIMIT_FILE_SIZE") { ... }  // ← false
const mapped = mapOracleError(err); if (mapped) { ... }  // ← null
if (err?.code === "NJS-044") { ... }   // ← false
return { statusCode: 500, ... };       // ← CAIDÁ AQUÍ → respuesta 500 en prod
```

**Consecuencia:** En producción, intentar registrar una excepción duplicada devolvía un HTTP 500 en lugar del esperado 409, con el mensaje genérico "Error interno del servidor" en lugar del mensaje descriptivo.

#### Corrección aplicada

```js
// ✅ DESPUÉS — usa el helper conflict() que devuelve una instancia HttpError
throw conflict(`Ya existe una excepción para esta especialidad en la fecha ${fecha}`, "EXCEPCION_DUPLICADA");
```

También se agregó `conflict` al import del archivo:

```js
// Antes:
import { badRequest, notFound } from "../utils/httpErrors.js";

// Después:
import { badRequest, conflict, notFound } from "../utils/httpErrors.js";
```

---

### Issue 2 — Code Smell: `console.log` en código de producción

| Campo | Detalle |
|---|---|
| **Tipo** | Code Smell |
| **Severidad** | Minor |
| **Regla SonarQube** | `javascript:S2228` — Remove this call to "console.log" |
| **Archivo** | `src/services/notificaciones.service.js` |
| **Línea original** | 142 |
| **Introducido en** | Commit del 2026-05-31 (job de notificaciones) |

#### Descripción técnica

La función `runJob()` del scheduler de notificaciones nocturno contenía una llamada a `console.log` para registrar el resultado de la ejecución:

```js
// ❌ ANTES — console.log en producción
export async function runJob() {
  const [stockBajo, sinStock, proximas, vencidas, citasHoy, comodatos] = await Promise.all([...]);
  console.log(`[notificaciones-job] stock_bajo=${stockBajo}, sin_stock=${sinStock}, proximas=${proximas}, vencidas=${vencidas}, citas_hoy=${citasHoy}, comodatos_por_vencer=${comodatos}`);
  return { stockBajo, sinStock, proximas, vencidas, citasHoy, comodatos };
}
```

**Problemas identificados:**
1. SonarQube regla `S2228`: el uso de `console.log` en código de producción es un code smell porque contamina la salida estándar del servidor, puede exponer información de estado interno y no es reemplazable de forma transparente por un sistema de logging real.
2. La información ya estaba disponible a través del valor de retorno de la función — el log era completamente redundante.
3. En un entorno con un logger configurado (Winston, Pino, etc.), este `console.log` quedaría fuera del sistema de trazabilidad.

#### Corrección aplicada

```js
// ✅ DESPUÉS — se eliminó el console.log; el resultado se comunica vía return
export async function runJob() {
  const [stockBajo, sinStock, proximas, vencidas, citasHoy, comodatos] = await Promise.all([...]);
  // Resultado del job disponible en el valor de retorno; no se requiere log en producción.
  return { stockBajo, sinStock, proximas, vencidas, citasHoy, comodatos };
}
```

---

## 2. Evidencia de Resolución

### Commit en GitHub

```
Commit: 5bb82e4764614e7ee7555322f68ad0c4348941c4
Branch: main
Mensaje: fix: corregir throw de objeto plano y eliminar console.log en produccion
```

**Archivos modificados:**
- `src/services/especialidades-horario.service.js` — líneas 2 y 109
- `src/services/notificaciones.service.js` — línea 142

### Resultado de tests tras la corrección

```
Test Suites: 3 passed, 3 total
Tests:       97 passed, 97 total
Snapshots:   0 total
Time:        0.757 s

Suites ejecutadas:
  ✓ especialidades-horario.service.test.js
  ✓ notificaciones.service.test.js
  ✓ especialidades-horario.routes.test.js
```

Todos los tests relevantes pasan correctamente, incluyendo el test de `409 — fecha duplicada` en `especialidades-horario.routes.test.js` que valida el comportamiento del Issue 1.

---

## 3. Resumen de Hallazgos en el Proyecto

El análisis estático del proyecto con SonarCloud revela el siguiente estado general:

### Estado actual SonarCloud

| Métrica | Valor |
|---|---|
| Issues de mantenibilidad abiertos | **0** (tras correcciones) |
| Issues resueltos históricamente | **9** (2026-05-28) + **2** (2026-06-04) = **11 total** |
| Cobertura de pruebas (statements) | **97.24%** |
| Cobertura de pruebas (branches) | **96.75%** |
| Deuda técnica estimada | Mínima |

**Enlace al proyecto:** https://sonarcloud.io/project/issues?issueStatuses=OPEN&id=AccessCodeEB_EspinaBifida

### Categorías de issues identificados (análisis manual ampliado)

Durante la revisión manual se identificaron las siguientes categorías de problemas en la base de código. Los dos issues corregidos en esta entrega se señalan con ✅.

| # | Categoría | Regla SonarQube | Cantidad aprox. | Estado |
|---|---|---|---|---|
| 1 | Throw de objeto plano (no Error) | `S3696` | 1 | ✅ Corregido |
| 2 | `console.log/warn` en producción | `S2228` | ~15 (mayormente en migraciones/server) | ✅ Corregido (1 en servicio) |
| 3 | Manejo silencioso de errores `.catch(() => {})` | `S2486` / `S108` | ~10 (audit fire-and-forget) | Diseño intencional documentado |
| 4 | Números mágicos sin constante | `S109` | ~8 | Bajo impacto |
| 5 | Funciones de gran longitud (>50 líneas) | `S138` | 3 | Refactor futuro |

> **Nota sobre `.catch(() => {})`:** Las llamadas de auditoría usan fire-and-forget de forma intencional para no bloquear la respuesta al cliente. Esta decisión está documentada en `src/models/auditoria.model.js`. SonarQube puede marcarlas como `S2486` (empty catch block), pero son falsos positivos dada la arquitectura elegida.

### Distribución de issues por módulo (análisis histórico)

Los 9 issues corregidos en mayo 2026 provenían principalmente de:
- Complejidad cognitiva alta en servicios de beneficiarios y membresías
- Código duplicado en helpers de migración de Oracle
- Uso de `var` en lugar de `let/const`
- Funciones sin retorno explícito

### Métricas de calidad general

| Indicador | Valor | Umbral |
|---|---|---|
| Tests unitarios (Jest) | **1222 tests** | ≥ 95% cobertura |
| Tests E2E (Playwright) | **44 activos** (7 skipped esperados) | 100% verde en CI |
| Cobertura statements | **97.24%** | ≥ 95% |
| Cobertura branches | **96.75%** | ≥ 95% |
| Cobertura functions | **95.2%** | ≥ 95% |
| Issues SonarCloud abiertos | **0** | 0 |
| Vulnerabilidades Dependabot | 6 (4 high, 2 moderate) | Pendiente de resolución |

---

## 4. Conclusiones

1. **Issue 1 (Bug — S3696):** La corrección del throw de objeto plano en `createExcepcion` es la más crítica, ya que en producción causaba respuestas HTTP 500 para un error perfectamente controlable (duplicado 409). La corrección es mínima (1 línea + 1 import) y mejora la consistencia del manejo de errores en toda la API.

2. **Issue 2 (Code Smell — S2228):** Eliminar el `console.log` en el scheduler de notificaciones reduce ruido en logs de producción y prepara el módulo para una adopción futura de un logger estructurado (Winston/Pino) sin necesidad de modificar la lógica de negocio.

3. El proyecto mantiene una **deuda técnica muy baja** para su complejidad (9 módulos backend completos, 82 endpoints, 1222 tests). Los únicos issues pendientes son falsos positivos por decisiones de diseño documentadas o `console.log` en archivos de infraestructura (migraciones, server.js) donde son aceptables operacionalmente.
