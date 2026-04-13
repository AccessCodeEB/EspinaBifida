# Autenticación y Control de Acceso (RBAC)

Sistema de autenticación basado en JWT con roles para el backend de EspinaBifida.

---

## Tablas involucradas

### ROLES
| Columna | Tipo | Descripción |
|---------|------|-------------|
| ID_ROL | Number (PK) | Identificador del rol |
| NOMBRE_ROL | VARCHAR2 | Nombre del rol (ej. 'Super Administrador') |
| DESCRIPCION | VARCHAR2 | Descripción opcional |

**Roles definidos:**

| ID_ROL | NOMBRE_ROL |
|--------|------------|
| 1 | Super Administrador |
| 2 | Recepción |

---

### ADMINISTRADORES
| Columna | Tipo | Descripción |
|---------|------|-------------|
| ID_ADMIN | Number (PK) | Identificador del administrador |
| ID_ROL | Number (FK) | Referencia a ROLES |
| NOMBRE_COMPLETO | VARCHAR2 | Nombre completo |
| EMAIL | VARCHAR2 | Usado para el login |
| PASSWORD_HASH | VARCHAR2 | Hash bcrypt de la contraseña |
| ACTIVO | Number | 1 = activo, 0 = inactivo (soft delete) |
| FECHA_CREACION | Date | Fecha de alta |

---

## Flujo de Login

### Endpoint
```
POST /administradores/login
Content-Type: application/json

{
  "email": "admin@espinabifida.mx",
  "password": "mi_contraseña"
}
```

### Diagrama paso a paso

```
Cliente
  │
  │  POST /administradores/login { email, password }
  ▼
administradores.controller.js → login()
  │
  ▼
administradores.service.js → login()
  │
  ├─ 1. Valida que email y password no estén vacíos
  │       └─ Si faltan → 400 Bad Request
  │
  ├─ 2. Busca el admin por email en Oracle (JOIN con ROLES)
  │       └─ Si no existe → 401 Credenciales inválidas
  │
  ├─ 3. Verifica que ACTIVO === 1
  │       └─ Si ACTIVO === 0 → 403 Cuenta desactivada
  │
  ├─ 4. Compara password con bcrypt.compare(password, PASSWORD_HASH)
  │       └─ Si no coincide → 401 Credenciales inválidas
  │
  └─ 5. Genera JWT con el payload:
         {
           idAdmin,
           idRol,
           nombreCompleto,
           email,
           nombreRol
         }
         Expiración: 8 horas (configurable en JWT_EXPIRES_IN)
  │
  ▼
Respuesta 200 OK:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "admin": {
    "idAdmin": 1,
    "idRol": 1,
    "nombreRol": "Super Administrador",
    "nombreCompleto": "Juan García",
    "email": "admin@espinabifida.mx"
  }
}
```

---

## Uso del Token en Peticiones Protegidas

Una vez obtenido el token, todas las rutas protegidas requieren enviarlo en el header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### En Postman
1. Abre la petición
2. Pestaña **Authorization**
3. Tipo: **Bearer Token**
4. Pega el token en el campo

---

## Middleware de Protección

### `verifyToken`
Verifica que el token sea válido y no haya expirado.

```
Request con header Authorization
  │
  ├─ Sin token → 401 Token no proporcionado
  ├─ Token expirado → 401 Token expirado
  ├─ Token inválido → 401 Token inválido
  └─ Token válido → agrega req.user con el payload y continúa
```

### `checkRole(...roles)`
Verifica que el rol del usuario esté en la lista de roles permitidos.

```javascript
// Solo Super Administrador (idRol = 1)
router.get("/", verifyToken, checkRole(1), AdminController.getAll);

// Super Admin o Recepción (idRol = 1 o 2)
router.get("/:id", verifyToken, checkRole(1, 2), AdminController.getById);
```

```
req.user.idRol no está en rolesPermitidos
  └─ 403 Acceso denegado. Se requiere rol: 1
```

---

## Matriz de Permisos por Endpoint

### /administradores

| Método | Ruta | Token | Rol requerido |
|--------|------|-------|---------------|
| POST | `/administradores/login` | ❌ | Público |
| GET | `/administradores` | ✅ | 1 (Super Admin) |
| GET | `/administradores/:idAdmin` | ✅ | 1 o 2 |
| POST | `/administradores` | ✅ | 1 (Super Admin) |
| PUT | `/administradores/:idAdmin` | ✅ | 1 (Super Admin) |
| PATCH | `/administradores/:idAdmin/password` | ✅ | 1 o 2 (propio) |
| DELETE | `/administradores/:idAdmin` | ✅ | 1 (Super Admin) |

### /roles

| Método | Ruta | Token | Rol requerido |
|--------|------|-------|---------------|
| GET | `/roles` | ✅ | 1 (Super Admin) |
| GET | `/roles/:idRol` | ✅ | 1 (Super Admin) |

---

## Seguridad de Contraseñas

Las contraseñas **nunca se guardan en texto plano**. Se usa `bcryptjs` con 10 rondas de salt:

```javascript
// Al crear admin
const passwordHash = await bcrypt.hash(password, 10);

// Al verificar login
const valida = await bcrypt.compare(passwordIngresado, passwordHash);
```

**Reglas de contraseña:**
- Mínimo 6 caracteres

---

## Códigos de Respuesta

| Código | Situación |
|--------|-----------|
| 200 | Login exitoso |
| 201 | Admin creado |
| 400 | Email/password faltante o formato inválido |
| 401 | Credenciales incorrectas o token inválido/expirado |
| 403 | Cuenta desactivada o rol sin permiso |
| 404 | Admin no encontrado |
| 409 | Email ya registrado |

---

## Variables de Entorno Requeridas

```env
JWT_SECRET=espinabifida_secret_2026
JWT_EXPIRES_IN=8h
```
