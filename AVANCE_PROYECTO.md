# Reporte de Avance — Sistema de Gestión Espina Bífida

**Actualización:** 2026-06-07 (Sábado) — Editor de tarifas de membresías, Error Boundary y fix TypeScript completados; proyecto listo para entrega
**Próxima entrega:** 2026-06-05 (Jueves)
**Entrega final al socio formador:** ~semana del 2026-06-08 (una semana antes del cierre de clase)

---

## Resumen ejecutivo

Sistema web de gestión para la Asociación de Espina Bífida. Reemplaza flujos fragmentados en Excel para centralizar beneficiarios, membresías, servicios médicos, inventario, citas y reportes.

| Indicador | Estado |
|---|---|
| Cobertura de pruebas (statements) | **97.71%** |
| Cobertura de pruebas (funciones) | **95.85%** |
| Cobertura de pruebas (ramas) | **95.78%** |
| Módulos backend completados | 9 / 9 |
| Módulos frontend completados | 11 / 11 |
| Migraciones de BD | 30 / 30 |
| Archivos de prueba Jest (suites) | 58 |
| Tests Jest | 1451 |
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
| **Citas** | CRUD completo, filtros por fecha/estatus, validación de horario por especialidad (bloqueo duro) | 100% |
| **Inventario** | Artículos + categorías (Medicamentos, Insumos Médicos, Equipos Médicos), movimientos, alertas de stock mínimo, safety net comodatos | 100% |
| **Reportes** | Generación PDF/XLSX, descarga autenticada, generación automática por cron | 100% |
| **Administradores** | Auth JWT, cambio de contraseña con SMS OTP, recuperación de contraseña vía SMS OTP, roles, foto de perfil, teléfono editable | 100% |
| **Catálogos** | Servicios-catálogo, especialistas, configuración, roles | 100% |
| **Notificaciones** | Alertas automáticas de stock bajo, membresías próximas/vencidas, citas del día y **comodatos por vencer/vencidos**, job nocturno cron, panel con cards por tipo | 100% |
| **Comodatos** | Alta, seguimiento de pagos, reportes de exenciones, consulta por beneficiario | 100% |
| **Auditoría** | Registro de operaciones sensibles en `AUDITORIA_OPERACIONES` (fire-and-forget) | 100% |
| **Migraciones BD** | 28 migraciones versionadas, auto-ejecutadas al iniciar el servidor | 100% |
| **Middleware** | Auth JWT, roles RBAC, upload de fotos, manejo de errores, rate limiting, validación Zod | 100% |

### Frontend (Next.js + React + TypeScript)

| Módulo | Estado |
|---|---|
| **Dashboard** | ✅ Completo |
| **Beneficiarios** | ✅ Completo |
| **Membresías** | ✅ Completo — botón **Nueva Membresía**, tab **Historial de pagos** (últimos 30 días), monto y método de pago reales, observaciones obligatorias, ícono por método de pago, scroll en form de beneficiario |
| **Servicios** | ✅ Completo — tabla rediseñada (fila clickeable, columna artículo entregado, eliminar desde detalle), form con selector de artículo buscable, catálogo 100% dinámico sin hardcode, badges de estatus, flechas de sort dinámicas, ciclo filtro por estatus |
| **Citas** | ✅ Completo — rediseño UI: KPIs cards, tabs Agenda/Historial estilo inventario, colores pasteles por estatus, fecha humanizada, mini-cal sincronizado, horario 7am–5pm, especialidades dinámicas con filtro de slots; selector de tipo de servicio filtrado a solo Consulta Médica y Estudio Médico; bloque de costo (primera/subsecuente) oculto para Estudio Médico |
| **Inventario** | ✅ Completo — filtro por categoría, columna Precio de Lista, card de estado 4 columnas, diálogo confirmación precios rediseñado, tab Altas/Bajas con log, búsqueda normalizada (ñ/acentos), label dinámico cantidad, safety net redirige a Comodatos, comodatos registran SALIDA en inventario |
| **Reportes** | ✅ Completo — rediseño UI: barra de config en una fila, panel izquierdo h-full, botones más altos, rango de fechas en subtítulo del preview |
| **Pre-registro** | ✅ Completo |
| **Login** | ✅ Completo |
| **Gestión de admins** | ✅ Completo — incluye SMS OTP para cambio de contraseña, recuperación de contraseña y teléfono editable |
| **Comodatos** | ✅ Completo — alta, seguimiento de pagos, reporte de exenciones, integrado en sidebar |
| **Notificaciones** | ✅ Completo — campana con badge en header, panel desplegable, íconos por tipo, marcar leída / todas, **cards especiales para comodatos por vencer con días restantes** |
| **Especialidades** | ✅ Completo — rediseño UI (KPI cards, lista con acento visual y badges de frecuencia, header navy con patrón de puntos, empty state accionable), especialidades inactivas visibles en vista admin, sincronización del panel derecho tras actualizar, avisos inline de citas afectadas antes de desactivar o bloquear fecha |

### Seguridad (completado 2026-05-21 al 2026-05-22)

- `verifyToken` agregado a todas las rutas que carecían de autenticación (beneficiarios, inventario, membresías, **citas**)
- CORS environment-aware: en producción solo permite `FRONTEND_URL` + `localhost:3001`
- Rate limiting con `express-rate-limit`: `loginLimiter` (5/15 min), `publicLimiter` (10/h), `authLimiter` (120/min), `otpLimiter` (5/15 min por idAdmin)
- OTP para cambio de contraseña generado con `crypto.randomInt` (seguro criptográficamente)
- `codigoDev` (código SMS en modo dev) excluido de la respuesta en `NODE_ENV=production`
- Flujo "¿Olvidé mi contraseña?": `POST /forgot-password` + `PATCH /forgot-password/reset` + `ForgotPasswordDialog` en frontend

### Infraestructura y calidad

- Arquitectura MVC consistente — lógica SQL extraída de rutas a controllers y services
- 55 archivos de prueba Jest, **1222 tests**, cobertura 98.29% statements / 96.99% branches / 96.33% functions (superan umbral 95%)
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

### Cambios 2026-06-01 — Horarios y restricciones de especialidades en citas (SCRUM-212)

**Especialidades configurables en citas:**
- 2 tablas nuevas: `ESPECIALIDADES_HORARIO` (4 especialidades con día, hora, capacidad, tipo de frecuencia) y `ESPECIALIDADES_EXCEPCIONES` (fechas bloqueadas por especialidad). Script: `scripts/add-especialidades-horario.sql`
- Gastroenterología (Jue 10:00, cap. 2), Urología (Jue 09:30–12:00), Psicología (Vie 10:00–12:00, cap. 3), Cirugía (primer miércoles del mes, 08:00)
- `validarSlotEspecialidad()` en `citas.service.js`: bloqueo duro antes de cada INSERT — 5 códigos de error: `ESPECIALIDAD_INACTIVA`, `DIA_NO_PERMITIDO`, `HORARIO_NO_PERMITIDO`, `FECHA_BLOQUEADA`, `CAPACIDAD_LLENA`
- Detección del primer miércoles del mes: `diaSemana === 3 && fecha.getDate() <= 7`
- Compatibilidad retroactiva: nombres de especialista no registrados en BD pasan sin validación
- MVC completo: `especialidades-horario.model.js`, `especialidades-horario.service.js`, `especialidades-horario.controller.js`, rutas en `/especialidades-horario`
- Frontend: dropdown dinámico desde API, hint de horario, filtro de slots, advertencia de fecha fuera de rango
- Pantalla admin `EspecialidadesConfigSection`: edición de horario/frecuencia, alta y baja de excepciones, entrada en sidebar
- 26 nuevos tests (20 en `especialidades-horario.service.test.js` + 6 en `citas.service.test.js`) — total: 1195 tests, 100% verde

### Cambios 2026-06-01 — Clasificación cuota A/B

**Clasificación económica A/B para beneficiarios e inventario (SCRUM-211):**
- Migración 027: `TIPO_CUOTA VARCHAR2(1) CHECK('A','B')` en `BENEFICIARIOS` (nullable)
- Migración 028: `CUOTA_B NUMBER(10,2)` en `ARTICULOS` (nullable, precio reducido para cuota B)
- Registro de servicio bloqueado con HTTP 400 (`CUOTA_NO_ASIGNADA`) si `TIPO_CUOTA = NULL`
- Función `precioSegunCuota(articulo, tipoCuota)` exportada de `servicios.service.js`: devuelve `cuotaB` para beneficiarios B (si definido), `cuotaRecuperacion` en cualquier otro caso
- UI: sección "Control Interno" en diálogo de edición de beneficiario (selector A/B/Sin asignar)
- UI: campo cuotaB en diálogos de agregar/modificar artículo en inventario
- 9 nuevos tests en `servicios.service.test.js` — total: 1169 tests, 100% verde
- **Nota post-despliegue:** todos los beneficiarios existentes quedan con `TIPO_CUOTA=NULL`; clasificarlos antes de registrar servicios

### Cambios 2026-06-01 — Auditoría QA y corrección de bugs

**3 bugs corregidos detectados en auditoría estática y de flujo:**

- **ISSUE-001 (typo funcional):** `diaSemanA` → `diaSemana` en `especialidades-horario.service.js` y `.model.js`. El typo silencioso hacía que `DIA_SEMANA` nunca pudiera actualizarse via `PATCH /especialidades-horario/:id`; el valor enviado se descartaba silenciosamente y Oracle mantenía el valor anterior por el `NVL`.
- **ISSUE-002 (optional chaining):** `r.rows[0]` → `r.rows?.[0] ?? null` en `findById` y `findExcepcionByFecha` del model. Sin el optional chaining, si Oracle devuelve un objeto sin propiedad `rows` (ej. en una query de tipo DML por error), se lanzaba un `TypeError` en lugar del valor `null` esperado.
- **ISSUE-003 (bypass de validación):** `updateCita` en `citas.service.js` no llamaba a `validarSlotEspecialidad` al modificar una cita existente. Un usuario podía crear una cita válida y luego editarla vía `PATCH` para moverla a un slot bloqueado (fecha bloqueada, día no permitido, capacidad llena). Corregido: ahora re-valida cuando cambia `fecha`, `hora` o `especialista`.
- **7 tests de regresión** añadidos en `especialidades-horario.service.test.js` y `citas.service.test.js` — total: 1222 tests, 100% verde

**Clasificación geográfica (reportes):**
- Criterio urbano/rural cambiado de municipios AMM (15) a las 32 capitales de estado de México
- `municipiosAMM.js` renombrado internamente a `CAPITALES_ESTADOS`

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

### Cambios 2026-06-05 — Especialidades: rediseño UI + bug fixes + validaciones

**Rediseño UI `EspecialidadesConfigSection`:**
- 3 KPI cards al tope: Registradas / Activas / Inactivas (calculadas del array, no hardcodeadas)
- Lista de especialidades: barra de acento navy izquierda en ítem seleccionado, chip de día coloreado, badge "Mensual" en ámbar para frecuencia `MENSUAL_PRIMER_DIA`, badge Inactivo en ámbar (antes gris)
- Panel derecho: header navy con patrón de puntos (mismo estilo que dialog de Citas), íconos de los 4 bloques con color propio
- Empty state de "Fechas bloqueadas": horizontal + mensaje accionable ("¿El doctor no estará disponible? Usa el botón...")
- Vista admin carga con `?todos=true` — especialidades inactivas visibles para poder reactivarlas
- `setSelected` sincroniza con versión fresca del array tras recargar (fix: panel derecho ya no muestra estado obsoleto)

**Bug fix crítico — Oracle:**
- `activo: activo ?? null` → `activo: activo == null ? null : (activo ? 1 : 0)` en `especialidades-horario.model.js`. Oracle espera `NUMBER` (0/1) para `ACTIVO`; recibir un boolean JavaScript causaba error 500 al desactivar.

**Validación de negocio — desactivar especialidad:**
- `countCitasFuturasActivas(nombre)` en model: cuenta citas futuras no canceladas/completadas
- Antes de desactivar, si hay citas pendientes → `HTTP 400` con mensaje claro: *"No se puede desactivar 'X' porque tiene N citas pendientes próximas. Cancélalas primero en la sección de Citas."*

**Avisos inline antes de guardar:**
- Nuevos endpoints `GET /:id/citas-futuras` y `GET /:id/citas-en-fecha?fecha=` (con `verifyToken`)
- Al desmarcar "Especialidad activa" en el dialog de edición → spinner + banner ámbar con conteo de citas afectadas (o banner verde si no hay)
- Al seleccionar fecha en "Bloquear fecha" → spinner + banner ámbar si ya hay citas ese día

**Mensaje de error 500:**
- Cambiado en `api-client.ts` de "contacta a soporte técnico" a *"El sistema tuvo un error inesperado. Inténtalo más tarde."*

**Cobertura de pruebas — thresholds globales superados:**
- `especialidades-horario.service.test.js`: mock de `countCitasFuturasActivas` agregado; 16 tests nuevos para la regla de negocio de desactivación, consultas de impacto y ramas edge (`HORA_FIN null`, `motivo null`, singular vs plural)
- `citas.service.test.js`: `mockDeleteE2ECitas` extraído a variable; 9 tests nuevos para `getAllCitas`, `deleteCita`, `deleteE2ECitas` (0% funciones antes) y ramas `??` de hora por defecto, FECHA como string, `espFinal null`, `ESTATUS null`, `curp` explícito
- `especialidades-horario.routes.test.js`: 6 tests de integración para los endpoints `GET /:id/citas-futuras` y `GET /:id/citas-en-fecha` (200, 400, 401, 404)
- Resultado: **statements 97.71% · branches 95.78% · functions 95.85% · lines 97.97%** — todos ≥ 95% threshold · 1381 tests verde

### Cambios 2026-06-06 — Devolución de comodatos: temprana y tardía

**Devolución física de equipo en comodatos (`PATCH /comodatos/:id/devolucion`):**
- Migración 033: agrega columna `FECHA_DEVOLUCION_REAL DATE` (nullable) a `COMODATOS`
- El endpoint detecta automáticamente el tipo: `anticipada` (antes de fecha esperada), `tarde` (después), `aTiempo` (en la fecha) o `sinFechaEsperada`
- Responde 409 si el comodato ya tiene una devolución registrada
- Frontend: botón "Devolver equipo" visible solo cuando `estatus === "Activo"` y sin devolución previa; muestra badge con tipo de devolución y fecha real tras confirmar

### Cambios 2026-06-06 — Rediseño UX: Registrar Pago / Perdonar Deuda en Comodatos

**Rediseño completo del flujo `PagoDialog` (`frontend/components/sections/comodatos.tsx`):**
- Reemplaza checkbox de "exención" por dos tarjetas visuales clickeables: **💳 Pago recibido** y **🎁 Perdonar deuda** — obliga a Lupita a elegir conscientemente
- Barra de progreso con **Total · Cubierto · Saldo** y porcentaje completado visible de un vistazo
- Botón **"Saldo completo ($$)"** para rellenar el monto pendiente con un solo clic
- **Preview dinámico**: muestra cuánto quedará pendiente después del movimiento, o "¡Comodato liquidado!" si queda en cero
- Validación en tiempo real: bloquea el envío si el monto supera el saldo
- Lenguaje llano: "Perdonar deuda" en lugar de "exención"; aviso explicativo en ámbar
- Caso donación total (`montoTotal null`) manejado con banner verde en lugar de progress bar
- Fix: notas del pago ahora se muestran en el historial de pagos del diálogo de detalle con prefijo "Nota:" en negrita para mayor visibilidad

### Cambios 2026-06-05 — Fix: Membresía Anual oculta en registro de servicios

**Bug fix — formulario de registro de servicios (`frontend/components/sections/servicios.tsx`):**
- "Membresía Anual" ya no aparece como opción en el selector de tipo de servicio al registrar un nuevo servicio
- Causa raíz: migración 031 insertó "Membresía Anual" en `SERVICIOS_CATALOGO` con `TIPO_SERVICIO = 'SERVICIO'` para vincularla al historial de servicios; el filtro anterior solo excluía `COMODATO`
- Fix: se agrega `!/membresia/i.test(t.nombre)` al `catalogoFiltrado` — sin cambios en backend ni BD
- "Membresía Anual" sigue visible en el historial de servicios registrados (comportamiento correcto)

### Cambios 2026-06-05 — Citas: filtro de tipos de servicio y bloque de costo condicional

**Selector de tipo de servicio filtrado (`frontend/components/sections/citas.tsx`):**
- El Select de "Tipo de servicio" en el formulario de agendar cita ahora muestra únicamente las opciones que contienen "consulta" o "estudio" en su nombre (regex case-insensitive)
- Se eliminan de la vista: Medicamento, Insumos Médicos, Otros y Membresía Anual — tipos que no aplican para citas
- El filtro usa `.filter(t => /consulta/i.test(t.nombre) || /estudio/i.test(t.nombre))` sobre el catálogo dinámico ya cargado desde la API — sin cambios en backend

**Bloque de costo condicional:**
- El bloque "Tipo de consulta / Costo" (Primera cita $350 / Subsecuente $300) solo se renderiza cuando el tipo seleccionado coincide con `/consulta/i`
- Para "Estudio Médico" el bloque no aparece — no hay tarifa diferenciada por número de consultas previas
- La condición evalúa el nombre del tipo seleccionado en el catálogo para mantenerlo desacoplado del ID de BD

| Archivo | Qué hace |
|---|---|
| `frontend/components/sections/citas.tsx` | Filtro de tipos de servicio (solo Consulta/Estudio) y visibilidad condicional del bloque de costo |

---

### Cambios 2026-06-07 — Editor de tarifas de membresías

- Migración 035: inserta `PRECIO_MEMBRESIA_NUEVO_INGRESO=200` y `PRECIO_MEMBRESIA_REINSCRIPCION=150` en `CONFIGURACION` (MERGE INTO idempotente)
- `configuracion.service.js`: `getValorNumerico(clave)` y `updateValor(clave, valor)` con whitelist de claves editables
- `PATCH /configuracion/:clave`: requiere `verifyToken` + `checkRole(1)` — solo Administrador
- `membresias.service.js`: lee precios desde CONFIGURACION con `Promise.allSettled` y fallback $200/$150
- Frontend: botón "Tarifas" en barra de acciones (solo admin), dialog de edición con selector de tarifa + campo de monto, AlertDialog de confirmación cuadrado con icono de alerta

### Cambios 2026-06-07 — Error Boundary y fix TypeScript

- `frontend/components/error-boundary.tsx`: componente clase con `getDerivedStateFromError` / `componentDidCatch`; muestra mensaje amigable y botón "Reintentar" si una sección falla en el render
- `key={activeSection}` en el wrapper: el boundary se resetea automáticamente al cambiar de sección
- `frontend/services/beneficiarios.ts`: `tipo: string` → `tipo?: string` — corrige error de TypeScript preexistente (campo puede ser `undefined` cuando el beneficiario no tiene tipo de espina bífida registrado)
- TypeScript: **0 errores** en todo el frontend

## 🔄 En progreso / Parcialmente terminado

| Área | Detalle | Prioridad |
|---|---|---|
| **Auditoría de hardcodes** | Revisión de valores fijos en frontend y backend; centralización en constantes o tabla CONFIGURACION | Media |

### Cambios 2026-06-07 — Auditoría hardcodes: citas

- `src/config/precios.js` — nueva fuente central para precios base de citas (`PRECIO_PRIMERA_CITA = 350`, `PRECIO_SUBSECUENTE_CITA = 300`); `citas.service.js` importa desde ahí
- UI formulario nueva cita: botón "Cambiar costo de esta cita" visible a todo el ancho con ícono de lápiz; al pulsar abre dialog con campo de monto grande, botones Cancelar/Confirmar; badge "Precio ajustado" en ámbar si el staff modificó el costo
- Override se resetea al cambiar beneficiario o cerrar el dialog; el backend ya aceptaba `costo` opcional, sin cambios en lógica de negocio

### Cambios 2026-06-07 — Fix Estudio Médico en formulario de citas

- Derivados booleanos `esConsulta` / `esEstudio` calculados con `useMemo` sobre el nombre del tipo seleccionado
- Selector de especialidad: oculto completamente para Estudio Médico (solo aparece en Consulta Médica)
- Campo de precio manual: visible solo para Estudio Médico — input numérico libre con prefijo `$`
- Botón Smart Slot: envuelto en `{esConsulta && ...}`, invisible para estudios
- Selector de hora: condicional — `<Input type="time">` libre para estudios; `<select>` con disponibilidad de slots para consultas
- Validación `handleGuardar`: especialista y `validateSlot` solo se exigen para consultas
- Total: 1451 tests en 58 suites — 100% verde

### Cambios 2026-06-07 — Tests casos borde scheduler de reportes

- `reporteScheduler.test.js`: 11 tests nuevos — año bisiesto (feb-29), meses de 30 y 31 días, error en `generarPDF`/`fs.mkdir`/`guardarRegistro` (verificando que el scheduler no crashea), formato de rutas `rutaPdf`/`rutaXlsx`, `console.log` de éxito
- Total: **1451 tests** en **58 suites** — 100% verde
- Scheduler de reportes marcado como **completado**

### Cambios 2026-06-01 — Inventario: edición de precios + rediseño diálogo

**Edición de precios en inventario:**
- Campo **"Cuota de recuperación"** (precio subsidiado, `CUOTA_RECUPERACION`) editable desde el diálogo "Modificar artículo"
- Campo **"Precio real"** (`CUOTA_B`) editable en el mismo diálogo — antes solo existía en el formulario de alta
- Diálogo de confirmación al cambiar cuota de recuperación: muestra precio actual → precio nuevo antes de guardar
- Ambas cuotas **obligatorias** al crear artículo nuevo y al editar — validación en frontend y backend ya lo soportaba
- Labels correctos en toda la UI: "Cuota de recuperación" (subsidiada) y "Precio real" (precio completo)

**Rediseño diálogo "Modificar artículo":**
- **Card de estado** al tope: stock actual (coloreado rojo/ámbar/normal), cuota de recuperación, stock mínimo — de un vistazo
- **Toggle ENTRADA / SALIDA** reemplaza el campo de cantidad con signo negativo — más claro para usuarios no técnicos
- Secciones agrupadas con tarjeta (`bg-muted/20 rounded-xl border`): "Movimiento de stock" separado de "Configuración del artículo"
- Precios arriba del stock mínimo (más importante visualmente)
- Símbolo `$` como prefijo visual en campos de precio
- Scroll habilitado en el diálogo (`max-h-[90vh] overflow-y-auto`)

**Hallazgo técnico — `precioSegunCuota` sin conectar:**
- La función `precioSegunCuota(articulo, tipoCuota)` en `src/services/servicios.service.js` está implementada, exportada y probada, pero **nunca se llama en producción**
- El campo `TIPO_CUOTA` en `BENEFICIARIOS` (A = subsidiado, B = precio real) es editable en el formulario de beneficiario pero tampoco afecta ningún cálculo automático
- Al registrar un servicio con artículo (medicamento/insumo), el costo se ingresa **manualmente** — el sistema no auto-rellena desde el precio del artículo
- **Oportunidad identificada**: conectar `precioSegunCuota` al formulario de registro de servicios para que al seleccionar un artículo y un beneficiario, el monto se pre-rellene automáticamente según su clasificación A/B

### Cambios 2026-06-04 (sesión tarde) — Servicios, Notificaciones, UX global

**Servicios — tabla y diálogo rediseñados:**
- Tabla reducida a 5 columnas (Beneficiario, Servicio, Fecha, Monto, Estatus) estilo Comodatos
- Tooltip flotante glass al hacer hover en filas: "Click para ver más detalles"
- Diálogo de detalle rediseñado: grid 2 cols, mini-cards para Fecha/Monto/Estatus, cards para artículo+cantidad, "Cambiar estatus" en el diálogo (no en la tabla)
- Tooltip idéntico agregado también en tabla de Comodatos

**Servicios — formulario de registro:**
- Botón "Programar cita y registrar" eliminado (registraba sin guardar servicio); reemplazado por flujo correcto: registrar primero, luego preguntar
- Dialog post-registro de "Consulta médica": "¿Agendar cita en el calendario?" con prefill a Citas
- Dialog post-eliminación de servicio consulta: "¿Cancelar también la cita?"
- Campo "Tipo de estudio médico" (datalist) cuando se selecciona "Estudio médico"
- Chips de precio (Cuota de recuperación / Precio de lista) al seleccionar artículo; precio elegido se envía al backend
- Backend: respeta el costo enviado por el frontend para consumibles (ya no lo sobreescribe siempre)
- Scroll arreglado en dropdown de artículos (onWheel stopPropagation)

**Citas:**
- Dialog post-cancelación de cita: "¿Cancelar también el servicio asociado?"
- Fix: nombre de beneficiario se auto-llena al llegar desde Servicios vía prefill

**Notificaciones:**
- Cascade delete: al eliminar un beneficiario (hardDelete), se eliminan también sus notificaciones
- Scheduler nocturno: limpia automáticamente notificaciones huérfanas (CURP ya no existe en BENEFICIARIOS)

**Inventario E2E cleanup:**
- `DELETE /inventario/e2e-cleanup` ahora también borra artículos E2E, sus movimientos y entradas en ARTICULOS_LOG
- `deleteE2ELogs`, `deleteE2EArticulos` agregados a modelos

**UX global:**
- Títulos de todas las secciones unificados a `text-xl font-bold tracking-tight`
- Cajita con ícono removida de Beneficiarios y Administradores
- "Resumen financiero" renombrado a "Ingresos por membresías" en dashboard
- Barra de búsqueda de Beneficiarios ampliada (w-64 → w-80)

**Beneficiarios:**
- Campo "Tipo de cuota" (A/B/Sin asignar) agregado al formulario de **creación** de beneficiario (ya existía solo en edición)

### Cambios 2026-06-04 — Mejoras UX/funcionales de Inventario

**Formulario de alta:**
- Eliminado campo "Clave del artículo" — el ID lo asigna el trigger Oracle automáticamente
- Nuevo campo **"Motivo del alta"** (opcional) registrado en `ARTICULOS_LOG`

**Nomenclatura de precios unificada:**
- `CUOTA_RECUPERACION` → "Cuota de Recuperación" (subsidiado) en toda la UI
- `CUOTA_B` → "Precio de Lista" (precio de mercado) en toda la UI
- Columna "Precio de Lista" agregada a la tabla de artículos con sort
- Card de estado en diálogo Modificar: **4 columnas iguales** (Stock · Cuota Rec. · Precio Lista · Mínimo)
- Diálogo de confirmación de precio: rediseñado con fondo ámbar, valores grandes, aplica para AMBOS precios
- Un solo diálogo de confirmación cuando cambian los dos precios simultáneamente

**Búsqueda mejorada:**
- Normalización de acentos y letra `ñ` en búsqueda de artículos
- Resultados priorizados: los que empiezan con el término van al tope
- Scroll habilitado en dropdown de eliminar (fix `onWheel stopPropagation`)

**UX movimiento de stock:**
- Label dinámico: "Cantidad a agregar" (ENTRADA) / "Cantidad a retirar" (SALIDA)

**Redirección safety net:**
- Equipos Médicos → "Registrar comodato" ahora redirige a la sección Comodatos (antes iba a Servicios)

**Historial de altas y bajas:**
- Nueva tabla `ARTICULOS_LOG` (migración 030) con secuencia y trigger
- Al agregar artículo → se registra evento ALTA con motivo opcional
- Al eliminar artículo → se registra evento BAJA con motivo opcional (nuevo campo en diálogo)
- Tab **"Altas/Bajas"** en la sección Inventario: tabla con fecha, artículo, tipo (badge) y motivo
- Endpoint `GET /articulos/log` con filtros `tipo` y `dias`

**Comodatos → inventario:**
- Al crear un comodato se registra automáticamente una SALIDA en `MOVIMIENTOS_INVENTARIO` con motivo `"Comodato a [Nombre Beneficiario]"`
- Historial de inventario ahora refleja los préstamos de equipos

**Descripciones user-friendly en historial:**
- Consumo por servicio: `"Consumo de [Nombre Beneficiario]"` (antes: "Consumo por servicio 1136")
- Cancelación de servicio: `"Cancelación de consumo – [Nombre Beneficiario]"` (antes: "Reversa por eliminación de servicio ID: 1122")

**Tests:** +129 tests nuevos/actualizados, cobertura 97.56% statements / 95.19% functions / 95.97% branches

---

### Cambios 2026-06-01 — Refactor Comodatos + UI (Fases 0–3)

**Fase 0 — Migración arquitectural:**
- Migración 025: `FECHA_DEVOLUCION_ESPERADA DATE` agregada a tabla `COMODATOS`
- Scheduler de notificaciones `checkComodatosPorVencer` migrado a leer de `COMODATOS` (ya no `SERVICIOS`)
- Eliminados `GET /servicios/comodatos` y `PATCH /servicios/:id/devolucion` con sus modelos/services/tests
- Removidos `PRESTADO`/`DEVUELTO` del ciclo de estatus en UI de servicios y schema Zod
- Migración 026: elimina "Préstamo de equipo" de `SERVICIOS_CATALOGO` (redirige servicios existentes a "Otros")

**Fase 1 — UI Comodatos:**
- Botón "Nuevo comodato" → azul `#0f4c81`
- Headers tabla: íconos + UPPERCASE + flechas sort dinámicas
- Botón "Actualizar" con texto
- Tabs "Lista" / "Reporte de exenciones" → estilo navy rounded-xl, fade 180ms
- Búsqueda de beneficiario → texto libre con sugerencias en tiempo real (`startsWith`)
- Selector de equipo médico → Popover+Command buscable filtrado a Equipos Médicos
- Campo `FECHA_DEVOLUCION_ESPERADA` en formulario de nuevo comodato
- Tabla simplificada: 6 columnas (ID, Beneficiario, Equipo, Saldo, Estatus, Acción)
- Panel de detalle al hacer click en fila: montos desglosados, fecha devolución con días restantes, notas, historial de pagos, botones Registrar pago / Cancelar

**Fase 2 — Selector de artículos en Servicios:**
- Tipo Medicamentos → Popover+Command filtrado solo a categoría Medicamentos
- Tipo Insumos médicos → Popover+Command filtrado solo a categoría Insumos Médicos
- Reset automático del artículo seleccionado al cambiar tipo de servicio

**Fase 3 — Tabs en Servicios:**
- Tab "Resumen": KPIs + gráfica de barras (monto por mes) + donut (servicios por tipo)
- Tab "Servicios registrados": tabla con filtros, sort y paginación

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
| 3a | Dos tabs: "Resumen" (dashboard con KPIs y gráficas) + "Servicios Registrados" (tabla) | ✅ Listo |

---

## ❌ Lo que falta por hacer

### Prioridad alta — Bugs / UX críticos

*(Sin ítems pendientes — Fix Estudio Médico completado 2026-06-07)*

### Prioridad media — UX / UI

| Tarea | Descripción |
|---|---|
| **Decidir sidebar Configuración vs menú header** | Actualmente existen ambos (sidebar + header dropdown). Coordinar con el equipo cuál conservar o si mantener los dos. |

### Prioridad media — Citas

*(Sin ítems pendientes en esta prioridad)*

### Prioridad media — Servicios

*(Sin ítems pendientes en esta prioridad)*


### Prioridad media — Notificaciones futuras

*(Sin ítems pendientes en esta prioridad)*

### Prioridad media — Calidad de código

*(Sin ítems pendientes — hardcodes de precios resueltos con CONFIGURACION; umbrales restantes son constantes de negocio estables)*

### Prioridad baja (nice-to-have)

| Tarea | Descripción |
|---|---|
| ~~Error Boundaries en frontend~~ | ✅ Completado 2026-06-07 |
| Estrategia de respaldo de BD | Pendiente — Oracle Cloud tiene backups automáticos; documentación formal por confirmar con el socio formador |

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
- `precioSegunCuota(articulo, tipoCuota)` en `src/services/servicios.service.js` — implementada y con tests, pero **nunca llamada en producción**. Diseñada para auto-seleccionar precio según `TIPO_CUOTA` del beneficiario (A = cuota de recuperación, B = precio real). Candidata a conectar al formulario de registro de servicios.
- `BENEFICIARIOS.TIPO_CUOTA` — campo A/B editable en el formulario de beneficiario, pero actualmente no afecta ningún cálculo automático en el sistema

---

*Este documento se actualiza cada martes y jueves para mantener el timeline del proyecto.*
