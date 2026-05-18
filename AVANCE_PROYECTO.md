# Reporte de Avance — Sistema de Gestión Espina Bífida

**Actualización:** 2026-05-17 (Martes)
**Próxima entrega:** 2026-05-19 (Jueves)
**Entrega final al socio formador:** ~semana del 2026-06-08 (una semana antes del cierre de clase)

---

## Resumen ejecutivo

Sistema web de gestión para la Asociación de Espina Bífida. Reemplaza flujos fragmentados en Excel para centralizar beneficiarios, membresías, servicios médicos, inventario, citas y reportes.

| Indicador | Estado |
|---|---|
| Cobertura de pruebas (statements) | 93.57% |
| Cobertura de pruebas (funciones) | 95.83% |
| Cobertura de pruebas (ramas) | 83.71% |
| Módulos backend completados | 8 / 8 |
| Módulos frontend completados | 9 / 10 |
| Migraciones de BD | 6 / 6 |

---

## ✅ Lo que está terminado

### Backend (Node.js + Express + Oracle)

| Módulo | Descripción | Cobertura |
|---|---|---|
| **Beneficiarios** | CRUD completo, pre-registro, aprobación/rechazo, foto de perfil, baja | 88.88% |
| **Membresías** | Alta, validación de vigencia, métodos de pago, sincronización de estados | 100% modelos / 73.8% controller |
| **Servicios** | Registro con validación de membresía activa, filtros, paginación, notas | ~90% |
| **Citas** | CRUD completo, filtros por fecha/estatus | 100% |
| **Inventario** | Artículos, movimientos (entradas/salidas), alertas de stock mínimo | 91.17% |
| **Reportes** | Generación PDF/XLSX, descarga autenticada, generación automática por cron | 96.9% |
| **Administradores** | Autenticación JWT, cambio de contraseña, roles, foto de perfil | ~90% |
| **Catálogos** | Servicios-catálogo, especialistas, configuración, roles | ✅ |
| **Migraciones BD** | 6 migraciones versionadas, auto-ejecutadas al iniciar el servidor | 100% |
| **Middleware** | Auth JWT, roles RBAC, upload de fotos, manejo de errores centralizado | ✅ |

### Frontend (Next.js + React + TypeScript)

| Módulo | Descripción | Estado |
|---|---|---|
| **Dashboard** | Estadísticas, resumen financiero, agenda del día, historial | ✅ Completo |
| **Beneficiarios** | Lista, alta, edición, credencial CR80 imprimible, foto de perfil | ✅ Completo |
| **Membresías** | Alta, visualización, métodos de pago | ✅ Completo |
| **Servicios** | Registro con validación, filtros, detalle | ✅ Completo |
| **Citas** | Vista lista y vista calendario, alta, cambio de estatus | ✅ Completo |
| **Inventario** | Artículos, movimientos, alertas de stock | ✅ Completo |
| **Reportes** | Generación y descarga de PDF/XLSX | ✅ Completo |
| **Pre-registro** | Formulario público, aprobación/rechazo desde panel admin | ✅ Completo |
| **Login** | Pantalla de autenticación con JWT | ✅ Completo |
| **Gestión de admins** | Edición de perfil, foto, cambio de contraseña | ✅ Completo |

### Infraestructura y calidad

- Arquitectura MVC consistente en todo el backend
- 29 archivos de prueba (Jest + Supertest)
- Pool de conexiones Oracle con reconexión automática
- Transformación automática de columnas Oracle a camelCase
- Soporte de modo oscuro (dark mode)
- Integración Cloudflare Turnstile en formulario público

---

## 🔄 En progreso / Parcialmente terminado

| Área | Detalle | Prioridad |
|---|---|---|
| **Scheduler de reportes** | Funcional pero con solo 32% de cobertura de pruebas; los casos borde del cron no están cubiertos | Media |
| **Cobertura de ramas** | Está en 83.71% — falta cubrir flujos alternativos en servicios y membresías | Media |
| **Controller membresías** | `postSyncEstados` necesita más tests para los flujos de pago | Baja |

---

## ❌ Lo que falta por hacer

### Alta prioridad (necesario para entrega al socio formador)

| Tarea | Descripción |
|---|---|
| **Documentación de la API** | No existe Swagger/OpenAPI ni README detallado por módulo; el socio formador necesitará esto para futuras integraciones o mantenimiento |
| **Pruebas E2E** | No hay pruebas end-to-end (Playwright o Cypress); los flujos críticos (alta de beneficiario → membresía → servicio) solo se validan con integration tests |
| **Flujo de recuperación de contraseña** | No existe endpoint ni pantalla de "olvidé mi contraseña"; necesario para operación real |
| **Validación de entradas en rutas backend** | Las rutas no usan esquemas de validación (Joi/Zod); datos mal formados pueden llegar a la BD |
| **Rate limiting en endpoints públicos** | `/api/v1/beneficiarios/solicitud-publica` y `/api/auth/login` no tienen límite de peticiones; riesgo de abuso |

### Prioridad media (mejoras de calidad)

| Tarea | Descripción |
|---|---|
| **Auditoría de operaciones sensibles** | No se registran quién hizo qué (creación/baja de beneficiarios, cambios de contraseña, aprobación de pre-registros) |
| **Pipeline CI/CD** | El directorio `.github/workflows` existe pero está vacío; no hay automatización de pruebas en PRs |
| **Manejo de errores de BD** | Fallos parciales en operaciones multi-paso pueden dejar estado inconsistente (ej: beneficiario creado sin membresía) |
| **Optimización de imágenes en frontend** | Las fotos de perfil no usan el componente `<Image>` de Next.js ni lazy loading |

### Prioridad baja (nice-to-have)

| Tarea | Descripción |
|---|---|
| Pantalla de errores (Error Boundaries) | Sin componente de fallback para errores inesperados en el frontend |
| Manual de usuario | No existe documentación para el personal de la asociación |
| Estrategia de respaldo de BD | No está documentado un plan de backups Oracle |

---

## Cronograma propuesto (hacia entrega ~2026-06-08)

| Semana | Fechas | Objetivo |
|---|---|---|
| **Semana 1** | 19 — 23 May | Validación de entradas (Zod/Joi) + rate limiting en endpoints públicos |
| **Semana 2** | 26 — 30 May | Flujo de recuperación de contraseña (backend + frontend) |
| **Semana 3** | 02 — 06 Jun | Documentación de API (Swagger) + pruebas E2E básicas (flujos críticos) |
| **Semana 4** | 09 — 13 Jun | CI/CD en GitHub Actions + revisión final con socio formador |

> Las entregas de progreso se generan cada **martes y jueves**.

---

## Notas técnicas relevantes

- Base de datos Oracle en producción; todas las tablas y columnas van en MAYÚSCULAS
- Las PKs numéricas usan secuencias + triggers `BEFORE INSERT` — nunca especificar el PK al insertar
- `MOVIMIENTOS_INVENTARIO` es la única tabla de movimientos; la tabla `MOVIMIENTOS` fue eliminada
- La credencial CR80 se genera en el frontend (PDF imprimible al tamaño de una tarjeta de crédito)
- El formulario público de pre-registro usa Cloudflare Turnstile para protección contra bots

---

*Este documento se actualiza cada martes y jueves para mantener el timeline del proyecto.*
