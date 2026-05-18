# Spec: Validación de entradas (Zod) + Rate Limiting

**Fecha:** 2026-05-18
**Entrega objetivo:** 2026-06-05
**Prioridad:** Alta

---

## Objetivo

Agregar validación de cuerpo de petición con Zod y rate limiting con `express-rate-limit` a todos los endpoints del backend. Cubre la Semana 1 del cronograma del proyecto.

---

## Arquitectura

### Nuevos archivos

```
src/
├── middleware/
│   ├── validate.js          ← factory: validate(schema) → Express middleware
│   └── rateLimiter.js       ← exporta publicLimiter, authLimiter, loginLimiter
└── schemas/
    ├── beneficiarios.schema.js
    ├── membresias.schema.js
    ├── servicios.schema.js
    ├── articulos.schema.js
    ├── citas.schema.js
    ├── inventario.schema.js
    ├── administradores.schema.js
    ├── preregistro.schema.js
    └── catalogos.schema.js
```

### Dependencias nuevas

```bash
npm install zod express-rate-limit
```

---

## Middleware: validate.js

Factory que recibe un schema Zod y devuelve un middleware Express. Valida `req.body` y llama `next(err)` si falla.

```js
// Uso en rutas
import { validate } from '../middleware/validate.js';
import { crearBeneficiarioSchema } from '../schemas/beneficiarios.schema.js';

router.post('/', verifyToken, validate(crearBeneficiarioSchema), Controller.create);
```

**Respuesta en error de validación (HTTP 400):**
```json
{
  "error": "Validation error",
  "message": "Datos inválidos",
  "details": [
    { "field": "curp", "message": "CURP debe tener 18 caracteres" },
    { "field": "email", "message": "Formato de email inválido" }
  ]
}
```

---

## Middleware: rateLimiter.js

Tres configuraciones diferenciadas con `express-rate-limit`:

| Exportación | Endpoints | Límite | Ventana |
|---|---|---|---|
| `loginLimiter` | `POST /administradores/login` | 5 peticiones | 15 minutos |
| `publicLimiter` | `POST /beneficiarios/solicitud-publica` | 10 peticiones | 60 minutos |
| `authLimiter` | Todos los demás | 120 peticiones | 1 minuto |

Todos usan `standardHeaders: true` y responden `429 Too Many Requests` con header `Retry-After` al exceder el límite.

---

## Esquemas Zod por módulo

### administradores.schema.js
- `loginSchema` — email (email válido), password (string no vacío)
- `crearAdminSchema` — email, password (mín 8 chars), idRol (número)
- `actualizarAdminSchema` — `.partial()` de crearAdminSchema
- `cambiarPasswordSchema` — passwordActual, passwordNuevo (mín 8 chars)

### beneficiarios.schema.js
- `crearBeneficiarioSchema` — CURP (exactamente 18 chars, uppercase), nombres, apellidoPaterno, apellidoMaterno, fechaNacimiento (fecha ISO), genero (enum), tipoSangre (enum), usaValvula (`S`/`N`), estatus (`Activo`/`Inactivo`/`Baja`)
- `actualizarBeneficiarioSchema` — `.partial()` de crearBeneficiarioSchema

### preregistro.schema.js
- `solicitudPublicaSchema` — mismos campos que crearBeneficiario (todos requeridos excepto estatus), más `cfTurnstileToken` (string no vacío)

### membresias.schema.js
- `crearMembresiaSchema` — curp, numeroCredencial, fechaVigenciaInicio (fecha ISO), fechaVigenciaFin (fecha ISO), fechaUltimoPago (fecha ISO), metodoPago (string)
- `actualizarMembresiaSchema` — `.partial()` de crearMembresiaSchema

### servicios.schema.js
- `crearServicioSchema` — curp, idTipoServicio (número entero positivo), fecha (fecha ISO), costo (número ≥ 0), montoPagado (número ≥ 0)

### citas.schema.js
- `crearCitaSchema` — curp, idTipoServicio (número), especialista (string), fecha (fecha ISO), estatus (string)
- `actualizarEstatusCitaSchema` — estatus (enum: `Pendiente`/`Confirmada`/`Cancelada`/`Completada`)

### articulos.schema.js
- `crearArticuloSchema` — descripcion, unidad, cuotaRecuperacion (número ≥ 0), inventarioActual (número ≥ 0), manejaInventario (`S`/`N`), idCategoria (número)
- `actualizarArticuloSchema` — `.partial()` de crearArticuloSchema

### inventario.schema.js
- `crearMovimientoSchema` — idArticulo (número entero positivo), tipoMovimiento (enum: `ENTRADA`/`SALIDA`), cantidad (número entero > 0), motivo (string no vacío)

### catalogos.schema.js
- `crearEspecialistaSchema` — nombre (string no vacío), especialidad (string)
- `actualizarEspecialistaSchema` — `.partial()`
- `crearServicioCatalogoSchema` — nombre (string no vacío)
- `actualizarConfiguracionSchema` — campos opcionales de configuración del sistema

---

## Aplicación del rate limiting en app.js

Los limiters se aplican en `app.js` **antes** del montaje de rutas:

```js
import { loginLimiter, publicLimiter, authLimiter } from './middleware/rateLimiter.js';

// Limiters específicos (antes de montar sus rutas)
app.post('/administradores/login', loginLimiter);
app.post('/api/v1/administradores/login', loginLimiter);
app.post('/beneficiarios/solicitud-publica', publicLimiter);

// Limiter global para rutas autenticadas
app.use(authLimiter);

// Montaje de rutas (igual que hoy)
app.use('/beneficiarios', beneficiariosRoutes);
// ...
```

---

## Integración en rutas

Cada archivo de rutas importa su schema y el middleware `validate`. El `validate` se coloca:
- **Después** de `verifyToken` / `checkRole` (si los hay)
- **Antes** del controller

Ejemplo completo:
```js
router.post('/', verifyToken, checkRole(1), validate(crearBeneficiarioSchema), Controller.create);
router.put('/:id', verifyToken, validate(actualizarBeneficiarioSchema), Controller.update);
```

Las rutas GET y DELETE (sin body) **no** reciben `validate`.

---

## Testing

### Nuevos tests unitarios
- `src/middleware/__tests__/validate.test.js` — schema válido pasa, schema inválido devuelve 400 con `details[]`
- `src/middleware/__tests__/rateLimiter.test.js` — verifica que las configuraciones tengan los límites correctos

### Tests de integración (archivos existentes)
Agregar casos en los archivos `*.test.js` existentes de cada módulo:
- `POST` con body vacío → 400
- `POST` con campo requerido faltante → 400 con `details`
- `POST` con tipo incorrecto (ej: número donde va string) → 400
- `POST` con datos válidos → sigue funcionando (200/201)

### Meta de cobertura
Mantener statements ≥ 95% y ramas ≥ 85% (mejora sobre el 83.71% actual).

---

## Orden de implementación

1. Instalar dependencias (`zod`, `express-rate-limit`)
2. Crear `src/middleware/validate.js`
3. Crear `src/middleware/rateLimiter.js`
4. Crear todos los archivos en `src/schemas/`
5. Aplicar `validate` en cada archivo de rutas
6. Aplicar rate limiters en `app.js` (antes del montaje de rutas específicas)
7. Tests unitarios de middleware
8. Tests de integración por módulo

---

## Restricciones

- No modificar el schema de la base de datos
- No cambiar el `errorHandler` existente — solo usar su formato
- No agregar validación en GET/DELETE (sin body)
- Los schemas de `actualizar*` deben usar `.partial()` sobre el base, sin duplicar campos
