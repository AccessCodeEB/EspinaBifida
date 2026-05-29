# Documentación Completa de la API — Swagger/OpenAPI Interactivo

**Rama:** main  
**Jira:** SCRUM-24  
**Fecha:** 2026-05-25  
**Story points:** 3 (ajustado: 5 real)  
**Prioridad:** Alta (requerida para entrega al socio formador ~2026-06-08)  
**Estimado real:** 10-12 horas  

---

## Contexto y motivación

El backend tiene **82 endpoints** en **16 archivos de rutas** documentados únicamente en Markdown (`docs/API_REFERENCE.md`, `docs/AUTENTICACION.md`). La documentación Markdown se desactualiza, no permite probar endpoints directamente y requiere que el socio formador lea dos archivos en paralelo.

**Meta:** Swagger/OpenAPI 3.0 interactivo en `/api-docs`, generado desde el código (JSDoc), con:
- JWT integrado (botón Authorize)
- Schemas reutilizables para los 9 modelos principales
- Credenciales de prueba visibles en la descripción de la API
- Guard `NODE_ENV !== 'production'` para no exponer en producción

**Paquetes a instalar:** `swagger-jsdoc`, `swagger-ui-express` (actualmente ninguno instalado)

---

## Alcance — 82 endpoints, 16 archivos de rutas

| Módulo | Archivo(s) | Endpoints | Prioridad |
|---|---|---|---|
| Administradores + Auth | `administradores.routes.js` | 12 | P0 |
| Beneficiarios | `beneficiarios.routes.js` + `beneficiarios.v1.routes.js` | 12 + 7 | P0 |
| Membresías | `membresias.routes.js` + `membresias.v1.routes.js` | 6 + 6 | P0 |
| Servicios | `servicios.routes.js` | 7 | P0 |
| Artículos | `articulos.routes.js` | 5 | P1 |
| Inventario | `inventario.routes.js` + `inventario.v1.routes.js` | 3 + 3 | P1 |
| Reportes | `reportes.routes.js` | 3 | P1 |
| Citas | `citas.routes.js` | 6 | P1 |
| Notificaciones | `notificaciones.routes.js` | 5 | P1 |
| Catálogos + Roles | `servicios-catalogo.routes.js`, `especialistas.routes.js`, `roles.routes.js` | 1 + 1 + 2 | P2 |
| Configuración | `configuracion.routes.js` | 3 | P2 |

### Fuera de alcance
- Swagger en producción (solo dev/staging — guard por `NODE_ENV`)
- Endpoint `/health`
- Migraciones de BD
- Swagger para entorno de producción o CI/CD deploy

---

## Arquitectura de la solución

### Estructura de archivos a crear

```
src/config/swagger.js          ← Config swagger-jsdoc + schemas globales
src/config/swagger.schemas.js  ← Schemas reutilizables de modelos Oracle
src/tests/swagger.test.js      ← Valida que el spec OpenAPI sea válido
```

### Registro en app.js (NO en server.js)

```javascript
// En src/app.js, después de CORS y antes de las rutas:
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { swaggerConfig } from './config/swagger.js';

if (process.env.NODE_ENV !== 'production') {
  const swaggerSpec = swaggerJsdoc(swaggerConfig);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}
```

> **Por qué app.js y no server.js:** `swagger-jsdoc` debe ejecutarse *después* de que todos los archivos de rutas sean importados para descubrir los JSDoc. `server.js` solo levanta el servidor HTTP; `app.js` es donde viven las rutas.

### Autenticación en Swagger UI

```javascript
// En swagger.js — securityScheme
components: {
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Usar POST /administradores/login para obtener el token. Demo: email=admin@espinabifida.mx, password=Admin123'
    }
  }
}
```

### Estrategia de versiones — evitar endpoints duplicados

Rutas `/beneficiarios` y `/api/v1/beneficiarios` son la misma lógica en dos montajes. Usar **tags separados por versión** en los JSDoc:

```javascript
// beneficiarios.routes.js (legacy)
* tags: ['Beneficiarios']

// beneficiarios.v1.routes.js
* tags: ['Beneficiarios v1']
```

Esto evita que Swagger UI muestre entradas duplicadas sin operationId.

### Documentación de nomenclatura Oracle

En la descripción global del API spec incluir:

> Las respuestas del servidor devuelven campos en **UPPER_SNAKE_CASE** (ej: `NOMBRE_COMPLETO`, `FECHA_NACIMIENTO`) porque vienen directamente de Oracle. Los bodies de request usan **camelCase** (ej: `nombreCompleto`, `fechaNacimiento`). Esta asimetría es intencional.

---

## Schemas globales a definir en swagger.schemas.js

### Modelos de datos (componentes reutilizables)
- `Beneficiario` — campos CURP (PK, 18 chars), nombres, ESTATUS enum ['Activo','Inactivo','Baja']
- `Credencial` — ID_CREDENCIAL, CURP, fechas vigencia, FECHA_ULTIMO_PAGO
- `Servicio` — ID_SERVICIO, CURP (FK), ID_TIPO_SERVICIO, REFERENCIA_TIPO (comodatos)
- `Articulo` — ID_ARTICULO, INVENTARIO_ACTUAL, MANEJA_INVENTARIO enum ['S','N']
- `Cita` — ID_CITA, CURP, ESPECIALISTA, ESTATUS
- `Notificacion` — ID, TIPO, MENSAJE, LEIDA
- `Administrador` — ID_ADMIN, ID_ROL, EMAIL, ACTIVO
- `MovimientoInventario` — TIPO_MOVIMIENTO enum ['ENTRADA','SALIDA'], CANTIDAD > 0

### Respuestas estándar reutilizables
- `Error400` — `{ error: string, details?: string[] }`
- `Error401` — `{ error: 'No autorizado' }`
- `Error403` — `{ error: 'Sin permisos' }`
- `Error404` — `{ error: 'No encontrado' }`
- `Error409` — `{ error: string, code: string }` (ej. CURP duplicada → `DUPLICATE_CURP`)
- `Error500` — `{ error: 'Error interno del servidor' }`
- `PaginatedResponse` — `{ data: [], total: number, page: number, limit: number }`
- `FileUploadSchema` — `{ foto: { type: string, format: binary } }` para multipart/form-data

---

## Plan de implementación (Tasks)

### Task 1 — Instalar paquetes y crear configuración base (30 min)
```bash
npm install swagger-jsdoc swagger-ui-express
```
- Crear `src/config/swagger.js` con info, servers, securitySchemes
- Crear `src/config/swagger.schemas.js` con todos los schemas globales
- Registrar `/api-docs` en `src/app.js` con guard `NODE_ENV !== 'production'`
- Verificar que `GET /api-docs` responde en dev (aunque sin endpoints aún)

### Task 2 — Schemas compartidos (~1 hora)
- Definir los 8 modelos + 6 respuestas de error + PaginatedResponse + FileUploadSchema
- Importar desde `swagger.schemas.js` en `swagger.js`

### Task 3 — swagger.test.js (~30 min)
```javascript
// src/tests/swagger.test.js
import swaggerJsdoc from 'swagger-jsdoc';
import { swaggerConfig } from '../config/swagger.js';

test('OpenAPI spec es válido y tiene versión 3.0.0', () => {
  const spec = swaggerJsdoc(swaggerConfig);
  expect(spec).toBeDefined();
  expect(spec.openapi).toBe('3.0.0');
  expect(spec.paths).toBeDefined();
});
```

### Task 4 — Anotar Administradores (P0, ~1 hora)
`src/routes/administradores.routes.js` — 12 endpoints:
- POST `/administradores/login` — public, sin auth, 200/400/401
- POST `/forgot-password` — public, OTP flow, 200/400/404/429
- PATCH `/forgot-password/reset` — public, 200/400/401/429
- GET/POST/PUT/DELETE `/administradores` — bearerAuth, roles 1 o 2
- PATCH `/:idAdmin/password` + PATCH `/:idAdmin/telefono` — bearerAuth
- POST/DELETE `/:idAdmin/foto-perfil` — multipart/form-data, bearerAuth
- POST `/:idAdmin/otp/verificar` — OTP verification, bearerAuth

### Task 5 — Anotar Beneficiarios (P0, ~1 hora)
`src/routes/beneficiarios.routes.js` + `beneficiarios.v1.routes.js` — 19 endpoints:
- POST `/solicitud-publica` — public, Turnstile, pre-registro
- GET/POST `/beneficiarios`, GET/PUT/DELETE `/:curp`
- PATCH `/:curp/estatus`, POST `/:curp/foto-perfil`, DELETE `/:curp/foto-perfil`
- v1: GET `/pre-registros`, POST `/pre-registros/:curp/aprobar|rechazar`
- Incluir: CURP como PK (18 chars, regex `^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$`)

### Task 6 — Anotar Membresías (P0, ~45 min)
`src/routes/membresias.routes.js` + `membresias.v1.routes.js` — 12 endpoints:
- GET/POST/PUT/DELETE `/membresias/:curp`
- GET `/:curp/activa` — validación vigencia (responde ACTIVA/VENCIDA)
- v1: incluir `estado` enum y `metodo_pago`

### Task 7 — Anotar Servicios (P0, ~45 min)
`src/routes/servicios.routes.js` — 7 endpoints:
- Documentar validación de membresía activa (403 si inactiva)
- Documentar `REFERENCIA_TIPO='COMODATO'` para préstamos de equipo
- GET detalle y filtros paginados

### Task 8 — Anotar Artículos e Inventario (P1, ~45 min)
- `articulos.routes.js` — CRUD, campo MANEJA_INVENTARIO
- `inventario.routes.js` + `inventario.v1.routes.js` — movimientos ENTRADA/SALIDA, alertas stock mínimo

### Task 9 — Anotar Reportes, Citas, Notificaciones (P1, ~1 hora)
- Reportes: parámetros de tipo (beneficiarios/membresias/etc.), formato (pdf/xlsx), descarga autenticada
- Citas: filtros por fecha, estatus (`Pendiente`/`Confirmada`/`Cancelada`)
- Notificaciones: GET panel, PATCH /:id/leer, PATCH /leer-todas

### Task 10 — Anotar Catálogos, Roles, Configuración (P2, ~30 min)
- Endpoints simples de GET (catálogos read-only)
- `configuracion.routes.js` — operaciones de admin solo rol 1

### Task 11 — Verificación completa (~1 hora)
- `npm run dev` → abrir `http://localhost:3000/api-docs`
- Flujo completo: login → copiar JWT → Authorize → llamar `GET /beneficiarios`
- Verificar todos los módulos con sus tags correctos
- Verificar `NODE_ENV=production` → `/api-docs` retorna 404
- Correr `npm test` — debe pasar incluyendo `swagger.test.js`

### Task 12 — Actualizar docs y Jira (~30 min)
- Actualizar `docs/API_REFERENCE.md` con banner: "Ver documentación interactiva en `/api-docs` (dev)"
- Actualizar `AVANCE_PROYECTO.md` — mover Swagger a ✅ completado
- Transicionar subtasks SCRUM-134, 136, 140, 143, 146, 148 → En progreso → Listo

---

## Criterios de aceptación

1. `GET /api-docs` sirve Swagger UI con los 82 endpoints en dev
2. Botón "Authorize" acepta JWT, endpoints protegidos retornan 200 (no 401)
3. Cada endpoint tiene: método, path, descripción, security, parámetros/body, respuestas con todos los códigos aplicables
4. Schemas de modelos son reutilizables vía `$ref '#/components/schemas/...'` (no inline repetidos)
5. `NODE_ENV=production` → `/api-docs` devuelve 404
6. `npm test` pasa incluyendo `swagger.test.js`
7. Nomenclatura camelCase vs UPPER_SNAKE_CASE documentada en descripción global

---

## Riesgos y mitigaciones

| Riesgo | Severidad | Mitigación |
|---|---|---|
| JSDoc malformado genera spec inválido silenciosamente | HIGH | `swagger.test.js` + ejecutar `swagger-jsdoc --validate` en CI |
| Rutas v1 y legacy producen endpoints duplicados en Swagger | CRITICAL | Tags separados: `Beneficiarios` vs `Beneficiarios v1` |
| Schemas no reflejan respuestas reales del backend | HIGH | Validar schemas contra respuestas de E2E tests |
| Exposición accidental en producción | HIGH | Guard `NODE_ENV !== 'production'` en app.js |
| Credenciales de demo no documentadas → socio formador no puede testear | HIGH | Incluir en `bearerAuth.description` y en Task 12 |
| 82 endpoints manuales = tasa de error alta en JSDoc | MEDIUM | Revisar spec en `/api-docs` después de cada Task 4-10 |

---

## Estimado de esfuerzo real

| Tarea | Estimado |
|---|---|
| Task 1-2: Setup + schemas globales | 1.5h |
| Task 3: swagger.test.js | 30 min |
| Task 4-7: Módulos P0 (Auth, Beneficiarios, Membresías, Servicios) | 3.5h |
| Task 8-10: Módulos P1-P2 (Artículos, Inventario, Reportes, Citas, Notif, Catálogos) | 2.5h |
| Task 11-12: Verificación + docs + Jira | 1.5h |
| **Total ajustado** | **~10h** |

---

## Decision Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rechazado |
|---|-------|----------|----------------|-----------|-----------|-----------|
| 1 | CEO | 82 endpoints completos | User override | Usuario | Socio formador requiere cobertura total | 40 endpoints críticos |
| 2 | Eng | Registrar swagger en app.js (no server.js) | Mechanical | P5 | app.js importa todas las rutas; server.js solo levanta HTTP | server.js |
| 3 | Eng | Tags separados por versión (legacy vs v1) | Mechanical | P5 | Evita entradas duplicadas en Swagger UI | Consolidar rutas |
| 4 | Eng | swagger.test.js en suite Jest | Mechanical | P1 | Detecta spec inválido antes de que llegue a /api-docs | Solo validación manual |
| 5 | DX | Credenciales demo en bearerAuth.description | Mechanical | P5 | Sin demo creds el socio formador no puede probar nada | Solo en README |
| 6 | DX | Documentar UPPER_SNAKE_CASE→camelCase en swagger info | Mechanical | P5 | Mayor fuente de confusión para staff no técnico | Ignorar la asimetría |
| 7 | DX | Pre-commit: correr swagger-jsdoc tras cada Task 4-10 | Mechanical | P1 | 82 endpoints manuales = alta tasa de error en JSDoc | Solo validar en CI final |

---

## Temas cross-fase

**Tema 1: Carga de mantenimiento manual** — señalado en CEO (docs estancadas), Eng (schemas manuales, ~200+ propiedades), DX (error rate en 82 JSDoc). Señal de alta confianza. Mitigación: schemas definidos en `swagger.schemas.js` una vez y referenciados vía `$ref` en todos los endpoints. Nunca inline.

**Tema 2: Infraestructura de prueba faltante** — señalado en Eng (`swagger.test.js`) y DX (validar que respuestas del backend coincidan con schemas Swagger). Mitigación: Task 3 agrega el test; verificación manual en Task 11 cierra el loop.

---

## GSTACK REVIEW REPORT

| Phase | Voices | Status | Issues Found | Unresolved |
|---|---|---|---|---|
| CEO | Claude subagent | clean | 5 | 0 |
| Design | skipped (no UI scope) | — | — | — |
| Eng | Claude subagent | issues_open | 7 | 2 (schema drift, v1 dup) → mitigados en plan |
| DX | Claude subagent | issues_open | 5 | 0 (todos mitigados) |
| **Verdict** | subagent-only | **APPROVED** | 17 total | 0 unresolved |
