# Costos Operativos Anuales y Guía de Operación
## Sistema de Gestión — Asociación de Espina Bífida de Nuevo León

**Versión:** 1.0 — Junio 2026  
**Preparado por:** Equipo de Desarrollo — AccessCodeEB  
**Destinatario:** Directivos y personal administrativo de la asociación

---

## 1. Resumen Ejecutivo

Este documento explica cuánto cuesta mantener funcionando el sistema de gestión **en términos anuales**, qué limitaciones tiene actualmente, y qué decisiones debe tomar la asociación para garantizar su operación continua.

**El sistema vive en internet.** No depende de una computadora física en la oficina; funciona en servidores en la nube, accesibles desde cualquier navegador web. Esto significa que los costos son mensuales o anuales, pagados a empresas proveedoras de tecnología.

### Costo total estimado por año

| Escenario | Costo anual (MXN) | Descripción |
|---|---|---|
| **Mínimo (plan gratuito)** | ~$1,600 MXN | Solo el servidor backend pagado |
| **Recomendado (con dominio propio)** | ~$1,900 MXN | Servidor + dominio .org |
| **Crecimiento (más capacidad)** | ~$7,200 MXN | Si la asociación crece y se necesita más potencia |

> **Nota de tipo de cambio:** Los costos se calculan con un tipo de cambio aproximado de $19 pesos por dólar. Este valor puede variar.

---

## 2. Cómo Funciona el Sistema (versión simplificada)

El sistema tiene tres componentes principales, cada uno alojado en un servicio diferente:

```
┌──────────────────────────────────────────────────────────────────┐
│                     INTERNET                                      │
│                                                                   │
│  [Usuario en la oficina]                                          │
│         │                                                         │
│         ▼                                                         │
│  ┌─────────────┐     ┌──────────────────┐     ┌───────────────┐  │
│  │  PANTALLA   │────▶│    SERVIDOR      │────▶│  BASE DE      │  │
│  │  (Vercel)   │     │   (Render)       │     │  DATOS        │  │
│  │             │     │                  │     │  (Oracle)     │  │
│  │  Lo que     │     │  La lógica del   │     │  Donde se     │  │
│  │  ve el      │     │  negocio:        │     │  guardan      │  │
│  │  usuario    │     │  validaciones,   │     │  todos los    │  │
│  │             │     │  reportes, citas │     │  datos        │  │
│  └─────────────┘     └──────────────────┘     └───────────────┘  │
│     GRATIS                $7 USD/mes              GRATIS          │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Costos Anuales Detallados

### 3.1 Infraestructura (Servidores y Base de Datos)

| Servicio | Proveedor | Plan actual | Costo mensual | Costo anual | Qué hace |
|---|---|---|---|---|---|
| **Pantalla web (frontend)** | Vercel | Hobby (gratuito) | $0 | $0 | Muestra el sistema en el navegador |
| **Servidor principal (backend)** | Render | Starter | $7 USD (~$133 MXN) | ~$1,596 MXN | Procesa datos, genera reportes, envía alertas |
| **Base de datos** | Oracle Cloud | Always Free | $0 | $0 | Almacena todos los registros (beneficiarios, membresías, etc.) |
| **Protección anti-bots** | Cloudflare Turnstile | Free | $0 | $0 | Protege el formulario público de registro |
| **TOTAL infraestructura** | | | **~$133 MXN/mes** | **~$1,596 MXN/año** | |

### 3.2 Opcionales Recomendados

| Servicio | Proveedor | Costo estimado/año | Qué hace | Prioridad |
|---|---|---|---|---|
| **Dominio propio** (ej. `espinabifidanl.org`) | Cloudflare / Namecheap | ~$250–$350 MXN/año | Dirección web profesional en lugar de `.vercel.app` | Alta |
| **Correo institucional** | Google Workspace | ~$900 MXN/año | Correo `@espinabifidanl.org` para enviar códigos de verificación y comunicaciones del sistema | Media |

### 3.3 Costos de Mantenimiento Técnico (el más importante)

La infraestructura es barata. **El costo real del sistema es el tiempo de una persona técnica** para mantenerlo actualizado y resolver problemas.

| Actividad | Frecuencia | Horas estimadas/año | Qué implica |
|---|---|---|---|
| Actualización de dependencias y seguridad | Mensual | ~12 hrs | Revisar alertas de GitHub y aplicar parches |
| Respaldo de datos (manual) | Mensual | ~3 hrs | Exportar copia de la base de datos Oracle |
| Revisión de alertas del sistema | Semanal | ~8 hrs | Ver que el servidor siga funcionando |
| Correcciones de errores menores | Según necesidad | ~10–20 hrs | Bugs o ajustes que aparezcan en uso real |
| **Total estimado** | | **~33–43 hrs/año** | |

> **Recomendación:** Establecer un acuerdo de soporte técnico con el equipo de desarrollo original o con un técnico local. Sin mantenimiento periódico, el sistema puede dejar de funcionar correctamente en 12–18 meses.

### 3.4 Resumen de Costos Anuales

| Categoría | Costo mínimo/año | Costo recomendado/año |
|---|---|---|
| Infraestructura (servidores) | $1,596 MXN | $1,596 MXN |
| Dominio propio | $0 (usando `.vercel.app`) | $300 MXN |
| **Subtotal tecnología** | **$1,596 MXN** | **$1,896 MXN** |
| Soporte técnico (externo) | Variable | $3,000–$6,000 MXN* |
| **TOTAL ESTIMADO** | **$1,596 MXN** | **$4,896–$7,896 MXN** |

*Precio estimado de mercado para soporte técnico básico en México (1–2 horas/mes a $250–$500 MXN/hr).

---

## 4. Limitaciones Actuales del Sistema

Esta sección describe funcionalidades que **no están completamente operativas** al momento de la entrega. Cada punto incluye qué significa para el uso diario y qué se necesita para resolverlo.

### 4.1 Sin respaldo automático de la base de datos

**Qué significa:** Los datos del sistema (beneficiarios, membresías, servicios, etc.) se almacenan en Oracle Cloud, que tiene su propia protección interna. Sin embargo, **no existe un proceso documentado** para hacer copias de respaldo periódicas que la asociación controle directamente.

**Impacto:** En caso de un problema grave con Oracle Cloud o una eliminación accidental de datos, la recuperación dependería de los mecanismos de Oracle (que sí existen, pero no están documentados para este proyecto).

**Cómo resolverlo:** Establecer una rutina mensual de exportación de datos. El equipo técnico puede crear un script que se ejecute automáticamente. Tiempo estimado: 4–8 horas de trabajo técnico.

---

### 4.2 Dominio web sin personalizar

**Qué significa:** El sistema actualmente es accesible en:
- Pantalla: `https://espinabifida-nl.vercel.app`
- Servidor: `https://espinabifida-api.onrender.com` (interno)

Estas direcciones no son profesionales y pueden cambiar si se migra de proveedor.

**Cómo resolverlo:** Registrar un dominio como `espinabifidanl.org` o `espinabifida.org.mx` y configurarlo. Costo: ~$250–350 MXN/año. Tiempo técnico: 2–4 horas.

---

### 4.3 El servidor puede tardar en responder después de inactividad

**Qué significa:** El plan gratuito/básico de Render tiene un comportamiento llamado "cold start" (arranque en frío): si nadie usa el sistema por un período largo (horas), el servidor puede tardar 30–60 segundos en responder la primera solicitud.

**Impacto:** Ocasionalmente, al abrir el sistema después de una noche o fin de semana, puede haber una espera inicial.

**Cómo resolverlo:** Actualizar al plan estándar de Render (~$25 USD/mes = ~$475 MXN/mes = ~$5,700 MXN/año). Solo recomendado si la espera es frecuentemente problemática.

---

### 4.4 Vulnerabilidades en componentes de software

**Qué significa:** GitHub detecta 6 vulnerabilidades en las bibliotecas de software que usa el sistema (4 altas, 2 moderadas). Estas son fallas conocidas en componentes de terceros que podrían ser explotadas por atacantes.

**Impacto actual:** Bajo (el sistema tiene otras capas de seguridad). Sin embargo, si no se atienden en los próximos 6–12 meses, el riesgo aumenta.

**Cómo resolverlo:** Un desarrollador técnico debe revisar y actualizar las dependencias. Tiempo estimado: 2–4 horas. No tiene costo adicional, solo requiere tiempo técnico.

---

### 4.5 Clasificación de precios A/B — No conectada al flujo de registro

**Qué significa:** El sistema tiene la capacidad de asignar a cada beneficiario una clasificación de cuota (A = precio subsidiado, B = precio de lista). Sin embargo, al registrar un servicio, el sistema **no calcula automáticamente** el precio según esta clasificación — el personal debe ingresar el monto manualmente.

**Impacto:** Mayor trabajo manual al registrar servicios con artículos de inventario.

**Cómo resolverlo:** Mejora de software estimada en 4–6 horas de desarrollo.

---

### 4.6 Vínculo directo entre Citas y Servicios — No implementado

**Qué significa:** Cuando se registra una consulta médica y se agenda una cita, ambos registros existen de forma separada en el sistema. No están vinculados automáticamente: si se cancela la cita, el servicio no se cancela solo (y viceversa).

**Impacto:** El personal debe cancelar manualmente en ambas secciones.

**Cómo resolverlo:** Mejora de software estimada en 8–12 horas de desarrollo.

---

## 5. Recomendaciones para la Asociación

### Inmediato (antes de iniciar operación)

1. **Configurar dominio propio.** Da identidad profesional al sistema. Costo: ~$300 MXN/año.
2. **Establecer contacto de soporte técnico.** Acordar con el equipo de desarrollo (o un técnico externo) un canal de comunicación para resolver problemas urgentes.
3. **Designar un "administrador del sistema"** dentro del personal. Esta persona debe conocer la dirección web, cómo iniciar sesión como administrador, y a quién llamar si algo falla.

### Corto plazo (primeros 3 meses)

4. **Activar SMS para recuperación de contraseña** (Twilio). Bajo costo, alta utilidad.
5. **Implementar rutina de respaldo mensual.** El equipo técnico puede ayudar a automatizarlo.

### Mediano plazo (6–12 meses)

6. **Resolver vulnerabilidades de seguridad** (actualización de dependencias). Requiere tiempo técnico.
7. **Conectar clasificación de precios A/B** al registro de servicios. Reduce trabajo manual.

---

## 6. Plan de Contingencia — ¿Qué hacer si algo falla?

| Problema | Qué hacer primero |
|---|---|
| El sistema no carga | 1) Verificar conexión a internet. 2) Esperar 60 segundos (cold start). 3) Llamar al soporte técnico. |
| Alguien olvidó su contraseña | El administrador principal puede crear/resetear contraseñas desde el panel de Administradores. |
| Los reportes PDF no generan | Revisar que el servidor Render esté activo en [render.com](https://render.com). Puede ser un problema de memoria en el servidor. |
| Los datos no se guardan / error rojo en pantalla | Capturar screenshot del error y contactar soporte técnico. Anotar qué se estaba haciendo cuando ocurrió. |
| El servidor está caído (502 / 503) | Iniciar sesión en [render.com](https://render.com) y reiniciar el servicio manualmente, o contactar soporte. |

---

## 7. Contacto y Soporte

| Rol | Responsabilidad |
|---|---|
| **Equipo de desarrollo (AccessCodeEB)** | Soporte técnico post-entrega durante el período acordado, corrección de bugs críticos |
| **Render.com** | Soporte del servidor backend: [render.com/support](https://render.com/support) |
| **Vercel** | Soporte del frontend: [vercel.com/support](https://vercel.com/support) |
| **Oracle Cloud** | Soporte de base de datos: [cloud.oracle.com/support](https://cloud.oracle.com/support) |

> **Importante:** Para emergencias técnicas (sistema completamente inaccesible), contactar directamente al equipo de desarrollo. Toda la configuración del sistema está documentada en el repositorio de código `github.com/AccessCodeEB/EspinaBifida`.

---

## 8. Glosario Rápido

| Término | Qué significa en palabras simples |
|---|---|
| **Servidor (backend)** | La computadora en la nube que procesa la información del sistema |
| **Frontend** | Lo que ve el usuario en el navegador — las pantallas y formularios |
| **Base de datos** | El "archivo" digital donde se guardan todos los datos de la asociación |
| **Plan gratuito / free tier** | Una oferta de los proveedores que no tiene costo mientras el uso sea bajo |
| **Dominio** | La dirección web del sistema (como `espinabifidanl.org`) |
| **Dependencias** | Componentes de software de terceros que usa el sistema |
| **Respaldo (backup)** | Copia de seguridad de los datos |
| **Cold start** | Tiempo de arranque cuando el servidor ha estado inactivo |

---

*Documento generado en Junio 2026. Revisar y actualizar anualmente o cuando cambien los planes de los proveedores de servicio.*
