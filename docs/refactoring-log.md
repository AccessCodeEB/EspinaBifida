# Bitácora de Refactors

Registro continuo de mejoras al codebase. Cada entrada documenta qué se cambió y por qué.

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
