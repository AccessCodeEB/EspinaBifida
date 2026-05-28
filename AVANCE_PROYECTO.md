# Reporte de Avance — Sistema de Gestión Espina Bífida

**Actualización:** 2026-05-24 (Sábado) — post Semana 2
**Próxima entrega:** 2026-05-29 (Jueves)
**Entrega final al socio formador:** ~semana del 2026-06-08 (una semana antes del cierre de clase)

---

## Resumen ejecutivo

Sistema web de gestión para la Asociación de Espina Bífida. Reemplaza flujos fragmentados en Excel para centralizar beneficiarios, membresías, servicios médicos, inventario, citas y reportes.

| Indicador | Estado |
|---|---|
| Cobertura de pruebas (statements) | **100%** |
| Cobertura de pruebas (funciones) | **100%** |
| Cobertura de pruebas (ramas) | **100%** |
| Módulos backend completados | 9 / 9 |
| Módulos frontend completados | 11 / 11 |
| Migraciones de BD | 10 / 10 |
| Archivos de prueba (Jest + Supertest) | 42 |
| Pruebas E2E Playwright — API (QASE IDs 1–40) | 38 tests en 11 archivos |
| Pruebas E2E Playwright — UI (QASE IDs 24,30–32,41–43) | 8 tests en 2 archivos (1 skipped: rate limit solo prod) |
| Total tests E2E | **46 tests**, **7 skipped** esperados |

---

## ✅ Lo que está terminado

### Backend (Node.js + Express + Oracle)

| Módulo | Descripción | Cobertura |
|---|---|---|
| **Beneficiarios** | CRUD completo, pre-registro, aprobación/rechazo, foto de perfil, baja | 100% |
| **Membresías** | Alta, validación de vigencia, métodos de pago, sincronización de estados | 100% |
| **Servicios** | Registro con validación de membresía activa, filtros, paginación, notas | 100% |
| **Citas** | CRUD completo, filtros por fecha/estatus | 100% |
| **Inventario** | Artículos, movimientos (entradas/salidas), alertas de stock mínimo, filtro activo/inactivo | 100% |
| **Reportes** | Generación PDF/XLSX, descarga autenticada, generación automática por cron | 100% |
| **Administradores** | Auth JWT, cambio de contraseña con SMS OTP, recuperación de contraseña vía SMS OTP, roles, foto de perfil, teléfono editable | 100% |
| **Catálogos** | Servicios-catálogo, especialistas, configuración, roles | 100% |
| **Notificaciones** | Alertas automáticas de stock bajo y membresías próximas/vencidas, job nocturno cron, panel en dashboard | 100% |
| **Migraciones BD** | 10 migraciones versionadas, auto-ejecutadas al iniciar el servidor | 100% |
| **Middleware** | Auth JWT, roles RBAC, upload de fotos, manejo de errores, rate limiting | 100% |

### Frontend (Next.js + React + TypeScript)

| Módulo | Estado |
|---|---|
| **Dashboard** | ✅ Completo |
| **Beneficiarios** | ✅ Completo |
| **Membresías** | ✅ Completo |
| **Servicios** | ✅ Completo |
| **Citas** | ✅ Completo |
| **Inventario** | ✅ Completo — incluye filtro por estado de stock |
| **Reportes** | ✅ Completo |
| **Pre-registro** | ✅ Completo |
| **Login** | ✅ Completo |
| **Gestión de admins** | ✅ Completo — incluye SMS OTP para cambio de contraseña, recuperación de contraseña y teléfono editable |
| **Notificaciones** | ✅ Completo — campana con badge en header, panel desplegable, íconos por tipo, marcar leída / todas |

### Seguridad (completado 2026-05-21 al 2026-05-22)

- `verifyToken` agregado a todas las rutas que carecían de autenticación (beneficiarios, inventario, membresías)
- CORS environment-aware: en producción solo permite `FRONTEND_URL` + `localhost:3001`
- Rate limiting con `express-rate-limit`: `loginLimiter` (5/15 min), `publicLimiter` (10/h), `authLimiter` (120/min), `otpLimiter` (5/15 min por idAdmin)
- OTP para cambio de contraseña generado con `crypto.randomInt` (seguro criptográficamente)
- `codigoDev` (código SMS en modo dev) excluido de la respuesta en `NODE_ENV=production`
- Flujo "¿Olvidé mi contraseña?": `POST /forgot-password` + `PATCH /forgot-password/reset` + `ForgotPasswordDialog` en frontend

### Infraestructura y calidad

- Arquitectura MVC consistente — lógica SQL extraída de rutas a controllers y services
- 40 archivos de prueba, 100% cobertura en statements, branches, functions y lines
- Pool de conexiones Oracle con reconexión automática
- Helper `withConnection` en todos los modelos
- Módulo `validators.js` centralizado (CURP, EMAIL, TEL, CP, etc.)
- Transformación automática de columnas Oracle a camelCase
- Modo oscuro (dark mode)
- Cloudflare Turnstile en formulario público

---

## 🔄 En progreso / Parcialmente terminado

| Área | Detalle | Prioridad |
|---|---|---|
| **Scheduler de reportes** | Funcional pero pruebas de los casos borde del cron aún incompletas | Media |
| **CI/CD GitHub Actions** | `.github/workflows` existe pero vacío — no hay pipeline automático en PRs | Media |

---

## ❌ Lo que falta por hacer

### Alta prioridad (necesario para entrega al socio formador)

| Tarea | Descripción |
|---|---|
| ~~**Documentación de la API**~~ | ✅ **Completado** — Swagger/OpenAPI 3.0 en `/api-docs` (dev). 82 endpoints anotados con JSDoc en 16 archivos de rutas. JWT integrado (botón Authorize). Guard `NODE_ENV !== 'production'`. `npm test` pasa incluyendo `swagger.test.js`. |
| ~~**Pruebas E2E**~~ | ✅ **Completado** — 41 tests Playwright + QASE (IDs 1–43): API (auth, beneficiarios, membresías, servicios, inventario, reportes, pre-registro, artículos, citas, roles, seguridad) + UI (formulario público, UAT). `npm run test:e2e` |
| ~~**Validación de entradas con esquemas**~~ | ✅ **Completado** — `validate()` Zod aplicado en todas las rutas POST/PUT/PATCH, incluyendo rutas v1. |
| ~~**CI/CD en GitHub Actions**~~ | ✅ **Completado** — `test.yml` corre `npm run test:coverage` en cada push/PR a main. Job `e2e` condicional a `ORACLE_E2E_ENABLED=true`. Cobertura posteada automáticamente como comentario en PRs. |

### Prioridad media

| Tarea | Descripción |
|---|---|
| **Auditoría de operaciones sensibles** | No se registra quién ejecutó cada operación crítica. Operaciones afectadas y responsable del código: baja lógica de beneficiario (`victorvalero6`), cambio de estatus (`victorvalero6`), aprobar pre-registro (`victorvalero6`), rechazar pre-registro (`victorvalero6`), eliminación permanente (`LeNav23`), desactivar administrador (`LeNav23`). |
| **Manejo de errores de BD** | Fallos parciales en operaciones multi-paso pueden dejar estado inconsistente |
| **Optimización de imágenes** | Las fotos de perfil no usan `<Image>` de Next.js ni lazy loading |

### Prioridad baja (nice-to-have)

| Tarea | Descripción |
|---|---|
| Error Boundaries en frontend | Sin componente de fallback para errores inesperados |
| Manual de usuario | No existe documentación para el personal de la asociación |
| Estrategia de respaldo de BD | No está documentado un plan de backups Oracle |

---

## Estrategia y cobertura de pruebas

### Capa 1 — Pruebas unitarias e integración (Jest + Supertest)

**42 archivos de prueba** en `src/tests/`, ejecutados con `npm test`.

| Módulo | Archivos de prueba |
|---|---|
| Beneficiarios | `beneficiarios.model.test.js`, `beneficiarios.service.test.js`, `beneficiarios.controller.test.js`, `beneficiarios.public.test.js` |
| Administradores | `administradores.model.test.js`, `administradores.service.test.js` |
| Membresías | `membresias.model.test.js`, `membresias.service.test.js`, `membresias.controller.test.js` |
| Servicios | `servicios.model.test.js`, `servicios.service.test.js`, `servicios.controller.test.js` |
| Artículos / Inventario | `articulos.model.test.js`, `articulos.service.test.js`, `articulos.test.js`, `inventario.model.test.js`, `inventario.service.test.js`, `inventario.test.js`, `inventario.criteria.test.js` |
| Reportes | `reportes.model.test.js`, `reportes.service.test.js`, `reportes.controller.test.js`, `reportes.unit.test.js` |
| Notificaciones | `notificaciones.service.test.js`, `notificaciones.controller.test.js` |
| Seguridad / Auth | `rateLimiter.test.js`, `otpStore.test.js`, `verifyTurnstile.test.js`, `sms.test.js` |
| Infraestructura | `db.test.js`, `dbTransform.test.js`, `health.test.js`, `migrations.test.js`, `email.test.js`, `uploadProfilePhoto.test.js`, `profile-photos-fallback.test.js` |
| Flujos integrados | `flujo-beneficiario-membresia-servicio.test.js`, `configuracion.routes.test.js`, `controllers-misc.test.js`, `core-coverage.test.js` |
| Schedulers | `reporteScheduler.test.js` |
| Validadores | `validators.test.js` |

**Cobertura alcanzada:** 100% en statements, branches, functions y lines (verificado con `npm run test:coverage`).

### Capa 2 — Pruebas E2E (Playwright + QASE reporter)

**13 archivos spec** en `e2e/`, ejecutados con `npm run test:e2e`. Integrados con QASE para trazabilidad de casos de prueba.

#### Tests de API (`e2e/api/`) — 38 tests

| Archivo | QASE IDs | Qué cubre |
|---|---|---|
| `auth.spec.ts` | 1, 2, 3 | Login exitoso, token JWT, credenciales inválidas |
| `beneficiarios.spec.ts` | 4, 5, 6, 7, 8 | CRUD beneficiario, búsqueda, CURP duplicada |
| `membresias.spec.ts` | 9, 10, 11 | Alta membresía, validación vigencia, expiración |
| `servicios.spec.ts` | 12, 13 | Registro servicio con membresía activa/inactiva |
| `inventario.spec.ts` | 14, 15 | Movimientos de stock, alertas mínimo |
| `reportes.spec.ts` | 16, 17, 18, 33, 34, 35, 36 | Generación PDF/XLSX, descarga, parámetros |
| `preregistro.spec.ts` | 19, 20, 21, 22, 23 | POST pre-registro, duplicado 409, aprobar, rechazar |
| `articulos.spec.ts` | 25 | CRUD artículos, stock tracking |
| `citas.spec.ts` | 26, 27 | CRUD citas, filtros por fecha |
| `roles.spec.ts` | 28 | Listado de roles |
| `seguridad.spec.ts` | 29, 37, 38, 39, 40 | RBAC, rutas protegidas, acceso sin token |

#### Tests de UI (`e2e/ui/`) — 8 tests

| Archivo | QASE IDs | Qué cubre |
|---|---|---|
| `formulario-publico.spec.ts` | 24, 30, 31, 32 | Formulario público: estados INEGI (≥32), municipios dinámicos, autocalculación CURP, envío y folio |
| `uat.spec.ts` | 41, 42, 43* | Flujo completo pre-registro → aprobación → beneficiario; descarga PDF membresías; bloqueo rate-limit* |

*UAT-003 (ID 43) marcado `test.skip` — rate limiting desactivado en modo dev, activo solo en producción.

#### Fixtures y helpers E2E

| Archivo | Propósito |
|---|---|
| `e2e/fixtures/auth.ts` | `authTest` con `apiContext` autenticado (Bearer token) reutilizable |
| `e2e/helpers/cleanup.ts` | Limpieza pre-test: elimina beneficiarios de prueba (PENDIENTE y aprobados, con forceDelete pattern) |
| `e2e/playwright.config.ts` | Proyectos `api` y `ui`, timeout 30s, reporter QASE + lista |

#### Decisiones de diseño en tests

- **CURP de prueba**: CURPs sintéticas con formato válido (`^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$`) que no corresponden a personas reales
- **Cloudflare Turnstile**: site key `1x00000000000000000000AA` en dev, que siempre pasa (Cloudflare testing key)
- **Radix Select**: todos los dropdowns usan pattern `locator('#id').click()` → `getByRole('option')` (no `<select>` nativo)
- **forceDelete pattern**: cleanup de beneficiarios aprobados: `PATCH estatus=Inactivo` → `PUT notas='[SOLICITUD_PUBLICA_PRE_REG]'` → `DELETE /pre-registro`
- **Rate limiting**: `isTest` en `rateLimiter.js` desactiva los límites en `NODE_ENV=test`; UAT-003 salta en dev/test

### Comandos de prueba

```bash
# Unitarias + integración (con cobertura)
npm test
npm run test:coverage

# E2E completo
npm run test:e2e

# Solo API
npx playwright test --config=e2e/playwright.config.ts --project=api

# Solo UI
npx playwright test --config=e2e/playwright.config.ts --project=ui
```

---

## Cronograma (hacia entrega ~2026-06-08)

| Semana | Fechas | Objetivo | Estado |
|---|---|---|---|
| **Semana 1** | 19 — 23 May | Refactoring + Rate limiting + Seguridad | ✅ Completado |
| **Semana 2** | 26 — 30 May | Flujo de recuperación de contraseña (backend + frontend) | ✅ Completado |
| **Semana 3** | 02 — 06 Jun | Documentación de API (Swagger) + pruebas E2E básicas | ✅ E2E completado (41 tests Playwright + QASE) |
| **Semana 4** | 09 — 13 Jun | CI/CD en GitHub Actions + revisión final con socio formador | ⏳ Pendiente |

> Las entregas de progreso se generan cada **martes y jueves**.

---

## Vulnerabilidades conocidas (Dependabot)

GitHub reporta 6 vulnerabilidades en dependencias (4 high, 2 moderate).
Ver: https://github.com/AccessCodeEB/EspinaBifida/security/dependabot

---

## Notas técnicas relevantes

- Base de datos Oracle en producción; todas las tablas y columnas van en MAYÚSCULAS
- Las PKs numéricas usan secuencias + triggers `BEFORE INSERT` — nunca especificar el PK al insertar
- `MOVIMIENTOS_INVENTARIO` es la única tabla de movimientos; la tabla `MOVIMIENTOS` fue eliminada
- La credencial CR80 se genera en el frontend (PDF imprimible al tamaño de una tarjeta de crédito)
- El formulario público de pre-registro usa Cloudflare Turnstile para protección contra bots
- SMS OTP para cambio de contraseña: `src/utils/otpStore.js` (Map en memoria, TTL 5 min)
- Sin Twilio configurado: modo dev activo — código visible en consola del servidor (nunca en prod)

---

*Este documento se actualiza cada martes y jueves para mantener el timeline del proyecto.*
