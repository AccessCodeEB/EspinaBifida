# Manual de Usuario — Sistema de Gestión Espina Bífida
## Personal de la Asociación (Administradores y Recepción)

**Versión:** 1.0  
**Fecha:** Mayo 2026  
**Audiencia:** Personal administrativo y de recepción de la Asociación de Espina Bífida de Nuevo León

---

## Índice

1. [Introducción](#1-introducción)
2. [Acceso al sistema](#2-acceso-al-sistema)
3. [Dashboard principal](#3-dashboard-principal)
4. [Notificaciones](#4-notificaciones)
5. [Pre-registro de solicitudes públicas](#5-pre-registro-de-solicitudes-públicas)
6. [Beneficiarios](#6-beneficiarios)
7. [Membresías (Credenciales)](#7-membresías-credenciales)
8. [Servicios](#8-servicios)
9. [Citas](#9-citas)
10. [Inventario](#10-inventario)
11. [Reportes](#11-reportes)
12. [Gestión de administradores](#12-gestión-de-administradores)
13. [Preguntas frecuentes](#13-preguntas-frecuentes)

---

## 1. Introducción

El **Sistema de Gestión Espina Bífida** es una plataforma web centralizada que permite al personal de la asociación administrar beneficiarios, membresías, servicios médicos, citas, inventario y reportes desde un solo lugar. Reemplaza los registros en Excel y permite mantener la información actualizada en tiempo real.

### Roles de usuario

| Rol | Acceso |
|---|---|
| **Administrador** | Acceso completo: configuración, gestión de cuentas, reportes, todos los módulos |
| **Recepción** | Beneficiarios, membresías, servicios, citas, inventario, pre-registro |

> El rol de cada cuenta lo asigna el Administrador. Si necesitas permisos adicionales, contacta al administrador del sistema.

### Requisitos técnicos

- Navegador web moderno (Chrome, Firefox, Edge o Safari — versión reciente)
- Conexión a internet
- Credenciales de acceso proporcionadas por el administrador

---

## 2. Acceso al sistema

### 2.1 Iniciar sesión

1. Abre tu navegador y ve a la dirección del panel administrativo.
2. Ingresa tu **correo electrónico** y **contraseña**.
3. Haz clic en **Acceder al panel**.

> Si el botón queda inactivo luego de varios intentos fallidos, espera 15 minutos antes de volver a intentarlo (protección contra accesos no autorizados).

### 2.2 Recuperar contraseña (SMS OTP)

Si olvidaste tu contraseña:

1. En la pantalla de login, haz clic en **¿Olvidé mi contraseña?**
2. Ingresa tu correo electrónico registrado.
3. Recibirás un **código de 6 dígitos por SMS** en el teléfono asociado a tu cuenta.
4. Ingresa el código en el campo correspondiente.
5. Escribe y confirma tu nueva contraseña.
6. Haz clic en **Restablecer contraseña**.

> El código SMS tiene vigencia de **5 minutos**. Si no lo recibes, verifica que tu número de teléfono esté registrado correctamente o contacta al administrador.

### 2.3 Cambiar contraseña

Desde cualquier pantalla del sistema:

1. Haz clic en tu nombre o foto de perfil (esquina superior derecha).
2. Selecciona **Cambiar contraseña**.
3. Recibirás un código OTP por SMS para confirmar la operación.
4. Ingresa el código, tu contraseña actual y la nueva contraseña.
5. Haz clic en **Guardar**.

### 2.4 Cerrar sesión

Haz clic en tu nombre o foto de perfil y selecciona **Cerrar sesión**. La sesión expira automáticamente después de 1 hora de inactividad.

---

## 3. Dashboard principal

Al iniciar sesión, el sistema muestra el **Dashboard** con un resumen del estado actual de la asociación.

### Indicadores principales (tarjetas superiores)

| Indicador | Descripción |
|---|---|
| Beneficiarios activos | Total de beneficiarios con estatus Activo |
| Membresías vigentes | Membresías cuya fecha de vigencia no ha expirado |
| Membresías por vencer | Membresías que vencen en los próximos 30 días |
| Servicios del mes | Servicios registrados en el mes actual |
| Citas pendientes | Citas programadas sin atender |
| Artículos con stock bajo | Artículos cuyo inventario está por debajo del mínimo |

### Accesos rápidos

El dashboard incluye botones de acceso directo a las acciones más frecuentes:
- Nuevo beneficiario
- Registrar servicio
- Agendar cita
- Ver pre-registros pendientes

### Gráficas de resumen

- **Servicios por tipo** — distribución de consultas, estudios, medicamentos, etc. en el período actual
- **Beneficiarios por género** — proporción masculino/femenino
- **Tendencia de membresías** — evolución mensual de altas y renovaciones

---

## 4. Notificaciones

La campana (🔔) en la barra superior muestra alertas del sistema en tiempo real. El número en rojo indica notificaciones no leídas.

### Tipos de notificaciones

| Tipo | Descripción |
|---|---|
| **Stock bajo** | Un artículo del inventario cayó por debajo del mínimo |
| **Membresía por vencer** | Una membresía vence en los próximos días |
| **Membresía vencida** | Una membresía expiró y el beneficiario quedó inactivo |

### Gestionar notificaciones

- Haz clic en la campana para abrir el panel de notificaciones.
- Cada notificación muestra el tipo, mensaje y fecha.
- Haz clic en **Marcar como leída** en una notificación individual, o **Marcar todas como leídas** para limpiar el panel.

> Las notificaciones de stock bajo y membresías se generan automáticamente cada noche. Si ves una alerta urgente, atiéndela antes de continuar con otras tareas.

---

## 5. Pre-registro de solicitudes públicas

Cuando un paciente o familiar llena el formulario público de pre-registro, la solicitud aparece en este módulo para que el personal la revise y decida si aprueba o rechaza la incorporación.

### 5.1 Ver solicitudes pendientes

1. En el menú lateral, haz clic en **Pre-registro**.
2. Verás la tabla **Todas las solicitudes** con el listado de solicitudes recibidas.
3. Las solicitudes en estado **Pendiente** son las que aún no han sido revisadas.

### 5.2 Revisar una solicitud

1. Localiza la solicitud en la tabla (puedes buscar por nombre o CURP).
2. Haz clic en el botón **Revisar** de la fila correspondiente.
3. Se abre una tarjeta de revisión rápida con los datos capturados por el solicitante:
   - Nombre completo y CURP
   - Fecha de nacimiento y género
   - Ciudad y estado
   - Teléfono y correo
   - Tipo de espina bífida y uso de válvula

### 5.3 Aprobar solicitud

1. Dentro de la tarjeta de revisión, haz clic en **Aprobar solicitud** (ícono ✓).
2. Confirma la acción en el diálogo que aparece.
3. El sistema crea el expediente del beneficiario automáticamente con estatus **Activo**.
4. Se mostrará un diálogo opcional: **¿Deseas completar la información ahora?**
   - **Completar ahora** — te lleva directamente al expediente para agregar datos adicionales (tipo de sangre, contacto de emergencia, foto, etc.)
   - **Más tarde** — el expediente queda guardado con los datos del formulario; puedes completarlo en cualquier momento desde el módulo Beneficiarios.

### 5.4 Rechazar solicitud

1. Dentro de la tarjeta de revisión, haz clic en **Rechazar solicitud** (ícono ✗).
2. Escribe el motivo del rechazo en el campo de texto (opcional pero recomendado).
3. Confirma la acción.
4. La solicitud se elimina del sistema; el solicitante puede volver a registrarse si lo desea.

> **Importante:** La aprobación o rechazo es irreversible desde esta pantalla. Si aprobaste por error, busca al beneficiario en el módulo Beneficiarios y aplica una baja.

---

## 6. Beneficiarios

Este módulo concentra el expediente completo de cada persona registrada en la asociación.

### 6.1 Lista de beneficiarios

1. En el menú lateral, haz clic en **Beneficiarios**.
2. Se muestra la tabla con todos los beneficiarios y su estatus (Activo / Inactivo / Baja).
3. Usa el buscador para filtrar por nombre, CURP o correo.
4. Puedes paginar la tabla si hay muchos registros.

### 6.2 Ver expediente completo

1. Haz clic en el nombre del beneficiario o en el botón de detalle de la fila.
2. Se abre el expediente con las siguientes secciones:
   - **Datos personales** — nombre, CURP, fecha de nacimiento, género, tipo de sangre
   - **Contacto** — teléfono, correo, dirección
   - **Clínico** — tipo de espina bífida, uso de válvula, padecimientos
   - **Membresía activa** — vigencia actual y número de credencial
   - **Historial de servicios** — servicios recibidos con fecha y costo
   - **Historial de membresías** — todas las credenciales pasadas
   - **Citas** — próximas y pasadas
   - **Foto de perfil**

### 6.3 Crear beneficiario manualmente

Úsalo cuando el beneficiario se presenta directamente sin haber llenado el formulario público.

1. Haz clic en **Nuevo beneficiario**.
2. Llena los campos obligatorios: nombre(s), apellido paterno, apellido materno, CURP, fecha de nacimiento y género.
3. Completa los datos opcionales: teléfono, correo, dirección, tipo de sangre, información clínica.
4. Haz clic en **Guardar**.

> La CURP es el identificador único del beneficiario en todo el sistema. Verifica que sea correcta antes de guardar.

### 6.4 Editar datos del expediente

1. Abre el expediente del beneficiario.
2. Haz clic en **Editar** (ícono de lápiz) en la sección que deseas modificar.
3. Realiza los cambios y haz clic en **Guardar**.

### 6.5 Cambiar estatus

Un beneficiario puede estar en tres estados:

| Estatus | Significado |
|---|---|
| **Activo** | Puede recibir servicios (requiere membresía vigente) |
| **Inactivo** | Registrado pero sin membresía activa o temporalmente suspendido |
| **Baja** | Ya no pertenece a la asociación (registro permanece por historial) |

Para cambiar el estatus:
1. En el expediente, haz clic en el selector de estatus.
2. Elige el nuevo estatus.
3. Confirma el cambio.

> Cuando una membresía vence, el sistema cambia el estatus a **Inactivo** automáticamente.

### 6.6 Dar de baja a un beneficiario

La baja es una operación definitiva que cancela todas las membresías activas del beneficiario.

1. En el expediente, haz clic en **Dar de baja** (disponible solo para Administrador).
2. Confirma la acción en el diálogo de advertencia.
3. El sistema cambia el estatus a **Baja** y cancela las membresías en una sola operación.

> El expediente no se elimina — permanece en el sistema para consulta histórica. Si necesitas eliminarlo completamente, contacta al Administrador.

### 6.7 Foto de perfil

1. En el expediente, haz clic en la foto o en el ícono de cámara.
2. Selecciona una imagen desde tu dispositivo (JPG o PNG, máximo 5 MB).
3. La foto se guarda automáticamente.

---

## 7. Membresías (Credenciales)

La membresía (credencial) es el requisito indispensable para que un beneficiario reciba servicios. Sin membresía vigente, no es posible registrar servicios a nombre del beneficiario.

### 7.1 Ver membresías de un beneficiario

1. Abre el expediente del beneficiario.
2. En la sección **Membresía activa**, verás la credencial actual con:
   - Número de credencial
   - Fecha de inicio y fecha de vencimiento
   - Estatus (Vigente / Por vencer / Vencida)

### 7.2 Crear membresía

1. Desde el módulo **Membresías** en el menú lateral, haz clic en **Nueva membresía**.
2. Busca y selecciona al beneficiario por nombre o CURP.
3. Ingresa la fecha de inicio, fecha de vigencia, monto pagado y método de pago.
4. Haz clic en **Guardar**.

> El sistema valida que el beneficiario no tenga ya una membresía activa. Si ya tiene una vigente, primero deberás renovarla o dejar que expire.

### 7.3 Renovar membresía

Cuando una membresía está próxima a vencer o ya expiró:

1. Abre el expediente del beneficiario o entra al módulo Membresías.
2. Haz clic en **Renovar** junto a la membresía.
3. Ingresa la nueva fecha de vigencia y el pago recibido.
4. Guarda — el sistema actualiza el estatus del beneficiario a **Activo** automáticamente.

### 7.4 Credencial imprimible (CR80)

El sistema genera una credencial en formato CR80 (tamaño tarjeta de crédito) que puede imprimirse directamente.

1. En el expediente del beneficiario, haz clic en **Generar credencial**.
2. Se abre un PDF listo para imprimir con los datos del beneficiario y el código de la membresía.

---

## 8. Servicios

Registra cada atención o servicio proporcionado al beneficiario. El sistema valida que el beneficiario tenga una membresía activa antes de permitir el registro.

### 8.1 Registrar un servicio

1. En el menú lateral, haz clic en **Servicios** y luego en **Nuevo servicio**.
2. Busca al beneficiario por nombre o CURP.
   - Si la membresía está **vigente**, el sistema lo permite y continúa.
   - Si la membresía está **vencida o inactiva**, el sistema muestra un mensaje de error y no permite continuar.
3. Selecciona el **tipo de servicio** del catálogo (consulta médica, estudio, medicamento, comodato, fisioterapia, psicología, nutrición, trabajo social).
4. Ingresa la fecha, costo total y monto pagado por el beneficiario.
5. Si el servicio consume artículos del inventario, agrégalos en la sección **Insumos utilizados** con la cantidad.
6. Agrega notas adicionales si es necesario.
7. Haz clic en **Guardar**.

> Al guardar, el sistema descuenta automáticamente los insumos del inventario y registra un movimiento de salida.

### 8.2 Ver historial de servicios

- Desde el expediente del beneficiario, sección **Servicios**.
- Desde el módulo **Servicios** con filtros por fecha, tipo y beneficiario.

### 8.3 Tipos de servicio disponibles

| Tipo | Descripción |
|---|---|
| Consulta médica | Atención de especialista |
| Estudios de laboratorio | Análisis clínicos |
| Medicamentos | Suministro de medicamentos |
| Comodato de equipo | Préstamo de silla de ruedas, andadera u otro equipo |
| Fisioterapia | Sesiones terapéuticas |
| Psicología | Apoyo emocional |
| Trabajo social | Gestión de apoyos |
| Nutrición | Asesoría nutricional |

---

## 9. Citas

Gestiona la agenda de citas para los beneficiarios con los especialistas de la asociación.

### 9.1 Ver agenda de citas

1. En el menú lateral, haz clic en **Citas**.
2. Verás la lista de citas ordenadas por fecha.
3. Filtra por fecha, especialista o estatus (Programada, Atendida, Cancelada).

### 9.2 Agendar una cita

1. Haz clic en **Nueva cita**.
2. Selecciona al beneficiario.
3. Elige el tipo de servicio y el especialista.
4. Selecciona la fecha y hora.
5. Agrega notas si es necesario.
6. Haz clic en **Guardar**.

### 9.3 Editar o cancelar una cita

1. En la lista de citas, haz clic en la cita que deseas modificar.
2. Edita los datos necesarios (fecha, hora, especialista) y guarda.
3. Para cancelar, haz clic en **Cancelar cita** y confirma.

---

## 10. Inventario

Controla el stock de artículos utilizados en los servicios: medicamentos, equipo ortopédico, insumos médicos, etc.

### 10.1 Ver artículos

1. En el menú lateral, haz clic en **Inventario**.
2. Verás la lista de artículos con su stock actual, stock mínimo y categoría.
3. Los artículos con stock igual o inferior al mínimo aparecen resaltados en rojo con una alerta.
4. Filtra por categoría o por estatus de stock (normal / bajo / agotado).

### 10.2 Crear artículo

1. Haz clic en **Nuevo artículo**.
2. Ingresa:
   - Descripción del artículo
   - Categoría
   - Unidad de medida (piezas, cajas, frascos, etc.)
   - Cuota de recuperación (costo al beneficiario, puede ser $0)
   - Stock inicial
   - Stock mínimo (nivel de alerta)
   - ¿Maneja inventario? (Sí = se descuenta al registrar un servicio)
3. Haz clic en **Guardar**.

### 10.3 Registrar movimiento de inventario

Usa esto para registrar entradas (donaciones, compras) o salidas manuales (ajustes, mermas).

1. Entra al artículo desde la lista.
2. Haz clic en **Registrar movimiento**.
3. Selecciona el tipo:
   - **Entrada** — aumenta el stock (compra, donación, devolución)
   - **Salida** — disminuye el stock (ajuste por merma, pérdida)
4. Ingresa la cantidad y el motivo.
5. Guarda.

> Las salidas por servicios se registran automáticamente al guardar el servicio. Este formulario es solo para ajustes manuales.

### 10.4 Alertas de stock bajo

Cuando el stock de un artículo cae por debajo del mínimo configurado:
- El artículo aparece resaltado en la lista de inventario.
- Se genera una notificación automática en el panel de notificaciones.

---

## 11. Reportes

Genera reportes estadísticos y operativos del sistema en formato PDF o Excel.

### 11.1 Acceder a reportes

1. En el menú lateral, haz clic en **Reportes**.
2. El panel muestra los tipos de reporte disponibles en la columna izquierda.

### 11.2 Tipos de reporte

| Reporte | Descripción |
|---|---|
| **Beneficiarios** | Lista de beneficiarios registrados con filtros por estatus, género, edad |
| **Membresías activas / por vencer** | Membresías vigentes con fecha de vencimiento |
| **Servicios** | Servicios registrados por período, tipo y beneficiario |
| **Inventario** | Stock actual, movimientos y artículos bajo mínimo |
| **Estadísticas generales** | Resumen ejecutivo: totales, gráficas, comparativos |

### 11.3 Generar un reporte

1. Selecciona el tipo de reporte en la columna izquierda.
2. Elige el **período**:
   - Este mes
   - Este año
   - Personalizado (especifica fecha inicio y fecha fin)
3. El sistema muestra una **vista previa** automática del reporte.
4. Haz clic en **Descargar PDF** o **Descargar Excel** según lo necesites.

### 11.4 Reportes automáticos programados

El sistema genera automáticamente ciertos reportes cada mes y los guarda para consulta. Puedes acceder a ellos desde la sección **Reportes guardados** dentro del módulo.

---

## 12. Gestión de administradores

*Disponible solo para Administrador.*

### 12.1 Ver cuentas de administrador

1. En el menú lateral, haz clic en **Administradores**.
2. Verás la lista de todos los usuarios del sistema con su rol, correo y estatus (activo/inactivo).

### 12.2 Crear cuenta de administrador

1. Haz clic en **Nuevo administrador**.
2. Ingresa nombre completo, correo electrónico, contraseña temporal y rol.
3. Haz clic en **Guardar**.
4. Comunica las credenciales al nuevo usuario para que cambie su contraseña en el primer acceso.

### 12.3 Editar datos de un administrador

1. Haz clic en el nombre del administrador.
2. Modifica los datos necesarios (nombre, correo, rol, teléfono).
3. Guarda los cambios.

### 12.4 Desactivar cuenta

1. En la lista, haz clic en **Desactivar** junto al administrador.
2. Confirma la acción.
3. El usuario ya no podrá iniciar sesión. Su historial de actividad se conserva.

> No es posible eliminar cuentas de administrador, solo desactivarlas. Esto preserva la trazabilidad de las operaciones realizadas.

---

## 13. Preguntas frecuentes

**¿Por qué no puedo registrar un servicio a un beneficiario?**  
El beneficiario no tiene membresía vigente. Primero crea o renueva su membresía, y luego podrás registrar el servicio.

**¿Qué pasa si la membresía vence y el beneficiario sigue activo?**  
El sistema cambia automáticamente el estatus del beneficiario a **Inactivo** cuando su membresía expira. Esto ocurre en el proceso nocturno de actualización.

**¿Puedo recuperar un beneficiario dado de baja?**  
No directamente. La baja es definitiva. Si el beneficiario desea reincorporarse, debe llenar nuevamente el formulario de pre-registro o contactar directamente a la asociación para crear un nuevo expediente.

**¿Cómo sé si una notificación de stock bajo es urgente?**  
Si el stock llega a **0**, el artículo aparece como **Agotado** y no será posible registrar servicios que lo incluyan hasta reponer el inventario.

**¿Puedo ver quién hizo un cambio en el sistema?**  
Las operaciones sensibles (aprobación de pre-registro, baja de beneficiario, cambio de contraseña, etc.) quedan registradas en el sistema de auditoría. Contacta al Administrador para consultar el historial de operaciones.

**¿La sesión expira?**  
Sí, la sesión expira automáticamente después de **1 hora** de inactividad. Guarda tu trabajo frecuentemente y vuelve a iniciar sesión cuando sea necesario.

**¿El sistema funciona en celular?**  
El panel administrativo está diseñado para uso en computadora o tablet. Puede funcionar en celular pero la experiencia es mejor en pantallas más grandes. El formulario público de pre-registro sí está optimizado para dispositivos móviles.

---

*Para soporte técnico o problemas con el sistema, contacta al equipo de desarrollo.*  
*Asociación de Espina Bífida de Nuevo León, A.B.P. — 2026*
