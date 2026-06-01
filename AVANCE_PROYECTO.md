# Reporte de Avance — Sistema de Gestión Espina Bífida

**Actualización:** 2026-06-01 (Domingo) — Sesión completa: notificación SIN_STOCK, migración 024 limpieza inventario, filtro categorías Popover, alertas de stock separadas, 1168 tests 100% verde, 5 commits de tests separados
**Próxima entrega:** 2026-06-03 (Martes)
**Entrega final al socio formador:** ~semana del 2026-06-08 (una semana antes del cierre de clase)

---

## Resumen ejecutivo

Sistema web de gestión para la Asociación de Espina Bífida. Reemplaza flujos fragmentados en Excel para centralizar beneficiarios, membresías, servicios médicos, inventario, citas y reportes.

| Indicador | Estado |
|---|---|
| Cobertura de pruebas (statements) | **96.84%** |
| Cobertura de pruebas (funciones) | **94.79%** |
| Cobertura de pruebas (ramas) | **96.09%** |
| Módulos backend completados | 9 / 9 |
| Módulos frontend completados | 11 / 11 |
| Migraciones de BD | 24 / 24 |
| Archivos de prueba Jest (suites) | 53 |
| Tests Jest | 1157 |
| Pruebas E2E Playwright — API | 37 tests activos en 12 archivos |
| Pruebas E2E Playwright — UI | 7 tests activos en 2 archivos |
| Tests E2E skipped (esperados) | 7 (rate limit solo prod, headers seguridad, refresh token) |
| Total tests E2E | **44 activos**, **7 skipped** esperados — **100% verde en CI** |
| Issues SonarCloud Mantenibilidad | **0 abiertos** |

---

## ✅ Lo que está terminado

### Backend (Node.js + Express + Oracle)

| Módulo | Descripción | Cobertura |
|---|---|---|
| **Beneficiarios** | CRUD completo, pre-registro, aprobación/rechazo, foto de perfil, baja | 100% |
| **Membresías** | Alta, validación de vigencia, métodos de pago, sincronización de estados | 100% |
| **Servicios** | Registro con validación de membresía activa, clasificación SERVICIO/CONSUMIBLE/COMODATO, comodatos con fecha devolución y tracking PRESTADO/DEVUELTO, filtros, paginación | 100% |
| **Citas** | CRUD completo, filtros por fecha/estatus | 100% |
| **Inventario** | Artículos + categorías (Medicamentos, Insumos Médicos, Equipos Médicos), movimientos, alertas de stock mínimo, safety net comodatos | 100% |
| **Reportes** | Generación PDF/XLSX, descarga autenticada, generación automática por cron | 100% |
| **Administradores** | Auth JWT, cambio de contraseña con SMS OTP, recuperación de contraseña vía SMS OTP, roles, foto de perfil, teléfono editable | 100% |
| **Catálogos** | Servicios-catálogo, especialistas, configuración, roles | 100% |
| **Notificaciones** | Alertas automáticas de stock bajo, membresías próximas/vencidas, citas del día y **comodatos por vencer/vencidos**, job nocturno cron, panel con cards por tipo | 100% |
| **Comodatos** | Alta, seguimiento de pagos, reportes de exenciones, consulta por beneficiario | 100% |
| **Auditoría** | Registro de operaciones sensibles en `AUDITORIA_OPERACIONES` (fire-and-forget) | 100% |
| **Migraciones BD** | 21 migraciones versionadas, auto-ejecutadas al iniciar el servidor | 100% |
| **Middleware** | Auth JWT, roles RBAC, upload de fotos, manejo de errores, rate limiting, validación Zod | 100% |

### Frontend (Next.js + React + TypeScript)

| Módulo | Estado |
|---|---|
| **Dashboard** | ✅ Completo |
| **Beneficiarios** | ✅ Completo |
| **Membresías** | ✅ Completo — botón **Nueva Membresía**, tab **Historial de pagos** (últimos 30 días), monto y método de pago reales, observaciones obligatorias, ícono por método de pago, scroll en form de beneficiario |
| **Servicios** | ✅ Completo — tabla rediseñada (fila clickeable, columna artículo entregado, eliminar desde detalle), form con selector de artículo buscable, catálogo 100% dinámico sin hardcode, badges de estatus, flechas de sort dinámicas, ciclo filtro por estatus |
| **Citas** | ✅ Completo — rediseño UI: KPIs cards, tabs Agenda/Historial estilo inventario, colores pasteles por estatus, fecha humanizada, mini-cal sincronizado, horario 7am–5pm |
| **Inventario** | ✅ Completo — filtro por categoría (Medicamentos/Insumos/Equipos), selector de categoría al agregar artículo, búsqueda se limpia al eliminar artículo, encabezados con íconos y flechas de sort |
| **Reportes** | ✅ Completo — rediseño UI: barra de config en una fila, panel izquierdo h-full, botones más altos, rango de fechas en subtítulo del preview |
| **Pre-registro** | ✅ Completo |
| **Login** | ✅ Completo |
| **Gestión de admins** | ✅ Completo — incluye SMS OTP para cambio de contraseña, recuperación de contraseña y teléfono editable |
| **Comodatos** | ✅ Completo — alta, seguimiento de pagos, reporte de exenciones, integrado en sidebar |
| **Notificaciones** | ✅ Completo — campana con badge en header, panel desplegable, íconos por tipo, marcar leída / todas, **cards especiales para comodatos por vencer con días restantes** |

### Seguridad (completado 2026-05-21 al 2026-05-22)

- `verifyToken` agregado a todas las rutas que carecían de autenticación (beneficiarios, inventario, membresías, **citas**)
- CORS environment-aware: en producción solo permite `FRONTEND_URL` + `localhost:3001`
- Rate limiting con `express-rate-limit`: `loginLimiter` (5/15 min), `publicLimiter` (10/h), `authLimiter` (120/min), `otpLimiter` (5/15 min por idAdmin)
- OTP para cambio de contraseña generado con `crypto.randomInt` (seguro criptográficamente)
- `codigoDev` (código SMS en modo dev) excluido de la respuesta en `NODE_ENV=production`
- Flujo "¿Olvidé mi contraseña?": `POST /forgot-password` + `PATCH /forgot-password/reset` + `ForgotPasswordDialog` en frontend

### Infraestructura y calidad

- Arquitectura MVC consistente — lógica SQL extraída de rutas a controllers y services
- 52 archivos de prueba Jest, **1153 tests**, cobertura 98.29% statements / 96.99% branches / 96.33% functions (superan umbral 95%)
- Pool de conexiones Oracle con reconexión automática
- Helper `withConnection` en todos los modelos
- Módulo `validators.js` centralizado (CURP, EMAIL, TEL, CP, etc.)
- Transformación automática de columnas Oracle a camelCase
- Modo oscuro (dark mode)
- Cloudflare Turnstile en formulario público
- CI/CD en GitHub Actions (`test.yml` corre `npm run test:coverage` en cada push/PR a main)
- Documentación de API: Swagger/OpenAPI 3.0 en `/api-docs` (dev), 82 endpoints anotados, JWT integrado
- Auditoría de operaciones sensibles: tabla `AUDITORIA_OPERACIONES` con 6 operaciones rastreadas
- Baja de beneficiario en transacción atómica (baja + cancelación de membresías con rollback)
- SonarCloud: 0 issues abiertos de mantenibilidad (9 corregidos 2026-05-28)
- CI E2E completamente operativo: 44 tests activos pasan en GitHub Actions contra Oracle Cloud DB
- Bug fix formulario público: `buildAltaCreatePayload` omite campos vacíos (`cp`, teléfonos, correo) para evitar error Zod en backend al enviar strings vacíos en campos con regex
- Manuales de usuario: `docs/manual-usuario-interno.md` (personal de la asociación, 13 secciones) y `docs/manual-usuario-publico.md` (pacientes y familias, 5 secciones)
- Documentación académica: `docs/SDD.md` (Documento de Diseño de Software, 1175 líneas) y `docs/documento-calidad.md` (Plan de Calidad con casos de prueba, métricas y lecciones aprendidas)

### Cambios 2026-05-29 — Rediseño Inventario + Servicios

**Inventario:**
- 3 categorías en `CATEGORIAS_ARTICULO`: Medicamentos, Insumos Médicos, Equipos Médicos (migración 014)
- Filtro por categoría en la UI — mismo Popover "Filtrar" que el filtro de stock
- Safety net para Equipos Médicos: al intentar modificar un equipo desde inventario, pregunta si es préstamo a beneficiario o ajuste de stock. Si es préstamo, redirige a Servicios.
- Selector de categoría obligatorio al agregar artículo nuevo
- Endpoint `GET /articulos/categorias` para cargar categorías dinámicamente
- Migración 016: categoriza automáticamente todos los artículos existentes por keywords en descripción

**Servicios:**
- Columnas `ESTATUS` (VARCHAR2 20, default COMPLETADO) y `FECHA_DEVOLUCION_ESPERADA` (DATE) en tabla SERVICIOS (migración 015)
- Columna `TIPO_SERVICIO` en `SERVICIOS_CATALOGO`: SERVICIO / CONSUMIBLE / COMODATO (migración 015)
- Catálogo limpio: "Silla de Ruedas" renombrada a "Prestamo de Equipo", genérico "Comodato" eliminado (migración 015)
- Tab **Préstamos activos** en la página de Servicios: muestra equipos prestados, días restantes/retraso, filas en ámbar si hay retraso
- Botón **Confirmar devolución**: transacción atómica (ESTATUS='DEVUELTO' + ENTRADA en inventario)
- Formulario nuevo servicio: selector de artículo con búsqueda (Combobox) filtrado por categoría; campo fecha devolución para comodatos
- Historial de servicios: badges COMPLETADO/PRESTADO/DEVUELTO con color; filas PRESTADO destacadas en ámbar
- Endpoints: `GET /servicios/comodatos`, `PATCH /servicios/:id/devolucion`

### Cambios 2026-05-31 — Bug Fix, UX y Notificaciones

**Bug Fix ORA-01400 — Registro de servicios con artículo:**
- Causa raíz: `SP_REGISTRAR_SERVICIO` insertaba en SERVICIOS sin `ID_SERVICIO`, dependiendo de un trigger inexistente
- Fix: `createWithInventarioTransaction` ahora usa `SEQ_SERVICIOS.NEXTVAL` y `SEQ_SERVICIO_ARTICULOS.NEXTVAL` explícitamente — sin SP
- Migración 017: crea `SEQ_SERVICIO_ARTICULOS` + `TRG_SERVICIO_ARTICULOS_BI`
- Afectaba COMODATO y CONSUMIBLE — ambos ya funcionan correctamente

**Insumos Médicos:**
- Tipo de servicio genérico "Insumos médicos" (reemplaza "Paquete de Pañales") — más flexible
- Migración 018: inserta 15 artículos base de insumos (pañales, catéteres, guantes, gasas…) con stock 0
- Artículo opcional para CONSUMIBLE — el servicio se registra aunque no haya stock disponible
- Artículo obligatorio solo para COMODATO (necesario para tracking de devolución)

**Rediseño tabla Servicios registrados:**
- Fila entera clickeable → abre panel de detalle (sin botones inline)
- Columna nueva: **Artículo entregado** (obtenida via subquery a SERVICIO_ARTICULOS)
- Botón Eliminar movido al panel de detalle
- Sort por fecha descendente por defecto (más reciente arriba)
- Filtros simplificados: eliminados "Este mes" / "Últimos 7d" para UI más limpia

**Nomenclatura unificada:**
- "Comodatos activos" → **"Préstamos activos"** en toda la UI
- "Comodato de equipo" → "Préstamo de equipo" en página pública
- Catálogo de servicios 100% dinámico — eliminado `TIPOS_SERVICIO_SUGERIDOS` hardcodeado
- Citas: carga catálogo dinámicamente desde API

**Notificaciones de préstamos por vencer:**
- Nueva notificación tipo `COMODATO_POR_VENCER` (migración 019 actualiza CHK_NOTIF_TIPO)
- Job nocturno detecta préstamos con `FECHA_DEVOLUCION_ESPERADA ≤ hoy + 5 días`
- Panel muestra cards individuales: beneficiario, equipo, días restantes o "Vencido hace N días"
- Colores: ámbar para por vencer, rojo para vencidos

### Cambios adicionales 2026-05-31 — Calidad y UX

**Reporte de inventario corregido:**
- `getArticulosStock()` filtra artículos inactivos (`NVL(ACTIVO,'S')='S'`) — el total ya no incluye artículos dados de baja
- `STOCK_MINIMO` incluido en el SELECT — la alerta de stock bajo usa el mínimo real por artículo en lugar de threshold fijo ≤5
- PDF y XLSX de inventario ahora muestran números correctos

**Dashboard — alertas de stock:**
- Panel "Alertas de stock" ahora muestra también artículos con stock 0 (agotados), no solo los de stock bajo
- Los agotados aparecen primero en la lista (más críticos), en rojo; stock bajo en ámbar

**Inventario — motivo obligatorio:**
- Al registrar un movimiento de stock (ENTRADA o SALIDA) el campo Motivo es ahora obligatorio
- El historial ya no muestra "No se especificó" — solo motivos reales ingresados por el usuario

**Devolución de préstamos — motivo humanizado:**
- El movimiento de ENTRADA en inventario al confirmar devolución muestra `Devolución de préstamo — [Nombre Beneficiario]` en lugar del número de servicio

**Limpieza E2E de notificaciones e inventario:**
- `DELETE /notificaciones/e2e-cleanup` — borra notificaciones donde `CURP LIKE 'PLAW%'` o `MENSAJE LIKE '%PLAW%'`
- `DELETE /inventario/e2e-cleanup` — borra movimientos donde `MOTIVO LIKE '%E2E%'`
- Ambos endpoints bloqueados en `NODE_ENV=production`; llamados automáticamente en `afterAll` de los specs correspondientes

**Fix `deleteById` en servicios:**
- Corregido `outFormat: 2304` hardcodeado → `oracledb.OUT_FORMAT_OBJECT`; eliminar servicios ya no falla con error 500

### Cambios 2026-05-31 — Sesión UX/UI y limpieza E2E

**Beneficiarios:**
- Búsqueda filtra por ciudad Y estado simultáneamente
- Normalización de acentos — "Nuevo Leon" encuentra "Nuevo León" y viceversa
- Scroll habilitado en el formulario de registro (se quitó `scrollbar-hide`)

**Membresías:**
- Campos Monto y Método de pago reales (antes hardcodeados a 0 y null)
- Botón **+ Nueva Membresía** con selector de beneficiarios sin membresía activa
- Tabs **Membresías** / **Historial de pagos** estilo inventario
- Historial de pagos: últimos 30 días (en lugar de últimos 20 registros), columna Observaciones, ícono por método de pago
- Observaciones obligatorias al registrar/renovar membresía

**Inventario:**
- Búsqueda se limpia automáticamente al eliminar un artículo

**Limpieza E2E/UAT:**
- `DELETE /citas/e2e-cleanup` — hard delete de citas de "Dr. E2E Playwright"
- `DELETE /administradores/e2e-cleanup` — hard delete del admin `e2e-admin-test@espina.com`
- Notificaciones UAT (`CURP LIKE 'UAFT%'`) incluidas en el cleanup de notificaciones
- Limpieza inmediata ejecutada contra la BD (citas, admin y notificaciones ya borrados)

**Rediseño Reportes:**
- Barra de config en una sola fila con 3 secciones separadas por divisores
- Panel izquierdo de tipos estira hasta el alto del preview (h-full)
- Botones de tipo de reporte más altos (py-5)
- Rango de fechas movido al subtítulo del preview (ya no en la config)
- Fechas del historial formateadas correctamente

**Rediseño Citas:**
- KPI cards con número grande (Hoy / Esta semana / Pendientes)
- Tabs Agenda/Historial estilo inventario/servicios
- Horario del calendario reducido a 7am–5pm (eliminado espacio vacío)
- Colores pasteles por estatus: Confirmada `#6FD6A8`, Completada `#7FB6FF`, Pendiente `#FFD97A`, Cancelada `#ef4444`
- Fecha en "Citas Pendientes" humanizada: "Dom 31 · 8am" en lugar de "2026-05-31 · 08:00"
- Mini-calendario se sincroniza al navegar semanas con las flechas del grid
- Panel de Citas Pendientes a la misma altura que el grid del calendario
- Texto del popup de cita usa color oscuro en pasteles para buen contraste

**Header — menú de perfil:**
- Avatar + nombre + rol + chevron como botón unificado clickeable
- Dropdown con: info del usuario, Editar perfil, Modo oscuro (toggle), Cerrar sesión (con confirmación)
- Cierra al hacer clic fuera
- El botón Configuración del sidebar se mantiene también

**Encabezados de tablas — estilo unificado:**
- Íconos descriptivos, texto en MAYÚSCULAS y `text-foreground` en todas las tablas del sistema
- Tablas actualizadas: Inventario (artículos + historial), Membresías, Historial de pagos, Pre-registro, Servicios registrados, Préstamos activos, Historial de citas, Administradores
- Flechas dinámicas de sort en Inventario y Servicios: `↕` cuando inactivo, `↑↓` cuando activo
- Servicios: ciclo de filtro por estatus (TODOS → COMPLETADO → PRESTADO → DEVUELTO)
- Servicios: columna Beneficiario sin sort (solo visual)

### Cambios 2026-06-01 — Inventario, notificaciones y calidad

**Notificación SIN_STOCK:**
- Nueva notificación separada para artículos con stock = 0 (migración 023)
- `checkSinStock()` en el scheduler nocturno, `findArticulosSinStock()` en el modelo
- Panel de notificaciones muestra cards rojas con detalle de artículos agotados
- Criterio unificado en inventario, dashboard y notificaciones: stock bajo = `cantidad > 0 && cantidad <= minimo`, agotado = `cantidad = 0`

**Inventario — limpieza de artículos mal clasificados (migración 024):**
- Desactivados artículos que eran estudios/diagnósticos (biometría, cistograma, TAC, etc.)
- Desactivados artículos administrativos (aportaciones, credenciales, tarjetas)
- Reclasificados artículos físicos sin categoría a Medicamentos/Insumos/Equipos
- Eliminada categoría "Servicios y Estudios" de `CATEGORIAS_ARTICULO` (vaciada, no borrada por FK)
- Endpoint `GET /articulos/categorias` ahora solo devuelve categorías con artículos activos
- Filtro de categorías en inventario rediseñado como Popover estilo stock (reemplaza `<select>` nativo)

**Dashboard — alertas de stock:**
- Panel "Alertas de stock" muestra tanto agotados (rojo) como stock bajo (ámbar) en la misma lista
- Agotados primero (más críticos), con subtítulo dinámico "X sin stock · Y stock bajo"

**Tests de cobertura (1168 tests, 5 commits separados):**
- `test(membresias)`: observaciones obligatorias + pagosRecientes sin limit
- `test(notificaciones)`: mocks SIN_STOCK en runJob, tests de checkSinStock, findArticulosSinStock, syncSinStockConsolidado, e2eCleanup controller
- `test(inventario)`: deleteE2EMovimientos en modelo
- `test(e2e-cleanup)`: nuevo archivo con tests de e2eCleanup para citas, inventario y administradores

---

## 🔄 En progreso / Parcialmente terminado

| Área | Detalle | Prioridad |
|---|---|---|
| **Scheduler de reportes** | Funcional pero pruebas de los casos borde del cron aún incompletas | Media |

---

## 🗓️ Plan activo — Refactor Comodatos + UI (2026-06-01)

Limpieza arquitectural del flujo viejo de préstamos-via-servicios y rediseño completo de la UI de Comodatos y Servicios. **Regla: no avanzar al siguiente inciso sin visto bueno. No hacer push hasta autorización.**

### Fase 0 — Migración arquitectural (prerequisito)

| # | Tarea | Estado |
|---|---|---|
| 0a | Agregar `FECHA_DEVOLUCION_ESPERADA DATE` a tabla `COMODATOS` (migración 025) | ✅ Listo |
| 0b | Actualizar scheduler de notificaciones para leer `COMODATOS` en lugar de `SERVICIOS` | ✅ Listo |
| 0c | Eliminar `GET /servicios/comodatos`, `PATCH /servicios/:id/devolucion` y sus modelos/services/tests | ✅ Listo |
| 0d | Remover `PRESTADO`/`DEVUELTO` del ciclo de estatus en UI de servicios y del schema Zod | ✅ Listo |
| 0e | Eliminar "Préstamo de equipo" del catálogo de servicios (migración 026) | ✅ Listo |

### Fase 1 — UI Comodatos ✅

| # | Tarea | Estado |
|---|---|---|
| 1a | Botón "Nuevo comodato" → azul (`bg-[#0f4c81]`) | ✅ Listo |
| 1b | Tabla: headers con íconos + UPPERCASE + flechas sort (igual al resto del sistema) | ✅ Listo |
| 1c | Botón actualizar: agregar texto "Actualizar" junto al emoji | ✅ Listo |
| 1d | Tabs "Lista" / "Reporte de exenciones" → rediseño estilo citas/inventario (navy azul activo, fade 180ms) | ✅ Listo |
| 1e | Búsqueda de beneficiario → texto libre con filtro en tiempo real (igual que servicios) | ✅ Listo |
| 1f | Selector de equipo médico → Popover+Command buscable, filtrado solo a categoría Equipos Médicos | ✅ Listo |
| 1g | Agregar `FECHA_DEVOLUCION_ESPERADA` en el formulario de nuevo comodato (depende de 0a) | ✅ Listo |

### Fase 2 — Selector de artículos buscable en Servicios

| # | Tarea | Estado |
|---|---|---|
| 2a | Servicios → tipo Medicamentos: Popover+Command buscable filtrado solo a categoría Medicamentos | ✅ Listo |
| 2b | Servicios → tipo Insumos médicos: Popover+Command buscable filtrado solo a categoría Insumos Médicos | ✅ Listo |
| 2c | Verificar y corregir que el filtro por categoría funcione correctamente en ambos casos | ✅ Listo |

### Fase 3 — Tabs en Servicios

| # | Tarea | Estado |
|---|---|---|
| 3a | Dos tabs: "Resumen" (dashboard con KPIs y gráficas) + "Servicios Registrados" (tabla) | ⏳ Pendiente |

---

## ❌ Lo que falta por hacer

### Prioridad media — UX / UI

| Tarea | Descripción |
|---|---|
| **Decidir sidebar Configuración vs menú header** | Actualmente existen ambos (sidebar + header dropdown). Coordinar con el equipo cuál conservar o si mantener los dos. |
| **Mejorar UI del filtro de categorías en Inventario** | El dropdown del filtro de categorías actualmente se ve diferente al de stock. Unificar el estilo del popover de categorías para que sea igual de bonito y consistente que el filtro de stock (mismo diseño de cards, íconos, hover states, etc.). |

### Prioridad media — Servicios

| Tarea | Descripción |
|---|---|
| **Especificar tipo de consulta y estudio al registrar servicio** | Al registrar un servicio de tipo "Consulta médica" o "Estudio médico", actualmente es muy genérico. Agregar campo para especificar qué consulta (dental, neurología, urología…) o qué estudio, y opcionalmente con qué doctor. Evaluar si agregar sub-tipos al catálogo o un campo libre de texto. |
| **Motivos más amigables al registrar servicio con inventario** | Al registrar un servicio de tipo Medicamento, Insumos médicos o Préstamo de equipo, el formulario debe guiar mejor al usuario: por ejemplo mostrar un selector con motivos sugeridos ("Entrega mensual", "Receta médica", "Primera entrega", etc.) en lugar de un campo de texto libre, para que Lupita no tenga que inventar qué escribir cada vez. |

### Prioridad media — Membresías

| Tarea | Descripción |
|---|---|
| **Investigar precio fijo de membresía** | Confirmar con la asociación cuánto cobran por mes de membresía, si hay precio diferente por tipo de beneficiario, y si aplican descuentos al renovar varios meses a la vez. Una vez confirmado, precargarlo como valor sugerido en el campo Monto del form de membresía. |

### Prioridad media — Notificaciones futuras

| Tarea | Descripción |
|---|---|
| **Notificación: pre-registro pendiente** | Avisar cuando hay pre-registros en estado PENDIENTE sin revisar por más de N días. |
| **Notificación: beneficiario sin membresía activa** | Avisar cuando un beneficiario activo lleva más de X días sin membresía vigente. |
| **Notificación: reporte automático generado** | Confirmar en el panel cuando el scheduler nocturno generó el reporte mensual exitosamente. |

### Prioridad media — Calidad de código

| Tarea | Descripción |
|---|---|
| **Auditar y corregir valores hardcodeados** | Revisar todo el código (frontend y backend) en busca de valores que deberían ser configurables o dinámicos pero están escritos fijos: precios, umbrales, límites de paginación, textos de estado, emails de prueba, colores, etc. Centralizar en constantes o en la tabla `CONFIGURACION` según corresponda. |

### Prioridad baja (nice-to-have)

| Tarea | Descripción |
|---|---|
| Error Boundaries en frontend | Sin componente de fallback para errores inesperados en React |
| Estrategia de respaldo de BD | No está documentado un plan de backups Oracle |

---

## Estrategia y cobertura de pruebas

### Capa 1 — Pruebas unitarias e integración (Jest + Supertest)

**50 archivos de prueba** en `src/tests/` + `frontend/lib/__tests__/`, ejecutados con `npm test`.

| Módulo | Archivos de prueba |
|---|---|
| Beneficiarios | `beneficiarios.model.test.js`, `beneficiarios.service.test.js`, `beneficiarios.controller.test.js`, `beneficiarios.public.test.js` |
| Administradores | `administradores.model.test.js`, `administradores.service.test.js` |
| Membresías | `membresias.model.test.js`, `membresias.service.test.js`, `membresias.controller.test.js` |
| Servicios | `servicios.model.test.js`, `servicios.service.test.js`, `servicios.controller.test.js` |
| Artículos / Inventario | `articulos.model.test.js`, `articulos.service.test.js`, `articulos.test.js`, `inventario.model.test.js`, `inventario.service.test.js`, `inventario.test.js`, `inventario.criteria.test.js`, `inventario.schema.test.js` |
| Reportes | `reportes.model.test.js`, `reportes.service.test.js`, `reportes.controller.test.js`, `reportes.unit.test.js` |
| Notificaciones | `notificaciones.service.test.js`, `notificaciones.controller.test.js`, `notificacionesScheduler.test.js` |
| Seguridad / Auth | `rateLimiter.test.js`, `otpStore.test.js`, `verifyTurnstile.test.js`, `sms.test.js` |
| Infraestructura | `db.test.js`, `dbTransform.test.js`, `health.test.js`, `migrations.test.js`, `email.test.js`, `uploadProfilePhoto.test.js`, `profile-photos-fallback.test.js`, `refreshTokens.model.test.js` |
| Flujos integrados | `flujo-beneficiario-membresia-servicio.test.js`, `configuracion.routes.test.js`, `controllers-misc.test.js`, `core-coverage.test.js` |
| Schedulers | `reporteScheduler.test.js` |
| Validadores | `validators.test.js` |
| Auditoría | `auditoria.model.test.js` |
| Frontend | `curp-generator.test.ts` |

**Cobertura alcanzada:** 98.29% statements / 96.99% branches / 96.33% functions / 98.56% lines — todos los umbrales de 95% superados (verificado con `npm run test:coverage`).

### Capa 2 — Pruebas E2E (Playwright + QASE reporter)

**14 archivos spec** en `e2e/`, ejecutados con `npm run test:e2e`. Integrados con QASE para trazabilidad de casos de prueba. **CI E2E activo** con Oracle Cloud DB (variable `ORACLE_E2E_ENABLED=true`).

#### Tests de API (`e2e/api/`) — 37 tests activos

| Archivo | QASE IDs | Qué cubre |
|---|---|---|
| `auth.spec.ts` | 1, 2, 3 | Login exitoso, token JWT, credenciales inválidas |
| `beneficiarios.spec.ts` | 1, 2, 10, 44, 45, 46, 47, 48 | CRUD beneficiario, CURP inválida/duplicada, GET por CURP, PUT actualizar, PATCH estatus, DELETE baja lógica, DELETE eliminación permanente |
| `administradores.spec.ts` | 49, 50, 51, 52, 53 | GET lista, GET por ID, PUT actualizar, validación 400, DELETE desactivar |
| `membresias.spec.ts` | 9, 10, 11 | Alta membresía, validación vigencia, expiración |
| `servicios.spec.ts` | 12, 13 | Registro servicio con membresía activa/inactiva |
| `inventario.spec.ts` | 14, 15 | Movimientos de stock, alertas mínimo |
| `reportes.spec.ts` | 16, 17, 18, 33, 34, 35, 36 | Generación PDF/XLSX, descarga, parámetros |
| `preregistro.spec.ts` | 19, 20, 21, 22, 23 | POST pre-registro, duplicado 409, aprobar, rechazar |
| `articulos.spec.ts` | 25 | CRUD artículos, stock tracking |
| `citas.spec.ts` | 26, 27 | CRUD citas, filtros por fecha |
| `roles.spec.ts` | 28 | Listado de roles |
| `seguridad.spec.ts` | 29, 37, 38, 39, 40 | RBAC, rutas protegidas, acceso sin token (5 skipped: rate limit, headers, refresh token — solo prod) |

#### Tests de UI (`e2e/ui/`) — 7 tests activos

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
- **CI E2E**: job `e2e` en `test.yml` activo con Oracle Instant Client + wallet, condicionado a `vars.ORACLE_E2E_ENABLED=true`; credenciales E2E en secrets `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` con fallback a `prueba@espina.com`

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
| **Semana 3** | 26 — 30 May | E2E 100% verde en CI, bug fix formulario público, SonarCloud limpio | ✅ Completado |
| **Semana 4** | 02 — 06 Jun | Revisión final, preparación para entrega al socio formador | ⏳ Pendiente |
| **Semana 5** | 09 — 13 Jun | Entrega final al socio formador | ⏳ Pendiente |

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
- Auditoría de operaciones sensibles: fire-and-forget post-response, no bloquea al cliente si falla

---

*Este documento se actualiza cada martes y jueves para mantener el timeline del proyecto.*
