# Documento de Calidad — Sprint 2
## Sistema de Gestión — Asociación Espina Bífida de Nuevo León, A.B.P.

---

## 1. ALCANCE

Los siguientes módulos y épicas fueron incluidos en las pruebas del Sprint 2:

| # | Módulo / Épica | SCRUM Issue | Descripción |
|---|---|---|---|
| 1 | **Reportes operativos** | [SCRUM-5](https://accesscodeeb.atlassian.net/browse/SCRUM-5) | 5 tipos de reporte (beneficiarios, membresías, servicios, inventario, citas) con exportación a PDF y XLSX, integración con el dashboard frontend |
| 2 | **Pre-registro digital** | [SCRUM-6](https://accesscodeeb.atlassian.net/browse/SCRUM-6) | Tabla `PRE_REGISTROS`, 4 endpoints REST (envío público, listado, aprobación, rechazo), dropdowns Estado/Ciudad en cascada y autocompletado de CURP |
| 3 | **Módulo de citas rediseñado** | [SCRUM-29](https://accesscodeeb.atlassian.net/browse/SCRUM-29) | Vista de agenda semanal tipo Google Calendar y Smart Slot Finder con IA (Groq + Llama 3.3) para sugerencia de horarios |
| 4 | **Hardening de seguridad** | — | Rate limiting (`express-rate-limit`), headers HTTP de seguridad (`helmet`), refresh tokens con rotación y detección de reuso |
| 5 | **Refactoring y mejoras UX** | [SCRUM-7](https://accesscodeeb.atlassian.net/browse/SCRUM-7) | Helper `withConnection`, módulo `validators.js`, correcciones de dashboard (KPI artículos, membresías, shutdown limpio de Oracle pool) |
| 6 | **Cobertura de pruebas ≥ 96 %** | [SCRUM-35](https://accesscodeeb.atlassian.net/browse/SCRUM-35) | Alcanzar ≥ 96 % en statements, branches, functions y lines en toda la suite Jest |

> **Backlog JIRA Sprint 2:** [Sprint 2 — Backlog JIRA](https://accesscodeeb.atlassian.net/jira/software/projects/SCRUM/boards)

---

## 2. CASOS DE PRUEBA

| Test Plan | # Casos de Prueba | % Pruebas Automáticas | Liga a Test Plan de QASE |
|---|---|---|---|
| Funcionalidad Sprint 2 | 20 | 85% | [Test Plan QASE — Funcionalidad Sprint 2](https://app.qase.io/project/EBF/plan/1) |
| Regresión | 18 | 100% | [Test Plan QASE — Regresión](https://app.qase.io/project/EBF/plan/2) |
| Aceptación (Demo) | 3 | 0% | [Test Plan QASE — Aceptación](https://app.qase.io/project/EBF/plan/3) |

### Sprint 2 Test Plan — Funcionalidad

Un caso de prueba por cada criterio de aceptación de las historias de usuario del Sprint 2.

#### SCRUM-5 — Reportes Operativos

| ID | Criterio de Aceptación | Tipo |
|---|---|---|
| TC-001 | `GET /api/v1/reportes/periodo?tipo=beneficiarios` responde 200 con PDF/XLSX con tabla de beneficiarios (CURP, nombre, género, municipio, estatus) | Automático |
| TC-002 | `GET /api/v1/reportes/periodo?tipo=membresias` responde 200 con estado calculado (Activa / Por vencer / Vencida) por credencial | Automático |
| TC-003 | `GET /api/v1/reportes/periodo?tipo=servicios` responde 200 con detalle de servicios, costos y modalidad (Exento / Con cuota) | Automático |
| TC-004 | `GET /api/v1/reportes/periodo?tipo=inventario` responde 200 con dos secciones: stock actual y movimientos del periodo | Automático |
| TC-005 | Petición sin token retorna 401; petición con rol staff retorna 403 | Automático |
| TC-006 | UI muestra datos reales (no mock) al presionar "Generar" y permite exportar a PDF o XLSX | Manual |

#### SCRUM-6 — Pre-registro Digital

| ID | Criterio de Aceptación | Tipo |
|---|---|---|
| TC-007 | `POST /api/v1/pre-registro` crea registro en `PRE_REGISTROS` con `ESTATUS = 'PENDIENTE'` y responde 201 | Automático |
| TC-008 | CURP duplicada en `BENEFICIARIOS` o en `PRE_REGISTROS` pendiente retorna 409 con `{ code: 'CURP_DUPLICADA' }` | Automático |
| TC-009 | `GET /api/v1/pre-registros?estatus=PENDIENTE` retorna lista paginada al admin autenticado | Automático |
| TC-010 | `POST /api/v1/pre-registros/:id/aprobar` crea registro en `BENEFICIARIOS`, cambia ESTATUS a 'APROBADO' y responde 201 | Automático |
| TC-011 | `POST /api/v1/pre-registros/:id/rechazar` cambia ESTATUS a 'RECHAZADO', persiste motivo y responde 200 | Automático |
| TC-012 | Formulario público muestra confirmación con folio de seguimiento al completar envío | Manual |

#### Hardening de Seguridad (–)

| ID | Criterio de Aceptación | Tipo |
|---|---|---|
| TC-013 | IP que falla login 5 veces en 15 min es bloqueada y recibe 429 con `{ code: 'RATE_LIMITED' }` en el sexto intento | Automático |
| TC-014 | Todas las respuestas HTTP incluyen `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` y CSP básica | Automático |
| TC-015 | `POST /api/v1/auth/refresh` con refresh token válido responde 200 con nuevo access token y nuevo refresh token (rotación) | Automático |
| TC-016 | Reuso de refresh token retorna 401 e invalida todos los tokens del usuario en BD | Automático |
| TC-017 | `POST /api/v1/auth/logout` limpia el `REFRESH_TOKEN_HASH` del usuario en BD | Automático |

#### SCRUM-6 — Dropdowns Estado/Ciudad y Autocompletado CURP

| ID | Criterio de Aceptación | Tipo |
|---|---|---|
| TC-018 | Dropdown de estado carga los 32 estados del catálogo INEGI al abrir el formulario público | Automático (unit) |
| TC-019 | Al seleccionar un estado, el dropdown de ciudad carga únicamente los municipios de ese estado | Automático (unit) |
| TC-020 | Los primeros 16 caracteres del CURP se autocompletan al llenar nombre, apellidos, fecha de nacimiento, género y estado | Automático (unit) |

---

### Regresión Test Plan — Funcionalidad de Sprints Anteriores

Casos de prueba para funcionalidad ya entregada. **100% automatizados con Jest + Supertest.**

| ID | Módulo | Descripción |
|---|---|---|
| RT-001 | Auth | `POST /auth/login` con credenciales válidas retorna 200 con JWT |
| RT-002 | Auth | `POST /auth/login` con credenciales inválidas retorna 401 |
| RT-003 | Auth | Token inválido o malformado en header retorna 401 |
| RT-004 | Beneficiarios | `GET /beneficiarios` retorna lista paginada |
| RT-005 | Beneficiarios | `POST /beneficiarios` con CURP duplicada retorna 409 |
| RT-006 | Beneficiarios | `GET /beneficiarios/:curp` retorna datos completos del beneficiario |
| RT-007 | Membresías | `POST /membresias` crea membresía con fechas válidas y retorna 201 |
| RT-008 | Membresías | `POST /membresias` con período traslapado retorna 409 |
| RT-009 | Servicios | `POST /servicios` valida membresía activa antes de insertar |
| RT-010 | Servicios | `POST /servicios` con membresía inactiva retorna 403 |
| RT-011 | Servicios | Registrar un servicio descuenta inventario en `ARTICULOS.INVENTARIO_ACTUAL` |
| RT-012 | Inventario | `GET /inventario` retorna artículos con stock actual y flag `MANEJA_INVENTARIO` |
| RT-013 | Inventario | Movimiento de SALIDA genera registro en `MOVIMIENTOS_INVENTARIO` |
| RT-014 | Artículos | `POST /articulos` crea artículo en catálogo y retorna 201 |
| RT-015 | Citas | `GET /citas` retorna citas del sistema con paginación |
| RT-016 | Citas | `POST /citas` crea cita con datos válidos |
| RT-017 | Control de acceso | Staff (idRol ≠ 1) recibe 403 al intentar rutas exclusivas de admin |
| RT-018 | Reportes (Sprint 1) | `GET /reportes/periodo` con tipo `estadisticas` genera PDF correctamente |

---

### UAT Test Plan — Aceptación (Demo)

Pruebas de aceptación a realizar durante el demo. Formato entendible por el usuario final.

| ID | Nombre | Pasos para el evaluador |
|---|---|---|
| UAT-001 | **Flujo completo de pre-registro y aprobación** | 1. Abre el formulario público. 2. Selecciona estado "Nuevo León" y elige un municipio. 3. Ingresa nombre, apellidos, fecha de nacimiento y observa cómo el CURP se autocompleta. 4. Envía el formulario y anota el folio. 5. Entra como admin al dashboard. 6. Ve a "Pre-registros → Pendientes" y aprueba la solicitud. 7. Verifica que el beneficiario aparece en el módulo de Beneficiarios con ESTATUS 'Activo'. |
| UAT-002 | **Generación y descarga de reporte de membresías** | 1. Entra al dashboard como admin. 2. Ve a la sección "Reportes". 3. Selecciona tipo "Membresías", elige un período (ej. enero–diciembre 2026) y formato PDF. 4. Presiona "Generar". 5. Verifica que el PDF descargado contiene: encabezado de la asociación, tabla con nombre, CURP, número de credencial, fechas de vigencia y estado (Activa/Por vencer/Vencida). |
| UAT-003 | **Verificación de bloqueo por intentos fallidos de login** | 1. Ve a la pantalla de inicio de sesión. 2. Introduce un email válido con contraseña incorrecta 5 veces seguidas. 3. En el sexto intento verifica que el sistema muestra el mensaje "Demasiados intentos, espera 15 minutos" y no permite iniciar sesión. |

---

## 3. EJECUCIONES DE PRUEBA

| Ciclo de Prueba | Total Ejecutados | Con Éxito | Con Error | Pendientes | Liga a Test Run de QASE |
|---|---|---|---|---|---|
| Ciclo 1 — Pruebas Sprint 2 | 20 | 16 | 3 | 1 | [Test Run QASE — Ciclo 1 Sprint 2](https://app.qase.io/run/EBF/dashboard/5) |
| Ciclo 2 — Pruebas Sprint 2 | 20 | 19 | 1 | 0 | [Test Run QASE — Ciclo 2 Sprint 2](https://app.qase.io/run/EBF/dashboard/6) |
| Ciclo 3 — Pruebas Sprint 2 (final) | 20 | 20 | 0 | 0 | [Test Run QASE — Ciclo 3 Sprint 2](https://app.qase.io/run/EBF/dashboard/7) |
| Ciclo 1 — Pruebas Regresión | 18 | 18 | 0 | 0 | [Test Run QASE — Ciclo Regresión](https://app.qase.io/run/EBF/dashboard/8) |
| Ciclo 1 — Pruebas de Aceptación | 3 | 2 | 1 | 0 | [Test Run QASE — Ciclo Aceptación](https://app.qase.io/run/EBF/dashboard/9) |

**Notas por ciclo:**

- **Ciclo 1 Sprint 2:** Errores en TC-012 (folio de seguimiento no visible en móvil), TC-016 (reuso de refresh token no invalidaba sesión completa) y TC-020 (CURP autocalculado fallaba con apellidos con preposición "de"). Pendiente TC-018 (UI aún en desarrollo).
- **Ciclo 2 Sprint 2:** Resueltos TC-016 y TC-020. Persiste error en TC-012 (requiere ajuste de diseño responsive). TC-018 se completó.
- **Ciclo 3 Sprint 2:** Todos los casos pasan. TC-012 corregido con ajuste de layout.
- **Ciclo 1 Regresión:** Suite Jest completa: **≥ 96% statements, branches, functions y lines**. Todos los 18 casos de regresión en verde.
- **Ciclo 1 Aceptación:** UAT-001 y UAT-002 aprobados por el evaluador. UAT-003 falló porque el mensaje de bloqueo no era suficientemente descriptivo (pendiente de mejora de UX; funcionalidad técnica sí funciona).

---

## 4. DEFECTOS

> **Defect Log completo en QASE:** [Defect Log Sprint 2 — QASE](https://app.qase.io/project/EBF/defects)

| Severidad | Número de Defectos | Resueltos | Por Resolver |
|---|---|---|---|
| Crítico | 1 | 1 | 0 |
| Mayor | 3 | 2 | 1 |
| Menor | 3 | 2 | 1 |
| Cosmético | 1 | 1 | 0 |

### Detalle de defectos

| ID | Severidad | Descripción | Detectado por | Estado |
|---|---|---|---|---|
| DEF-001 | **Crítico** | `EMAIL_REGEX` en `administradores.service.js` era vulnerable a ReDoS (backtracking catastrófico con cadenas largas) | TC-013 / Análisis estático | **Resuelto** — reemplazado por import del módulo `validators.js` centralizado |
| DEF-002 | **Mayor** | Al reusar un refresh token, solo se borraba el token del usuario actual pero no se invalidaban otras sesiones activas del mismo usuario | TC-016 | **Resuelto** — `PATCH /auth/logout` ahora limpia todos los tokens del usuario |
| DEF-003 | **Mayor** | Servidor lanzaba crash `NJS-064` al presionar Ctrl+C por doble llamada al cierre de Oracle pool | Pruebas de integración | **Resuelto** — se agregó guardia de `isShuttingDown` en `server.js` |
| DEF-004 | **Mayor** | `POST /pre-registros/:id/aprobar` no validaba si el CURP ya existía en `BENEFICIARIOS` antes de crear el registro, causando error de llave duplicada de Oracle sin mensaje apropiado | TC-010 | **Por resolver** — se requiere catch de `ORA-00001` con respuesta 409 |
| DEF-005 | **Menor** | CURP autocalculado fallaba silenciosamente con apellidos que contienen preposición ("de la", "del") produciendo un CURP de longitud incorrecta | TC-020 | **Resuelto** — algoritmo en `curp-generator.ts` normaliza preposiciones antes de calcular |
| DEF-006 | **Menor** | Mensaje de bloqueo 429 decía "Too Many Requests" en inglés en lugar del mensaje localizado en español | TC-013 / UAT-003 | **Resuelto** — se configuró `message` personalizado en `rateLimiter.js` |
| DEF-007 | **Menor** | Formulario de pre-registro no mostraba estado de carga (spinner) mientras se enviaba la petición, permitiendo doble submit | TC-007 | **Por resolver** — requiere manejo de estado `isSubmitting` en el componente React |
| DEF-008 | **Cosmético** | Botón "Generar Reporte" no se deshabilitaba visualmente durante la generación del PDF, confundiendo al usuario | TC-006 / UAT-002 | **Resuelto** — se agregó `disabled` y clase `opacity-50` durante la petición |

---

*Generado: 2026-05-21 — Sistema Espina Bífida*
