## Inicio de sesión obligatorio

**Al comenzar cualquier conversación, leer `AVANCE_PROYECTO.md` antes de hacer cualquier otra cosa.**

Este archivo es la fuente de verdad del proyecto: qué está hecho, qué falta, cronograma y prioridades. Usarlo para orientar qué implementar a continuación. Si el archivo parece desactualizado respecto al estado real del código, actualizarlo.

```
Read /Users/leobardo/Desktop/EspinaBifida/AVANCE_PROYECTO.md
```

---

## Registro obligatorio en Jira

**Cada vez que se implemente, modifique o complete algo en el código, actualizar Jira de inmediato.**

Esto incluye:
- Crear o mover una subtask al estado correspondiente cuando se termina (`En progreso` → `Listo`)
- Si se implementa algo que no tiene subtask, **crearla y cerrarla** en ese momento
- Al terminar una Story completa, verificar que todas sus subtasks estén cerradas

El objetivo es mantener Jira sincronizado con el código y evitar discrepancias entre lo que dice el tablero y lo que está en GitHub.

**Flujo recomendado por tarea:**
1. Antes de implementar → verificar que existe la subtask en Jira
2. Al empezar → mover subtask a `En progreso`
3. Al terminar y hacer commit → mover subtask a `Listo`

cloudId Jira: `406fb017-139a-4e56-9aee-8402270aa958` — proyecto `SCRUM`

---

## Reglas de commits

* **NUNCA** incluir autoría de Claude en commits (`Co-Authored-By: Claude` o similar)
* Los commits solo deben llevar el autor del desarrollador humano

## gstack workflow (EspinaBifida project)

This project uses gstack as a structured AI-assisted development workflow.

### Required workflow

* Always start tasks with `/plan`
* Always run `/review` before committing or opening a PR
* Use `/qa` to validate backend logic and edge cases

### Backend focus

* Validate business rules (active membership, inventory updates)
* Ensure Oracle database consistency
* Consider edge cases in all endpoints

### When to use

* `/plan-eng-review` → for database or architecture changes
* `/autoplan` → during implementation
* `/ship` → before deploy

### Goal

Maintain code quality, reduce bugs, and standardize development across the team.

## Project Overview

Web-based management system for a Spina Bifida association. Replaces fragmented Excel workflows to centralize and automate management of beneficiaries, memberships, medical services, inventory, appointments, and reports.

**Core goal:** Reduce manual work, ensure data integrity, and enable reporting for donors and institutions.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express (REST API) |
| Database | Oracle (production schema exists) |
| Frontend | Web-based (Admin dashboard + public pre-registration form) |
| Testing | Jest (unit), Supertest (API/integration), E2E flows |
| CI/CD | GitHub Actions |

---

## Users

- **Admin** — full system access
- **Staff / Volunteers** — operational access (register services, manage beneficiaries)
- **External patients** — pre-registration form only, no internal system access

---

## Critical Business Rules

These rules must be enforced at the API level, not just the UI.

### Membership
- A beneficiary **must have an active membership** (credencial) to receive any service
- Membership expiration **automatically sets beneficiary status to `Inactivo`**
- Expiration is calculated from `FECHA_ULTIMO_PAGO` in `CREDENCIALES`
- Status values: `Activo`, `Inactivo`, `Baja` (enforced by DB CHECK constraint)
- **Memberships are annual** (12 months from `FECHA_VIGENCIA_INICIO`) — never monthly
- **Membership cost** is determined automatically by checking prior credential history:
  - No prior credentials → `nuevo_ingreso` → **$200**
  - Has prior credentials → `reinscripcion` → **$150**
- The `tipo` field (`nuevo_ingreso` | `reinscripcion`) can be overridden by the caller but defaults to DB-detected value via `countCredencialesByCurp()`
- `OBSERVACIONES` are mandatory when registering a membership
- `METODO_PAGO` (`efectivo`, `transferencia`, `tarjeta`) is required

### Services
- **Beneficiaries with inactive membership (`Inactivo`) CAN still receive services** — this is a non-profit association and access is not blocked. A `warning` field is returned in the response to remind staff to invite the beneficiary to renew.
- Only beneficiaries with `Baja` status are hard-blocked from receiving services.
- Every service must be linked to a `CURP` (beneficiary primary key)
- Service types: consultations, studies, medication, equipment loans (comodatos)

### Inventory
- Inventory (`ARTICULOS.INVENTARIO_ACTUAL`) **decreases automatically** when a service consumes an item via `SERVICIO_ARTICULOS`
- `ARTICULOS.MANEJA_INVENTARIO = 'S'` means stock tracking is active for that item
- Trigger or service layer must log a `MOVIMIENTOS_INVENTARIO` record (type `SALIDA`) on each deduction
- **Low stock alerts** must be triggered when stock falls below a threshold

### Pre-registration
- External users submit data → Admin approves or rejects
- Approved pre-registrations become `BENEFICIARIOS` records

---

## Database Schema

**Database:** Oracle. All table and column names are UPPERCASE. Primary keys use sequences + BEFORE INSERT triggers for auto-increment.

### Core Tables

#### `BENEFICIARIOS`
Primary key: `CURP` (VARCHAR2 18) — Mexican national ID, used as FK everywhere.

| Column | Type | Notes |
|---|---|---|
| CURP | VARCHAR2(18) | PK |
| NOMBRES | VARCHAR2(100) | |
| APELLIDO_PATERNO | VARCHAR2(100) | |
| APELLIDO_MATERNO | VARCHAR2(100) | |
| FECHA_NACIMIENTO | DATE | |
| GENERO | VARCHAR2(20) | |
| CIUDAD / MUNICIPIO / ESTADO | VARCHAR2(100) | |
| TIPO_SANGRE | VARCHAR2(10) | |
| USA_VALVULA | CHAR(1) | |
| ESTATUS | VARCHAR2(10) | `'Activo'`, `'Inactivo'`, `'Baja'` |
| FECHA_ALTA | DATE | |

#### `CREDENCIALES` (Memberships)
| Column | Type | Notes |
|---|---|---|
| ID_CREDENCIAL | NUMBER | PK (sequence) |
| CURP | VARCHAR2(18) | FK → BENEFICIARIOS |
| NUMERO_CREDENCIAL | VARCHAR2(50) | |
| FECHA_VIGENCIA_INICIO | DATE | |
| FECHA_VIGENCIA_FIN | DATE | Expiration date |
| FECHA_ULTIMO_PAGO | DATE | Used to calculate validity |

Membership is active when `SYSDATE BETWEEN FECHA_VIGENCIA_INICIO AND FECHA_VIGENCIA_FIN`.

#### `SERVICIOS` (Service records)
| Column | Type | Notes |
|---|---|---|
| ID_SERVICIO | NUMBER | PK (SEQ_SERVICIOS) |
| CURP | VARCHAR2(18) | FK → BENEFICIARIOS |
| ID_TIPO_SERVICIO | NUMBER | FK → SERVICIOS_CATALOGO |
| FECHA | TIMESTAMP | |
| COSTO | NUMBER(10,2) | |
| MONTO_PAGADO | NUMBER(10,2) | |
| REFERENCIA_ID | NUMBER | Polymorphic ref (e.g., comodato ID) |
| REFERENCIA_TIPO | VARCHAR2(50) | Type label for polymorphic ref |

#### `SERVICIOS_CATALOGO` (Service type catalog)
| Column | Type |
|---|---|
| ID_TIPO_SERVICIO | NUMBER PK |
| NOMBRE | VARCHAR2(100) |

#### `SERVICIO_ARTICULOS` (Items consumed per service)
| Column | Type |
|---|---|
| ID | NUMBER PK |
| ID_SERVICIO | NUMBER FK → SERVICIOS |
| ID_ARTICULO | NUMBER FK → ARTICULOS |
| CANTIDAD | NUMBER |

#### `ARTICULOS` (Inventory items)
| Column | Type | Notes |
|---|---|---|
| ID_ARTICULO | NUMBER | PK (SEQ_ARTICULOS) |
| DESCRIPCION | VARCHAR2(150) | |
| UNIDAD | VARCHAR2(50) | |
| CUOTA_RECUPERACION | NUMBER(10,2) | Recovery fee |
| INVENTARIO_ACTUAL | NUMBER | Current stock |
| MANEJA_INVENTARIO | CHAR(1) | `'S'` = tracked, `'N'` = not tracked |
| ID_CATEGORIA | NUMBER | FK → CATEGORIAS_ARTICULO |

#### `MOVIMIENTOS_INVENTARIO` (Inventory log)
| Column | Type | Notes |
|---|---|---|
| ID_MOVIMIENTO | NUMBER | PK (SEQ_MOV_INV, trigger TRG_MOV_INV_BI) |
| ID_ARTICULO | NUMBER | FK → ARTICULOS |
| TIPO_MOVIMIENTO | VARCHAR2(50) | `'ENTRADA'` or `'SALIDA'` (CHECK constraint) |
| CANTIDAD | NUMBER | Must be > 0 (CHECK constraint) |
| FECHA | DATE | |
| MOTIVO | CLOB | |

> **Note:** `MOVIMIENTOS_INVENTARIO` is the canonical inventory movement table (indexes on `ID_ARTICULO` and `FECHA`). The legacy `MOVIMIENTOS` table has been dropped.

#### `CITAS` (Appointments)
| Column | Type | Notes |
|---|---|---|
| ID_CITA | NUMBER | PK (SEQ_CITAS) |
| CURP | VARCHAR2(18) | FK → BENEFICIARIOS |
| ID_TIPO_SERVICIO | NUMBER | FK → SERVICIOS_CATALOGO |
| ESPECIALISTA | VARCHAR2(100) | |
| FECHA | TIMESTAMP | |
| ESTATUS | VARCHAR2(50) | |

#### `ADMINISTRADORES` (System users)
| Column | Type | Notes |
|---|---|---|
| ID_ADMIN | NUMBER | PK (identity) |
| ID_ROL | NUMBER | FK → ROLES |
| EMAIL | VARCHAR2(100) | Unique |
| PASSWORD_HASH | VARCHAR2(255) | |
| ACTIVO | NUMBER(1,0) | 1 = active |

#### `ROLES`
| Column | Type |
|---|---|
| ID_ROL | NUMBER PK (identity) |
| NOMBRE_ROL | VARCHAR2(50) |

#### `PADECIMIENTOS` + `BENEFICIARIO_PADECIMIENTOS`
Medical conditions catalog and many-to-many link to beneficiaries.

### Key Relationships
```
BENEFICIARIOS (CURP)
  ├── CREDENCIALES         (1:N, membership history)
  ├── SERVICIOS            (1:N, service records)
  │     └── SERVICIO_ARTICULOS → ARTICULOS
  ├── CITAS                (1:N, appointments)
  └── BENEFICIARIO_PADECIMIENTOS → PADECIMIENTOS

ARTICULOS
  ├── MOVIMIENTOS_INVENTARIO  (stock log)
  └── CATEGORIAS_ARTICULO     (FK)

ADMINISTRADORES → ROLES
```

### Sequence / Trigger Pattern (Oracle)
All numeric PKs use the pattern:
```sql
-- Sequence: SEQ_<TABLE>
-- Trigger: TRG_<TABLE>_BI (BEFORE INSERT, assigns NEXTVAL when PK IS NULL)
```
Always insert without specifying the PK — the trigger handles it.

---

## API Design Guidelines

- Follow REST conventions: `GET /beneficiarios`, `POST /servicios`, `PATCH /credenciales/:id`
- Return consistent JSON: `{ data, message, error }`
- **Always validate membership status before registering a service**
- Use HTTP status codes correctly: 200, 201, 400, 401, 403, 404, 409, 500
- Paginate list endpoints: `?page=1&limit=20`
- Input validation on all POST/PUT/PATCH routes

### Membership check pattern (pseudo-code)
```js
// Before creating a service
const credencial = await getActiveCredencial(curp);
if (!credencial) throw new AppError(403, 'Beneficiary does not have an active membership');
```

---

## Reports Required

| Report | Grouping |
|---|---|
| Patients per month | COUNT by month/year |
| Patients by gender | GROUP BY GENERO |
| Local vs external | GROUP BY CIUDAD/ESTADO vs association location |
| Age group classification | Derived from FECHA_NACIMIENTO |

---

## Testing Strategy

- **Unit tests (Jest):** Service layer logic, business rule validation, utility functions
- **Integration tests (Supertest):** API endpoint behavior, DB interactions
- **E2E tests:** Full user flows (register beneficiary → create membership → register service)
- **Security tests:** Auth, role-based access, input sanitization
- **Target:** 90–95% test success per sprint, 100% user story coverage
- All tests run in CI/CD via GitHub Actions

---

## Constraints

- Web-only, no offline mode
- Internet connection required
- External patients cannot access internal system
- No hardware integrations (no barcode scanners, etc.)
- UI must be simple — designed for low-tech users

---

## Code Standards

- Write clean, readable, maintainable code
- Include input validation on all routes
- Handle edge cases explicitly (expired memberships, zero stock, duplicate CURP, etc.)
- Do not redesign the database schema unless explicitly asked
- Prefer simplicity over abstraction — avoid overengineering
- Comment non-obvious business logic
- Use `async/await` with proper error handling (`try/catch` or error middleware)

---

## Known Schema Notes

- `MOVIMIENTOS_INVENTARIO` is the only inventory movement table — `MOVIMIENTOS` was dropped
- `SERVICIOS.REFERENCIA_ID` + `REFERENCIA_TIPO` implement a polymorphic association pattern — use carefully
- The SQL export contains ORA export errors for constraints/sequences that already exist inline in the CREATE TABLE statements — these can be ignored

## Maintenance Instructions

Claude Code is allowed to update this file when:
- New tables or columns are added to the schema
- Business rules change or are clarified
- New patterns or conventions are established
- Bugs reveal missing context or wrong assumptions

Always keep updates concise and accurate.