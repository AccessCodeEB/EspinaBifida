# Spec: Refactoring continuo del codebase

**Fecha:** 2026-05-18
**Alcance:** Backend (modelos, servicios, manejo de errores) + Frontend (componentes grandes)
**Modalidad:** Trabajo continuo; cada refactor se documenta en `docs/refactoring-log.md`

---

## Objetivo

Mejorar la mantenibilidad del codebase eliminando código duplicado, separando responsabilidades y reduciendo el tamaño de archivos que hacen demasiado. Cada cambio debe ser transparente, verificable con los tests existentes, y registrado en la bitácora de refactors.

---

## Orden de ejecución

1. Boilerplate de conexiones en modelos (backend)
2. Validadores compartidos en servicios (backend)
3. Limpieza de manejo de errores (backend)
4. División de componentes grandes (frontend)

---

## Refactor 1: Helper `withConnection` en modelos

### Problema

Los 9 archivos de modelos (`src/models/*.model.js`) repiten 57 veces este patrón idéntico:

```js
const conn = await getConnection();
try {
  // lógica real (1–5 líneas)
} finally {
  await conn.close();
}
```

Esto produce ~400 líneas de boilerplate. Además hay inconsistencia en el nombre de la variable: algunos archivos usan `conn`, otros usan `connection`.

### Solución

Agregar `withConnection(fn)` a `src/config/db.js`:

```js
export async function withConnection(fn) {
  const conn = await getConnection();
  try {
    return await fn(conn);
  } finally {
    await conn.close();
  }
}
```

Cada función de modelo queda reducida a su lógica real:

```js
// Antes
export async function findAll() {
  const conn = await getConnection();
  try {
    const result = await conn.execute(`SELECT ...`);
    return result.rows;
  } finally {
    await conn.close();
  }
}

// Después
export async function findAll() {
  return withConnection(conn =>
    conn.execute(`SELECT ...`).then(r => r.rows)
  );
}
```

### Archivos modificados

- `src/config/db.js` — agregar `withConnection`
- `src/models/beneficiarios.model.js`
- `src/models/servicios.model.js`
- `src/models/membresias.model.js`
- `src/models/reportes.model.js`
- `src/models/administradores.model.js`
- `src/models/articulos.model.js`
- `src/models/citas.model.js`
- `src/models/inventario.model.js`
- `src/models/roles.model.js`

### Validación

Los 659 tests existentes cubren todos los modelos. Todos deben seguir pasando sin modificación.

---

## Refactor 2: Módulo de validadores compartidos

### Problema

Cada servicio reimplementa sus propios helpers de validación:

- `servicios.service.js` → `parseNumber()`, `parseAndValidateDate()`
- `membresias.service.js` → `parseISODate()`, `formatISODateUTC()`, `addMonthsUTC()`, `toDateOnlyUTC()`
- `beneficiarios.service.js` → `sanitizar()`, regex CURP/EMAIL/TEL

Código duplicado que si cambia una regla hay que actualizar en varios lugares.

### Solución

Crear `src/utils/validators.js` con las funciones comunes:

```js
// src/utils/validators.js

export const CURP_REGEX = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const TEL_REGEX = /^\d{10}$/;

export function sanitizeString(val) {
  return typeof val === 'string' ? val.trim() : val;
}

export function parsePositiveNumber(val, fieldName) {
  const num = Number(val);
  if (Number.isNaN(num) || num < 0)
    throw badRequest(`${fieldName} debe ser un número >= 0`);
  return num;
}

export function parseISODate(val, fieldName) {
  const d = new Date(val);
  if (isNaN(d.getTime()))
    throw badRequest(`${fieldName} debe ser una fecha ISO válida`);
  return d;
}
```

Cada servicio importa solo lo que necesita y elimina su implementación local.

### Archivos modificados

- `src/utils/validators.js` — nuevo archivo
- `src/services/beneficiarios.service.js`
- `src/services/servicios.service.js`
- `src/services/membresias.service.js`

### Validación

Los tests de servicios existentes (`beneficiarios.service.test.js`, `servicios.service.test.js`, `membresias.service.test.js`) deben pasar sin modificación, ya que el comportamiento es idéntico.

---

## Refactor 3: Limpieza de manejo de errores

### Problema 3a — Raw `Error()` en modelos

Dos lugares en `src/models/servicios.model.js` lanzan `throw new Error(...)` en vez de usar el utility `httpErrors`. Esto produce respuestas 500 genéricas cuando debería ser un error controlado.

### Solución 3a

Reemplazar con el utility correspondiente:

```js
// Antes
throw new Error("No se pudo generar ID_SERVICIO");

// Después
throw internalError("No se pudo generar ID_SERVICIO");
```

### Problema 3b — Clase `AppError` legacy

`src/middleware/errorHandler.js` contiene la clase `AppError` marcada como "kept for compatibility". Ningún archivo del codebase la usa actualmente.

### Solución 3b

Eliminar la clase `AppError` de `errorHandler.js`.

### Archivos modificados

- `src/models/servicios.model.js` — 2 throws
- `src/middleware/errorHandler.js` — eliminar clase AppError

### Validación

Los tests existentes de servicios y el test de errorHandler deben seguir pasando.

---

## Refactor 4: División de componentes frontend grandes

### Problema

`frontend/components/sections/beneficiarios.tsx` (1,328 líneas) y `frontend/components/sections/servicios.tsx` (1,310 líneas) concentran estado, lógica, formularios, tablas y diálogos en un solo archivo. Son difíciles de leer, mantener y testear.

### Solución

Dividir cada sección en un orquestador + subcomponentes con responsabilidad única.

**Beneficiarios:**

```
frontend/components/sections/beneficiarios.tsx          ← orquestador (~200 líneas)
frontend/components/sections/beneficiarios/
  BeneficiariosTable.tsx                                ← tabla + filtros
  BeneficiarioFormDialog.tsx                            ← formulario crear/editar
  BeneficiarioDetailPanel.tsx                           ← panel lateral de detalle
```

**Servicios:**

```
frontend/components/sections/servicios.tsx              ← orquestador (~200 líneas)
frontend/components/sections/servicios/
  ServiciosTable.tsx                                    ← tabla + filtros
  ServicioFormDialog.tsx                                ← formulario nuevo servicio
  ConsumoArticulosForm.tsx                              ← sub-formulario de artículos consumidos
```

### Reglas de la división

- El orquestador mantiene el estado principal y pasa props a los subcomponentes
- Cada subcomponente recibe props explícitas — sin acceso directo a estado global
- Los hooks existentes (`useBeneficiarios.ts`) no se modifican
- El comportamiento visible en UI es idéntico al actual

### Archivos modificados

- `frontend/components/sections/beneficiarios.tsx`
- `frontend/components/sections/beneficiarios/BeneficiariosTable.tsx` (nuevo)
- `frontend/components/sections/beneficiarios/BeneficiarioFormDialog.tsx` (nuevo)
- `frontend/components/sections/beneficiarios/BeneficiarioDetailPanel.tsx` (nuevo)
- `frontend/components/sections/servicios.tsx`
- `frontend/components/sections/servicios/ServiciosTable.tsx` (nuevo)
- `frontend/components/sections/servicios/ServicioFormDialog.tsx` (nuevo)
- `frontend/components/sections/servicios/ConsumoArticulosForm.tsx` (nuevo)

### Validación

Build de Next.js sin errores (`npm run build` en `frontend/`). Verificación manual de que las secciones funcionan igual en el navegador.

---

## Bitácora de refactors

Cada refactor completado se registra en `docs/refactoring-log.md` con este formato:

```markdown
## [YYYY-MM-DD] Nombre del refactor

**Área:** Backend / Frontend
**Archivos modificados:** lista
**Problema:** descripción del código original y por qué era problemático
**Solución:** qué se cambió y por qué
**Impacto:** líneas eliminadas, archivos afectados, tests que validan el cambio
```

El archivo se crea al iniciar el Refactor 1 y se actualiza al completar cada uno.

---

## Restricciones

- No modificar el comportamiento observable en ningún caso — solo reorganizar código
- Cada refactor debe tener los tests pasando antes de hacer commit
- No combinar refactors en un solo commit — un commit por refactor
- No refactorizar archivos que no están en la lista sin aprobación explícita
