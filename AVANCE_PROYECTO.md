# Reporte de Avance — Sistema de Gestión Espina Bífida

**Actualización:** 2026-05-22 (Jueves) — Semana 2
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
| Módulos backend completados | 8 / 8 |
| Módulos frontend completados | 10 / 10 |
| Migraciones de BD | 8 / 8 |
| Archivos de prueba (Jest + Supertest) | 39 |

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
| **Migraciones BD** | 8 migraciones versionadas, auto-ejecutadas al iniciar el servidor | 100% |
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
| **Documentación de la API** | No existe Swagger/OpenAPI ni README detallado por módulo |
| **Pruebas E2E** | No hay pruebas end-to-end (Playwright); los flujos críticos solo se validan con integration tests |
| **Validación de entradas con esquemas** | Las rutas no usan Joi/Zod; datos mal formados pueden llegar a la BD |

### Prioridad media

| Tarea | Descripción |
|---|---|
| **Auditoría de operaciones sensibles** | No se registra quién hizo qué (baja de beneficiarios, aprobación de pre-registros, etc.) |
| **CI/CD en GitHub Actions** | Correr tests automáticamente en cada PR |
| **Manejo de errores de BD** | Fallos parciales en operaciones multi-paso pueden dejar estado inconsistente |
| **Optimización de imágenes** | Las fotos de perfil no usan `<Image>` de Next.js ni lazy loading |

### Prioridad baja (nice-to-have)

| Tarea | Descripción |
|---|---|
| Error Boundaries en frontend | Sin componente de fallback para errores inesperados |
| Manual de usuario | No existe documentación para el personal de la asociación |
| Estrategia de respaldo de BD | No está documentado un plan de backups Oracle |

---

## Cronograma (hacia entrega ~2026-06-08)

| Semana | Fechas | Objetivo | Estado |
|---|---|---|---|
| **Semana 1** | 19 — 23 May | Refactoring + Rate limiting + Seguridad | ✅ Completado |
| **Semana 2** | 26 — 30 May | Flujo de recuperación de contraseña (backend + frontend) | ✅ Completado |
| **Semana 3** | 02 — 06 Jun | Documentación de API (Swagger) + pruebas E2E básicas | ⏳ Pendiente |
| **Semana 4** | 09 — 13 Jun | CI/CD en GitHub Actions + revisión final con socio formador | ⏳ Pendiente |

> Las entregas de progreso se generan cada **martes y jueves**.

---

## Vulnerabilidades conocidas (Dependabot)

GitHub reporta 5 vulnerabilidades en dependencias (4 high, 1 moderate).
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
