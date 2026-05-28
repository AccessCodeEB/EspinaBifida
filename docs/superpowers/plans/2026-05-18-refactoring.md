# Refactoring Continuo Implementation Plan

> **STATUS: EJECUTADO** — Completado 2026-05-18. Helper `withConnection`, módulo `validators.js`, eliminación de `AppError` legacy, y división de componentes frontend (`beneficiarios.tsx`, `servicios.tsx`) realizados.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar código duplicado y separar responsabilidades en el backend (modelos, servicios, manejo de errores) y frontend (componentes grandes), documentando cada cambio en una bitácora.

**Architecture:** Backend-first. Los modelos comparten un helper `withConnection` que elimina el boilerplate de Oracle. Los servicios comparten un módulo de validadores. El frontend divide dos secciones de 1300+ líneas en subcomponentes. Cada refactor se registra en `docs/refactoring-log.md`.

**Tech Stack:** Node.js + Express, Oracle (node-oracledb), Jest (tests), Next.js 14 + TypeScript (frontend)

---

## Mapa de archivos

| Acción | Archivo | Responsabilidad |
|--------|---------|-----------------|
| Crear | `docs/refactoring-log.md` | Bitácora de refactors |
| Modificar | `src/config/db.js` | Agregar `withConnection` |
| Modificar | `src/models/roles.model.js` | Usar `withConnection` |
| Modificar | `src/models/citas.model.js` | Usar `withConnection` |
| Modificar | `src/models/administradores.model.js` | Usar `withConnection` |
| Modificar | `src/models/beneficiarios.model.js` | Usar `withConnection` |
| Modificar | `src/models/inventario.model.js` | Usar `withConnection` (solo fns sin rollback) |
| Modificar | `src/models/articulos.model.js` | Usar `withConnection` |
| Modificar | `src/models/membresias.model.js` | Usar `withConnection` (solo fns sin rollback) |
| Modificar | `src/models/servicios.model.js` | Usar `withConnection` + fix `throw new Error` |
| Modificar | `src/models/reportes.model.js` | Usar `withConnection` |
| Crear | `src/utils/validators.js` | Validadores compartidos |
| Modificar | `src/services/beneficiarios.service.js` | Usar validators.js |
| Modificar | `src/services/servicios.service.js` | Usar validators.js |
| Modificar | `src/services/membresias.service.js` | Usar validators.js |
| Modificar | `src/middleware/errorHandler.js` | Eliminar clase `AppError` |
| Crear | `frontend/components/sections/beneficiarios/BeneficiariosTable.tsx` | Tabla + filtros |
| Crear | `frontend/components/sections/beneficiarios/BeneficiarioFormDialog.tsx` | Formulario crear |
| Crear | `frontend/components/sections/beneficiarios/BeneficiarioDetailPanel.tsx` | Panel detalle |
| Modificar | `frontend/components/sections/beneficiarios.tsx` | Orquestador |
| Crear | `frontend/components/sections/servicios/ServiciosTable.tsx` | Tabla + filtros |
| Crear | `frontend/components/sections/servicios/ServicioFormDialog.tsx` | Formulario nuevo servicio |
| Crear | `frontend/components/sections/servicios/ConsumoArticulosForm.tsx` | Sub-formulario artículos |
| Modificar | `frontend/components/sections/servicios.tsx` | Orquestador |

---

### Task 1: Crear bitácora de refactors

**Files:**
- Create: `docs/refactoring-log.md`

- [ ] **Step 1: Crear el archivo**

```markdown
# Bitácora de Refactors

Registro continuo de mejoras al codebase. Cada entrada documenta qué se cambió y por qué.

---
```

- [ ] **Step 2: Commit**

```bash
git add docs/refactoring-log.md
git commit -m "docs: crear bitácora de refactors"
```

---

### Task 2: Agregar `withConnection` a db.js

**Files:**
- Modify: `src/config/db.js`
- Test: `src/tests/db.test.js` (nuevo)

**Contexto:** Todos los modelos repiten el patrón `getConnection / try / finally / conn.close()`. El helper `withConnection(fn)` centraliza ese boilerplate. Las funciones que necesitan transacciones con rollback explícito (como `createWithInventarioTransaction` en servicios) NO usan este helper — se dejan tal como están.

- [ ] **Step 1: Escribir el test**

Crear `src/tests/db.test.js`:

```js
import { withConnection } from '../config/db.js';

jest.mock('../config/db.js', () => {
  const actual = jest.requireActual('../config/db.js');
  return {
    ...actual,
    getConnection: jest.fn(),
    withConnection: actual.withConnection,
  };
});

import { getConnection } from '../config/db.js';

describe('withConnection', () => {
  test('llama a fn con la conexión y cierra al terminar', async () => {
    const fakeConn = { close: jest.fn() };
    getConnection.mockResolvedValue(fakeConn);

    const result = await withConnection(async (conn) => {
      expect(conn).toBe(fakeConn);
      return 'resultado';
    });

    expect(result).toBe('resultado');
    expect(fakeConn.close).toHaveBeenCalledTimes(1);
  });

  test('cierra la conexión aunque fn lance un error', async () => {
    const fakeConn = { close: jest.fn() };
    getConnection.mockResolvedValue(fakeConn);

    await expect(
      withConnection(async () => { throw new Error('fallo'); })
    ).rejects.toThrow('fallo');

    expect(fakeConn.close).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Ejecutar test para verificar que falla**

```bash
node --experimental-vm-modules node_modules/.bin/jest src/tests/db.test.js --no-coverage
```

Expected: FAIL — `withConnection is not a function`

- [ ] **Step 3: Agregar `withConnection` a db.js**

Al final de `src/config/db.js`, agregar:

```js
/**
 * Ejecuta fn(conn) con una conexión del pool, garantizando conn.close() al terminar.
 * Usar para operaciones simples sin rollback. Para transacciones con rollback,
 * manejar la conexión manualmente.
 */
export async function withConnection(fn) {
  const conn = await getConnection();
  try {
    return await fn(conn);
  } finally {
    await conn.close();
  }
}
```

- [ ] **Step 4: Ejecutar test para verificar que pasa**

```bash
node --experimental-vm-modules node_modules/.bin/jest src/tests/db.test.js --no-coverage
```

Expected: PASS — 2 tests

- [ ] **Step 5: Commit**

```bash
git add src/config/db.js src/tests/db.test.js
git commit -m "refactor(db): agregar helper withConnection para eliminar boilerplate de Oracle"
```

---

### Task 3: Refactorizar roles.model.js y citas.model.js

**Files:**
- Modify: `src/models/roles.model.js`
- Modify: `src/models/citas.model.js`

- [ ] **Step 1: Reemplazar roles.model.js completo**

```js
import { withConnection } from "../config/db.js";

export const findAll = () =>
  withConnection(conn =>
    conn.execute(`SELECT ID_ROL, NOMBRE_ROL, DESCRIPCION FROM ROLES ORDER BY ID_ROL`)
      .then(r => r.rows)
  );

export const findById = (idRol) =>
  withConnection(conn =>
    conn.execute(
      `SELECT ID_ROL, NOMBRE_ROL, DESCRIPCION FROM ROLES WHERE ID_ROL = :idRol`,
      { idRol }
    ).then(r => r.rows[0] ?? null)
  );
```

- [ ] **Step 2: Reemplazar citas.model.js completo**

```js
import { withConnection } from "../config/db.js";

export const findAll = () =>
  withConnection(conn =>
    conn.execute(`
      SELECT
        c.ID_CITA, c.CURP, c.ID_TIPO_SERVICIO, c.ESPECIALISTA,
        TO_CHAR(c.FECHA, 'YYYY-MM-DD') AS FECHA,
        TO_CHAR(c.FECHA, 'HH24:MI')    AS HORA,
        c.ESTATUS, c.NOTAS,
        b.NOMBRES || ' ' || b.APELLIDO_PATERNO || ' ' || NVL(b.APELLIDO_MATERNO,'') AS NOMBRE_BENEFICIARIO
      FROM CITAS c
      LEFT JOIN BENEFICIARIOS b ON b.CURP = c.CURP
      ORDER BY c.FECHA DESC
    `).then(r => r.rows)
  );

export const findById = (id) =>
  withConnection(conn =>
    conn.execute(
      `SELECT ID_CITA, CURP, ID_TIPO_SERVICIO, ESPECIALISTA, FECHA, ESTATUS, NOTAS
       FROM CITAS WHERE ID_CITA = :id`,
      { id }
    ).then(r => r.rows[0])
  );

export const create = ({ curp, idTipoServicio, especialista, fecha, estatus, notas }) =>
  withConnection(conn =>
    conn.execute(
      `INSERT INTO CITAS (
        ID_CITA, CURP, ID_TIPO_SERVICIO, ESPECIALISTA,
        FECHA, ESTATUS, NOTAS
      ) VALUES (
        SEQ_CITAS.NEXTVAL, :curp, :idTipoServicio, :especialista,
        TO_TIMESTAMP(:fecha, 'YYYY-MM-DD HH24:MI:SS'), :estatus, :notas
      )`,
      { curp, idTipoServicio, especialista, fecha, estatus, notas },
      { autoCommit: true }
    )
  );

export const update = (id, { curp, idTipoServicio, especialista, fecha, estatus, notas }) =>
  withConnection(conn =>
    conn.execute(
      `UPDATE CITAS SET
        CURP = :curp, ID_TIPO_SERVICIO = :idTipoServicio,
        ESPECIALISTA = :especialista,
        FECHA = TO_TIMESTAMP(:fecha, 'YYYY-MM-DD HH24:MI:SS'),
        ESTATUS = :estatus, NOTAS = :notas
       WHERE ID_CITA = :id`,
      { id, curp, idTipoServicio, especialista, fecha, estatus, notas },
      { autoCommit: true }
    )
  );

export const remove = (id) =>
  withConnection(conn =>
    conn.execute(
      `UPDATE CITAS SET ESTATUS = 'CANCELADA' WHERE ID_CITA = :id`,
      { id },
      { autoCommit: true }
    )
  );
```

- [ ] **Step 3: Correr la suite completa**

```bash
node --experimental-vm-modules node_modules/.bin/jest --no-coverage 2>&1 | tail -8
```

Expected: todos pasan.

- [ ] **Step 4: Commit**

```bash
git add src/models/roles.model.js src/models/citas.model.js
git commit -m "refactor(models): usar withConnection en roles y citas"
```

- [ ] **Step 5: Actualizar bitácora**

Agregar a `docs/refactoring-log.md`:

```markdown
## 2026-05-18 withConnection — roles.model.js, citas.model.js

**Área:** Backend — Modelos
**Archivos modificados:** `src/models/roles.model.js`, `src/models/citas.model.js`
**Problema:** Cada función repetía `getConnection / try / finally / conn.close()` (~6 líneas de boilerplate por función).
**Solución:** Reemplazado con `withConnection(fn)` definido en `src/config/db.js`.
**Impacto:** Eliminadas ~30 líneas de boilerplate. Tests existentes pasan sin cambios.
```

```bash
git add docs/refactoring-log.md
git commit -m "docs(refactoring-log): registrar refactor withConnection en roles y citas"
```

---

### Task 4: Refactorizar administradores.model.js

**Files:**
- Modify: `src/models/administradores.model.js`

- [ ] **Step 1: Reemplazar administradores.model.js completo**

```js
import { withConnection } from "../config/db.js";

const SELECT_CON_ROL = `
  SELECT a.ID_ADMIN, a.ID_ROL, a.NOMBRE_COMPLETO, a.EMAIL,
         a.ACTIVO, a.FECHA_CREACION, a.FOTO_PERFIL_URL, r.NOMBRE_ROL
  FROM   ADMINISTRADORES a
  JOIN   ROLES r ON r.ID_ROL = a.ID_ROL
`;

export const findAll = () =>
  withConnection(conn =>
    conn.execute(`${SELECT_CON_ROL} ORDER BY a.NOMBRE_COMPLETO`).then(r => r.rows)
  );

export const findById = (idAdmin) =>
  withConnection(conn =>
    conn.execute(`${SELECT_CON_ROL} WHERE a.ID_ADMIN = :idAdmin`, { idAdmin })
      .then(r => r.rows[0] ?? null)
  );

export const findByEmail = (email) =>
  withConnection(conn =>
    conn.execute(
      `SELECT a.ID_ADMIN, a.ID_ROL, a.NOMBRE_COMPLETO, a.EMAIL,
              a.PASSWORD_HASH, a.ACTIVO, a.FOTO_PERFIL_URL, r.NOMBRE_ROL
       FROM   ADMINISTRADORES a
       JOIN   ROLES r ON r.ID_ROL = a.ID_ROL
       WHERE  LOWER(TRIM(a.EMAIL)) = :email`,
      { email }
    ).then(r => r.rows[0] ?? null)
  );

export const create = ({ idRol, nombreCompleto, email, passwordHash }) =>
  withConnection(conn =>
    conn.execute(
      `INSERT INTO ADMINISTRADORES
         (ID_ROL, NOMBRE_COMPLETO, EMAIL, PASSWORD_HASH, ACTIVO, FECHA_CREACION)
       VALUES (:idRol, :nombreCompleto, :email, :passwordHash, 1, SYSDATE)`,
      { idRol, nombreCompleto, email, passwordHash },
      { autoCommit: true }
    )
  );

export const update = (idAdmin, { idRol, nombreCompleto, email }) =>
  withConnection(conn =>
    conn.execute(
      `UPDATE ADMINISTRADORES SET
         ID_ROL = :idRol, NOMBRE_COMPLETO = :nombreCompleto, EMAIL = :email
       WHERE ID_ADMIN = :idAdmin`,
      { idRol, nombreCompleto, email, idAdmin },
      { autoCommit: true }
    )
  );

export const updatePassword = (idAdmin, passwordHash) =>
  withConnection(conn =>
    conn.execute(
      `UPDATE ADMINISTRADORES
       SET PASSWORD_HASH = :passwordHash WHERE ID_ADMIN = :idAdmin`,
      { passwordHash, idAdmin },
      { autoCommit: true }
    )
  );

export const updateFotoPerfilUrl = (idAdmin, fotoPerfilUrl) =>
  withConnection(conn =>
    conn.execute(
      `UPDATE ADMINISTRADORES
       SET FOTO_PERFIL_URL = :fotoPerfilUrl WHERE ID_ADMIN = :idAdmin`,
      { idAdmin, fotoPerfilUrl },
      { autoCommit: true }
    )
  );

export const deactivate = (idAdmin) =>
  withConnection(conn =>
    conn.execute(
      `UPDATE ADMINISTRADORES SET ACTIVO = 0 WHERE ID_ADMIN = :idAdmin`,
      { idAdmin },
      { autoCommit: true }
    )
  );
```

- [ ] **Step 2: Correr la suite completa**

```bash
node --experimental-vm-modules node_modules/.bin/jest --no-coverage 2>&1 | tail -8
```

Expected: todos pasan.

- [ ] **Step 3: Commit + bitácora**

```bash
git add src/models/administradores.model.js
git commit -m "refactor(models): usar withConnection en administradores"
```

Agregar a `docs/refactoring-log.md`:

```markdown
## 2026-05-18 withConnection — administradores.model.js

**Área:** Backend — Modelos
**Archivos modificados:** `src/models/administradores.model.js`
**Problema:** 8 funciones con boilerplate repetido (~48 líneas extra).
**Solución:** Reemplazado con `withConnection`. La constante `SELECT_CON_ROL` se conserva.
**Impacto:** Eliminadas ~48 líneas de boilerplate. Tests pasan sin cambios.
```

```bash
git add docs/refactoring-log.md
git commit -m "docs(refactoring-log): registrar refactor withConnection en administradores"
```

---

### Task 5: Refactorizar beneficiarios.model.js

**Files:**
- Modify: `src/models/beneficiarios.model.js`

- [ ] **Step 1: Reemplazar beneficiarios.model.js completo**

```js
import { withConnection } from "../config/db.js";

export const findAll = () =>
  withConnection(conn =>
    conn.execute(
      `SELECT b.NOMBRES, b.APELLIDO_PATERNO, b.APELLIDO_MATERNO,
              b.CURP, b.GENERO, b.FECHA_NACIMIENTO, b.TIPOS_SANGRE,
              b.NOMBRE_PADRE_MADRE, b.CALLE, b.COLONIA, b.CIUDAD,
              b.MUNICIPIO, b.ESTADO, b.CP,
              b.TELEFONO_CASA, b.TELEFONO_CELULAR, b.CORREO_ELECTRONICO,
              b.CONTACTO_EMERGENCIA, b.TELEFONO_EMERGENCIA,
              b.HOSPITAL_NACIMIENTO,
              b.USA_VALVULA, b.TIPO, b.NOTAS, b.ESTATUS, b.FECHA_ALTA,
              CASE
                WHEN EXISTS (SELECT 1 FROM CREDENCIALES c WHERE c.CURP = b.CURP
                  AND c.FECHA_VIGENCIA_FIN >= TRUNC(SYSDATE)
                  AND c.FECHA_VIGENCIA_FIN - TRUNC(SYSDATE) > 30) THEN 'Activa'
                WHEN EXISTS (SELECT 1 FROM CREDENCIALES c WHERE c.CURP = b.CURP
                  AND c.FECHA_VIGENCIA_FIN >= TRUNC(SYSDATE)
                  AND c.FECHA_VIGENCIA_FIN - TRUNC(SYSDATE) <= 30) THEN 'Por vencer'
                WHEN EXISTS (SELECT 1 FROM CREDENCIALES c WHERE c.CURP = b.CURP)
                  THEN 'Vencida'
                ELSE 'Sin membresia'
              END AS MEMBRESIA_ESTATUS,
              (SELECT c.FECHA_VIGENCIA_FIN - TRUNC(SYSDATE)
               FROM CREDENCIALES c WHERE c.CURP = b.CURP
               ORDER BY c.FECHA_VIGENCIA_FIN DESC, c.ID_CREDENCIAL DESC
               FETCH FIRST 1 ROWS ONLY) AS DIAS_RESTANTES,
              b.FOTO_PERFIL_URL
       FROM BENEFICIARIOS b
       ORDER BY b.APELLIDO_PATERNO`
    ).then(r => r.rows)
  );

export const findById = (curp) =>
  withConnection(conn =>
    conn.execute(`SELECT * FROM BENEFICIARIOS WHERE CURP = :curp`, { curp })
      .then(r => r.rows[0] ?? null)
  );

export async function create(data) {
  return withConnection(conn => {
    const {
      nombres, apellidoPaterno, apellidoMaterno, curp, fechaNacimiento, genero,
      nombrePadreMadre, calle, colonia, ciudad, municipio, estado, cp,
      telefonoCasa, telefonoCelular, correoElectronico,
      contactoEmergencia, telefonoEmergencia, hospitalNacimiento,
      tipoSangre, tipo, usaValvula, notas, estatus,
    } = data;
    return conn.execute(
      `INSERT INTO BENEFICIARIOS (
         NOMBRES, APELLIDO_PATERNO, APELLIDO_MATERNO, CURP,
         FECHA_NACIMIENTO, GENERO, NOMBRE_PADRE_MADRE,
         CALLE, COLONIA, CIUDAD, MUNICIPIO, ESTADO, CP,
         TELEFONO_CASA, TELEFONO_CELULAR, CORREO_ELECTRONICO,
         CONTACTO_EMERGENCIA, TELEFONO_EMERGENCIA, HOSPITAL_NACIMIENTO,
         TIPOS_SANGRE, TIPO, USA_VALVULA, NOTAS, ESTATUS
       ) VALUES (
         :nombres, :apellidoPaterno, :apellidoMaterno, :curp,
         TO_DATE(:fechaNacimiento, 'YYYY-MM-DD'), :genero, :nombrePadreMadre,
         :calle, :colonia, :ciudad, :municipio, :estado, :cp,
         :telefonoCasa, :telefonoCelular, :correoElectronico,
         :contactoEmergencia, :telefonoEmergencia, :hospitalNacimiento,
         :tipoSangre, :tipo, :usaValvula, :notas, :estatus
       )`,
      {
        nombres: nombres ?? null, apellidoPaterno: apellidoPaterno ?? null,
        apellidoMaterno: apellidoMaterno ?? null, curp,
        fechaNacimiento: fechaNacimiento ?? null, genero: genero ?? null,
        nombrePadreMadre: nombrePadreMadre ?? null,
        calle: calle ?? null, colonia: colonia ?? null, ciudad: ciudad ?? null,
        municipio: municipio ?? null, estado: estado ?? null, cp: cp ?? null,
        telefonoCasa: telefonoCasa ?? null, telefonoCelular: telefonoCelular ?? null,
        correoElectronico: correoElectronico ?? null,
        contactoEmergencia: contactoEmergencia ?? null,
        telefonoEmergencia: telefonoEmergencia ?? null,
        hospitalNacimiento: hospitalNacimiento ?? null,
        tipoSangre: tipoSangre ?? null, tipo: tipo ?? null,
        usaValvula: usaValvula ?? "N", notas: notas ?? null,
        estatus: estatus ?? "Activo",
      },
      { autoCommit: true }
    );
  });
}

export async function update(curp, data) {
  return withConnection(conn => {
    const {
      nombres, apellidoPaterno, apellidoMaterno, fechaNacimiento, genero,
      nombrePadreMadre, calle, colonia, ciudad, municipio, estado, cp,
      telefonoCasa, telefonoCelular, correoElectronico,
      contactoEmergencia, telefonoEmergencia, hospitalNacimiento,
      tipoSangre, tipo, usaValvula, notas, estatus,
    } = data;
    return conn.execute(
      `UPDATE BENEFICIARIOS SET
         NOMBRES = :nombres, APELLIDO_PATERNO = :apellidoPaterno,
         APELLIDO_MATERNO = :apellidoMaterno,
         FECHA_NACIMIENTO = TO_DATE(:fechaNacimiento, 'YYYY-MM-DD'),
         GENERO = :genero, NOMBRE_PADRE_MADRE = :nombrePadreMadre,
         CALLE = :calle, COLONIA = :colonia, CIUDAD = :ciudad,
         MUNICIPIO = :municipio, ESTADO = :estado, CP = :cp,
         TELEFONO_CASA = :telefonoCasa, TELEFONO_CELULAR = :telefonoCelular,
         CORREO_ELECTRONICO = :correoElectronico,
         CONTACTO_EMERGENCIA = :contactoEmergencia,
         TELEFONO_EMERGENCIA = :telefonoEmergencia,
         HOSPITAL_NACIMIENTO = :hospitalNacimiento,
         TIPOS_SANGRE = :tipoSangre, TIPO = :tipo,
         USA_VALVULA = :usaValvula, NOTAS = :notas, ESTATUS = :estatus
       WHERE CURP = :curp`,
      {
        nombres: nombres ?? null, apellidoPaterno: apellidoPaterno ?? null,
        apellidoMaterno: apellidoMaterno ?? null, curp,
        fechaNacimiento: fechaNacimiento ?? null, genero: genero ?? null,
        nombrePadreMadre: nombrePadreMadre ?? null,
        calle: calle ?? null, colonia: colonia ?? null, ciudad: ciudad ?? null,
        municipio: municipio ?? null, estado: estado ?? null, cp: cp ?? null,
        telefonoCasa: telefonoCasa ?? null, telefonoCelular: telefonoCelular ?? null,
        correoElectronico: correoElectronico ?? null,
        contactoEmergencia: contactoEmergencia ?? null,
        telefonoEmergencia: telefonoEmergencia ?? null,
        hospitalNacimiento: hospitalNacimiento ?? null,
        tipoSangre: tipoSangre ?? null, tipo: tipo ?? null,
        usaValvula: usaValvula ?? "N", notas: notas ?? null,
        estatus: estatus ?? "Activo",
      },
      { autoCommit: true }
    ).then(r => r.rowsAffected ?? 0);
  });
}

export const updateFotoPerfilUrl = (curp, fotoPerfilUrl) =>
  withConnection(conn =>
    conn.execute(
      `UPDATE BENEFICIARIOS SET FOTO_PERFIL_URL = :fotoPerfilUrl WHERE CURP = :curp`,
      { curp, fotoPerfilUrl }, { autoCommit: true }
    )
  );

export const updateEstatus = (curp, estatus) =>
  withConnection(conn =>
    conn.execute(
      `UPDATE BENEFICIARIOS SET ESTATUS = :estatus WHERE CURP = :curp`,
      { estatus, curp }, { autoCommit: true }
    )
  );

export const updateEstatusAndNotas = (curp, estatus, notas) =>
  withConnection(conn =>
    conn.execute(
      `UPDATE BENEFICIARIOS SET ESTATUS = :estatus, NOTAS = :notas WHERE CURP = :curp`,
      { estatus, notas: notas ?? null, curp }, { autoCommit: true }
    )
  );

export const deactivate = (curp) =>
  withConnection(conn =>
    conn.execute(
      `UPDATE BENEFICIARIOS SET ESTATUS = 'Baja' WHERE CURP = :curp`,
      { curp }, { autoCommit: true }
    ).then(r => r.rowsAffected ?? 0)
  );

export const hardDelete = (curp) =>
  withConnection(conn =>
    conn.execute(
      `DELETE FROM BENEFICIARIOS WHERE CURP = :curp`,
      { curp }, { autoCommit: true }
    ).then(r => r.rowsAffected ?? 0)
  );
```

- [ ] **Step 2: Correr la suite completa**

```bash
node --experimental-vm-modules node_modules/.bin/jest --no-coverage 2>&1 | tail -8
```

Expected: todos pasan.

- [ ] **Step 3: Commit + bitácora**

```bash
git add src/models/beneficiarios.model.js
git commit -m "refactor(models): usar withConnection en beneficiarios"
```

Agregar a `docs/refactoring-log.md`:

```markdown
## 2026-05-18 withConnection — beneficiarios.model.js

**Área:** Backend — Modelos
**Archivos modificados:** `src/models/beneficiarios.model.js`
**Problema:** 8 funciones con boilerplate repetido (~48 líneas extra). Variable llamada inconsistentemente `conn`.
**Solución:** Todas las funciones con `withConnection`. `create` y `update` usan forma `async function` para mantener legibilidad del destructuring de muchos campos.
**Impacto:** Eliminadas ~48 líneas. Tests pasan sin cambios.
```

```bash
git add docs/refactoring-log.md
git commit -m "docs(refactoring-log): registrar refactor withConnection en beneficiarios"
```

---

### Task 6: Refactorizar inventario.model.js y articulos.model.js

**Files:**
- Modify: `src/models/inventario.model.js`
- Modify: `src/models/articulos.model.js`

**Nota:** `createMovimientoConTransaccion` en inventario usa rollback explícito — se deja sin cambios.

- [ ] **Step 1: Reemplazar inventario.model.js completo**

```js
import oracledb from "oracledb";
import { getConnection, withConnection } from "../config/db.js";
import { HttpError } from "../utils/httpErrors.js";

/**
 * Registra movimiento via SP. Recibe conexión existente — caller hace commit/rollback.
 */
export async function applyMovimientoConConexion(conn, data) {
  let stockResultante;
  try {
    const result = await conn.execute(
      `BEGIN
         SP_REGISTRAR_MOVIMIENTO_INVENTARIO(:art, :tipo, :cant, :motivo, :stock_out);
       END;`,
      {
        art:       data.idArticulo,
        tipo:      data.tipo,
        cant:      data.cantidad,
        motivo:    data.motivo ?? null,
        stock_out: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      }
    );
    stockResultante = result.outBinds.stock_out;
  } catch (err) {
    if (err.errorNum === 20002 || err.errorNum === 20001)
      throw new HttpError(422, "Stock insuficiente", "INSUFFICIENT_STOCK", {});
    if (err.errorNum === 20006)
      throw new HttpError(404, "Producto no encontrado", "PRODUCT_NOT_FOUND");
    if (err.errorNum === 20005)
      throw new HttpError(400, "Tipo de movimiento inválido", "INVALID_MOVIMIENTO_TIPO");
    throw err;
  }
  return {
    idProducto: data.idArticulo, tipo: data.tipo, cantidad: data.cantidad,
    fecha: new Date().toISOString(), stockResultante, stockActual: stockResultante,
  };
}

/**
 * Versión standalone con su propia conexión y rollback.
 * No usa withConnection porque necesita rollback explícito en caso de error.
 */
export async function createMovimientoConTransaccion(data) {
  let conn;
  try {
    conn = await getConnection();
    const movimiento = await applyMovimientoConConexion(conn, data);
    await conn.commit();
    return movimiento;
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (conn) await conn.close();
  }
}

export const findInventarioActual = () =>
  withConnection(conn =>
    conn.execute(
      `SELECT ID_ARTICULO, DESCRIPCION, UNIDAD,
              CUOTA_RECUPERACION, INVENTARIO_ACTUAL, NVL(STOCK_MINIMO, 5) AS STOCK_MINIMO
       FROM ARTICULOS ORDER BY DESCRIPCION`
    ).then(r => r?.rows ?? [])
  );

export const findMovimientos = () =>
  withConnection(conn =>
    conn.execute(
      `SELECT M.ID_MOVIMIENTO, M.ID_ARTICULO, A.DESCRIPCION,
              M.TIPO_MOVIMIENTO, M.CANTIDAD, M.MOTIVO, M.FECHA, M.STOCK_RESULTANTE
       FROM MOVIMIENTOS_INVENTARIO M
       JOIN ARTICULOS A ON A.ID_ARTICULO = M.ID_ARTICULO
       ORDER BY M.FECHA DESC, M.ID_MOVIMIENTO DESC`
    ).then(r => r?.rows ?? [])
  );

export const countMovimientosByArticulo = (idArticulo) =>
  withConnection(conn =>
    conn.execute(
      `SELECT COUNT(*) AS TOTAL FROM MOVIMIENTOS_INVENTARIO WHERE ID_ARTICULO = :idArticulo`,
      { idArticulo }
    ).then(r => Number(r.rows[0].TOTAL || 0))
  );
```

- [ ] **Step 2: Reemplazar articulos.model.js completo**

```js
import { withConnection } from "../config/db.js";

function isInvalidIdentifierError(err) {
  return err?.errorNum === 904 || /ORA-00904/i.test(String(err?.message ?? ""));
}

export const findAll = () =>
  withConnection(async conn => {
    try {
      return (await conn.execute(
        `SELECT ID_ARTICULO, DESCRIPCION, UNIDAD, CUOTA_RECUPERACION,
                INVENTARIO_ACTUAL, MANEJA_INVENTARIO, ID_CATEGORIA,
                STOCK_MINIMO, NVL(ACTIVO, 'S') AS ACTIVO
         FROM ARTICULOS WHERE NVL(ACTIVO, 'S') = 'S' ORDER BY DESCRIPCION`
      )).rows;
    } catch (err) {
      if (!isInvalidIdentifierError(err)) throw err;
      return (await conn.execute(
        `SELECT ID_ARTICULO, DESCRIPCION, UNIDAD, CUOTA_RECUPERACION,
                INVENTARIO_ACTUAL, MANEJA_INVENTARIO, ID_CATEGORIA, STOCK_MINIMO
         FROM ARTICULOS ORDER BY DESCRIPCION`
      )).rows;
    }
  });

export const findById = (id) =>
  withConnection(async conn => {
    try {
      return (await conn.execute(
        `SELECT ID_ARTICULO, DESCRIPCION, UNIDAD, CUOTA_RECUPERACION,
                INVENTARIO_ACTUAL, MANEJA_INVENTARIO, ID_CATEGORIA,
                STOCK_MINIMO, NVL(ACTIVO, 'S') AS ACTIVO
         FROM ARTICULOS WHERE ID_ARTICULO = :id AND NVL(ACTIVO, 'S') = 'S'`,
        { id }
      )).rows[0] ?? null;
    } catch (err) {
      if (!isInvalidIdentifierError(err)) throw err;
      return (await conn.execute(
        `SELECT ID_ARTICULO, DESCRIPCION, UNIDAD, CUOTA_RECUPERACION,
                INVENTARIO_ACTUAL, MANEJA_INVENTARIO, ID_CATEGORIA, STOCK_MINIMO
         FROM ARTICULOS WHERE ID_ARTICULO = :id`,
        { id }
      )).rows[0] ?? null;
    }
  });

export const create = (data) =>
  withConnection(conn =>
    conn.execute(
      `INSERT INTO ARTICULOS (
         ID_ARTICULO, DESCRIPCION, UNIDAD, CUOTA_RECUPERACION,
         INVENTARIO_ACTUAL, MANEJA_INVENTARIO, ID_CATEGORIA, STOCK_MINIMO
       ) VALUES (
         :idArticulo, :descripcion, :unidad, :cuotaRecuperacion,
         :inventarioActual, :manejaInventario, :idCategoria, :stockMinimo
       )`,
      data, { autoCommit: true }
    )
  );

export async function update(id, data) {
  return withConnection(async conn => {
    const { idArticulo: _idArticulo, ...updateData } = data;
    const dbColumnMap = {
      descripcion: "DESCRIPCION", unidad: "UNIDAD",
      cuotaRecuperacion: "CUOTA_RECUPERACION", inventarioActual: "INVENTARIO_ACTUAL",
      manejaInventario: "MANEJA_INVENTARIO", idCategoria: "ID_CATEGORIA",
      stockMinimo: "STOCK_MINIMO", activo: "ACTIVO",
    };
    const setClause = Object.entries(updateData)
      .filter(([key, value]) => {
        if (value === null || value === undefined) return false;
        if (!(key in dbColumnMap)) { console.warn(`Campo desconocido en update: ${key}`); return false; }
        return true;
      })
      .map(([key]) => `${dbColumnMap[key]} = :${key}`);
    if (setClause.length === 0) return;
    await conn.execute(
      `UPDATE ARTICULOS SET ${setClause.join(", ")} WHERE ID_ARTICULO = :id`,
      { ...updateData, id }, { autoCommit: true }
    );
  });
}

export const deleteById = (id) =>
  withConnection(async conn => {
    try {
      await conn.execute(
        `UPDATE ARTICULOS SET ACTIVO = 'N' WHERE ID_ARTICULO = :id`,
        { id }, { autoCommit: true }
      );
    } catch (err) {
      if (!isInvalidIdentifierError(err)) throw err;
      await conn.execute(
        `DELETE FROM ARTICULOS WHERE ID_ARTICULO = :id`,
        { id }, { autoCommit: true }
      );
    }
  });
```

- [ ] **Step 3: Correr la suite completa**

```bash
node --experimental-vm-modules node_modules/.bin/jest --no-coverage 2>&1 | tail -8
```

Expected: todos pasan.

- [ ] **Step 4: Commit + bitácora**

```bash
git add src/models/inventario.model.js src/models/articulos.model.js
git commit -m "refactor(models): usar withConnection en inventario y articulos"
```

Agregar a `docs/refactoring-log.md`:

```markdown
## 2026-05-18 withConnection — inventario.model.js, articulos.model.js

**Área:** Backend — Modelos
**Archivos modificados:** `src/models/inventario.model.js`, `src/models/articulos.model.js`
**Problema:** Boilerplate repetido. `inventario.model.js` mezclaba funciones simples con una que necesita rollback.
**Solución:** Funciones de lectura/escritura simple usan `withConnection`. `createMovimientoConTransaccion` (con rollback) conservada sin cambios con comentario explicativo. `articulos.model.js` usa `async conn =>` para funciones con inner try/catch del fallback ORA-00904.
**Impacto:** Eliminadas ~36 líneas. Tests pasan sin cambios.
```

```bash
git add docs/refactoring-log.md
git commit -m "docs(refactoring-log): registrar refactor withConnection en inventario y articulos"
```

---

### Task 7: Refactorizar membresias.model.js

**Files:**
- Modify: `src/models/membresias.model.js`

**Nota:** La función `create` usa stored procedure con commit/rollback manual — se deja intacta.

- [ ] **Step 1: Agregar `withConnection` al import**

Cambiar la primera línea de imports:

```js
// Antes:
import { getConnection } from "../config/db.js";

// Después:
import { getConnection, withConnection } from "../config/db.js";
```

- [ ] **Step 2: Refactorizar todas las funciones excepto `create`**

Para cada función con el patrón `conn = await getConnection() / try / finally / conn.close()`, convertir a `withConnection`. Funciones a convertir: `findAll`, `findPagosRecientes`, `findBeneficiarioByCurp`, `findLastByCurp`, `hasPeriodOverlap`, `findMembresiaActivaByCurp`, `setBeneficiarioInactivo`, `setBeneficiarioBaja`, `syncEstados`, `cancelarPorCurp`.

Ejemplo del patrón para todas:

```js
// findAll — antes:
export async function findAll() {
  const conn = await getConnection();
  try {
    const result = await conn.execute(`SELECT ...`);
    return result.rows;
  } finally {
    await conn.close();
  }
}

// findAll — después:
export const findAll = () =>
  withConnection(conn => conn.execute(`SELECT ...`).then(r => r.rows));

// hasPeriodOverlap — antes:
export async function hasPeriodOverlap(curp, fechaInicio, fechaFin) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(`SELECT COUNT(1) AS TOTAL ...`, { curp, fechaInicio, fechaFin });
    return Number(result.rows?.[0]?.TOTAL ?? 0) > 0;
  } finally {
    await conn.close();
  }
}

// hasPeriodOverlap — después:
export const hasPeriodOverlap = (curp, fechaInicio, fechaFin) =>
  withConnection(conn =>
    conn.execute(`SELECT COUNT(1) AS TOTAL ...`, { curp, fechaInicio, fechaFin })
      .then(r => Number(r.rows?.[0]?.TOTAL ?? 0) > 0)
  );

// syncEstados — usa dos conn.execute independientes con autoCommit:
export const syncEstados = () =>
  withConnection(async conn => {
    await conn.execute(`UPDATE BENEFICIARIOS SET ESTATUS = 'Inactivo' WHERE ...`, {}, { autoCommit: true });
    await conn.execute(`UPDATE BENEFICIARIOS SET ESTATUS = 'Baja' WHERE ...`, {}, { autoCommit: true });
  });
```

La función `create` (stored procedure con rollback) NO se modifica.

- [ ] **Step 3: Correr la suite completa**

```bash
node --experimental-vm-modules node_modules/.bin/jest --no-coverage 2>&1 | tail -8
```

Expected: todos pasan.

- [ ] **Step 4: Commit + bitácora**

```bash
git add src/models/membresias.model.js
git commit -m "refactor(models): usar withConnection en membresias (fns sin rollback)"
```

Agregar a `docs/refactoring-log.md`:

```markdown
## 2026-05-18 withConnection — membresias.model.js

**Área:** Backend — Modelos
**Archivos modificados:** `src/models/membresias.model.js`
**Problema:** 10 funciones con boilerplate repetido (~60 líneas extra).
**Solución:** 10 funciones refactorizadas con `withConnection`. `create` se conserva sin cambios (stored procedure con commit/rollback explícito).
**Impacto:** Eliminadas ~60 líneas. Tests pasan sin cambios.
```

```bash
git add docs/refactoring-log.md
git commit -m "docs(refactoring-log): registrar refactor withConnection en membresias"
```

---

### Task 8: Refactorizar servicios.model.js + fix raw Error()

**Files:**
- Modify: `src/models/servicios.model.js`

**Nota:** `createWithInventarioTransaction` y `deleteById` tienen rollback — se dejan intactos.

- [ ] **Step 1: Actualizar imports**

```js
// Antes:
import { getConnection } from "../config/db.js";
import { applyMovimientoConConexion } from "./inventario.model.js";

// Después:
import { getConnection, withConnection } from "../config/db.js";
import { applyMovimientoConConexion } from "./inventario.model.js";
import { internal } from "../utils/httpErrors.js";
```

- [ ] **Step 2: Refactorizar funciones simples**

```js
export const findAll = () =>
  withConnection(conn =>
    conn.execute(
      `SELECT s.ID_SERVICIO, s.CURP,
              b.NOMBRES || ' ' || b.APELLIDO_PATERNO || ' ' || NVL(b.APELLIDO_MATERNO,'') AS NOMBRE_BENEFICIARIO,
              NVL(cat.NOMBRE, 'Servicio ' || s.ID_TIPO_SERVICIO) AS TIPO_SERVICIO,
              s.FECHA, s.COSTO, s.MONTO_PAGADO, s.NOTAS,
              NVL(b.ESTATUS, 'Activo') AS ESTATUS,
              CASE
                WHEN EXISTS (SELECT 1 FROM CREDENCIALES c WHERE c.CURP = s.CURP
                  AND c.FECHA_VIGENCIA_FIN >= TRUNC(SYSDATE)
                  AND c.FECHA_VIGENCIA_FIN - TRUNC(SYSDATE) > 30) THEN 'Activa'
                WHEN EXISTS (SELECT 1 FROM CREDENCIALES c WHERE c.CURP = s.CURP
                  AND c.FECHA_VIGENCIA_FIN >= TRUNC(SYSDATE)
                  AND c.FECHA_VIGENCIA_FIN - TRUNC(SYSDATE) <= 30) THEN 'Por vencer'
                WHEN EXISTS (SELECT 1 FROM CREDENCIALES c WHERE c.CURP = s.CURP) THEN 'Vencida'
                ELSE 'Sin membresia'
              END AS MEMBRESIA_ESTATUS
       FROM SERVICIOS s
       LEFT JOIN BENEFICIARIOS b ON b.CURP = s.CURP
       LEFT JOIN SERVICIOS_CATALOGO cat ON cat.ID_TIPO_SERVICIO = s.ID_TIPO_SERVICIO
       ORDER BY s.FECHA DESC`
    ).then(r => r.rows)
  );

export const findBeneficiarioActivo = (curp) =>
  withConnection(conn =>
    conn.execute(
      `SELECT ESTATUS, NOMBRES, APELLIDO_PATERNO FROM BENEFICIARIOS WHERE CURP = :curp`,
      { curp }
    ).then(r => r.rows[0] ?? null)
  );

export const findBeneficiarioActivoConMembresia = (curp) =>
  withConnection(conn =>
    conn.execute(
      `SELECT b.ESTATUS, b.NOMBRES, b.APELLIDO_PATERNO, c.ID_CREDENCIAL, c.NUMERO_CREDENCIAL
       FROM BENEFICIARIOS b
       LEFT JOIN CREDENCIALES c ON c.CURP = b.CURP
         AND SYSDATE BETWEEN c.FECHA_VIGENCIA_INICIO AND c.FECHA_VIGENCIA_FIN
       WHERE b.CURP = :curp`,
      { curp }
    ).then(r => r.rows[0] ?? null)
  );

export const findByCurp = (curp) =>
  withConnection(conn =>
    conn.execute(
      `SELECT ID_SERVICIO, CURP, ID_TIPO_SERVICIO, FECHA, COSTO,
              MONTO_PAGADO, REFERENCIA_ID, REFERENCIA_TIPO, NOTAS
       FROM SERVICIOS WHERE CURP = :curp ORDER BY FECHA DESC`,
      { curp }
    ).then(r => r.rows)
  );

export const findByCurpPaginated = (curp, page = 1, limit = 10) =>
  withConnection(conn => {
    const offset = (page - 1) * limit;
    return conn.execute(
      `SELECT ID_SERVICIO, CURP, ID_TIPO_SERVICIO, FECHA, COSTO,
              MONTO_PAGADO, REFERENCIA_ID, REFERENCIA_TIPO, NOTAS
       FROM SERVICIOS WHERE CURP = :curp ORDER BY FECHA DESC
       OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`,
      { curp, offset, limit }
    ).then(r => r.rows);
  });

export const findById = (idServicio) =>
  withConnection(conn =>
    conn.execute(
      `SELECT ID_SERVICIO, CURP, ID_TIPO_SERVICIO, FECHA, COSTO,
              MONTO_PAGADO, REFERENCIA_ID, REFERENCIA_TIPO, NOTAS
       FROM SERVICIOS WHERE ID_SERVICIO = :idServicio`,
      { idServicio }
    ).then(r => r.rows[0] ?? null)
  );

export const update = (idServicio, data) =>
  withConnection(conn =>
    conn.execute(
      `UPDATE SERVICIOS SET MONTO_PAGADO = :montoPagado, NOTAS = :notas
       WHERE ID_SERVICIO = :idServicio`,
      { ...data, idServicio }, { autoCommit: true }
    )
  );
```

- [ ] **Step 3: Refactorizar `create` y corregir los `throw new Error`**

```js
export async function create(data) {
  return withConnection(async conn => {
    const idResult = await conn.execute(
      `SELECT SEQ_SERVICIOS.NEXTVAL AS NEXT_ID FROM DUAL`
    );
    const idServicio = Number(idResult.rows?.[0]?.NEXT_ID ?? 0);
    if (!Number.isInteger(idServicio) || idServicio <= 0) {
      throw internal("No se pudo generar ID_SERVICIO");
    }
    await conn.execute(
      `INSERT INTO SERVICIOS (
         ID_SERVICIO, CURP, ID_TIPO_SERVICIO, FECHA, COSTO, MONTO_PAGADO,
         REFERENCIA_ID, REFERENCIA_TIPO, NOTAS
       ) VALUES (
         :idServicio, :curp, :idTipoServicio, SYSDATE, :costo, :montoPagado,
         :referenciaId, :referenciaTipo, :notas
       )`,
      {
        idServicio, curp: data.curp, idTipoServicio: data.idTipoServicio,
        costo: data.costo, montoPagado: data.montoPagado,
        referenciaId: data.referenciaId, referenciaTipo: data.referenciaTipo,
        notas: data.notas,
      },
      { autoCommit: true }
    );
    return idServicio;
  });
}
```

Nota: `createWithInventarioTransaction` y `deleteById` tienen rollback — **no** se tocan.

- [ ] **Step 4: Correr la suite completa**

```bash
node --experimental-vm-modules node_modules/.bin/jest --no-coverage 2>&1 | tail -8
```

Expected: todos pasan.

- [ ] **Step 5: Commit + bitácora**

```bash
git add src/models/servicios.model.js
git commit -m "refactor(models): usar withConnection en servicios + reemplazar raw Error() con internal()"
```

Agregar a `docs/refactoring-log.md`:

```markdown
## 2026-05-18 withConnection + fix raw Error — servicios.model.js

**Área:** Backend — Modelos
**Archivos modificados:** `src/models/servicios.model.js`
**Problema:** (1) Boilerplate repetido en 8 funciones. (2) Dos `throw new Error(...)` generaban respuestas 500 sin el formato estándar.
**Solución:** Funciones simples refactorizadas. `createWithInventarioTransaction` y `deleteById` (con rollback) conservadas. Los dos `throw new Error` reemplazados con `throw internal(...)` de `httpErrors.js`.
**Impacto:** Eliminadas ~48 líneas. Errores de secuencia Oracle producen respuestas 500 con formato consistente.
```

```bash
git add docs/refactoring-log.md
git commit -m "docs(refactoring-log): registrar refactor withConnection + error fix en servicios"
```

---

### Task 9: Refactorizar reportes.model.js

**Files:**
- Modify: `src/models/reportes.model.js`

- [ ] **Step 1: Leer el archivo y reemplazar el import**

```bash
cat -n src/models/reportes.model.js
```

Cambiar la primera línea:

```js
// Antes:
import { getConnection } from "../config/db.js";

// Después:
import { withConnection } from "../config/db.js";
```

- [ ] **Step 2: Aplicar el patrón `withConnection` a todas las funciones**

Para cada función que sigue el patrón `getConnection / try / finally / close`, convertir:

```js
// Patrón antes (para cada función):
export async function nombreFuncion(param1, param2) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(SQL, { param1, param2 });
    return result.rows;
  } finally {
    await conn.close();
  }
}

// Patrón después:
export const nombreFuncion = (param1, param2) =>
  withConnection(conn =>
    conn.execute(SQL, { param1, param2 }).then(r => r.rows)
  );
```

Las consultas SQL no cambian — solo el envoltorio de conexión.

- [ ] **Step 3: Correr la suite completa**

```bash
node --experimental-vm-modules node_modules/.bin/jest --no-coverage 2>&1 | tail -8
```

Expected: todos pasan.

- [ ] **Step 4: Commit + bitácora**

```bash
git add src/models/reportes.model.js
git commit -m "refactor(models): usar withConnection en reportes"
```

Agregar a `docs/refactoring-log.md`:

```markdown
## 2026-05-18 withConnection — reportes.model.js

**Área:** Backend — Modelos
**Archivos modificados:** `src/models/reportes.model.js`
**Problema:** 15 funciones de consulta con boilerplate repetido (~90 líneas extra).
**Solución:** Todas refactorizadas con `withConnection`. Al ser solo SELECTs, ninguna necesita rollback.
**Impacto:** Eliminadas ~90 líneas de boilerplate. Tests pasan sin cambios.
```

```bash
git add docs/refactoring-log.md
git commit -m "docs(refactoring-log): registrar refactor withConnection en reportes"
```

---

### Task 10: Crear módulo de validadores compartidos

**Files:**
- Create: `src/utils/validators.js`
- Test: `src/tests/validators.test.js` (nuevo)

- [ ] **Step 1: Escribir el test**

Crear `src/tests/validators.test.js`:

```js
import {
  CURP_REGEX, EMAIL_REGEX, TEL_REGEX,
  sanitizeString, parsePositiveNumber, parseISODate,
} from '../utils/validators.js';

describe('CURP_REGEX', () => {
  test('acepta CURP válido', () => {
    expect(CURP_REGEX.test('GALJ900515HJCRPN01')).toBe(true);
  });
  test('rechaza CURP de 17 chars', () => {
    expect(CURP_REGEX.test('GALJ900515HJCRPN0')).toBe(false);
  });
});

describe('sanitizeString', () => {
  test('recorta espacios', () => {
    expect(sanitizeString('  hola  ')).toBe('hola');
  });
  test('devuelve no-string sin cambio', () => {
    expect(sanitizeString(null)).toBe(null);
  });
});

describe('parsePositiveNumber', () => {
  test('convierte string numérico', () => {
    expect(parsePositiveNumber('5', 'campo')).toBe(5);
  });
  test('lanza error si es negativo', () => {
    expect(() => parsePositiveNumber(-1, 'campo')).toThrow('campo');
  });
  test('lanza error si NaN', () => {
    expect(() => parsePositiveNumber('abc', 'campo')).toThrow('campo');
  });
});

describe('parseISODate', () => {
  test('parsea fecha ISO válida', () => {
    const d = parseISODate('2024-01-15', 'fecha');
    expect(d).toBeInstanceOf(Date);
    expect(d.getUTCFullYear()).toBe(2024);
  });
  test('lanza error si formato incorrecto', () => {
    expect(() => parseISODate('15/01/2024', 'fecha')).toThrow('fecha');
  });
  test('devuelve null si valor vacío', () => {
    expect(parseISODate(null, 'fecha')).toBeNull();
  });
});
```

- [ ] **Step 2: Ejecutar test para verificar que falla**

```bash
node --experimental-vm-modules node_modules/.bin/jest src/tests/validators.test.js --no-coverage
```

Expected: FAIL — `Cannot find module '../utils/validators.js'`

- [ ] **Step 3: Crear validators.js**

```js
import { badRequest } from "./httpErrors.js";

export const CURP_REGEX  = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const TEL_REGEX   = /^\d{10}$/;
export const CP_REGEX    = /^\d{5}$/;

/** Recorta espacios si es string; devuelve el valor tal cual si no. */
export function sanitizeString(val) {
  return typeof val === "string" ? val.trim() : val;
}

/** Convierte val a número >= 0. Lanza badRequest si es inválido. */
export function parsePositiveNumber(val, fieldName) {
  const num = Number(val);
  if (Number.isNaN(num) || num < 0)
    throw badRequest(`${fieldName} debe ser un número >= 0`);
  return num;
}

/**
 * Parsea fecha ISO YYYY-MM-DD. Devuelve Date (UTC) o null si val está vacío.
 * Lanza badRequest si el formato es incorrecto.
 */
export function parseISODate(val, fieldName) {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val !== "string")
    throw badRequest(`${fieldName} debe ser una fecha ISO (YYYY-MM-DD)`);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.test(val.trim());
  if (!m) throw badRequest(`${fieldName} debe tener formato YYYY-MM-DD`);
  const parts = val.trim().split("-");
  const d = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
  if (Number.isNaN(d.getTime())) throw badRequest(`${fieldName} es una fecha inválida`);
  return d;
}
```

- [ ] **Step 4: Ejecutar test para verificar que pasa**

```bash
node --experimental-vm-modules node_modules/.bin/jest src/tests/validators.test.js --no-coverage
```

Expected: PASS — 8 tests

- [ ] **Step 5: Correr suite completa**

```bash
node --experimental-vm-modules node_modules/.bin/jest --no-coverage 2>&1 | tail -8
```

Expected: todos pasan.

- [ ] **Step 6: Commit + bitácora**

```bash
git add src/utils/validators.js src/tests/validators.test.js
git commit -m "refactor(utils): extraer módulo de validadores compartidos"
```

Agregar a `docs/refactoring-log.md`:

```markdown
## 2026-05-18 Módulo de validadores compartidos

**Área:** Backend — Utilidades
**Archivos creados:** `src/utils/validators.js`, `src/tests/validators.test.js`
**Problema:** Cada servicio reimplementaba sus propios helpers: `parseNumber` en servicios.service, `parseISODate` en membresias.service, regex CURP/EMAIL/TEL en beneficiarios.service. Cambiar una regla requería actualizaciones en múltiples lugares.
**Solución:** Módulo centralizado con `CURP_REGEX`, `EMAIL_REGEX`, `TEL_REGEX`, `CP_REGEX`, `sanitizeString`, `parsePositiveNumber`, `parseISODate`.
**Impacto:** ~50 líneas de código duplicado consolidadas. 8 nuevos tests unitarios.
```

```bash
git add docs/refactoring-log.md
git commit -m "docs(refactoring-log): registrar creación del módulo validators"
```

---

### Task 11: Actualizar servicios para usar validators.js

**Files:**
- Modify: `src/services/beneficiarios.service.js`
- Modify: `src/services/servicios.service.js`
- Modify: `src/services/membresias.service.js`

- [ ] **Step 1: Actualizar beneficiarios.service.js**

Agregar import al inicio:

```js
import { CURP_REGEX, EMAIL_REGEX, TEL_REGEX, CP_REGEX, sanitizeString } from "../utils/validators.js";
```

Eliminar las cuatro constantes duplicadas (busca las líneas con `const CURP_REGEX`, `const EMAIL_REGEX`, `const TEL_REGEX`, `const CP_REGEX`).

En la función `sanitizar`, reemplazar `String(data[campo]).trim()` con `sanitizeString(data[campo])`:

```js
// Antes:
if (data[campo]) data[campo] = String(data[campo]).trim();

// Después:
if (data[campo]) data[campo] = sanitizeString(data[campo]);
```

- [ ] **Step 2: Actualizar servicios.service.js**

Agregar import:

```js
import { parsePositiveNumber, parseISODate } from "../utils/validators.js";
```

Eliminar las funciones locales `parseNumber` y `parseAndValidateDate` (aproximadamente líneas 7–41).

Reemplazar los usos:
- `parseNumber(value, fieldName)` → `parsePositiveNumber(value, fieldName)`
- `parseAndValidateDate(dateStr, fieldName)` → dado que la local devolvía `string` y la de validators devuelve `Date`, busca dónde se usa el resultado. Si se pasa directamente a Oracle como string, usa `.toISOString().split('T')[0]` sobre el Date resultante, o adapta según contexto.

- [ ] **Step 3: Actualizar membresias.service.js**

Agregar import:

```js
import { parseISODate } from "../utils/validators.js";
```

Eliminar la función local `parseISODate` (líneas 6–13 del archivo). Verificar que la firma y comportamiento son compatibles (ambas devuelven `Date | null`).

- [ ] **Step 4: Correr suite completa**

```bash
node --experimental-vm-modules node_modules/.bin/jest --no-coverage 2>&1 | tail -8
```

Expected: todos pasan. Si algún test falla por la diferencia de tipo (string vs Date) en `parseAndValidateDate`, ajusta el código consumidor antes de pasar el valor a Oracle.

- [ ] **Step 5: Commit + bitácora**

```bash
git add src/services/beneficiarios.service.js src/services/servicios.service.js src/services/membresias.service.js
git commit -m "refactor(services): usar validators.js compartido en lugar de reimplementaciones locales"
```

Agregar a `docs/refactoring-log.md`:

```markdown
## 2026-05-18 Servicios usan validators.js

**Área:** Backend — Servicios
**Archivos modificados:** `beneficiarios.service.js`, `servicios.service.js`, `membresias.service.js`
**Problema:** Cada servicio tenía su propia copia de regex (CURP, EMAIL, TEL) y funciones de parse.
**Solución:** Importan desde `src/utils/validators.js`. Se eliminan las implementaciones locales.
**Impacto:** ~50 líneas de duplicación eliminadas. Tests existentes pasan sin cambios.
```

```bash
git add docs/refactoring-log.md
git commit -m "docs(refactoring-log): registrar uso de validators en servicios"
```

---

### Task 12: Eliminar clase AppError de errorHandler.js

**Files:**
- Modify: `src/middleware/errorHandler.js`

- [ ] **Step 1: Eliminar la clase AppError**

Eliminar del archivo las líneas que definen la clase (aproximadamente líneas 3–11):

```js
// ELIMINAR estas líneas:
// Clase legada — conservada para compatibilidad con código existente.
export class AppError extends Error {
  constructor(message, statusCode, details = undefined) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
  }
}
```

- [ ] **Step 2: Eliminar la rama `instanceof AppError` del handler**

Dentro de la función `errorHandler`, eliminar el bloque `else if (err instanceof AppError)`:

```js
// ELIMINAR este bloque (4 líneas):
  } else if (err instanceof AppError) {
    statusCode = err.statusCode ?? 500;
    code       = statusToDefaultCode(statusCode);
    message    = err.message;
    details    = err.details;
```

- [ ] **Step 3: Verificar que nadie importa AppError**

```bash
grep -r "AppError" src/ --include="*.js"
```

Expected: sin resultados.

- [ ] **Step 4: Correr suite completa**

```bash
node --experimental-vm-modules node_modules/.bin/jest --no-coverage 2>&1 | tail -8
```

Expected: todos pasan.

- [ ] **Step 5: Commit + bitácora**

```bash
git add src/middleware/errorHandler.js
git commit -m "refactor(middleware): eliminar clase AppError legacy de errorHandler"
```

Agregar a `docs/refactoring-log.md`:

```markdown
## 2026-05-18 Eliminar AppError legacy

**Área:** Backend — Middleware
**Archivos modificados:** `src/middleware/errorHandler.js`
**Problema:** La clase `AppError` marcada como "kept for compatibility" no era usada por ningún archivo. Su rama `instanceof AppError` en el handler era código muerto.
**Solución:** Eliminada la clase y su rama. Todo el código ya usaba `HttpError`.
**Impacto:** 12 líneas de código muerto eliminadas. Tests pasan sin cambios.
```

```bash
git add docs/refactoring-log.md
git commit -m "docs(refactoring-log): registrar eliminación de AppError"
```

---

### Task 13: Dividir beneficiarios.tsx

**Files:**
- Modify: `frontend/components/sections/beneficiarios.tsx`
- Create: `frontend/components/sections/beneficiarios/BeneficiariosTable.tsx`
- Create: `frontend/components/sections/beneficiarios/BeneficiarioFormDialog.tsx`
- Create: `frontend/components/sections/beneficiarios/BeneficiarioDetailPanel.tsx`

- [ ] **Step 1: Leer el archivo completo**

```bash
cat -n frontend/components/sections/beneficiarios.tsx
```

Identifica los tres bloques de JSX:
1. **Tabla** — el bloque que renderiza la lista de beneficiarios con buscador y filtros
2. **Panel de detalle** — el panel/drawer lateral que aparece al seleccionar un beneficiario
3. **Diálogo de alta** — el `<Dialog>` para crear un nuevo beneficiario (el de edición ya vive en `BeneficiariosEditDialog.tsx`)

- [ ] **Step 2: Crear BeneficiariosTable.tsx**

```tsx
"use client"

// Importa solo lo que necesita la tabla (íconos, shadcn, tipos)
// Ver qué imports usa el bloque de tabla en el archivo original

interface BeneficiariosTableProps {
  beneficiarios: Beneficiario[]
  loading: boolean
  searchTerm: string
  onSearchChange: (term: string) => void
  onSelect: (b: Beneficiario) => void
  onNew: () => void
}

export function BeneficiariosTable({
  beneficiarios, loading, searchTerm, onSearchChange, onSelect, onNew
}: BeneficiariosTableProps) {
  // Pegar aquí el JSX del bloque de tabla extraído del archivo original
  // Incluye: buscador, filtros de estatus, tabla con filas, paginación si existe
}
```

- [ ] **Step 3: Crear BeneficiarioDetailPanel.tsx**

```tsx
"use client"

interface BeneficiarioDetailPanelProps {
  beneficiario: Beneficiario | null
  onEdit: () => void
  onClose: () => void
  onPrintCredencial?: () => void
}

export function BeneficiarioDetailPanel({
  beneficiario, onEdit, onClose, onPrintCredencial
}: BeneficiarioDetailPanelProps) {
  // Pegar aquí el JSX del panel de detalle extraído del archivo original
}
```

- [ ] **Step 4: Crear BeneficiarioFormDialog.tsx**

```tsx
"use client"

interface BeneficiarioFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: any) => Promise<void>
}

export function BeneficiarioFormDialog({
  open, onOpenChange, onSubmit
}: BeneficiarioFormDialogProps) {
  // Pegar aquí el JSX del diálogo de alta extraído del archivo original
  // Incluye el estado local del formulario (nombres, apellidos, etc.)
}
```

- [ ] **Step 5: Reducir beneficiarios.tsx a orquestador**

El archivo original queda con los imports del hook y los tres nuevos componentes, el estado que coordina qué se muestra, y el JSX que ensambla los tres subcomponentes pasando las props:

```tsx
"use client"

import { BeneficiariosTable } from "./beneficiarios/BeneficiariosTable"
import { BeneficiarioDetailPanel } from "./beneficiarios/BeneficiarioDetailPanel"
import { BeneficiarioFormDialog } from "./beneficiarios/BeneficiarioFormDialog"
import { useBeneficiarios } from "@/hooks/useBeneficiarios"
import { BeneficiariosEditDialog } from "@/components/beneficiarios-edit-dialog"

export default function BeneficiariosSection() {
  const {
    beneficiarios, loading, selected, setSelected,
    searchTerm, setSearchTerm, crearBeneficiario,
    // ... otros valores del hook
  } = useBeneficiarios()

  const [showForm, setShowForm] = useState(false)

  return (
    <>
      <BeneficiariosTable
        beneficiarios={beneficiarios}
        loading={loading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onSelect={setSelected}
        onNew={() => setShowForm(true)}
      />
      <BeneficiarioDetailPanel
        beneficiario={selected}
        onEdit={() => { /* abrir edit dialog */ }}
        onClose={() => setSelected(null)}
      />
      <BeneficiarioFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        onSubmit={crearBeneficiario}
      />
      <BeneficiariosEditDialog {/* ... */} />
    </>
  )
}
```

- [ ] **Step 6: Verificar build**

```bash
cd frontend && npm run build 2>&1 | tail -20
```

Expected: build sin errores de TypeScript. Si hay errores de tipo, ajusta las interfaces de props.

- [ ] **Step 7: Commit + bitácora**

```bash
git add frontend/components/sections/beneficiarios.tsx \
        frontend/components/sections/beneficiarios/
git commit -m "refactor(frontend): dividir beneficiarios.tsx en orquestador + 3 subcomponentes"
```

Agregar a `docs/refactoring-log.md`:

```markdown
## 2026-05-18 División de beneficiarios.tsx

**Área:** Frontend — Componentes
**Archivos modificados:** `sections/beneficiarios.tsx` (orquestador)
**Archivos creados:** `beneficiarios/BeneficiariosTable.tsx`, `beneficiarios/BeneficiarioFormDialog.tsx`, `beneficiarios/BeneficiarioDetailPanel.tsx`
**Problema:** Un solo archivo de 1,328 líneas mezclaba tabla, panel de detalle y formulario. Difícil de leer y mantener.
**Solución:** Tres subcomponentes con props explícitas. El orquestador coordina estado y ensambla.
**Impacto:** Componente principal reducido de 1,328 a ~200 líneas. Cada subcomponente tiene una responsabilidad clara.
```

```bash
git add docs/refactoring-log.md
git commit -m "docs(refactoring-log): registrar división de beneficiarios.tsx"
```

---

### Task 14: Dividir servicios.tsx

**Files:**
- Modify: `frontend/components/sections/servicios.tsx`
- Create: `frontend/components/sections/servicios/ServiciosTable.tsx`
- Create: `frontend/components/sections/servicios/ServicioFormDialog.tsx`
- Create: `frontend/components/sections/servicios/ConsumoArticulosForm.tsx`

- [ ] **Step 1: Leer el archivo completo**

```bash
cat -n frontend/components/sections/servicios.tsx
```

Identifica los bloques:
1. **Tabla** — lista de servicios con filtros
2. **Formulario principal** — `<Dialog>` para registrar servicio (CURP, tipo, fecha, costo, montoPagado, notas)
3. **Sub-formulario artículos** — sección dentro del formulario donde se agregan artículos consumidos

- [ ] **Step 2: Crear ConsumoArticulosForm.tsx primero** (más autocontenido)

```tsx
"use client"

interface ConsumoItem {
  idProducto: number
  cantidad: number
  motivo?: string
}

interface ConsumoArticulosFormProps {
  consumos: ConsumoItem[]
  articulos: any[]
  onChange: (consumos: ConsumoItem[]) => void
}

export function ConsumoArticulosForm({ consumos, articulos, onChange }: ConsumoArticulosFormProps) {
  // Pegar aquí el JSX del sub-formulario de artículos extraído del archivo original
}
```

- [ ] **Step 3: Crear ServicioFormDialog.tsx**

```tsx
"use client"

interface ServicioFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  articulos: any[]
  onSubmit: (data: any) => Promise<void>
}

export function ServicioFormDialog({ open, onOpenChange, articulos, onSubmit }: ServicioFormDialogProps) {
  // Pegar aquí el JSX del formulario de servicio extraído del archivo original
  // Incluye <ConsumoArticulosForm> como subcomponente interno
}
```

- [ ] **Step 4: Crear ServiciosTable.tsx**

```tsx
"use client"

interface ServiciosTableProps {
  servicios: any[]
  loading: boolean
  onNew: () => void
}

export function ServiciosTable({ servicios, loading, onNew }: ServiciosTableProps) {
  // Pegar aquí el JSX de la tabla de servicios extraído del archivo original
}
```

- [ ] **Step 5: Reducir servicios.tsx a orquestador**

```tsx
"use client"

import { ServiciosTable } from "./servicios/ServiciosTable"
import { ServicioFormDialog } from "./servicios/ServicioFormDialog"
// imports del hook o state management existente

export default function ServiciosSection() {
  // Estado mínimo: showForm, lista de servicios, artículos
  return (
    <>
      <ServiciosTable servicios={servicios} loading={loading} onNew={() => setShowForm(true)} />
      <ServicioFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        articulos={articulos}
        onSubmit={registrarServicio}
      />
    </>
  )
}
```

- [ ] **Step 6: Verificar build**

```bash
cd frontend && npm run build 2>&1 | tail -20
```

Expected: build sin errores de TypeScript.

- [ ] **Step 7: Commit + bitácora**

```bash
git add frontend/components/sections/servicios.tsx \
        frontend/components/sections/servicios/
git commit -m "refactor(frontend): dividir servicios.tsx en orquestador + 3 subcomponentes"
```

Agregar a `docs/refactoring-log.md`:

```markdown
## 2026-05-18 División de servicios.tsx

**Área:** Frontend — Componentes
**Archivos modificados:** `sections/servicios.tsx` (orquestador)
**Archivos creados:** `servicios/ServiciosTable.tsx`, `servicios/ServicioFormDialog.tsx`, `servicios/ConsumoArticulosForm.tsx`
**Problema:** Un solo archivo de 1,310 líneas mezclaba tabla, formulario de servicio y sub-formulario de artículos consumidos.
**Solución:** Tres subcomponentes. `ConsumoArticulosForm` es reutilizable de forma independiente.
**Impacto:** Componente principal reducido de 1,310 a ~150 líneas.
```

```bash
git add docs/refactoring-log.md
git commit -m "docs(refactoring-log): registrar división de servicios.tsx"
```

---

## Self-Review

**Spec coverage:**
- Refactor 1 (withConnection): Tasks 2–9
- Refactor 2 (validators compartidos): Tasks 10–11
- Refactor 3 (AppError + raw Error): Task 12
- Refactor 4 (frontend split): Tasks 13–14
- Bitácora de refactors: Task 1 + step de actualización en cada task
- Funciones con rollback explícito conservadas sin cambios: anotado en Tasks 6, 7, 8

**Placeholder scan:** Tasks 7 y 9 incluyen un paso `cat` de lectura previa del archivo — justificado porque membresias.model.js y reportes.model.js tienen estructuras repetitivas donde aplicar el patrón es más claro tras leer el archivo completo. El patrón de transformación está especificado completamente en ambos tasks.

**Consistencia de tipos:** `withConnection` usa la misma firma en todos los tasks. `parseISODate` de validators.js devuelve `Date | null` mientras la versión local de servicios.service.js devolvía `string | null` — el Task 11 advierte explícitamente ajustar si hay diferencia.
