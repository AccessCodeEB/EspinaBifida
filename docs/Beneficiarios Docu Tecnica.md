# Módulo: Beneficiarios

Documentación técnica completa del módulo de beneficiarios para el sistema EspinaBifida.

---

## Tabla en Oracle: `BENEFICIARIOS`

| Columna              | Tipo         | Restricción                                             |
| -------------------- | ------------ | ------------------------------------------------------- |
| CURP                 | VARCHAR2     | PRIMARY KEY (identificador principal)                   |
| NOMBRES              | VARCHAR2     | NOT NULL                                                |
| APELLIDO_PATERNO     | VARCHAR2     | NOT NULL                                                |
| APELLIDO_MATERNO     | VARCHAR2     | NOT NULL                                                |
| FECHA_NACIMIENTO     | DATE         | NOT NULL                                                |
| GENERO               | VARCHAR2     | 'M' o 'F'                                               |
| NOMBRE_PADRE_MADRE   | VARCHAR2     | -                                                       |
| CALLE                | VARCHAR2     | -                                                       |
| COLONIA              | VARCHAR2     | -                                                       |
| CIUDAD               | VARCHAR2     | -                                                       |
| MUNICIPIO            | VARCHAR2     | -                                                       |
| ESTADO               | VARCHAR2     | -                                                       |
| CP                   | VARCHAR2     | 5 dígitos                                               |
| TELEFONO_CASA        | VARCHAR2     | 10 dígitos                                              |
| TELEFONO_CELULAR     | VARCHAR2     | 10 dígitos                                              |
| CORREO_ELECTRONICO   | VARCHAR2     | formato email                                           |
| CONTACTO_EMERGENCIA  | VARCHAR2     | -                                                       |
| TELEFONO_EMERGENCIA  | VARCHAR2     | 10 dígitos                                              |
| MUNICIPIO_NACIMIENTO | VARCHAR2     | -                                                       |
| HOSPITAL_NACIMIENTO  | VARCHAR2     | -                                                       |
| TIPO_SANGRE          | VARCHAR2     | A+/A-/B+/B-/AB+/AB-/O+/O-                               |
| USA_VALVULA          | VARCHAR2     | 'S' o 'N'                                               |
| NOTAS                | VARCHAR2     | máx 500 caracteres                                      |
| FECHA_ALTA           | DATE         | automático (SYSDATE)                                    |
| ESTATUS              | VARCHAR2(10) | DEFAULT 'Activo', CHECK IN ('Activo','Inactivo','Baja') |

> **Nota:** La columna `ESTATUS` fue agregada con `ALTER TABLE beneficiarios ADD estatus VARCHAR2(10) DEFAULT 'Activo' NOT NULL`.

---

## Arquitectura del módulo

El módulo sigue una arquitectura de 4 capas:

```
routes → controller → service → model → Oracle DB
```

| Archivo                       | Ruta               | Responsabilidad                               |
| ----------------------------- | ------------------ | --------------------------------------------- |
| `beneficiarios.routes.js`     | `src/routes/`      | Definición de endpoints y métodos HTTP        |
| `beneficiarios.controller.js` | `src/controllers/` | Manejo de req/res, delega al service          |
| `beneficiarios.service.js`    | `src/services/`    | Lógica de negocio, validaciones, coordinación |
| `beneficiarios.model.js`      | `src/models/`      | Queries SQL directos a Oracle                 |

---

## Endpoints

Base: `/beneficiarios`

| Método | URL                    | Descripción                    | Código éxito |
| ------ | ---------------------- | ------------------------------ | ------------ |
| GET    | `/beneficiarios`       | Listar todos los beneficiarios | 200          |
| GET    | `/beneficiarios/:curp` | Obtener uno por CURP           | 200          |
| POST   | `/beneficiarios`       | Crear nuevo beneficiario       | 201          |
| PUT    | `/beneficiarios/:curp` | Actualizar beneficiario        | 200          |
| DELETE | `/beneficiarios/:curp` | Dar de baja (borrado lógico)   | 200          |

> **Importante:** El identificador principal en todos los endpoints es la **CURP**, no un ID numérico.

---

## Lógica de negocio (Service)

### Sanitización automática

Antes de cualquier operación de escritura, los campos de texto se limpian con `.trim()`:

- `nombres`, `apellidoPaterno`, `apellidoMaterno`, `nombrePadreMadre`
- `calle`, `colonia`, `ciudad`, `municipio`, `estado`
- `contactoEmergencia`, `municipioNacimiento`, `hospitalNacimiento`

### Validaciones aplicadas

#### Formato de CURP

```
Regex: /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/
```

Se aplica en: `POST`, `PUT`, `DELETE`

#### Campos obligatorios

Los siguientes campos no pueden estar vacíos o nulos:

- `nombres`
- `apellidoPaterno`
- `apellidoMaterno`
- `fechaNacimiento`

Se aplica en: `POST`, `PUT`

#### Validaciones de formato

| Campo                | Regla                          | Error |
| -------------------- | ------------------------------ | ----- |
| `correoElectronico`  | Regex email estándar           | 400   |
| `telefonoCelular`    | Exactamente 10 dígitos         | 400   |
| `telefonoCasa`       | Exactamente 10 dígitos         | 400   |
| `telefonoEmergencia` | Exactamente 10 dígitos         | 400   |
| `cp`                 | Exactamente 5 dígitos          | 400   |
| `genero`             | 'M' o 'F'                      | 400   |
| `tipoSangre`         | A+/A-/B+/B-/AB+/AB-/O+/O-      | 400   |
| `usaValvula`         | 'S' o 'N'                      | 400   |
| `notas`              | Máximo 500 caracteres          | 400   |
| `fechaNacimiento`    | No futura, no > 120 años atrás | 400   |

#### Control de duplicidad (POST)

Antes de insertar, se consulta si la CURP ya existe en la BD. Si existe → `409 Conflict`.

#### Existencia del beneficiario (PUT, DELETE)

Si la CURP no existe en la BD → `404 Not Found`.

### ESTATUS asignado automáticamente

- En `POST`: el service fuerza `estatus = 'Activo'`. El cliente **no puede** definirlo.
- En `PUT`: el service conserva el `ESTATUS` actual del beneficiario. El cliente **no puede** cambiarlo por este endpoint.

---

## Borrado lógico

El `DELETE /beneficiarios/:curp` **no elimina** el registro de la base de datos. Realiza dos operaciones en secuencia:

1. `UPDATE BENEFICIARIOS SET ESTATUS = 'Baja' WHERE CURP = :curp`
2. Cancela todas las membresías/credenciales vigentes del beneficiario:
   ```sql
   UPDATE CREDENCIALES
   SET FECHA_VIGENCIA_FIN = TRUNC(SYSDATE),
       OBSERVACIONES = 'Cancelada por baja de beneficiario'
   WHERE CURP = :curp
     AND (FECHA_VIGENCIA_FIN IS NULL OR FECHA_VIGENCIA_FIN > TRUNC(SYSDATE))
   ```

---

## Impacto en otros módulos

### Módulo Servicios

Antes de crear un servicio, se valida el estatus del beneficiario:

```
ESTATUS = 'Activo'   → ✅ se permite crear el servicio
ESTATUS = 'Inactivo' → ❌ 400 bloqueado
ESTATUS = 'Baja'     → ❌ 400 bloqueado
```

Archivo afectado: `src/services/servicios.service.js` → función `createConValidacion`.
Modelo afectado: `src/models/servicios.model.js` → función `findBeneficiarioActivo` (usa `ESTATUS`).

---

## Manejo de errores

Todos los errores de negocio se lanzan como instancias de `AppError`:

```javascript
// src/middleware/errorHandler.js
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}
```

El `errorHandler` global los captura y responde con el `statusCode` definido:

```json
{ "error": "mensaje descriptivo" }
```

Errores genéricos de Oracle o del servidor responden con `500 Internal Server Error`.

---

## Tabla de respuestas esperadas

| Operación  | Condición      | Código | Respuesta                                                                 |
| ---------- | -------------- | ------ | ------------------------------------------------------------------------- |
| POST       | Éxito          | 201    | `{ "message": "Beneficiario creado exitosamente" }`                       |
| POST       | CURP inválida  | 400    | `{ "error": "CURP con formato inválido" }`                                |
| POST       | Campos vacíos  | 400    | `{ "error": "Campos obligatorios faltantes: ..." }`                       |
| POST       | Email inválido | 400    | `{ "error": "Formato de correo electrónico inválido" }`                   |
| POST       | CURP duplicada | 409    | `{ "error": "Ya existe un beneficiario con la CURP ..." }`                |
| GET /:curp | No existe      | 404    | `{ "error": "Beneficiario no encontrado" }`                               |
| PUT        | No existe      | 404    | `{ "error": "No existe un beneficiario con la CURP ..." }`                |
| PUT        | Estatus Baja   | 200    | Permite editar datos; `ESTATUS` se conserva (sigue en Baja salvo `PATCH .../estatus`) |
| DELETE     | No existe      | 404    | `{ "error": "No existe un beneficiario con la CURP ..." }`                |
| DELETE     | Éxito          | 200    | `{ "message": "Beneficiario desactivado exitosamente" }`                  |
