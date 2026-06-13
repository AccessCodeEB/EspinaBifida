# Sistema de Gestión — Asociación Espina Bífida NL

Sistema web de gestión para la Asociación de Espina Bífida de Nuevo León. Centraliza el manejo de beneficiarios, membresías, servicios médicos, inventario, citas, comodatos y reportes, reemplazando flujos fragmentados en Excel.

**Equipo:** a01541324 · a00839182 · a01286259 · a01383804 · a00840653 · a00839729

---

## Demo en producción

**Frontend:** https://espinabifida-nl.vercel.app/  
**API (Swagger):** disponible en `/api-docs` en ambiente de desarrollo

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Backend | Node.js + Express (REST API) |
| Base de datos | Oracle Autonomous Database (Cloud) |
| Frontend | Next.js 14 + React + TypeScript + Tailwind CSS |
| Pruebas unitarias | Jest + Supertest |
| Pruebas E2E | Playwright + QASE |
| CI/CD | GitHub Actions |
| Deploy | Vercel (frontend) + Oracle Cloud (BD) |

---

## Requisitos de desarrollo local

- Node.js 18+
- Oracle Instant Client instalado en `~/oracle/instantclient`
- Wallet de Oracle descomprimido en `wallet/`

---

## Configuración

### Backend

1. Copia `.env.example` → `.env` y ajusta las variables:

```env
PORT=3000
NODE_ENV=development
DB_USER=ADMIN
DB_PASSWORD=tu_password
DB_CONNECTION_STRING=NOMBRE_SERVICIO_HIGH
ORACLE_CLIENT_PATH=/Users/tu_usuario/oracle/instantclient
JWT_SECRET=tu_secreto
FRONTEND_URL=http://localhost:3001
```

2. Ajusta `wallet/sqlnet.ora` para que `DIRECTORY` apunte a la ruta absoluta de tu carpeta `wallet/`.

3. Instala dependencias y levanta el servidor:

```bash
npm install
npm run dev        # API en http://localhost:3000
```

Las migraciones de base de datos se ejecutan automáticamente al iniciar el servidor.

### Frontend

```bash
cd frontend
npm install
# Crea frontend/.env.local con:
# NEXT_PUBLIC_API_URL=http://localhost:3000
npm run dev        # UI en http://localhost:3001
```

### Fotos de perfil

Las imágenes viven en `uploads/` (no se versiona). Define `PROFILE_PHOTOS_REMOTE_BASE` en `.env.defaults` para que el backend las descargue automáticamente desde el servidor de referencia si no existen en local.

---

## Estructura del proyecto

```
/
├── src/                         # Backend (Node.js + Express)
│   ├── config/
│   │   ├── db.js                # Pool de conexiones Oracle
│   │   └── precios.js           # Precios base centralizados
│   ├── middleware/              # Auth JWT, RBAC, rate limiting, Zod
│   ├── modules/                 # Un módulo por dominio (MVC)
│   │   └── [modulo]/
│   │       ├── [modulo].model.js       # Queries SQL → Oracle
│   │       ├── [modulo].service.js     # Lógica de negocio
│   │       ├── [modulo].controller.js  # Manejo req/res
│   │       └── [modulo].routes.js      # Endpoints
│   ├── migrations/              # 35 migraciones versionadas
│   ├── utils/                   # Validators, OTP store, SMS, email
│   ├── app.js
│   └── server.js
├── frontend/                    # Next.js + TypeScript
│   ├── app/                     # App Router
│   ├── components/
│   │   ├── sections/            # Un componente por módulo del sistema
│   │   └── ui/                  # shadcn/ui components
│   └── services/                # API client por módulo
├── e2e/                         # Playwright (API + UI tests)
├── docs/                        # Manuales de usuario y documentación técnica
└── scripts/                     # Utilidades de BD y fotos
```

---

## Módulos del sistema

| Módulo | Descripción |
|---|---|
| **Beneficiarios** | CRUD completo, pre-registro público con aprobación/rechazo, foto de perfil, baja lógica, clasificación cuota A/B |
| **Membresías** | Alta, renovación, validación de vigencia anual, historial de pagos, editor de tarifas (admin) |
| **Servicios** | Registro de consultas, consumibles e insumos con validación de membresía; dashboard con KPIs y gráficas |
| **Comodatos** | Préstamo de equipos médicos, seguimiento de pagos, devolución física (anticipada/tardía), reporte de exenciones |
| **Citas** | Agenda semanal con mini-calendario, horarios por especialidad, bloqueo de capacidad, especialidades configurables |
| **Inventario** | Artículos con categorías, movimientos ENTRADA/SALIDA, alertas de stock bajo/agotado, historial de altas/bajas |
| **Reportes** | Generación PDF/XLSX por rango de fechas, descarga autenticada, generación automática nocturna por cron |
| **Notificaciones** | Alertas de membresías por vencer, stock bajo/agotado, comodatos por vencer; panel con campana en header |
| **Especialidades** | Configuración de horarios y excepciones por especialidad, validación dura de slots al agendar citas |
| **Administradores** | CRUD de usuarios, roles RBAC, cambio de contraseña con SMS OTP, recuperación de contraseña |
| **Pre-registro** | Formulario público con Cloudflare Turnstile, flujo de aprobación/rechazo en panel admin |

---

## Pruebas

```bash
# Unitarias + integración (con cobertura)
npm test
npm run test:coverage

# E2E completo
npm run test:e2e

# Solo API (Playwright)
npx playwright test --config=e2e/playwright.config.ts --project=api

# Solo UI (Playwright)
npx playwright test --config=e2e/playwright.config.ts --project=ui
```

| Métrica | Valor |
|---|---|
| Tests Jest | **1 469** en 58 suites |
| Cobertura statements | **97.71%** |
| Cobertura branches | **95.78%** |
| Cobertura funciones | **95.85%** |
| Tests E2E activos | **44** (API + UI) |
| SonarCloud issues | **0 abiertos** |

---

## Seguridad

- Autenticación JWT con refresh tokens
- RBAC con dos roles: Administrador y Staff
- Rate limiting: login (5/15 min), rutas públicas (10/h), rutas autenticadas (120/min), OTP (5/15 min)
- CORS restrictivo en producción (solo `FRONTEND_URL`)
- OTP generado con `crypto.randomInt` (criptográficamente seguro)
- Cloudflare Turnstile en formulario público
- Auditoría de operaciones sensibles en `AUDITORIA_OPERACIONES`

---

## Convenciones de código

- Arquitectura MVC: lógica SQL en `.model.js`, reglas de negocio en `.service.js`
- Columnas Oracle en `UPPER_SNAKE_CASE`; responses en `camelCase` (transformación automática)
- PKs numéricas via secuencias + triggers `BEFORE INSERT` — nunca especificar el PK al insertar
- Borrado lógico por defecto; borrado físico solo para datos de prueba (endpoints `e2e-cleanup`, bloqueados en producción)
- Validación de inputs con Zod en todas las rutas POST/PATCH/PUT
- `async/await` con `try/catch` y propagación a `errorHandler` global

---

## Documentación

| Documento | Ubicación |
|---|---|
| Manual de usuario interno | `docs/manual-usuario-interno.md` |
| Manual de usuario público | `docs/manual-usuario-publico.md` |
| Documento de Diseño de Software (SDD) | `docs/SDD.md` |
| Plan de calidad | `docs/documento-calidad.md` |
| API Reference (Swagger) | `/api-docs` (solo desarrollo) |
