# Bitácora de Refactors

Registro continuo de mejoras al codebase. Cada entrada documenta qué se cambió y por qué.

---

## 2026-05-18 Servicios usan validators.js

**Área:** Backend — Servicios
**Archivos modificados:** `beneficiarios.service.js`, `servicios.service.js`, `membresias.service.js`
**Problema:** Cada servicio tenía su propia copia de regex (CURP, EMAIL, TEL) y funciones de parse.
**Solución:** Importan desde `src/utils/validators.js`. Se eliminan las implementaciones locales.
**Impacto:** ~50 líneas de duplicación eliminadas. Tests existentes pasan sin cambios.

---

## 2026-05-18 withConnection — beneficiarios.model.js

**Área:** Backend — Modelos
**Archivos modificados:** `src/models/beneficiarios.model.js`
**Problema:** 8 funciones con boilerplate repetido (~48 líneas extra). Variable llamada inconsistentemente `conn`.
**Solución:** Todas las funciones con `withConnection`. `create` y `update` usan forma `async function` para mantener legibilidad del destructuring de muchos campos.
**Impacto:** Eliminadas ~93 líneas. Tests pasan sin cambios (661/661 pasados).

## 2026-05-18 withConnection — roles.model.js, citas.model.js

**Área:** Backend — Modelos
**Archivos modificados:** `src/models/roles.model.js`, `src/models/citas.model.js`
**Problema:** Cada función repetía `getConnection / try / finally / conn.close()` (~6 líneas de boilerplate por función).
**Solución:** Reemplazado con `withConnection(fn)` definido en `src/config/db.js`.
**Impacto:** Eliminadas ~30 líneas de boilerplate. Tests existentes pasan sin cambios.
**Archivos de test:** `src/tests/helpers/mockDb.js`, `src/tests/inventario.criteria.test.js` actualizados para incluir `withConnection` en los mocks.

## 2026-05-18 withConnection — administradores.model.js

**Área:** Backend — Modelos
**Archivos modificados:** `src/models/administradores.model.js`
**Problema:** 8 funciones con boilerplate repetido (~48 líneas extra).
**Solución:** Reemplazado con `withConnection`. La constante `SELECT_CON_ROL` se conserva.
**Impacto:** Eliminadas ~48 líneas de boilerplate. Tests pasan sin cambios.
**Nota:** Se mejoró `mockDb.js` para que `withConnection` en tests llame realmente al `finally` block.

## 2026-05-18 withConnection — inventario.model.js, articulos.model.js

**Área:** Backend — Modelos
**Archivos modificados:** `src/models/inventario.model.js`, `src/models/articulos.model.js`
**Problema:** Boilerplate repetido. `inventario.model.js` mezclaba funciones simples con `createMovimientoConTransaccion` que necesita rollback explícito.
**Solución:** Funciones simples en ambos archivos usan `withConnection`. `createMovimientoConTransaccion` conservada sin cambios (com comentario explicativo) porque necesita `conn.rollback()` en error. `articulos.model.js` usa `async conn =>` para funciones con inner try/catch del fallback ORA-00904.
**Impacto:** Eliminadas ~79 líneas de boilerplate. Tests pasan sin cambios (661/661 pasados).

---

## 2026-05-18 withConnection — membresias.model.js

**Área:** Backend — Modelos
**Archivos modificados:** `src/models/membresias.model.js`
**Problema:** 10 funciones con boilerplate repetido (~60 líneas extra).
**Solución:** 10 funciones refactorizadas con `withConnection`. `create` se conserva sin cambios (stored procedure con commit/rollback explícito).
**Impacto:** Eliminadas ~60 líneas. Tests pasan sin cambios.

---

## 2026-05-18 Módulo de validadores compartidos

**Área:** Backend — Utilidades
**Archivos creados:** `src/utils/validators.js`, `src/tests/validators.test.js`
**Problema:** Cada servicio reimplementaba sus propios helpers: `parseNumber` en servicios.service, `parseISODate` en membresias.service, regex CURP/EMAIL/TEL en beneficiarios.service. Cambiar una regla requería actualizaciones en múltiples lugares.
**Solución:** Módulo centralizado con `CURP_REGEX`, `EMAIL_REGEX`, `TEL_REGEX`, `CP_REGEX`, `sanitizeString`, `parsePositiveNumber`, `parseISODate`.
**Impacto:** ~50 líneas de código duplicado consolidadas. 10 nuevos tests unitarios. Todos los tests pasan (671/671 pasados).

---

## 2026-05-18 withConnection + fix raw Error — servicios.model.js

**Área:** Backend — Modelos
**Archivos modificados:** `src/models/servicios.model.js`
**Problema:** (1) Boilerplate repetido en 8 funciones. (2) Dos `throw new Error(...)` generaban respuestas 500 sin el formato estándar.
**Solución:** Funciones simples refactorizadas. `createWithInventarioTransaction` y `deleteById` (con rollback) conservadas. Los dos `throw new Error` reemplazados con `throw internal(...)` de `httpErrors.js`.
**Impacto:** Eliminadas ~48 líneas. Errores de secuencia Oracle producen respuestas 500 con formato consistente.

---

## 2026-05-18 withConnection — reportes.model.js

**Área:** Backend — Modelos
**Archivos modificados:** `src/models/reportes.model.js`
**Problema:** 13 funciones (11 SELECTs puros + 1 INSERT + 1 SELECT paginado) con boilerplate repetido (~68 líneas extra).
**Solución:** Todas las 13 funciones refactorizadas con `withConnection`. Como no hay rollback en ninguna (puro SELECT o INSERT sin lógica de error), la simplicidad es máxima. `getEstudios` tiene un ternario para retornar `Promise.resolve([])` si `ESTUDIOS_IDS` está vacío.
**Impacto:** Eliminadas ~68 líneas de boilerplate. Tests pasan sin cambios (661/661 pasados).
