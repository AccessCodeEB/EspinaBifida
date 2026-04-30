# API Reference — EspinaBifida Backend

Documentación completa de la API REST del sistema EspinaBifida.

---

## Información General

| Propiedad | Valor |
|-----------|-------|
| **Puerto** | `3000` (configurable en `.env` → `PORT`) |
| **URL base local** | `http://localhost:3000` |
| **Autenticación** | JWT (JSON Web Token) — **no usa sesiones ni cookies** |
| **Formato de datos** | JSON (`Content-Type: application/json`) |
| **Nomenclatura de campos** | El body de las peticiones usa **camelCase** en español (ej. `nombreCompleto`, `fechaNacimiento`). Las respuestas de Oracle devuelven **UPPER_SNAKE_CASE** (ej. `NOMBRE_COMPLETO`, `FECHA_NACIMIENTO`) |

---

## Autenticación

Las rutas protegidas requieren el token en el header:

```
Authorization: Bearer <token>
```

El token se obtiene en `POST /administradores/login` y contiene:

```json
{
  "idAdmin": 1,
  "idRol": 1,
  "nombreCompleto": "Super Admin",
  "email": "admin@espinabifida.mx",
  "nombreRol": "Super Administrador"
}
```

**Roles:**
- `1` → Super Administrador (acceso total)
- `2` → Recepción (acceso limitado)

---

## Módulos y Endpoints

### 🔐 Administradores
**Base:** `/administradores`
**Archivo:** `src/routes/administradores.routes.js`

| Método | Endpoint | Token | Rol | Descripción |
|--------|----------|-------|-----|-------------|
| POST | `/administradores/login` | ❌ | — | Login. Retorna JWT |
| GET | `/administradores` | ✅ | 1 | Listar todos los administradores |
| GET | `/administradores/:idAdmin` | ✅ | 1,2 | Obtener administrador por ID |
| POST | `/administradores` | ✅ | 1 | Crear nuevo administrador |
| PUT | `/administradores/:idAdmin` | ✅ | 1 | Actualizar datos (sin contraseña) |
| PATCH | `/administradores/:idAdmin/password` | ✅ | 1,2 | Cambiar contraseña |
| DELETE | `/administradores/:idAdmin` | ✅ | 1 | Desactivar administrador (soft delete) |

**Body POST login:**
```json
{ "email": "admin@espinabifida.mx", "password": "mi_password" }
```

**Body POST/PUT administrador:**
```json
{
  "idRol": 1,
  "nombreCompleto": "Juan García",
  "email": "juan@espinabifida.mx",
  "password": "minimo6chars"
}
```

---

### 🎭 Roles
**Base:** `/roles`
**Archivo:** `src/routes/roles.routes.js`

| Método | Endpoint | Token | Rol | Descripción |
|--------|----------|-------|-----|-------------|
| GET | `/roles` | ✅ | 1 | Listar todos los roles |
| GET | `/roles/:idRol` | ✅ | 1 | Obtener rol por ID |

---

### 👤 Beneficiarios
**Base:** `/beneficiarios`
**Archivo:** `src/routes/beneficiarios.routes.js`
**Identificador:** `CURP` (VARCHAR2)

| Método | Endpoint | Token | Descripción |
|--------|----------|-------|-------------|
| GET | `/beneficiarios` | ❌ | Listar todos |
| GET | `/beneficiarios/:curp` | ❌ | Obtener uno por CURP |
| POST | `/beneficiarios` | ❌ | Crear beneficiario |
| PUT | `/beneficiarios/:curp` | ❌ | Actualizar datos (conserva `ESTATUS`; p. ej. sigue en Baja hasta PATCH estatus o DELETE) |
| DELETE | `/beneficiarios/:curp` | ❌ | Dar de baja (ESTATUS = 'Baja' + cancela membresías) |

**Body POST/PUT:**
```json
{
  "nombres": "Juan",
  "apellidoPaterno": "García",
  "apellidoMaterno": "López",
  "curp": "GALJ900101HDFRCN01",
  "fechaNacimiento": "1990-01-01",
  "genero": "M",
  "nombrePadreMadre": "María López",
  "calle": "Av. Reforma 123",
  "colonia": "Centro",
  "ciudad": "CDMX",
  "municipio": "Cuauhtémoc",
  "estado": "CDMX",
  "cp": "06600",
  "telefonoCasa": "5512345678",
  "telefonoCelular": "5587654321",
  "correoElectronico": "juan@email.com",
  "contactoEmergencia": "María García",
  "telefonoEmergencia": "5511111111",
  "hospitalNacimiento": "Hospital General",
  "tipoSangre": "O+",
  "usaValvula": "N",
  "notas": ""
}
```

**Valores permitidos:**
- `genero`: `"M"` o `"F"`
- `tipoSangre`: `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`
- `usaValvula`: `"S"` o `"N"`
- `estatus` (solo lectura): `"Activo"`, `"Inactivo"`, `"Baja"`

---

### 📋 Citas
**Base:** `/citas`
**Archivo:** `src/routes/citas.routes.js`

| Método | Endpoint | Token | Descripción |
|--------|----------|-------|-------------|
| GET | `/citas` | ❌ | Listar todas las citas |
| GET | `/citas/:id` | ❌ | Obtener cita por ID |
| POST | `/citas` | ❌ | Crear cita |
| PUT | `/citas/:id` | ❌ | Actualizar cita |
| DELETE | `/citas/:id` | ❌ | Eliminar cita |

---

### 🏥 Servicios
**Base:** `/servicios`
**Archivo:** `src/routes/servicios.routes.js`

| Método | Endpoint | Token | Descripción |
|--------|----------|-------|-------------|
| POST | `/servicios` | ❌ | Crear servicio (valida que beneficiario esté Activo) |
| GET | `/servicios/:curp` | ❌ | Servicios de un beneficiario |
| GET | `/servicios/detalle/:idServicio` | ❌ | Obtener servicio por ID |
| GET | `/servicios/detalle` | ❌ | Consulta con filtros y paginación |
| PUT | `/servicios/:idServicio` | ❌ | Actualizar (montoPagado, notas) |
| DELETE | `/servicios/:idServicio` | ❌ | Eliminar servicio |

> **Regla de negocio:** No se puede crear un servicio si el beneficiario tiene `ESTATUS = 'Inactivo'` o `'Baja'`.

---

### 🎫 Membresías / Credenciales
**Base:** `/membresias`
**Archivo:** `src/routes/membresias.routes.js`

| Método | Endpoint | Token | Rol | Descripción |
|--------|----------|-------|-----|-------------|
| POST | `/membresias` | ✅ | 1,2 | Crear membresía |
| GET | `/membresias/:curp` | ✅ | 1,2 | Estado de membresía |
| GET | `/membresias/:curp/activa` | ✅ | 1,2 | Validar si membresía está vigente |

---

### 📦 Inventario
**Base:** `/inventario`, `/movimientos`
**Archivo:** `src/routes/inventario.routes.js`

| Método | Endpoint | Token | Rol | Descripción |
|--------|----------|-------|-----|-------------|
| POST | `/movimientos` | ✅ | 1,2 | Registrar movimiento de inventario |
| GET | `/inventario` | ✅ | 1,2 | Ver inventario actual |
| GET | `/movimientos` | ✅ | 1,2 | Ver historial de movimientos |

---

### 🗂️ Artículos
**Base:** `/articulos`
**Archivo:** `src/routes/articulos.routes.js`

| Método | Endpoint | Token | Descripción |
|--------|----------|-------|-------------|
| GET | `/articulos` | ❌ | Listar todos |
| GET | `/articulos/:id` | ❌ | Obtener por ID |
| POST | `/articulos` | ❌ | Crear artículo |
| PUT | `/articulos/:id` | ❌ | Actualizar |
| DELETE | `/articulos/:id` | ❌ | Eliminar |

---

## Respuestas de Error

Todos los errores siguen el mismo formato:

```json
{ "error": "Descripción del error" }
```

| Código | Significado |
|--------|-------------|
| 400 | Datos inválidos o faltantes |
| 401 | No autenticado / token inválido o expirado |
| 403 | Sin permisos / cuenta desactivada |
| 404 | Recurso no encontrado |
| 409 | Conflicto (duplicado, estatus inválido) |
| 500 | Error interno del servidor |

---

## Estructura de Carpetas

```
src/
├── config/
│   └── db.js                  # Conexión a Oracle (TNS + Wallet)
├── middleware/
│   ├── auth.js                # verifyToken + checkRole (JWT)
│   └── errorHandler.js        # Manejo global de errores + AppError
├── utils/
│   └── httpErrors.js          # Helpers: badRequest, notFound, conflict
├── models/                    # Queries SQL directos a Oracle
├── services/                  # Lógica de negocio y validaciones
├── controllers/               # Manejo de req/res HTTP
├── routes/                    # Definición de endpoints
└── app.js                     # Registro de rutas y middlewares
```

---

## Variables de Entorno (.env)

```env
PORT=3000
DB_USER=ADMIN
DB_PASSWORD=tu_password
DB_CONNECTION_STRING=NOMBRE_SERVICIO_HIGH
ORACLE_CLIENT_PATH=/ruta/al/oracle/instantclient
JWT_SECRET=clave_secreta
JWT_EXPIRES_IN=8h
```
