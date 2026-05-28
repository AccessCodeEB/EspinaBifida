# Stored Procedures Implementation Plan

> **STATUS: PARCIALMENTE EJECUTADO** — `SP_REGISTRAR_MOVIMIENTO_INVENTARIO` y `SP_REGISTRAR_MEMBRESIA` wired en sus modelos. `SP_REGISTRAR_SERVICIO` pendiente (el modelo de servicios aún usa SQL inline).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 3 Oracle stored procedures (SP_REGISTRAR_MOVIMIENTO_INVENTARIO, SP_REGISTRAR_MEMBRESIA, SP_REGISTRAR_SERVICIO) and wire the Node.js models to call them instead of inline SQL.

**Architecture:** The stored procedures live in Oracle and encapsulate the multi-table transaction logic. The Node.js model layer calls them via `conn.execute('BEGIN sp_name(:p); END;', binds)` with OUT parameters for generated IDs. The service and controller layers are untouched — the interface is identical.

**Tech Stack:** Node.js (ESM), oracledb v6, Oracle DB, Jest + Supertest, PL/SQL

---

## File Map

| Action | File | What changes |
|---|---|---|
| Create | `scripts/stored-procedures.sql` | 3 CREATE OR REPLACE PROCEDURE |
| Modify | `src/models/inventario.model.js` | Replace `applyMovimientoConConexion` body; remove dead helpers |
| Modify | `src/models/membresias.model.js` | Replace `create` function body |
| Modify | `src/models/servicios.model.js` | Fix race-condition bug in `createWithInventarioTransaction` |
| Modify | `src/tests/inventario.test.js` | Update mock expectations for SP call format |

---

## Task 1: Create the SQL script

**Files:**
- Create: `scripts/stored-procedures.sql`

- [ ] **Step 1: Write the file**

```sql
-- =============================================================================
-- EspinaBifida — Stored Procedures
-- Run once against Oracle DB:
--   sqlplus user/pass@connection @scripts/stored-procedures.sql
--
-- PREREQUISITE: scripts/add-stock-resultante-column.sql must run first.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- SP 1: Registrar movimiento de inventario (ENTRADA o SALIDA)
-- Replaces: src/models/inventario.model.js > applyMovimientoConConexion
-- -----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE SP_REGISTRAR_MOVIMIENTO_INVENTARIO(
  p_id_articulo    IN  NUMBER,
  p_tipo           IN  VARCHAR2,   -- 'ENTRADA' o 'SALIDA'
  p_cantidad       IN  NUMBER,
  p_motivo         IN  VARCHAR2,
  p_stock_nuevo    OUT NUMBER
) AS
  v_stock_actual NUMBER;
  v_maneja       CHAR(1);
BEGIN
  IF p_tipo NOT IN ('ENTRADA', 'SALIDA') THEN
    RAISE_APPLICATION_ERROR(-20005, 'TIPO_MOVIMIENTO invalido: ' || p_tipo);
  END IF;

  SELECT INVENTARIO_ACTUAL, MANEJA_INVENTARIO
  INTO v_stock_actual, v_maneja
  FROM ARTICULOS
  WHERE ID_ARTICULO = p_id_articulo
  FOR UPDATE;

  -- Articulos sin trazabilidad: devolver stock sin cambio y salir
  IF v_maneja != 'S' THEN
    p_stock_nuevo := v_stock_actual;
    RETURN;
  END IF;

  IF p_tipo = 'SALIDA' AND v_stock_actual < p_cantidad THEN
    RAISE_APPLICATION_ERROR(-20002, 'Stock insuficiente para SALIDA');
  END IF;

  IF p_tipo = 'ENTRADA' THEN
    p_stock_nuevo := v_stock_actual + p_cantidad;
  ELSE
    p_stock_nuevo := v_stock_actual - p_cantidad;
  END IF;

  UPDATE ARTICULOS SET INVENTARIO_ACTUAL = p_stock_nuevo
  WHERE ID_ARTICULO = p_id_articulo;

  -- TRG_MOV_INV_BI asigna ID_MOVIMIENTO
  INSERT INTO MOVIMIENTOS_INVENTARIO
    (ID_ARTICULO, TIPO_MOVIMIENTO, CANTIDAD, FECHA, MOTIVO, STOCK_RESULTANTE)
  VALUES
    (p_id_articulo, p_tipo, p_cantidad, SYSDATE, p_motivo, p_stock_nuevo);

  -- NO COMMIT: el caller (Node.js) hace conn.commit()
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    RAISE_APPLICATION_ERROR(-20006, 'Articulo no encontrado: ' || p_id_articulo);
  WHEN OTHERS THEN
    RAISE;
END SP_REGISTRAR_MOVIMIENTO_INVENTARIO;
/

-- -----------------------------------------------------------------------------
-- SP 2: Registrar membresia
-- Replaces: src/models/membresias.model.js > create
-- -----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE SP_REGISTRAR_MEMBRESIA(
  p_curp            IN  VARCHAR2,
  p_num_credencial  IN  VARCHAR2,
  p_fecha_inicio    IN  DATE,
  p_fecha_fin       IN  DATE,
  p_fecha_pago      IN  DATE,
  p_fecha_emision   IN  DATE,
  p_observaciones   IN  VARCHAR2,
  p_id_credencial   OUT NUMBER
) AS
  v_estatus VARCHAR2(10);
BEGIN
  SELECT ESTATUS INTO v_estatus
  FROM BENEFICIARIOS
  WHERE CURP = p_curp;

  IF v_estatus = 'Baja' THEN
    RAISE_APPLICATION_ERROR(-20003,
      'Beneficiario en Baja: no puede registrar membresia');
  END IF;

  -- Cancelar membresías previas activas
  UPDATE CREDENCIALES
  SET FECHA_VIGENCIA_FIN = TRUNC(SYSDATE) - 1
  WHERE CURP = p_curp
    AND FECHA_VIGENCIA_FIN >= TRUNC(SYSDATE);

  -- Trigger SEQ_CREDENCIALES asigna ID_CREDENCIAL
  INSERT INTO CREDENCIALES (
    CURP, NUMERO_CREDENCIAL,
    FECHA_VIGENCIA_INICIO, FECHA_VIGENCIA_FIN,
    FECHA_ULTIMO_PAGO, FECHA_EMISION, OBSERVACIONES
  ) VALUES (
    p_curp, p_num_credencial,
    p_fecha_inicio, p_fecha_fin,
    p_fecha_pago, p_fecha_emision, p_observaciones
  )
  RETURNING ID_CREDENCIAL INTO p_id_credencial;

  UPDATE BENEFICIARIOS
  SET ESTATUS = 'Activo'
  WHERE CURP = p_curp AND ESTATUS = 'Inactivo';

  -- NO COMMIT: el caller hace conn.commit()
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    RAISE_APPLICATION_ERROR(-20004, 'Beneficiario no encontrado: ' || p_curp);
  WHEN OTHERS THEN
    RAISE;
END SP_REGISTRAR_MEMBRESIA;
/

-- -----------------------------------------------------------------------------
-- SP 3: Registrar servicio con un articulo consumido
-- Used by: src/models/servicios.model.js > createWithInventarioTransaction (1st item)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE SP_REGISTRAR_SERVICIO(
  p_curp          IN  VARCHAR2,
  p_tipo_servicio IN  NUMBER,
  p_costo         IN  NUMBER,
  p_monto_pagado  IN  NUMBER,
  p_notas         IN  VARCHAR2,
  p_referencia_id IN  NUMBER,
  p_ref_tipo      IN  VARCHAR2,
  p_id_articulo   IN  NUMBER,
  p_cantidad      IN  NUMBER,
  p_id_servicio   OUT NUMBER
) AS
  v_stock_actual   NUMBER;
  v_stock_nuevo    NUMBER;
  v_maneja         CHAR(1);
BEGIN
  -- Trigger SEQ_SERVICIOS asigna ID_SERVICIO
  INSERT INTO SERVICIOS (
    CURP, ID_TIPO_SERVICIO, FECHA, COSTO, MONTO_PAGADO,
    NOTAS, REFERENCIA_ID, REFERENCIA_TIPO
  ) VALUES (
    p_curp, p_tipo_servicio, SYSDATE, p_costo, p_monto_pagado,
    p_notas, p_referencia_id, p_ref_tipo
  )
  RETURNING ID_SERVICIO INTO p_id_servicio;

  IF p_id_articulo IS NOT NULL AND p_cantidad IS NOT NULL THEN
    SELECT INVENTARIO_ACTUAL, MANEJA_INVENTARIO
    INTO v_stock_actual, v_maneja
    FROM ARTICULOS
    WHERE ID_ARTICULO = p_id_articulo
    FOR UPDATE;

    IF v_maneja = 'S' THEN
      IF v_stock_actual < p_cantidad THEN
        RAISE_APPLICATION_ERROR(-20001,
          'Stock insuficiente para articulo ' || p_id_articulo);
      END IF;

      v_stock_nuevo := v_stock_actual - p_cantidad;

      UPDATE ARTICULOS SET INVENTARIO_ACTUAL = v_stock_nuevo
      WHERE ID_ARTICULO = p_id_articulo;

      INSERT INTO SERVICIO_ARTICULOS (ID_SERVICIO, ID_ARTICULO, CANTIDAD)
      VALUES (p_id_servicio, p_id_articulo, p_cantidad);

      INSERT INTO MOVIMIENTOS_INVENTARIO
        (ID_ARTICULO, TIPO_MOVIMIENTO, CANTIDAD, FECHA, MOTIVO, STOCK_RESULTANTE)
      VALUES
        (p_id_articulo, 'SALIDA', p_cantidad, SYSDATE,
         'Servicio ID: ' || p_id_servicio, v_stock_nuevo);
    END IF;
  END IF;
  -- NO COMMIT
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END SP_REGISTRAR_SERVICIO;
/
```

- [ ] **Step 2: Verify the file exists**

```bash
ls -la scripts/stored-procedures.sql
```

Expected: file exists, ~180 lines.

- [ ] **Step 3: Execute in Oracle**

In SQL Developer: File → Open → `scripts/stored-procedures.sql` → Run Script (F5)

Or via sqlplus:
```bash
sqlplus $DB_USER/$DB_PASSWORD@$DB_CONNECTION_STRING @scripts/stored-procedures.sql
```

- [ ] **Step 4: Verify SPs were created in Oracle**

Run in SQL Developer or sqlplus:
```sql
SELECT OBJECT_NAME, STATUS FROM USER_OBJECTS
WHERE OBJECT_TYPE = 'PROCEDURE'
ORDER BY OBJECT_NAME;
```

Expected output:
```
OBJECT_NAME                            STATUS
-------------------------------------- -------
SP_REGISTRAR_MEMBRESIA                 VALID
SP_REGISTRAR_MOVIMIENTO_INVENTARIO     VALID
SP_REGISTRAR_SERVICIO                  VALID
```

If STATUS = INVALID: run `SHOW ERRORS PROCEDURE SP_<name>;` to see compilation errors.

- [ ] **Step 5: Commit**

```bash
git add scripts/stored-procedures.sql
git commit -m "feat: add Oracle stored procedures for inventory, membership, and service registration"
```

---

## Task 2: Update `inventario.model.js` to call SP

**Files:**
- Modify: `src/models/inventario.model.js`
- Modify: `src/tests/inventario.test.js`

The current `applyMovimientoConConexion` does 3 SQL calls (SELECT FOR UPDATE, INSERT, UPDATE).
After this task it does 1 SP call. The `createMovimientoConTransaccion` wrapper is unchanged.

- [ ] **Step 1: Write the failing test first**

In `src/tests/inventario.test.js`, find the `"POST /api/v1/movimientos"` describe block.
Replace the first two tests (ENTRADA and SALIDA success) with:

```js
test("registra ENTRADA exitosamente via SP (201)", async () => {
  // SP call returns stock resultante via OUT bind
  mockExecute.mockResolvedValueOnce({ outBinds: { stock_out: 15 } });

  const res = await request(app)
    .post("/api/v1/movimientos")
    .set("Authorization", `Bearer ${tokenAdmin}`)
    .send(movimientoBase); // idArticulo: 101, tipo: ENTRADA, cantidad: 5

  expect(res.status).toBe(201);
  expect(res.body.message).toMatch(/registrado/i);
  expect(res.body.data.stockActual).toBe(15);
  expect(mockCommit).toHaveBeenCalled();
});

test("registra SALIDA exitosamente via SP (201)", async () => {
  mockExecute.mockResolvedValueOnce({ outBinds: { stock_out: 17 } });

  const res = await request(app)
    .post("/api/v1/movimientos")
    .set("Authorization", `Bearer ${tokenAdmin}`)
    .send({ ...movimientoBase, tipo: "SALIDA", cantidad: 3 });

  expect(res.status).toBe(201);
  expect(res.body.data.stockActual).toBe(17);
});

test("devuelve 422 si stock insuficiente para SALIDA (via SP ORA-20002)", async () => {
  const oraErr = Object.assign(
    new Error("ORA-20002: Stock insuficiente para SALIDA"),
    { errorNum: 20002 }
  );
  mockExecute.mockRejectedValueOnce(oraErr);

  const res = await request(app)
    .post("/api/v1/movimientos")
    .set("Authorization", `Bearer ${tokenAdmin}`)
    .send({ ...movimientoBase, tipo: "SALIDA", cantidad: 10 });

  expect(res.status).toBe(422);
  expect(mockRollback).toHaveBeenCalled();
});

test("devuelve 404 si el artículo no existe (via SP ORA-20006)", async () => {
  const oraErr = Object.assign(
    new Error("ORA-20006: Articulo no encontrado: 101"),
    { errorNum: 20006 }
  );
  mockExecute.mockRejectedValueOnce(oraErr);

  const res = await request(app)
    .post("/api/v1/movimientos")
    .set("Authorization", `Bearer ${tokenAdmin}`)
    .send(movimientoBase);

  expect(res.status).toBe(404);
  expect(mockRollback).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest src/tests/inventario.test.js --no-coverage 2>&1 | tail -20
```

Expected: tests fail because the model still uses the old inline SQL.

- [ ] **Step 3: Rewrite `inventario.model.js`**

Replace the entire file content with:

```js
import oracledb from "oracledb";
import { getConnection } from "../config/db.js";
import { HttpError } from "../utils/httpErrors.js";

/**
 * Registra un movimiento de inventario usando SP_REGISTRAR_MOVIMIENTO_INVENTARIO.
 * Recibe una conexión existente — el caller hace commit/rollback.
 */
export async function applyMovimientoConConexion(conn, data) {
  let stockResultante;
  try {
    const result = await conn.execute(
      `BEGIN
         SP_REGISTRAR_MOVIMIENTO_INVENTARIO(
           :art, :tipo, :cant, :motivo, :stock_out
         );
       END;`,
      {
        art:      data.idArticulo,
        tipo:     data.tipo,
        cant:     data.cantidad,
        motivo:   data.motivo ?? null,
        stock_out: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      }
    );
    stockResultante = result.outBinds.stock_out;
  } catch (err) {
    if (err.errorNum === 20002 || err.errorNum === 20001) {
      throw new HttpError(422, "Stock insuficiente", "INSUFFICIENT_STOCK", {});
    }
    if (err.errorNum === 20006) {
      throw new HttpError(404, "Producto no encontrado", "PRODUCT_NOT_FOUND");
    }
    if (err.errorNum === 20005) {
      throw new HttpError(400, "Tipo de movimiento inválido", "INVALID_MOVIMIENTO_TIPO");
    }
    throw err;
  }

  return {
    idProducto:     data.idArticulo,
    tipo:           data.tipo,
    cantidad:       data.cantidad,
    fecha:          new Date().toISOString(),
    stockResultante,
    stockActual:    stockResultante,
  };
}

/**
 * Versión standalone: abre su propia conexión, hace commit/rollback.
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

export async function findInventarioActual() {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT ID_ARTICULO, DESCRIPCION, UNIDAD,
              CUOTA_RECUPERACION, INVENTARIO_ACTUAL
       FROM ARTICULOS
       ORDER BY DESCRIPCION`
    );
    return result?.rows ?? [];
  } finally {
    await conn.close();
  }
}

export async function findMovimientos() {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT M.ID_MOVIMIENTO,
              M.ID_ARTICULO,
              A.DESCRIPCION,
              M.TIPO_MOVIMIENTO,
              M.CANTIDAD,
              M.MOTIVO,
              M.FECHA,
              M.STOCK_RESULTANTE
       FROM MOVIMIENTOS_INVENTARIO M
        JOIN ARTICULOS A ON A.ID_ARTICULO = M.ID_ARTICULO
        ORDER BY M.FECHA DESC, M.ID_MOVIMIENTO DESC`
    );
    return result?.rows ?? [];
  } finally {
    await conn.close();
  }
}

export async function countMovimientosByArticulo(idArticulo) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT COUNT(*) AS TOTAL
       FROM MOVIMIENTOS_INVENTARIO
        WHERE ID_ARTICULO = :idArticulo`,
      { idArticulo }
    );
    return Number(result.rows[0].TOTAL || 0);
  } finally {
    await conn.close();
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest src/tests/inventario.test.js --no-coverage 2>&1 | tail -30
```

Expected: all inventario tests PASS.

- [ ] **Step 5: Run full suite to catch regressions**

```bash
npx jest --no-coverage 2>&1 | tail -20
```

Expected: same pass/fail as before this task.

- [ ] **Step 6: Commit**

```bash
git add src/models/inventario.model.js src/tests/inventario.test.js
git commit -m "feat: replace inventario inline SQL with SP_REGISTRAR_MOVIMIENTO_INVENTARIO"
```

---

## Task 3: Update `membresias.model.js` to call SP

**Files:**
- Modify: `src/models/membresias.model.js`

The `membresias.service.test.js` mocks at the model function level (`mockCreate`), not at the
`conn.execute` level — no test changes needed here.

- [ ] **Step 1: Add import and replace the `create` function**

At the top of `src/models/membresias.model.js`, add:

```js
import oracledb from "oracledb";
import { HttpError } from "../utils/httpErrors.js";
```

Then replace the entire `create` function (lines 150–195) with:

```js
export async function create({
  curp,
  numeroCredencial,
  fechaEmision,
  fechaVigenciaInicio,
  fechaVigenciaFin,
  fechaUltimoPago,
  observaciones,
}) {
  const toDate = (v) => {
    if (!v) return null;
    return v instanceof Date ? v : new Date(v);
  };

  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `BEGIN
         SP_REGISTRAR_MEMBRESIA(
           :curp, :num, :ini, :fin, :pago,
           :emision, :obs, :id_out
         );
       END;`,
      {
        curp:    curp,
        num:     numeroCredencial,
        ini:     { val: toDate(fechaVigenciaInicio), type: oracledb.DB_TYPE_DATE },
        fin:     { val: toDate(fechaVigenciaFin),    type: oracledb.DB_TYPE_DATE },
        pago:    { val: toDate(fechaUltimoPago),     type: oracledb.DB_TYPE_DATE },
        emision: { val: toDate(fechaEmision),        type: oracledb.DB_TYPE_DATE },
        obs:     observaciones ?? null,
        id_out:  { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      }
    );
    await conn.commit();
    return result;   // backward-compat: callers don't use the return value
  } catch (err) {
    await conn.rollback();
    if (err.errorNum === 20003) {
      throw new HttpError(403, "Beneficiario en Baja", "BENEFICIARIO_BAJA");
    }
    if (err.errorNum === 20004) {
      throw new HttpError(404, "Beneficiario no encontrado", "NOT_FOUND");
    }
    throw err;
  } finally {
    await conn.close();
  }
}
```

- [ ] **Step 2: Run the membresias tests**

```bash
npx jest src/tests/membresias.service.test.js --no-coverage 2>&1 | tail -20
```

Expected: all tests PASS (they mock `mockCreate` at function level, so they don't call `conn.execute`).

- [ ] **Step 3: Run full suite**

```bash
npx jest --no-coverage 2>&1 | tail -20
```

Expected: no regressions.

- [ ] **Step 4: Commit**

```bash
git add src/models/membresias.model.js
git commit -m "feat: replace membresias.create inline SQL with SP_REGISTRAR_MEMBRESIA"
```

---

## Task 4: Fix race condition in `servicios.model.js`

**Files:**
- Modify: `src/models/servicios.model.js`

`createWithInventarioTransaction` (line 156) uses `NVL(MAX(ID_SERVICIO), 0) + 1`
to generate the service ID — a race condition: two concurrent requests can get the
same ID. The `create` function (line 110) already uses `SEQ_SERVICIOS.NEXTVAL`
correctly. This task aligns `createWithInventarioTransaction` with the same pattern.

Note: after Task 2, `applyMovimientoConConexion` already calls the SP internally,
so the inventory part of this transaction already goes through a stored procedure.

- [ ] **Step 1: Replace the ID generation inside `createWithInventarioTransaction`**

In `src/models/servicios.model.js`, find `createWithInventarioTransaction` (line 156).

Replace only the ID generation block (lines 159–167):

```js
// BEFORE (race condition):
const idResult = await conn.execute(
  `SELECT NVL(MAX(ID_SERVICIO), 0) + 1 AS NEXT_ID
   FROM SERVICIOS`
);
const idServicio = Number(idResult.rows?.[0]?.NEXT_ID ?? 0);
if (!Number.isInteger(idServicio) || idServicio <= 0) {
  throw new Error("No se pudo generar ID_SERVICIO");
}
```

```js
// AFTER (atomic sequence):
const idResult = await conn.execute(
  `SELECT SEQ_SERVICIOS.NEXTVAL AS NEXT_ID FROM DUAL`
);
const idServicio = Number(idResult.rows?.[0]?.NEXT_ID ?? 0);
if (!Number.isInteger(idServicio) || idServicio <= 0) {
  throw new Error("No se pudo generar ID_SERVICIO");
}
```

Only these 3 lines change. The rest of the function stays identical.

- [ ] **Step 2: Run servicios tests**

```bash
npx jest src/tests/servicios.controller.test.js --no-coverage 2>&1 | tail -20
```

Expected: all tests PASS. (The mock already has a `mockResolvedValueOnce` for the sequence call; if the test used `NVL(MAX(...))` specifically, update that mock to return `{ rows: [{ NEXT_ID: 1 }] }` — same shape, different SQL string which the mock doesn't inspect.)

- [ ] **Step 3: Run full suite**

```bash
npx jest --no-coverage 2>&1 | tail -20
```

Expected: no regressions.

- [ ] **Step 4: Commit**

```bash
git add src/models/servicios.model.js
git commit -m "fix: replace NVL(MAX(ID_SERVICIO)) with SEQ_SERVICIOS.NEXTVAL in createWithInventarioTransaction"
```

---

## Task 5: Final verification

- [ ] **Step 1: Run full test suite**

```bash
npx jest --no-coverage 2>&1 | tail -30
```

Expected: same or better pass rate than before. No new failures.

- [ ] **Step 2: Verify SPs are being called (quick smoke test)**

If you have the backend running against the real Oracle DB:

```bash
# Start backend
node src/server.js &

# Test SP_REGISTRAR_MOVIMIENTO_INVENTARIO via API
curl -X POST http://localhost:3000/api/v1/movimientos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_token>" \
  -d '{"idArticulo": 1, "tipo": "ENTRADA", "cantidad": 5, "motivo": "Test SP"}'

# Expected: 201 with stockActual updated
```

Then verify in Oracle:
```sql
SELECT TOP 1 * FROM MOVIMIENTOS_INVENTARIO ORDER BY ID_MOVIMIENTO DESC;
```

- [ ] **Step 3: Verify all 3 SPs are documented for the academic deliverable**

```bash
# List all stored procedures in the project
grep -n "SP_" scripts/stored-procedures.sql | grep "CREATE OR REPLACE"
```

Expected:
```
1:CREATE OR REPLACE PROCEDURE SP_REGISTRAR_MOVIMIENTO_INVENTARIO(
...
CREATE OR REPLACE PROCEDURE SP_REGISTRAR_MEMBRESIA(
...
CREATE OR REPLACE PROCEDURE SP_REGISTRAR_SERVICIO(
```

- [ ] **Step 4: Final commit if any cleanup needed**

```bash
git add -p   # stage only intentional changes
git commit -m "chore: stored procedures implementation complete"
```

---

## Quick Reference: Error Code Map

| Oracle errorNum | SP | Meaning | HTTP |
|---|---|---|---|
| 20001 | SP_REGISTRAR_SERVICIO | Stock insuficiente (servicio) | 422 |
| 20002 | SP_REGISTRAR_MOVIMIENTO_INVENTARIO | Stock insuficiente (movimiento) | 422 |
| 20003 | SP_REGISTRAR_MEMBRESIA | Beneficiario en Baja | 403 |
| 20004 | SP_REGISTRAR_MEMBRESIA | Beneficiario no encontrado | 404 |
| 20005 | SP_REGISTRAR_MOVIMIENTO_INVENTARIO | TIPO_MOVIMIENTO inválido | 400 |
| 20006 | SP_REGISTRAR_MOVIMIENTO_INVENTARIO | Artículo no encontrado | 404 |

## Mock Pattern Reference (for tests)

```js
// SP success → outBinds
mockExecute.mockResolvedValueOnce({ outBinds: { stock_out: 15 } });
mockExecute.mockResolvedValueOnce({ outBinds: { id_out: 42 } });

// SP failure → Oracle error with errorNum
const oraErr = Object.assign(new Error("ORA-20002"), { errorNum: 20002 });
mockExecute.mockRejectedValueOnce(oraErr);
```
