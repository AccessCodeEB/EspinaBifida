# Sprint 3 — Descripciones reformateadas al estilo SCRUM-9

Pega cada bloque en la descripción del issue correspondiente.

---

## SCRUM-109 — Reportes operativos: backend con 5 endpoints + integración UI

**Como** administrador del sistema,
**quiero** generar reportes operativos filtrados por período, género, tipo de servicio y ubicación,
**para** poder enviar indicadores a donantes, autoridades y la dirección de la asociación.

---

**Criterios de Aceptación:**

**Scenario 1 — Reporte de pacientes por mes:**
Given un administrador autenticado,
When hace `GET /api/v1/reportes/pacientes-mes?desde=2026-01-01&hasta=2026-03-31`,
Then responde 200 con `[{ mes, totalPacientes, nuevos, recurrentes }]` agregado por mes.

**Scenario 2 — Distribución por género:**
Given un administrador autenticado,
When hace `GET /api/v1/reportes/pacientes-genero?periodo=trimestre`,
Then responde 200 con `{ M: n, F: n, otro: n, total: n }`.

**Scenario 3 — Locales vs foráneos:**
Given un administrador autenticado,
When hace `GET /api/v1/reportes/local-vs-foraneo` (locales = ciudad Monterrey),
Then responde 200 con `{ locales: n, foraneos: n }`.

**Scenario 4 — Grupos de edad:**
Given un administrador autenticado,
When hace `GET /api/v1/reportes/grupos-edad`,
Then responde 200 con conteos por grupo `0-5, 6-12, 13-17, 18-30, 31-50, 51+`.

**Scenario 5 — Acceso restringido:**
Given una petición sin token o con rol staff,
When intenta acceder a un reporte restringido,
Then responde 401 / 403 según corresponda.

**Scenario 6 — UI conectada:**
Given el componente `reportes.tsx` con un filtro aplicado,
When el usuario presiona "Generar",
Then muestra los datos reales (no mock) y permite exportar a CSV.

---

**Reglas de Negocio:**

- Los reportes solo son accesibles para usuarios autenticados con rol ADMIN.
- El frontend nunca debe mostrar datos mock; si el backend falla, mostrar error gracioso.
- Tiempo de respuesta < 3 segundos para dataset de prueba (RNF-05).
- La exportación CSV debe respetar los filtros aplicados.
- Los reportes consumen las mismas tablas de beneficiarios, servicios y membresías; no se duplica data.

---

Story Points: 8 | Prioridad: High | Rol: Backend + Frontend

---

## SCRUM-110 — Pre-registro digital: tabla PRE_REGISTROS, 4 endpoints y flujo de aprobación

**Como** paciente externo,
**quiero** completar un formulario de pre-registro en línea,
**para** que la asociación revise mi solicitud antes de darme acceso a servicios.

**Como** administrador,
**quiero** revisar las solicitudes de pre-registro y aprobarlas o rechazarlas,
**para** validar que el solicitante cumple los criterios antes de crear el beneficiario.

---

**Criterios de Aceptación:**

**Scenario 1 — Envío de pre-registro público:**
Given un paciente externo en la página pública,
When envía `POST /api/v1/pre-registro` con CURP, nombre, contacto, ciudad, condición,
Then se crea registro en `PRE_REGISTROS` con `ESTATUS = 'PENDIENTE'` y responde 201.

**Scenario 2 — CURP duplicada:**
Given un CURP que ya existe en BENEFICIARIOS o en PRE_REGISTROS pendiente,
When se envía nuevo pre-registro con ese CURP,
Then responde 409 con `{ error: 'CURP ya registrada', code: 'CURP_DUPLICADA' }`.

**Scenario 3 — Listado para administrador:**
Given un administrador autenticado,
When hace `GET /api/v1/pre-registros?estatus=PENDIENTE`,
Then responde 200 con lista paginada de pre-registros pendientes.

**Scenario 4 — Aprobación:**
Given un administrador,
When hace `POST /api/v1/pre-registros/:id/aprobar`,
Then se crea registro en BENEFICIARIOS con datos del pre-registro, ESTATUS pasa a 'APROBADO' y responde 201 con la CURP del nuevo beneficiario.

**Scenario 5 — Rechazo con motivo:**
Given un administrador,
When hace `POST /api/v1/pre-registros/:id/rechazar` con `{ motivo }`,
Then ESTATUS cambia a 'RECHAZADO', se persiste el motivo y responde 200.

**Scenario 6 — Confirmación al paciente:**
Given el formulario público,
When un paciente externo lo completa y envía,
Then ve confirmación con folio de seguimiento.

---

**Reglas de Negocio:**

- La tabla `PRE_REGISTROS` es independiente de `BENEFICIARIOS`.
- Un pre-registro solo puede aprobarse o rechazarse una vez (estados terminales).
- La aprobación NO crea credencial activa; el beneficiario queda sin membresía hasta primer pago.
- Solo administradores (rol 1) pueden aprobar o rechazar.
- La validación de CURP reutiliza la función existente del módulo beneficiarios.

---

Story Points: 8 | Prioridad: High | Rol: Backend + Frontend

---

## SCRUM-111 — Notificaciones automáticas: stock bajo y membresías por vencer

**Como** administrador,
**quiero** ver alertas en el dashboard cuando un artículo tenga stock bajo o una membresía esté próxima a vencer,
**para** tomar acción preventiva antes de que falte material o se interrumpa el servicio a un beneficiario.

---

**Criterios de Aceptación:**

**Scenario 1 — Generación de alerta de stock bajo:**
Given un artículo con `INVENTARIO_ACTUAL = 3` y `STOCK_MINIMO = 5`,
When se ejecuta el job nocturno,
Then se crea o actualiza una notificación tipo `STOCK_BAJO` para ese artículo.

**Scenario 2 — Membresía próxima a vencer:**
Given una membresía cuya `FECHA_VENCIMIENTO` es en 10 días,
When se ejecuta el job nocturno,
Then se crea notificación tipo `MEMBRESIA_PROXIMA` con la CURP del beneficiario.

**Scenario 3 — Marcar como leída:**
Given una notificación pendiente,
When el admin hace `PATCH /api/v1/notificaciones/:id/leer`,
Then `ESTATUS` cambia a 'LEIDA' y `FECHA_LECTURA` se setea a `NOW()`.

**Scenario 4 — Visualización en dashboard:**
Given el admin entra al dashboard,
When la página carga,
Then ve un badge con la cantidad de notificaciones pendientes; al hacer click ve la lista.

**Scenario 5 — Idempotencia del job:**
Given un mismo artículo con notificación `STOCK_BAJO` ya pendiente,
When el job corre nuevamente,
Then no se duplica la notificación.

---

**Reglas de Negocio:**

- Tipos válidos: `STOCK_BAJO`, `MEMBRESIA_PROXIMA`, `MEMBRESIA_VENCIDA`.
- Estados válidos: `PENDIENTE`, `LEIDA`.
- El job corre una vez por noche (cron `0 2 * * *`); también puede ejecutarse manualmente vía script.
- Una notificación pasa a `MEMBRESIA_VENCIDA` cuando `FECHA_VENCIMIENTO < NOW()`.
- El campo `STOCK_MINIMO` se agrega a `ARTICULOS` con default 5.

---

Story Points: 5 | Prioridad: Medium | Rol: Backend + Frontend

---

## SCRUM-112 — Carga de documentos PDF del beneficiario

**Como** administrador,
**quiero** subir y consultar los documentos legales del beneficiario (acta de nacimiento, comprobante de domicilio, identificación oficial),
**para** tener el expediente digital completo y cumplir con los requisitos del Reto §1.

---

**Criterios de Aceptación:**

**Scenario 1 — Subida correcta de PDF:**
Given un admin con beneficiario CURP existente,
When hace `POST /api/v1/beneficiarios/:curp/documentos` con archivo PDF y `tipoDocumento`,
Then el archivo se guarda en `uploads/documentos/`, se crea el registro y responde 201.

**Scenario 2 — Tipo MIME inválido:**
Given un archivo con extensión distinta a `.pdf`,
When se intenta subir,
Then responde 400 con `{ error: 'Solo PDF permitido', code: 'INVALID_MIME' }`.

**Scenario 3 — Tamaño excedido:**
Given un PDF mayor a 5 MB,
When se intenta subir,
Then responde 413 con `{ error: 'Archivo excede tamaño máximo', code: 'FILE_TOO_LARGE' }`.

**Scenario 4 — Listado de documentos:**
Given un admin pidiendo lista de documentos,
When hace `GET /api/v1/beneficiarios/:curp/documentos`,
Then responde 200 con `[{ id, tipoDocumento, fechaSubida, urlDescarga }]`.

**Scenario 5 — Descarga de documento:**
Given un admin pidiendo un documento específico,
When hace `GET /api/v1/beneficiarios/:curp/documentos/:id`,
Then responde con el PDF como `application/pdf` y header `Content-Disposition: attachment`.

**Scenario 6 — Reemplazo del mismo tipo:**
Given un beneficiario con un ACTA activo,
When admin sube nuevo ACTA para el mismo CURP,
Then el anterior queda inactivo (`ACTIVO = 0`) y el nuevo es el vigente.

---

**Reglas de Negocio:**

- Tipos válidos: `ACTA`, `COMPROBANTE_DOMICILIO`, `IDENTIFICACION`.
- Solo se acepta MIME `application/pdf`.
- Tamaño máximo: 5 MB por archivo.
- Solo puede haber un documento ACTIVO por tipo y por beneficiario.
- El borrado es lógico (`ACTIVO = 0`); los archivos físicos no se eliminan.
- `uploads/documentos/` está en `.gitignore`.

---

Story Points: 5 | Prioridad: Medium | Rol: Backend + Frontend

---

## SCRUM-113 — Credencial digital imprimible del beneficiario (PDF con foto, datos y QR)

**Como** administrador,
**quiero** generar la credencial digital del beneficiario en formato imprimible,
**para** entregar al paciente una identificación física que lo acredite como miembro vigente.

---

**Criterios de Aceptación:**

**Scenario 1 — Credencial de beneficiario activo:**
Given un beneficiario con membresía activa y foto de perfil,
When admin hace `GET /api/v1/beneficiarios/:curp/credencial`,
Then responde con un PDF que incluye foto, nombre, folio, CURP, tipo de espina bífida, tipo de cuota, fecha de vigencia y QR escaneable con el CURP.

**Scenario 2 — Credencial sin foto de perfil:**
Given un beneficiario sin foto de perfil,
When se solicita su credencial,
Then se genera con foto placeholder y campo de foto en blanco.

**Scenario 3 — Membresía inactiva:**
Given un beneficiario con membresía vencida o inactiva,
When se solicita la credencial,
Then la credencial muestra leyenda "MEMBRESÍA INACTIVA" en rojo sobre el PDF.

**Scenario 4 — Acceso desde frontend:**
Given el frontend con el perfil de beneficiario abierto,
When admin presiona el botón "Imprimir credencial",
Then se abre el PDF en una nueva pestaña.

---

**Reglas de Negocio:**

- Tamaño del PDF: 8.5 × 5.5 cm (formato credencial estándar mexicana).
- El QR contiene únicamente el CURP del beneficiario.
- La credencial siempre se genera en tiempo real (no se cachea).
- Los datos provienen de `BENEFICIARIOS`, `MEMBRESIAS` y `TIPOS_ESPINA_BIFIDA`.
- Solo administradores y staff con rol válido pueden solicitar credencial.

---

Story Points: 3 | Prioridad: Medium | Rol: Backend + Frontend

---

## SCRUM-114 — Catálogo de tipos de Espina Bífida con CRUD y migración

**Como** administrador,
**quiero** que el campo "tipo de espina bífida" del beneficiario use un catálogo controlado en lugar de texto libre,
**para** garantizar consistencia de datos y poder filtrar y reportar por tipo.

---

**Criterios de Aceptación:**

**Scenario 1 — Carga de catálogo en formulario:**
Given un admin creando o editando un beneficiario,
When abre el formulario,
Then el campo `tipoEspinaBifida` se carga desde `GET /api/v1/tipos-espina-bifida` como dropdown con todos los tipos activos.

**Scenario 2 — Creación de tipo nuevo (admin):**
Given un usuario con rol ADMIN,
When hace `POST /api/v1/tipos-espina-bifida` con `{ nombre, descripcion }`,
Then se crea el tipo con `ACTIVO = 1` y responde 201.

**Scenario 3 — Acceso restringido para staff:**
Given un staff (rol != 1),
When intenta `POST` o `PUT` sobre `/tipos-espina-bifida`,
Then responde 403.

**Scenario 4 — Migración de datos existentes:**
Given el script de migración,
When se ejecuta,
Then los valores existentes en `BENEFICIARIOS.TIPO_ESPINA_BIFIDA` (texto libre) se mapean al ID del catálogo correspondiente; los no-mapeables se asignan a "Otro".

---

**Reglas de Negocio:**

- Catálogo inicial: Mielomeningocele, Meningocele, Espina Bífida Oculta, Lipomielomeningocele, Otro.
- Solo admins pueden crear, editar o desactivar tipos.
- El borrado es lógico (`ACTIVO = 0`); no se permiten eliminaciones físicas.
- `BENEFICIARIOS.TIPO_ESPINA_BIFIDA` debe ser FK a `TIPOS_ESPINA_BIFIDA.ID`.

---

Story Points: 2 | Prioridad: Low | Rol: Backend + Frontend

---

## SCRUM-115 — Comodatos: préstamo y devolución de equipo médico con control de inventario

**Como** administrador,
**quiero** registrar y dar seguimiento a comodatos (préstamos de equipo médico como sillas de ruedas) a beneficiarios,
**para** controlar qué equipo está prestado, a quién y por cuánto tiempo, evitando pérdidas.

---

**Criterios de Aceptación:**

**Scenario 1 — Registrar préstamo con membresía activa:**
Given un admin registrando comodato para CURP existente con membresía activa,
When hace `POST /api/v1/comodatos` con `{ idArticulo, fechaDevolucionEsperada }`,
Then se crea registro `ESTATUS = 'PRESTADO'`, se descuenta 1 unidad de inventario vía `SP_REGISTRAR_MOVIMIENTO_INVENTARIO`, y responde 201.

**Scenario 2 — Bloqueo por membresía inactiva:**
Given un beneficiario con membresía inactiva,
When admin intenta registrar comodato,
Then responde 403 con `{ error: 'Beneficiario sin membresía activa', code: 'MEMBERSHIP_INACTIVE' }`.

**Scenario 3 — Devolución:**
Given un comodato con `ESTATUS = 'PRESTADO'`,
When admin hace `PATCH /api/v1/comodatos/:id/devolver`,
Then `ESTATUS` pasa a 'DEVUELTO', `FECHA_DEVOLUCION_REAL = NOW()`, y se suma 1 al inventario.

**Scenario 4 — Marcar extraviado:**
Given un comodato extraviado,
When admin hace `PATCH /api/v1/comodatos/:id/extraviar` con `{ observaciones }`,
Then `ESTATUS` pasa a 'EXTRAVIADO' y NO se devuelve al inventario.

**Scenario 5 — Historial por beneficiario:**
Given un beneficiario,
When admin hace `GET /api/v1/beneficiarios/:curp/comodatos`,
Then responde con el historial completo de préstamos con estatus de cada uno.

---

**Reglas de Negocio:**

- Estados válidos: `PRESTADO`, `DEVUELTO`, `EXTRAVIADO`.
- La membresía debe estar activa al momento de registrar el préstamo.
- El inventario se devuelve solo cuando ESTATUS pasa a 'DEVUELTO'.
- Una vez en estado 'DEVUELTO' o 'EXTRAVIADO', no se permiten más cambios.
- El descuento de inventario usa el SP existente para mantener atomicidad.

---

Story Points: 5 | Prioridad: Medium | Rol: Backend + Frontend

---

## SCRUM-116 — Recibos digitales: generación, listado y PDF descargable

**Como** administrador,
**quiero** generar recibos digitales para los pagos realizados por beneficiarios (membresías y servicios),
**para** tener un registro auditable de transacciones y poder entregar comprobante al paciente.

---

**Criterios de Aceptación:**

**Scenario 1 — Generación automática al registrar servicio:**
Given un admin registrando un servicio con monto,
When marca "Generar recibo" en el formulario,
Then al crear el servicio también se crea un recibo vinculado y la respuesta incluye el folio.

**Scenario 2 — Creación manual de recibo:**
Given un admin,
When hace `POST /api/v1/recibos` con datos de transacción,
Then se crea recibo con folio único secuencial (`REC-2026-00001`) y responde 201.

**Scenario 3 — Descarga de PDF:**
Given un recibo existente,
When admin hace `GET /api/v1/recibos/:folio/pdf`,
Then responde con un PDF que incluye logo de la asociación, datos del beneficiario, monto, fecha, folio y tipo de pago.

**Scenario 4 — Filtrado por beneficiario y rango:**
Given un admin filtrando recibos,
When hace `GET /api/v1/recibos?curp=ABCD123456&desde=2026-01-01&hasta=2026-03-31`,
Then responde con lista paginada de recibos del beneficiario en el rango.

**Scenario 5 — Validación de monto:**
Given un monto = 0 o negativo,
When se intenta crear recibo,
Then responde 400 con `{ error: 'Monto debe ser positivo', code: 'INVALID_AMOUNT' }`.

---

**Reglas de Negocio:**

- Tipos de pago válidos: `MEMBRESIA`, `SERVICIO`, `COMODATO`.
- Métodos de pago válidos: `EFECTIVO`, `TRANSFERENCIA`, `TARJETA`.
- El folio sigue formato `REC-YYYY-NNNNN` y es único secuencial via Oracle SEQ.
- Los recibos no pueden modificarse una vez creados (auditabilidad).
- El monto debe ser estrictamente positivo.

---

Story Points: 5 | Prioridad: Low | Rol: Backend + Frontend

---

## SCRUM-117 — Pestaña Usuarios en dashboard: integración frontend con backend de administradores

**Como** administrador,
**quiero** una pestaña en el dashboard donde pueda gestionar a los usuarios internos (administradores y staff),
**para** crear, editar y desactivar cuentas sin necesidad de tocar la base de datos.

---

**Criterios de Aceptación:**

**Scenario 1 — Visibilidad por rol admin:**
Given un usuario con rol ADMIN (idRol = 1),
When entra al dashboard,
Then la pestaña "Usuarios" aparece en el sidebar.

**Scenario 2 — Ocultamiento para staff:**
Given un usuario con rol STAFF (idRol != 1),
When entra al dashboard,
Then la pestaña "Usuarios" NO aparece en el sidebar.

**Scenario 3 — Listado de usuarios:**
Given un admin en la pestaña Usuarios,
When la página carga,
Then se muestra una tabla con todos los usuarios incluyendo nombre, email, rol y estado activo.

**Scenario 4 — Creación de usuario:**
Given un admin,
When presiona "Nuevo usuario" y completa formulario válido,
Then se llama `POST /api/v1/administradores`, la tabla se refresca y aparece el nuevo usuario.

**Scenario 5 — Edición de usuario:**
Given un admin,
When edita un usuario y guarda,
Then se llama `PUT /api/v1/administradores/:id` y la tabla se refresca con cambios.

**Scenario 6 — Desactivación con baja lógica:**
Given un admin,
When presiona "Desactivar" en un usuario,
Then se llama `DELETE` (baja lógica) y el usuario aparece como inactivo.

**Scenario 7 — Protección del último admin:**
Given el último administrador activo del sistema,
When admin intenta desactivarlo,
Then ve advertencia y la acción se bloquea.

---

**Reglas de Negocio:**

- La pestaña Usuarios solo es visible para usuarios con `idRol = 1`.
- Nunca se eliminan usuarios físicamente; siempre baja lógica (`ACTIVO = 0`).
- No se puede desactivar al último administrador activo del sistema.
- Las contraseñas nunca se devuelven en respuestas GET.
- El cambio de password usa endpoint dedicado (`PATCH /:id/password`).

---

Story Points: 3 | Prioridad: Medium | Rol: Frontend

---

## SCRUM-118 — Hardening seguridad: helmet, rate limiting y refresh tokens

**Como** equipo de desarrollo,
**quiero** complementar la seguridad del backend con rate limiting, headers HTTP de seguridad y refresh tokens,
**para** mitigar ataques de fuerza bruta, XSS, clickjacking y mejorar UX de sesiones largas según RNF-03.

---

**Criterios de Aceptación:**

**Scenario 1 — Rate limit en login:**
Given una IP que falla el login 5 veces en 15 minutos,
When intenta login por sexta vez,
Then responde 429 con `{ error: 'Demasiados intentos, espera 15 minutos', code: 'RATE_LIMITED' }`.

**Scenario 2 — Headers de seguridad:**
Given cualquier petición HTTP al backend,
When el middleware helmet procesa la respuesta,
Then los headers incluyen `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` y CSP básica.

**Scenario 3 — Refresh de token válido:**
Given un access token expirado y un refresh token válido,
When el cliente hace `POST /api/v1/auth/refresh`,
Then responde 200 con un nuevo access token y un nuevo refresh token (rotación).

**Scenario 4 — Detección de reuso de refresh token:**
Given un refresh token usado dos veces (token reuse),
When llega el segundo intento,
Then responde 401 e invalida todos los tokens del usuario en BD.

**Scenario 5 — Logout limpia refresh token:**
Given un usuario haciendo logout,
When hace `POST /api/v1/auth/logout`,
Then `REFRESH_TOKEN_HASH` del usuario se limpia y se invalidan futuros refresh.

---

**Reglas de Negocio:**

- Rate limit en `/login` y endpoints sensibles: 5 intentos por IP cada 15 minutos.
- Access token: TTL 15 minutos. Refresh token: TTL 7 días.
- Refresh tokens rotan en cada uso (one-time use); reuso = invalidación total.
- Helmet aplicado globalmente en `src/app.js`.
- `JWT_SECRET` y `REFRESH_SECRET` validados al arranque.

---

Story Points: 5 | Prioridad: Medium | Rol: Backend

---

## SCRUM-119 — Reporte trimestral consolidado para autoridades (PDF + XLSX)

**Como** administrador,
**quiero** generar el reporte trimestral consolidado para autoridades gubernamentales,
**para** cumplir RD-02 sin tener que ensamblar manualmente datos de múltiples fuentes.

---

**Criterios de Aceptación:**

**Scenario 1 — Consulta de datos consolidados:**
Given un admin autenticado,
When hace `GET /api/v1/reportes/trimestral/2026/2`,
Then responde 200 con datos consolidados de abril a junio 2026.

**Scenario 2 — Exportación a PDF:**
Given un admin pidiendo el reporte en PDF,
When envía header `Accept: application/pdf`,
Then responde con un PDF formateado con sección por cada métrica.

**Scenario 3 — Exportación a Excel:**
Given un admin pidiendo el reporte en Excel,
When envía header `Accept: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`,
Then responde con un XLSX con una hoja por categoría de métrica.

**Scenario 4 — Trimestre futuro inválido:**
Given un trimestre que aún no concluye,
When se solicita reporte,
Then responde 400 con `{ error: 'Trimestre no concluido', code: 'QUARTER_NOT_ENDED' }`.

**Scenario 5 — Trimestre sin datos:**
Given un trimestre histórico sin actividad,
When se solicita reporte,
Then devuelve estructura completa con valores en cero (no error).

---

**Reglas de Negocio:**

- Trimestres definidos: Q1 = ene-mar, Q2 = abr-jun, Q3 = jul-sep, Q4 = oct-dic.
- Métricas obligatorias: total beneficiarios activos, nuevos beneficiarios, servicios por tipo, membresías activas/vencidas, comodatos vigentes, distribución local/foránea, distribución por género y edad.
- Solo se permite generar reportes de trimestres CONCLUIDOS.
- El reporte siempre incluye encabezado de la asociación.
- Cumple RD-02 del SRS.

---

Story Points: 5 | Prioridad: High | Rol: Backend + Frontend

---

## SCRUM-120 — Dashboard funcional: métricas en tiempo real con endpoint consolidado

**Como** administrador,
**quiero** ver en el dashboard principal métricas en tiempo real (beneficiarios activos, membresías por vencer, servicios del mes, inventario bajo),
**para** tener una visión rápida del estado de la asociación al iniciar sesión.

---

**Criterios de Aceptación:**

**Scenario 1 — Carga de métricas:**
Given un admin autenticado,
When entra al dashboard,
Then ve 4 cards con: beneficiarios activos, membresías por vencer (≤ 15 días), servicios del mes actual, artículos con stock bajo.

**Scenario 2 — Estructura del endpoint:**
Given el endpoint `GET /api/v1/dashboard/metricas`,
When responde,
Then devuelve `{ beneficiariosActivos, membresiasProximas, serviciosMes, stockBajo, tendenciaMensual: [...12 meses], distribucionLocalForanea: { local, foraneo } }`.

**Scenario 3 — Estado de carga:**
Given el dashboard cargando datos,
When la respuesta tarda más de lo esperado,
Then se muestran skeleton loaders durante la espera.

**Scenario 4 — Navegación contextual:**
Given un admin haciendo click en la card "Membresías por vencer",
When la card es presionada,
Then navega a la sección de membresías filtrada por "próximas a vencer".

**Scenario 5 — Performance:**
Given el endpoint en uso normal,
When un admin hace la petición,
Then la respuesta llega en menos de 3 segundos (RNF-05).

---

**Reglas de Negocio:**

- El endpoint debe ser un único roundtrip (no múltiples fetches).
- Las métricas son siempre actuales; no se cachean en frontend.
- "Membresías próximas" = vence en ≤ 15 días desde hoy.
- "Servicios del mes" = registrados en el mes calendario actual.
- "Stock bajo" = artículos con `INVENTARIO_ACTUAL <= STOCK_MINIMO`.

---

Story Points: 3 | Prioridad: Medium | Rol: Backend + Frontend

---

## SCRUM-121 — Test E2E del flujo demo + README + manual de usuario

**Como** equipo de desarrollo,
**quiero** un test end-to-end que valide el flujo demo completo y un README actualizado con todos los endpoints,
**para** garantizar que la auditoría del profesor pueda seguir el flujo sin sorpresas y los nuevos colaboradores puedan onboarding rápido.

---

**Criterios de Aceptación:**

**Scenario 1 — Test E2E del flujo demo:**
Given el sistema corriendo en local con Oracle conectado,
When se ejecuta `npm run test:e2e:demo`,
Then ejecuta el flujo completo (pre-registro → aprobación → membresía → servicio → recibo → reporte) y todos los pasos pasan en menos de 60 segundos.

**Scenario 2 — README completo:**
Given un nuevo desarrollador,
When lee `README.md`,
Then encuentra: arquitectura, endpoints organizados por módulo, flujo de autenticación e instrucciones de seed de datos demo.

**Scenario 3 — Manual de usuario:**
Given el profesor o cliente evaluando el sistema,
When abre `docs/MANUAL_USUARIO.md`,
Then ve manual en español con mínimo 5 capturas de pantalla del flujo principal.

**Scenario 4 — Convención de commits:**
Given los issues del Sprint 3,
When se hace `git log` con commits asociados,
Then cada commit referencia su issue (`feat(SCRUM-XX): ...`).

**Scenario 5 — Seed de datos demo:**
Given el sistema en local,
When se ejecuta `npm run seed:demo`,
Then la base de datos queda con beneficiarios, membresías, servicios e inventario suficientes para demo.

---

**Reglas de Negocio:**

- El test E2E corre en CI sobre dataset seed.
- El manual de usuario está en español (audiencia: personal de la asociación).
- Cada endpoint nuevo del Sprint 3 debe quedar documentado en README antes de cerrar sprint.
- El diagrama de arquitectura usa mermaid y vive en `docs/ARQUITECTURA.md`.

---

Story Points: 3 | Prioridad: High | Rol: QA + Documentación

---

# Notas finales

- **Cambios respecto al formato original:**
  - Renombré "Criterios de aceptación" → "Criterios de Aceptación" (capitalización)
  - Numeré cada scenario con `Scenario N — Título:`
  - Separé "Reglas de Negocio" en una sección propia (antes estaban embebidas)
  - Quité la sección "INVEST" extensa y "Definición de Done" (el equipo no las usa en SCRUM-9)
  - Agregué línea final: `Story Points: X | Prioridad: Y | Rol: Z`

- **Si el profesor pregunta por INVEST**: cada story lo cumple implícitamente (Independiente entre módulos, Negociable en alcance v1, Valuable mapeado a RF/RD del SRS, Estimable con SP, Small ≤ 8 SP, Testable con scenarios numerados).
