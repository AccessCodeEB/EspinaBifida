# Bitácora de Refactors

Registro continuo de mejoras al codebase. Cada entrada documenta qué se cambió y por qué.

---

## 2026-05-18 withConnection — roles.model.js, citas.model.js

**Área:** Backend — Modelos
**Archivos modificados:** `src/models/roles.model.js`, `src/models/citas.model.js`
**Problema:** Cada función repetía `getConnection / try / finally / conn.close()` (~6 líneas de boilerplate por función).
**Solución:** Reemplazado con `withConnection(fn)` definido en `src/config/db.js`.
**Impacto:** Eliminadas ~30 líneas de boilerplate. Tests existentes pasan sin cambios.
**Archivos de test:** `src/tests/helpers/mockDb.js`, `src/tests/inventario.criteria.test.js` actualizados para incluir `withConnection` en los mocks.
