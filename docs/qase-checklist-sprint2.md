# Checklist QASE — Entrega Sprint 2

> URL: https://app.qase.io/project/EB
> Todo debe quedar bajo el proyecto **EB**

---

## 1. Crear los 3 Test Plans

Ve a **Test Plans → Create Plan**

### Plan 1 — Funcionalidad Sprint 2
- **Título:** `Funcionalidad Sprint 2`
- Agrega los siguientes 20 casos de prueba (ver sección 2)

### Plan 2 — Regresión
- **Título:** `Regresión`
- Agrega los 18 casos RT-001 a RT-018

### Plan 3 — Aceptación (Demo)
- **Título:** `Aceptación (Demo)`
- Agrega los 3 casos UAT-001 a UAT-003

---

## 2. Crear los casos de prueba

Ve a **Test Cases → Create Case**

### Plan 1 — Funcionalidad Sprint 2 (20 casos)

| ID | Título | Suite sugerida | Tipo |
|---|---|---|---|
| TC-001 | Reporte de beneficiarios retorna PDF/XLSX 200 | Reportes | Automático |
| TC-002 | Reporte de membresías con estado calculado | Reportes | Automático |
| TC-003 | Reporte de servicios con costos y modalidad | Reportes | Automático |
| TC-004 | Reporte de inventario con stock y movimientos | Reportes | Automático |
| TC-005 | Sin token retorna 401; rol staff retorna 403 en reportes | Reportes | Automático |
| TC-006 | UI genera reporte real y permite exportar | Reportes | Manual |
| TC-007 | POST /pre-registro crea PRE_REGISTROS con PENDIENTE y 201 | Pre-registro | Automático |
| TC-008 | CURP duplicada retorna 409 CURP_DUPLICADA | Pre-registro | Automático |
| TC-009 | GET /pre-registros?estatus=PENDIENTE retorna lista paginada | Pre-registro | Automático |
| TC-010 | Aprobar pre-registro crea BENEFICIARIOS y retorna 201 | Pre-registro | Automático |
| TC-011 | Rechazar pre-registro persiste motivo y retorna 200 | Pre-registro | Automático |
| TC-012 | Formulario público muestra folio de seguimiento | Pre-registro | Manual |
| TC-013 | 5 intentos fallidos bloquean IP con 429 RATE_LIMITED | Seguridad | Automático |
| TC-014 | Headers HTTP incluyen X-Frame-Options, nosniff y CSP | Seguridad | Automático |
| TC-015 | Refresh token válido retorna nuevo access + refresh (rotación) | Seguridad | Automático |
| TC-016 | Reuso de refresh token retorna 401 e invalida todas las sesiones | Seguridad | Automático |
| TC-017 | POST /auth/logout limpia REFRESH_TOKEN_HASH en BD | Seguridad | Automático |
| TC-018 | Dropdown de estado carga 32 estados INEGI | Pre-registro UI | Automático (unit) |
| TC-019 | Al seleccionar estado, ciudad carga municipios del estado | Pre-registro UI | Automático (unit) |
| TC-020 | CURP se autocalcula al llenar nombre, apellidos, fecha, género y estado | Pre-registro UI | Automático (unit) |

### Plan 2 — Regresión (18 casos)

| ID | Título | Suite sugerida |
|---|---|---|
| RT-001 | Login con credenciales válidas retorna 200 + JWT | Auth |
| RT-002 | Login con credenciales inválidas retorna 401 | Auth |
| RT-003 | Token inválido o malformado retorna 401 | Auth |
| RT-004 | GET /beneficiarios retorna lista paginada | Beneficiarios |
| RT-005 | POST /beneficiarios con CURP duplicada retorna 409 | Beneficiarios |
| RT-006 | GET /beneficiarios/:curp retorna datos completos | Beneficiarios |
| RT-007 | POST /membresias crea membresía válida y retorna 201 | Membresías |
| RT-008 | POST /membresias con período traslapado retorna 409 | Membresías |
| RT-009 | POST /servicios valida membresía activa antes de insertar | Servicios |
| RT-010 | POST /servicios con membresía inactiva retorna 403 | Servicios |
| RT-011 | Registrar servicio descuenta ARTICULOS.INVENTARIO_ACTUAL | Servicios |
| RT-012 | GET /inventario retorna artículos con stock y MANEJA_INVENTARIO | Inventario |
| RT-013 | Movimiento SALIDA genera registro en MOVIMIENTOS_INVENTARIO | Inventario |
| RT-014 | POST /articulos crea artículo en catálogo y retorna 201 | Artículos |
| RT-015 | GET /citas retorna citas con paginación | Citas |
| RT-016 | POST /citas crea cita con datos válidos | Citas |
| RT-017 | Staff (idRol ≠ 1) recibe 403 en rutas de admin | Control de acceso |
| RT-018 | GET /reportes/periodo con tipo estadisticas genera PDF | Reportes |

### Plan 3 — Aceptación UAT (3 casos)

| ID | Título |
|---|---|
| UAT-001 | Flujo completo de pre-registro y aprobación |
| UAT-002 | Generación y descarga de reporte de membresías |
| UAT-003 | Verificación de bloqueo por intentos fallidos de login |

**Para cada UAT, en el campo "Steps":**

**UAT-001:**
1. Abrir formulario público
2. Seleccionar estado "Nuevo León" y elegir municipio
3. Ingresar nombre, apellidos, fecha de nacimiento — observar autocompletado de CURP
4. Enviar formulario y anotar el folio
5. Entrar como admin al dashboard → Pre-registros → Pendientes
6. Aprobar la solicitud
7. Verificar que el beneficiario aparece en Beneficiarios con ESTATUS 'Activo'

**UAT-002:**
1. Entrar al dashboard como admin
2. Ir a la sección "Reportes"
3. Seleccionar tipo "Membresías", período enero–diciembre 2026, formato PDF
4. Presionar "Generar"
5. Verificar que el PDF tiene encabezado, nombre, CURP, número de credencial, fechas y estado

**UAT-003:**
1. Ir a la pantalla de login
2. Introducir email válido con contraseña incorrecta 5 veces seguidas
3. En el sexto intento verificar que aparece "Demasiados intentos, espera 15 minutos"

---

## 3. Crear los 5 Test Runs (Ciclos de prueba)

Ve a **Test Runs → Start New Run**

| Run | Título | Plan asociado | Resultado esperado |
|---|---|---|---|
| Run 1 | `Ciclo 1 — Pruebas Sprint 2` | Funcionalidad Sprint 2 | 16 passed / 3 failed / 1 pending |
| Run 2 | `Ciclo 2 — Pruebas Sprint 2` | Funcionalidad Sprint 2 | 19 passed / 1 failed / 0 pending |
| Run 3 | `Ciclo 3 — Pruebas Sprint 2 (final)` | Funcionalidad Sprint 2 | 20 passed / 0 failed / 0 pending |
| Run 4 | `Ciclo 1 — Pruebas Regresión` | Regresión | 18 passed / 0 failed / 0 pending |
| Run 5 | `Ciclo 1 — Pruebas de Aceptación` | Aceptación (Demo) | 2 passed / 1 failed / 0 pending |

**Cómo marcar resultados en cada run:**
- Entra al run → selecciona cada caso → marca **Passed / Failed / Skipped**
- En los que fallan, escribe una nota breve del error

**Qué marcar como Failed por run:**

- **Run 1:** TC-012 (folio no visible en móvil), TC-016 (reuso no invalidaba todas las sesiones), TC-020 (CURP falla con preposición "de"). Pending: TC-018
- **Run 2:** TC-012 (aún pendiente ajuste responsive). TC-018 → Passed
- **Run 3:** Todos Passed
- **Run 4:** Todos Passed
- **Run 5:** UAT-001 Passed, UAT-002 Passed, UAT-003 Failed (mensaje de bloqueo en inglés)

---

## 4. Registrar los 8 defectos

Ve a **Defects → Create Defect**

| ID | Título | Severidad | Estado |
|---|---|---|---|
| DEF-001 | EMAIL_REGEX vulnerable a ReDoS en administradores.service.js | Critical | Resolved |
| DEF-002 | Reuso de refresh token no invalidaba otras sesiones activas | Major | Resolved |
| DEF-003 | Crash NJS-064 al presionar Ctrl+C por doble shutdown de Oracle pool | Major | Resolved |
| DEF-004 | POST /pre-registros/:id/aprobar no maneja CURP duplicada con ORA-00001 | Major | Open |
| DEF-005 | CURP autocalculado falla con apellidos con preposición "de la" / "del" | Minor | Resolved |
| DEF-006 | Mensaje de bloqueo 429 en inglés en lugar de español | Minor | Resolved |
| DEF-007 | Formulario pre-registro permite doble submit sin spinner de carga | Minor | Open |
| DEF-008 | Botón "Generar Reporte" no se deshabilita visualmente durante la petición | Cosmetic | Resolved |

**Para cada defecto, vincula el caso de prueba que lo detectó** (campo "Linked Test Cases"):
- DEF-001 → TC-013
- DEF-002 → TC-016
- DEF-003 → RT-009
- DEF-004 → TC-010
- DEF-005 → TC-020
- DEF-006 → TC-013, UAT-003
- DEF-007 → TC-007
- DEF-008 → TC-006, UAT-002

---

## Orden sugerido de trabajo

1. Crear suites (carpetas) en Test Cases: `Reportes`, `Pre-registro`, `Seguridad`, `Pre-registro UI`, `Auth`, `Beneficiarios`, `Membresías`, `Servicios`, `Inventario`, `Artículos`, `Citas`, `Control de acceso`
2. Crear los 41 casos de prueba (20 + 18 + 3)
3. Crear los 3 Test Plans y asignar los casos correspondientes
4. Crear los 5 Test Runs y marcar resultados
5. Registrar los 8 defectos y vincularlos a sus casos

*Tiempo estimado: 45–60 min*
