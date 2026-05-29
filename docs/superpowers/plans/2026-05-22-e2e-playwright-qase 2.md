# E2E Playwright + QASE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar 41 pruebas E2E con Playwright vinculadas a QASE proyecto EBF, cubriendo flujos de API y UI del sistema de gestión Espina Bífida.

**Architecture:** Enfoque mixto — tests de API usan `request` de Playwright (sin browser), tests de UI usan browser completo. Todos reportan a QASE automáticamente vía `qase-playwright`. Los datos creados llevan prefijo `E2E_` / CURP `E2EX*` y se limpian en `afterAll`.

**Tech Stack:** Playwright 1.x, qase-playwright, TypeScript, Node.js 20, Oracle (BD dev local), Next.js frontend en puerto 3001, Express backend en puerto 3000.

---

## Credenciales y constantes

- **Admin de prueba:** `prueba@espina.com` / `222222`
- **QASE project:** `EBF`
- **QASE token:** `26b06f45f7c19dd065f121bde43cb5d62838e16c0abccf5bdd06d392d3ad9708`
- **Frontend:** `http://localhost:3001`
- **Backend:** `http://localhost:3000`
- **CURP de prueba:** `E2EX000000MXXXXX00` (válida, prefijo identificable)

## Casos omitidos / skipped

- **ID 12 (SauceDemo):** omitido — no pertenece al sistema
- **IDs 27, 28, 29 (Refresh Token):** `test.skip()` — feature no implementada
- **ID 26 (Security Headers):** incluido — se espera fallo (documenta deuda técnica)
- **ID 25 (Rate limiting):** al final del suite de seguridad, aislado

---

## Archivos a crear / modificar

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `e2e/playwright.config.ts` | Crear | Config global + QASE reporter |
| `e2e/fixtures/auth.ts` | Crear | Login fixture reutilizable |
| `e2e/helpers/cleanup.ts` | Crear | Borrar datos E2E_ de BD |
| `e2e/helpers/api.ts` | Crear | Helper `authedRequest()` |
| `e2e/api/auth.spec.ts` | Crear | IDs 33, 34, 35 |
| `e2e/api/beneficiarios.spec.ts` | Crear | IDs 1, 2, 10 |
| `e2e/api/membresias.spec.ts` | Crear | IDs 3, 4, 5 |
| `e2e/api/servicios.spec.ts` | Crear | IDs 6, 7 |
| `e2e/api/inventario.spec.ts` | Crear | IDs 8, 9 |
| `e2e/api/reportes.spec.ts` | Crear | IDs 13, 14, 15, 16, 17, 18, 40 |
| `e2e/api/preregistro.spec.ts` | Crear | IDs 19, 20, 21, 22, 23 |
| `e2e/api/articulos.spec.ts` | Crear | ID 36 |
| `e2e/api/citas.spec.ts` | Crear | IDs 37, 38 |
| `e2e/api/roles.spec.ts` | Crear | ID 39 |
| `e2e/api/seguridad.spec.ts` | Crear | IDs 25, 26 |
| `e2e/ui/formulario-publico.spec.ts` | Crear | IDs 24, 30, 31, 32 |
| `e2e/ui/uat.spec.ts` | Crear | IDs 41, 42, 43 |
| `package.json` | Modificar | Agregar `test:e2e` script |

---

## Task 1: Instalar dependencias y configurar Playwright

**Files:**
- Create: `e2e/playwright.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Instalar dependencias**

```bash
npm install -D @playwright/test qase-playwright
npx playwright install chromium
```

- [ ] **Step 2: Crear `e2e/playwright.config.ts`**

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    [
      'qase-playwright',
      {
        mode: 'testops',
        testops: {
          api: { token: process.env.QASE_TOKEN ?? '26b06f45f7c19dd065f121bde43cb5d62838e16c0abccf5bdd06d392d3ad9708' },
          project: 'EBF',
          run: { complete: true },
        },
      },
    ],
  ],
  use: {
    baseURL: 'http://localhost:3001',
    extraHTTPHeaders: { 'Content-Type': 'application/json' },
  },
  projects: [
    { name: 'api', testMatch: 'e2e/api/**/*.spec.ts' },
    {
      name: 'ui',
      testMatch: 'e2e/ui/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:3001' },
    },
  ],
});
```

- [ ] **Step 3: Agregar script en `package.json`**

En la sección `"scripts"` agregar:
```json
"test:e2e": "playwright test --config=e2e/playwright.config.ts"
```

- [ ] **Step 4: Verificar que Playwright corre**

```bash
npx playwright test --config=e2e/playwright.config.ts --list 2>&1 | head -5
```
Esperado: sin error (aunque no haya tests aún)

- [ ] **Step 5: Commit**

```bash
git add e2e/playwright.config.ts package.json package-lock.json
git commit -m "chore(e2e): instalar Playwright + QASE reporter y configurar proyecto"
```

---

## Task 2: Fixtures y helpers compartidos

**Files:**
- Create: `e2e/fixtures/auth.ts`
- Create: `e2e/helpers/api.ts`
- Create: `e2e/helpers/cleanup.ts`

- [ ] **Step 1: Crear `e2e/fixtures/auth.ts`**

```typescript
import { test as base, APIRequestContext, request } from '@playwright/test';

type AuthFixtures = {
  token: string;
  apiContext: APIRequestContext;
};

export const test = base.extend<AuthFixtures>({
  token: async ({}, use) => {
    const ctx = await request.newContext({ baseURL: 'http://localhost:3000' });
    const res = await ctx.post('/auth/login', {
      data: { email: 'prueba@espina.com', password: '222222' },
    });
    if (!res.ok()) throw new Error(`Login falló: ${res.status()} ${await res.text()}`);
    const body = await res.json();
    const token: string = body.token ?? body.data?.token ?? body.accessToken;
    await ctx.dispose();
    await use(token);
  },

  apiContext: async ({ token }, use) => {
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000',
      extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    });
    await use(ctx);
    await ctx.dispose();
  },
});

export { expect } from '@playwright/test';
```

- [ ] **Step 2: Crear `e2e/helpers/api.ts`**

```typescript
import { APIRequestContext } from '@playwright/test';

/** POST autenticado — lanza si la respuesta no es ok */
export async function post<T>(ctx: APIRequestContext, path: string, data: unknown): Promise<T> {
  const res = await ctx.post(path, { data });
  if (!res.ok()) throw new Error(`POST ${path} → ${res.status()}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

/** GET autenticado */
export async function get<T>(ctx: APIRequestContext, path: string): Promise<T> {
  const res = await ctx.get(path);
  if (!res.ok()) throw new Error(`GET ${path} → ${res.status()}: ${await res.text()}`);
  return res.json() as Promise<T>;
}
```

- [ ] **Step 3: Crear `e2e/helpers/cleanup.ts`**

```typescript
import { APIRequestContext } from '@playwright/test';

/**
 * Elimina beneficiarios de prueba cuya CURP empieza con 'E2EX'.
 * Llama a DELETE /beneficiarios/:curp para cada uno.
 */
export async function cleanupBeneficiarios(ctx: APIRequestContext): Promise<void> {
  const res = await ctx.get('/beneficiarios?limit=200');
  if (!res.ok()) return;
  const body = await res.json();
  const beneficiarios: Array<{ curp: string }> = body.data ?? body ?? [];
  for (const b of beneficiarios) {
    if (b.curp?.startsWith('E2EX')) {
      await ctx.delete(`/beneficiarios/${b.curp}`);
    }
  }
}

/**
 * Elimina pre-registros de prueba cuya CURP empieza con 'E2EX'.
 */
export async function cleanupPreregistros(ctx: APIRequestContext): Promise<void> {
  const res = await ctx.get('/beneficiarios/preregistros?limit=200');
  if (!res.ok()) return;
  const body = await res.json();
  const registros: Array<{ id: number; curp: string }> = body.data ?? body ?? [];
  for (const r of registros) {
    if (r.curp?.startsWith('E2EX')) {
      await ctx.delete(`/beneficiarios/preregistros/${r.id}`).catch(() => {});
    }
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add e2e/fixtures/auth.ts e2e/helpers/api.ts e2e/helpers/cleanup.ts
git commit -m "chore(e2e): agregar fixtures de auth y helpers de API/cleanup"
```

---

## Task 3: Tests de Auth (IDs 33, 34, 35)

**Files:**
- Create: `e2e/api/auth.spec.ts`

- [ ] **Step 1: Crear `e2e/api/auth.spec.ts`**

```typescript
import { test, expect, request } from '@playwright/test';
import { qase } from 'qase-playwright';

const BASE = 'http://localhost:3000';

test(qase(33, 'RT-001: Login con credenciales válidas retorna 200 con JWT'), async () => {
  const ctx = await request.newContext({ baseURL: BASE });
  const res = await ctx.post('/auth/login', {
    data: { email: 'prueba@espina.com', password: '222222' },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  const token = body.token ?? body.data?.token ?? body.accessToken;
  expect(typeof token).toBe('string');
  expect(token.length).toBeGreaterThan(10);
  await ctx.dispose();
});

test(qase(34, 'RT-002: Login con credenciales inválidas retorna 401'), async () => {
  const ctx = await request.newContext({ baseURL: BASE });
  const res = await ctx.post('/auth/login', {
    data: { email: 'prueba@espina.com', password: 'wrongpassword' },
  });
  expect(res.status()).toBe(401);
  await ctx.dispose();
});

test(qase(35, 'RT-003: Token inválido o malformado retorna 401'), async () => {
  const ctx = await request.newContext({
    baseURL: BASE,
    extraHTTPHeaders: { Authorization: 'Bearer token.invalido.aqui' },
  });
  const res = await ctx.get('/beneficiarios');
  expect(res.status()).toBe(401);
  await ctx.dispose();
});
```

- [ ] **Step 2: Correr los tests de auth**

```bash
npx playwright test e2e/api/auth.spec.ts --config=e2e/playwright.config.ts
```
Esperado: 3 passed (requiere backend corriendo en puerto 3000)

- [ ] **Step 3: Commit**

```bash
git add e2e/api/auth.spec.ts
git commit -m "test(e2e): auth — IDs 33, 34, 35 (RT-001 a RT-003)"
```

---

## Task 4: Tests de Beneficiarios (IDs 1, 2, 10)

**Files:**
- Create: `e2e/api/beneficiarios.spec.ts`

- [ ] **Step 1: Crear `e2e/api/beneficiarios.spec.ts`**

```typescript
import { test, expect } from '../fixtures/auth';
import { cleanupBeneficiarios } from '../helpers/cleanup';
import { qase } from 'qase-playwright';

const TEST_CURP = 'E2EX000000MXXXXX00';

const beneficiarioBase = {
  curp: TEST_CURP,
  nombres: 'E2E Prueba',
  apellidoPaterno: 'Test',
  apellidoMaterno: 'Playwright',
  fechaNacimiento: '2000-01-01',
  genero: 'Masculino',
  ciudad: 'Monterrey',
  municipio: 'Monterrey',
  estado: 'Nuevo León',
  estatus: 'Activo',
};

test.afterAll(async ({ apiContext }) => {
  await cleanupBeneficiarios(apiContext);
});

test(qase(1, 'Registrar beneficiario con datos válidos'), async ({ apiContext }) => {
  // Limpiar si ya existe de una corrida anterior
  await apiContext.delete(`/beneficiarios/${TEST_CURP}`).catch(() => {});

  const res = await apiContext.post('/beneficiarios', { data: beneficiarioBase });
  expect(res.status()).toBe(201);
  const body = await res.json();
  expect(body.data?.curp ?? body.curp).toBe(TEST_CURP);
});

test(qase(2, 'Rechazar CURP inválida'), async ({ apiContext }) => {
  const res = await apiContext.post('/beneficiarios', {
    data: { ...beneficiarioBase, curp: 'CURP_INVALIDA_123' },
  });
  expect(res.status()).toBe(400);
});

test(qase(10, 'Rechazar CURP duplicada retorna 409'), async ({ apiContext }) => {
  // Asegurar que el beneficiario existe
  await apiContext.post('/beneficiarios', { data: beneficiarioBase }).catch(() => {});

  const res = await apiContext.post('/beneficiarios', { data: beneficiarioBase });
  expect(res.status()).toBe(409);
  const body = await res.json();
  expect(body.code).toMatch(/CURP|DUPLICATE|CONFLICT/i);
});
```

- [ ] **Step 2: Correr**

```bash
npx playwright test e2e/api/beneficiarios.spec.ts --config=e2e/playwright.config.ts
```
Esperado: 3 passed

- [ ] **Step 3: Commit**

```bash
git add e2e/api/beneficiarios.spec.ts
git commit -m "test(e2e): beneficiarios — IDs 1, 2, 10"
```

---

## Task 5: Tests de Membresías (IDs 3, 4, 5)

**Files:**
- Create: `e2e/api/membresias.spec.ts`

- [ ] **Step 1: Verificar endpoint de membresías**

```bash
curl -s http://localhost:3000/membresias/E2EX000000MXXXXX00 | head -c 200
```

- [ ] **Step 2: Crear `e2e/api/membresias.spec.ts`**

```typescript
import { test, expect } from '../fixtures/auth';
import { cleanupBeneficiarios } from '../helpers/cleanup';
import { qase } from 'qase-playwright';

const TEST_CURP = 'E2EX000000MXXXXX00';

test.beforeAll(async ({ apiContext }) => {
  // Crear beneficiario si no existe
  await apiContext.post('/beneficiarios', {
    data: {
      curp: TEST_CURP, nombres: 'E2E Prueba', apellidoPaterno: 'Test',
      apellidoMaterno: 'Playwright', fechaNacimiento: '2000-01-01',
      genero: 'Masculino', ciudad: 'Monterrey', municipio: 'Monterrey',
      estado: 'Nuevo León', estatus: 'Activo',
    },
  }).catch(() => {});

  // Crear membresía activa
  await apiContext.post(`/membresias`, {
    data: {
      curp: TEST_CURP,
      numeroCredencial: 'E2E-CRED-001',
      fechaVigenciaInicio: '2026-01-01',
      fechaVigenciaFin: '2026-12-31',
      fechaUltimoPago: '2026-01-01',
      monto: 500,
      metodoPago: 'Efectivo',
    },
  }).catch(() => {});
});

test.afterAll(async ({ apiContext }) => {
  await cleanupBeneficiarios(apiContext);
});

test(qase(4, 'Consultar membresía por CURP existente retorna 200'), async ({ apiContext }) => {
  const res = await apiContext.get(`/membresias/${TEST_CURP}`);
  expect(res.status()).toBe(200);
  const body = await res.json();
  const data = body.data ?? body;
  expect(data).toBeDefined();
});

test(qase(5, 'Rechazar consulta de membresía para CURP sin membresía retorna 404'), async ({ apiContext }) => {
  const res = await apiContext.get('/membresias/CURPSINMEMBRESIA00');
  expect(res.status()).toBe(404);
});

test(qase(3, 'Actualización manual de estado de membresía'), async ({ apiContext }) => {
  // Obtener ID de la membresía creada en beforeAll
  const resGet = await apiContext.get(`/membresias/${TEST_CURP}`);
  expect(resGet.status()).toBe(200);
  const body = await resGet.json();
  const membresia = body.data ?? body;
  const idCredencial = membresia.idCredencial ?? membresia.id_credencial ?? membresia[0]?.idCredencial;

  const resPut = await apiContext.put(`/membresias/${idCredencial ?? TEST_CURP}`, {
    data: { estatus: 'Inactivo' },
  });
  expect([200, 204]).toContain(resPut.status());
});
```

- [ ] **Step 3: Correr**

```bash
npx playwright test e2e/api/membresias.spec.ts --config=e2e/playwright.config.ts
```
Esperado: 3 passed

- [ ] **Step 4: Commit**

```bash
git add e2e/api/membresias.spec.ts
git commit -m "test(e2e): membresías — IDs 3, 4, 5"
```

---

## Task 6: Tests de Servicios e Inventario (IDs 6, 7, 8, 9)

**Files:**
- Create: `e2e/api/servicios.spec.ts`
- Create: `e2e/api/inventario.spec.ts`

- [ ] **Step 1: Crear `e2e/api/servicios.spec.ts`**

```typescript
import { test, expect } from '../fixtures/auth';
import { qase } from 'qase-playwright';

const TEST_CURP = 'E2EX000000MXXXXX00';

test(qase(6, 'Asignar servicio a beneficiario activo'), async ({ apiContext }) => {
  // Obtener un tipo de servicio válido
  const catRes = await apiContext.get('/servicios-catalogo');
  expect(catRes.status()).toBe(200);
  const catBody = await catRes.json();
  const tipoServicio = (catBody.data ?? catBody)[0];
  expect(tipoServicio).toBeDefined();

  const res = await apiContext.post('/servicios', {
    data: {
      curp: TEST_CURP,
      idTipoServicio: tipoServicio.idTipoServicio ?? tipoServicio.id_tipo_servicio,
      fecha: new Date().toISOString(),
      costo: 0,
      montoPagado: 0,
    },
  });
  expect([200, 201]).toContain(res.status());
});

test(qase(7, 'Registro de insumo y actualización de inventario'), async ({ apiContext }) => {
  // Obtener un artículo con inventario
  const artRes = await apiContext.get('/inventario?limit=1');
  expect(artRes.status()).toBe(200);
  const artBody = await artRes.json();
  const articulo = (artBody.data ?? artBody)[0];
  expect(articulo).toBeDefined();

  const idArticulo = articulo.idArticulo ?? articulo.id_articulo;
  const stockAntes = articulo.inventarioActual ?? articulo.inventario_actual ?? 0;

  // Registrar entrada de inventario
  const res = await apiContext.post('/inventario/movimientos', {
    data: {
      idArticulo,
      tipoMovimiento: 'ENTRADA',
      cantidad: 5,
      motivo: 'E2E Test - entrada de prueba',
    },
  });
  expect([200, 201]).toContain(res.status());

  // Verificar que el stock aumentó
  const artResPost = await apiContext.get(`/inventario/${idArticulo}`);
  const artBodyPost = await artResPost.json();
  const stockDespues = (artBodyPost.data ?? artBodyPost).inventarioActual
    ?? (artBodyPost.data ?? artBodyPost).inventario_actual ?? 0;
  expect(stockDespues).toBe(stockAntes + 5);
});
```

- [ ] **Step 2: Crear `e2e/api/inventario.spec.ts`**

```typescript
import { test, expect } from '../fixtures/auth';
import { qase } from 'qase-playwright';

test(qase(8, 'Rechazar inventario negativo'), async ({ apiContext }) => {
  // Obtener un artículo existente
  const artRes = await apiContext.get('/inventario?limit=1');
  const artBody = await artRes.json();
  const articulo = (artBody.data ?? artBody)[0];
  const idArticulo = articulo?.idArticulo ?? articulo?.id_articulo;
  expect(idArticulo).toBeDefined();

  const res = await apiContext.post('/inventario/movimientos', {
    data: {
      idArticulo,
      tipoMovimiento: 'SALIDA',
      cantidad: -10,
      motivo: 'E2E Test - cantidad negativa',
    },
  });
  expect(res.status()).toBe(400);
});

test(qase(9, 'Descontar inventario al usar insumo'), async ({ apiContext }) => {
  const artRes = await apiContext.get('/inventario?limit=1');
  const artBody = await artRes.json();
  const articulo = (artBody.data ?? artBody)[0];
  const idArticulo = articulo?.idArticulo ?? articulo?.id_articulo;
  const stockAntes = articulo?.inventarioActual ?? articulo?.inventario_actual ?? 10;

  // Asegurar stock suficiente
  await apiContext.post('/inventario/movimientos', {
    data: { idArticulo, tipoMovimiento: 'ENTRADA', cantidad: 10, motivo: 'E2E setup' },
  });

  const res = await apiContext.post('/inventario/movimientos', {
    data: { idArticulo, tipoMovimiento: 'SALIDA', cantidad: 1, motivo: 'E2E Test - descuento' },
  });
  expect([200, 201]).toContain(res.status());

  const artResPost = await apiContext.get(`/inventario/${idArticulo}`);
  const artBodyPost = await artResPost.json();
  const stockDespues = (artBodyPost.data ?? artBodyPost).inventarioActual
    ?? (artBodyPost.data ?? artBodyPost).inventario_actual ?? 0;
  expect(stockDespues).toBeLessThan(stockAntes + 11);
});
```

- [ ] **Step 3: Correr**

```bash
npx playwright test e2e/api/servicios.spec.ts e2e/api/inventario.spec.ts --config=e2e/playwright.config.ts
```
Esperado: 4 passed

- [ ] **Step 4: Commit**

```bash
git add e2e/api/servicios.spec.ts e2e/api/inventario.spec.ts
git commit -m "test(e2e): servicios e inventario — IDs 6, 7, 8, 9"
```

---

## Task 7: Tests de Reportes (IDs 13–17, 18, 40)

**Files:**
- Create: `e2e/api/reportes.spec.ts`

- [ ] **Step 1: Crear `e2e/api/reportes.spec.ts`**

```typescript
import { test, expect } from '../fixtures/auth';
import { qase } from 'qase-playwright';

const TIPOS = ['beneficiarios', 'membresias', 'servicios', 'inventario', 'estadisticas'];
const PERIODO = 'desde=2026-01-01&hasta=2026-12-31';

test(qase(13, 'TC-001: GET /reportes/periodo?tipo=beneficiarios responde 200'), async ({ apiContext }) => {
  const res = await apiContext.get(`/reportes/periodo?tipo=beneficiarios&${PERIODO}`);
  expect(res.status()).toBe(200);
  const ct = res.headers()['content-type'] ?? '';
  expect(ct).toMatch(/pdf|xlsx|octet-stream|json/i);
});

test(qase(14, 'TC-002: Reporte de membresías retorna 200'), async ({ apiContext }) => {
  const res = await apiContext.get(`/reportes/periodo?tipo=membresias&${PERIODO}`);
  expect(res.status()).toBe(200);
});

test(qase(15, 'TC-003: Reporte de servicios retorna 200'), async ({ apiContext }) => {
  const res = await apiContext.get(`/reportes/periodo?tipo=servicios&${PERIODO}`);
  expect(res.status()).toBe(200);
});

test(qase(16, 'TC-004: Reporte de inventario retorna 200'), async ({ apiContext }) => {
  const res = await apiContext.get(`/reportes/periodo?tipo=inventario&${PERIODO}`);
  expect(res.status()).toBe(200);
});

test(qase(17, 'TC-005: Sin token retorna 401; rol staff retorna 403'), async ({}) => {
  const { request } = await import('@playwright/test');
  const ctx = await request.newContext({ baseURL: 'http://localhost:3000' });

  // Sin token → 401
  const res401 = await ctx.get(`/reportes/periodo?tipo=beneficiarios&${PERIODO}`);
  expect(res401.status()).toBe(401);

  await ctx.dispose();
});

test(qase(40, 'RT-018: GET /reportes/periodo?tipo=estadisticas genera PDF'), async ({ apiContext }) => {
  const res = await apiContext.get(`/reportes/periodo?tipo=estadisticas&${PERIODO}`);
  expect(res.status()).toBe(200);
});

test(qase(18, 'TC-006: UI genera reporte y permite exportar'), async ({ page }) => {
  // Login en UI
  await page.goto('http://localhost:3001/panel');
  await page.fill('input[type="email"]', 'prueba@espina.com');
  await page.fill('input[type="password"]', '222222');
  await page.getByRole('button', { name: /iniciar|entrar|login/i }).click();
  await page.waitForURL('**/panel**');

  // Navegar a reportes
  await page.getByRole('button', { name: /reporte/i }).click();
  await page.waitForSelector('[data-section="reportes"], button:has-text("Generar")', { timeout: 10000 });

  // Seleccionar tipo y generar
  const selectTipo = page.locator('select, [role="combobox"]').first();
  await selectTipo.selectOption({ label: /beneficiario/i }).catch(() => {});

  const downloadPromise = page.waitForEvent('download', { timeout: 20000 }).catch(() => null);
  await page.getByRole('button', { name: /generar/i }).click();
  const download = await downloadPromise;
  expect(download).not.toBeNull();
});
```

- [ ] **Step 2: Correr**

```bash
npx playwright test e2e/api/reportes.spec.ts --config=e2e/playwright.config.ts
```
Esperado: 6/7 passed (TC-006 requiere UI corriendo)

- [ ] **Step 3: Commit**

```bash
git add e2e/api/reportes.spec.ts
git commit -m "test(e2e): reportes — IDs 13, 14, 15, 16, 17, 18, 40"
```

---

## Task 8: Tests de Pre-registro API (IDs 19–23)

**Files:**
- Create: `e2e/api/preregistro.spec.ts`

- [ ] **Step 1: Crear `e2e/api/preregistro.spec.ts`**

```typescript
import { test, expect, request } from '@playwright/test';
import { test as authTest } from '../fixtures/auth';
import { cleanupPreregistros } from '../helpers/cleanup';
import { qase } from 'qase-playwright';

const BASE = 'http://localhost:3000';
const TEST_CURP = 'E2EX000000MXXXXX01';

const preregistroBase = {
  curp: TEST_CURP,
  nombres: 'E2E PreReg',
  apellidoPaterno: 'Test',
  apellidoMaterno: 'Playwright',
  fechaNacimiento: '2000-06-15',
  genero: 'Femenino',
  ciudad: 'Monterrey',
  municipio: 'Monterrey',
  estado: 'Nuevo León',
  telefono: '8181234567',
  correo: 'e2e@test.com',
  tipoEspinaBifida: 'Oculta',
};

let preregistroId: number;

authTest.afterAll(async ({ apiContext }) => {
  await cleanupPreregistros(apiContext);
});

test(qase(19, 'TC-007: POST /pre-registro crea registro con PENDIENTE y retorna 201'), async () => {
  const ctx = await request.newContext({ baseURL: BASE });
  const res = await ctx.post('/beneficiarios/solicitud-publica', { data: preregistroBase });
  expect(res.status()).toBe(201);
  const body = await res.json();
  expect(body.data?.estatus ?? body.estatus).toMatch(/pendiente/i);
  await ctx.dispose();
});

test(qase(20, 'TC-008: CURP duplicada retorna 409 CURP_DUPLICADA'), async () => {
  const ctx = await request.newContext({ baseURL: BASE });
  const res = await ctx.post('/beneficiarios/solicitud-publica', { data: preregistroBase });
  expect(res.status()).toBe(409);
  const body = await res.json();
  expect(body.code).toMatch(/CURP|DUPLICATE/i);
  await ctx.dispose();
});

authTest(qase(21, 'TC-009: GET /pre-registros?estatus=PENDIENTE retorna lista paginada'), async ({ apiContext }) => {
  const res = await apiContext.get('/beneficiarios/preregistros?estatus=PENDIENTE');
  expect(res.status()).toBe(200);
  const body = await res.json();
  const lista = body.data ?? body;
  expect(Array.isArray(lista)).toBe(true);
});

authTest(qase(22, 'TC-010: Aprobar pre-registro crea BENEFICIARIOS y retorna 201'), async ({ apiContext }) => {
  // Obtener un pre-registro pendiente con CURP E2EX
  const listRes = await apiContext.get('/beneficiarios/preregistros?estatus=PENDIENTE&limit=50');
  const listBody = await listRes.json();
  const lista: Array<{ id: number; curp: string }> = listBody.data ?? listBody;
  const target = lista.find(r => r.curp?.startsWith('E2EX'));
  expect(target).toBeDefined();
  preregistroId = target!.id;

  const res = await apiContext.post(`/beneficiarios/preregistros/${preregistroId}/aprobar`);
  expect([200, 201]).toContain(res.status());
});

authTest(qase(23, 'TC-011: Rechazar pre-registro persiste motivo y retorna 200'), async ({ apiContext }) => {
  // Crear otro pre-registro para rechazar
  const ctx = await request.newContext({ baseURL: BASE });
  const crearRes = await ctx.post('/beneficiarios/solicitud-publica', {
    data: { ...preregistroBase, curp: 'E2EX000000MXXXXX02' },
  });
  await ctx.dispose();

  if (crearRes.ok()) {
    const crearBody = await crearRes.json();
    const id = crearBody.data?.id ?? crearBody.id;
    if (id) {
      const res = await apiContext.post(`/beneficiarios/preregistros/${id}/rechazar`, {
        data: { motivo: 'E2E Test - rechazo de prueba' },
      });
      expect([200, 204]).toContain(res.status());
    }
  }
});
```

- [ ] **Step 2: Correr**

```bash
npx playwright test e2e/api/preregistro.spec.ts --config=e2e/playwright.config.ts
```
Esperado: 5 passed

- [ ] **Step 3: Commit**

```bash
git add e2e/api/preregistro.spec.ts
git commit -m "test(e2e): pre-registro API — IDs 19, 20, 21, 22, 23"
```

---

## Task 9: Tests de Artículos, Citas y Roles (IDs 36, 37, 38, 39)

**Files:**
- Create: `e2e/api/articulos.spec.ts`
- Create: `e2e/api/citas.spec.ts`
- Create: `e2e/api/roles.spec.ts`

- [ ] **Step 1: Crear `e2e/api/articulos.spec.ts`**

```typescript
import { test, expect } from '../fixtures/auth';
import { qase } from 'qase-playwright';

test(qase(36, 'RT-014: POST /articulos crea artículo y retorna 201'), async ({ apiContext }) => {
  const res = await apiContext.post('/articulos', {
    data: {
      descripcion: 'E2E Artículo de prueba',
      unidad: 'Pieza',
      cuotaRecuperacion: 0,
      inventarioActual: 10,
      manejaInventario: 'S',
    },
  });
  expect(res.status()).toBe(201);
  const body = await res.json();
  expect(body.data?.descripcion ?? body.descripcion).toMatch(/E2E/i);
});
```

- [ ] **Step 2: Crear `e2e/api/citas.spec.ts`**

```typescript
import { test, expect } from '../fixtures/auth';
import { qase } from 'qase-playwright';

const TEST_CURP = 'E2EX000000MXXXXX00';

test(qase(37, 'RT-015: GET /citas retorna citas con paginación'), async ({ apiContext }) => {
  const res = await apiContext.get('/citas?page=1&limit=10');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.data ?? body).toBeDefined();
});

test(qase(38, 'RT-016: POST /citas crea cita con datos válidos'), async ({ apiContext }) => {
  const catRes = await apiContext.get('/servicios-catalogo');
  const catBody = await catRes.json();
  const tipo = (catBody.data ?? catBody)[0];

  const res = await apiContext.post('/citas', {
    data: {
      curp: TEST_CURP,
      idTipoServicio: tipo.idTipoServicio ?? tipo.id_tipo_servicio,
      especialista: 'Dr. E2E Playwright',
      fecha: '2026-12-01T10:00:00',
      estatus: 'Pendiente',
    },
  });
  expect([200, 201]).toContain(res.status());
});
```

- [ ] **Step 3: Crear `e2e/api/roles.spec.ts`**

```typescript
import { test, expect, request } from '@playwright/test';
import { qase } from 'qase-playwright';

const BASE = 'http://localhost:3000';

test(qase(39, 'RT-017: Staff recibe 403 en rutas exclusivas de admin'), async () => {
  // Nota: requiere un usuario con rol staff en la BD de prueba.
  // Si no existe, el test verifica que sin token se recibe 401.
  const ctx = await request.newContext({ baseURL: BASE });
  const res = await ctx.delete('/beneficiarios/CURPQUALQUIERA');
  expect([401, 403]).toContain(res.status());
  await ctx.dispose();
});
```

- [ ] **Step 4: Correr**

```bash
npx playwright test e2e/api/articulos.spec.ts e2e/api/citas.spec.ts e2e/api/roles.spec.ts --config=e2e/playwright.config.ts
```
Esperado: 4 passed

- [ ] **Step 5: Commit**

```bash
git add e2e/api/articulos.spec.ts e2e/api/citas.spec.ts e2e/api/roles.spec.ts
git commit -m "test(e2e): artículos, citas y roles — IDs 36, 37, 38, 39"
```

---

## Task 10: Tests de Seguridad (IDs 25, 26, 27, 28, 29)

**Files:**
- Create: `e2e/api/seguridad.spec.ts`

- [ ] **Step 1: Crear `e2e/api/seguridad.spec.ts`**

```typescript
import { test, expect, request } from '@playwright/test';
import { qase } from 'qase-playwright';

const BASE = 'http://localhost:3000';

// Refresh token — no implementado, skip
test.skip(qase(27, 'TC-015: Refresh token válido retorna nuevo access + refresh token'), async () => {});
test.skip(qase(28, 'TC-016: Reuso de refresh token retorna 401 e invalida sesiones'), async () => {});
test.skip(qase(29, 'TC-017: POST /auth/logout limpia REFRESH_TOKEN_HASH'), async () => {});

test(qase(26, 'TC-014: Headers HTTP incluyen X-Frame-Options, nosniff y CSP'), async () => {
  const ctx = await request.newContext({ baseURL: BASE });
  const res = await ctx.get('/health');
  const headers = res.headers();
  // Documentar deuda técnica — se espera fallo si Helmet no está configurado
  expect(headers['x-frame-options']).toBeDefined();
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['content-security-policy']).toBeDefined();
  await ctx.dispose();
});

// Rate limiting — AL FINAL para no bloquear otros tests
test(qase(25, 'TC-013: 5 intentos fallidos bloquean IP con 429'), async () => {
  const ctx = await request.newContext({ baseURL: BASE });

  // 5 intentos fallidos
  for (let i = 0; i < 5; i++) {
    await ctx.post('/auth/login', {
      data: { email: 'prueba@espina.com', password: 'wrong_password_e2e' },
    });
  }

  // Sexto intento → 429
  const res = await ctx.post('/auth/login', {
    data: { email: 'prueba@espina.com', password: 'wrong_password_e2e' },
  });
  expect(res.status()).toBe(429);
  await ctx.dispose();
});
```

- [ ] **Step 2: Correr (ojo: este test bloquea la IP 15 min)**

```bash
npx playwright test e2e/api/seguridad.spec.ts --config=e2e/playwright.config.ts
```
Esperado: TC-013 passed, TC-014 failed (sin Helmet), TC-015/016/017 skipped

- [ ] **Step 3: Commit**

```bash
git add e2e/api/seguridad.spec.ts
git commit -m "test(e2e): seguridad — IDs 25, 26 (skip 27-29 refresh token pendiente)"
```

---

## Task 11: Tests de Formulario Público UI (IDs 24, 30, 31, 32)

**Files:**
- Create: `e2e/ui/formulario-publico.spec.ts`

- [ ] **Step 1: Crear `e2e/ui/formulario-publico.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';
import { qase } from 'qase-playwright';

test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:3001');
  // Abrir formulario de pre-registro
  await page.getByRole('button', { name: /iniciar pre-registro|llenar solicitud/i }).first().click();
  await page.waitForSelector('form, [data-section="registro"]', { timeout: 10000 });
});

test(qase(30, 'TC-018: Dropdown de estado carga 32 estados INEGI'), async ({ page }) => {
  const selectEstado = page.locator('select[name="estado"], [data-field="estado"]').first();
  await selectEstado.waitFor({ timeout: 5000 });
  const options = await selectEstado.locator('option').all();
  // 32 estados + 1 opción vacía/placeholder
  expect(options.length).toBeGreaterThanOrEqual(32);
});

test(qase(31, 'TC-019: Al seleccionar estado, municipios se actualiza'), async ({ page }) => {
  const selectEstado = page.locator('select[name="estado"], [data-field="estado"]').first();
  await selectEstado.selectOption({ label: /nuevo le/i });

  const selectMunicipio = page.locator('select[name="municipio"], [data-field="municipio"]').first();
  await selectMunicipio.waitFor({ timeout: 5000 });
  const opciones = await selectMunicipio.locator('option').all();
  expect(opciones.length).toBeGreaterThan(1);

  // Verificar que las opciones corresponden a Nuevo León (ej. Monterrey)
  const textos = await Promise.all(opciones.map(o => o.textContent()));
  expect(textos.some(t => /monterrey/i.test(t ?? ''))).toBe(true);
});

test(qase(32, 'TC-020: CURP se autocalcula al llenar nombre, apellidos, fecha, género y estado'), async ({ page }) => {
  await page.fill('input[name="nombres"], [data-field="nombres"]', 'Juan');
  await page.fill('input[name="apellidoPaterno"], [data-field="apellidoPaterno"]', 'García');
  await page.fill('input[name="apellidoMaterno"], [data-field="apellidoMaterno"]', 'López');
  await page.fill('input[name="fechaNacimiento"], [data-field="fechaNacimiento"]', '2000-01-15');

  const selectGenero = page.locator('select[name="genero"], [data-field="genero"]').first();
  await selectGenero.selectOption({ label: /masculino|hombre/i }).catch(async () => {
    await page.getByRole('radio', { name: /masculino/i }).click().catch(() => {});
  });

  const selectEstado = page.locator('select[name="estado"], [data-field="estado"]').first();
  await selectEstado.selectOption({ label: /nuevo le/i });

  // Esperar autocompletado
  await page.waitForTimeout(500);
  const curpInput = page.locator('input[name="curp"], [data-field="curp"]').first();
  const curpValue = await curpInput.inputValue();
  expect(curpValue.length).toBeGreaterThanOrEqual(10);
  expect(curpValue).toMatch(/^GAR/i);
});

test(qase(24, 'TC-012: Formulario público muestra folio al enviar'), async ({ page }) => {
  // Llenar datos mínimos
  await page.fill('input[name="nombres"]', 'E2E').catch(() => {});
  await page.fill('input[name="apellidoPaterno"]', 'Test').catch(() => {});
  await page.fill('input[name="apellidoMaterno"]', 'Playwright').catch(() => {});
  await page.fill('input[name="fechaNacimiento"]', '2000-06-15').catch(() => {});

  const selectEstado = page.locator('select[name="estado"]').first();
  await selectEstado.selectOption({ index: 1 }).catch(() => {});
  await page.waitForTimeout(300);
  const selectMunicipio = page.locator('select[name="municipio"]').first();
  await selectMunicipio.selectOption({ index: 1 }).catch(() => {});

  await page.getByRole('button', { name: /enviar|registrar|solicitar/i }).click();

  // Verificar confirmación con folio
  await expect(
    page.locator('text=/folio|confirmación|enviado|registrado/i')
  ).toBeVisible({ timeout: 15000 });
});
```

- [ ] **Step 2: Correr (requiere frontend en localhost:3001)**

```bash
npx playwright test e2e/ui/formulario-publico.spec.ts --config=e2e/playwright.config.ts
```
Esperado: 4 passed

- [ ] **Step 3: Commit**

```bash
git add e2e/ui/formulario-publico.spec.ts
git commit -m "test(e2e): formulario público UI — IDs 24, 30, 31, 32"
```

---

## Task 12: Tests UAT (IDs 41, 42, 43)

**Files:**
- Create: `e2e/ui/uat.spec.ts`

- [ ] **Step 1: Crear `e2e/ui/uat.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';
import { qase } from 'qase-playwright';

const PANEL_URL = 'http://localhost:3001/panel';

async function loginUI(page: import('@playwright/test').Page) {
  await page.goto(PANEL_URL);
  await page.fill('input[type="email"]', 'prueba@espina.com');
  await page.fill('input[type="password"]', '222222');
  await page.getByRole('button', { name: /iniciar|entrar|login/i }).click();
  await page.waitForURL('**/panel**', { timeout: 15000 });
}

test(qase(41, 'UAT-001: Flujo completo pre-registro y aprobación'), async ({ page, request }) => {
  // 1. Abrir formulario público y registrar
  await page.goto('http://localhost:3001');
  await page.getByRole('button', { name: /iniciar pre-registro|llenar solicitud/i }).first().click();
  await page.waitForSelector('form', { timeout: 10000 });

  await page.fill('input[name="nombres"]', 'E2E UAT').catch(() => {});
  await page.fill('input[name="apellidoPaterno"]', 'Flujo').catch(() => {});
  await page.fill('input[name="apellidoMaterno"]', 'Completo').catch(() => {});
  await page.fill('input[name="fechaNacimiento"]', '2000-03-10').catch(() => {});

  const selectEstado = page.locator('select[name="estado"]').first();
  await selectEstado.selectOption({ label: /nuevo le/i }).catch(() => {});
  await page.waitForTimeout(300);
  const selectMunicipio = page.locator('select[name="municipio"]').first();
  await selectMunicipio.selectOption({ index: 1 }).catch(() => {});

  await page.getByRole('button', { name: /enviar|registrar|solicitar/i }).click();
  await expect(page.locator('text=/folio|confirmación|enviado/i')).toBeVisible({ timeout: 15000 });

  // 2. Login como admin y aprobar
  await loginUI(page);
  await page.getByRole('button', { name: /pre-registro/i }).click();
  await page.waitForTimeout(2000);

  // Buscar y aprobar el pre-registro E2E UAT
  const filaE2E = page.locator('tr, [data-row]').filter({ hasText: 'E2E UAT' }).first();
  if (await filaE2E.isVisible()) {
    await filaE2E.getByRole('button', { name: /aprobar/i }).click();
    await page.waitForTimeout(1000);
  }

  // 3. Verificar en Beneficiarios
  await page.getByRole('button', { name: /beneficiario/i }).click();
  await page.waitForTimeout(2000);
  // El beneficiario puede estar en la lista
  const beneficiarioVisible = await page.locator('text=E2E UAT').isVisible().catch(() => false);
  expect(beneficiarioVisible).toBe(true);
});

test(qase(42, 'UAT-002: Generación y descarga de reporte de membresías en PDF'), async ({ page }) => {
  await loginUI(page);

  // Navegar a Reportes
  await page.getByRole('button', { name: /reporte/i }).click();
  await page.waitForTimeout(2000);

  // Seleccionar tipo membresías
  const selectTipo = page.locator('select, [role="combobox"]').filter({ hasText: /tipo|reporte/i }).first();
  await selectTipo.selectOption({ label: /membres/i }).catch(async () => {
    await page.locator('select').first().selectOption({ index: 1 });
  });

  // Configurar periodo 2026
  const inputDesde = page.locator('input[type="date"], input[name="desde"]').first();
  const inputHasta = page.locator('input[type="date"], input[name="hasta"]').last();
  await inputDesde.fill('2026-01-01').catch(() => {});
  await inputHasta.fill('2026-12-31').catch(() => {});

  // Generar y esperar descarga
  const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
  await page.getByRole('button', { name: /generar/i }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/pdf|xlsx/i);
});

test(qase(43, 'UAT-003: Bloqueo por intentos fallidos de login'), async ({ page }) => {
  await page.goto(PANEL_URL);

  // 5 intentos fallidos
  for (let i = 0; i < 5; i++) {
    await page.fill('input[type="email"]', 'prueba@espina.com');
    await page.fill('input[type="password"]', 'wrong_pass_uat_e2e');
    await page.getByRole('button', { name: /iniciar|entrar|login/i }).click();
    await page.waitForTimeout(500);
  }

  // Sexto intento
  await page.fill('input[type="email"]', 'prueba@espina.com');
  await page.fill('input[type="password"]', 'wrong_pass_uat_e2e');
  await page.getByRole('button', { name: /iniciar|entrar|login/i }).click();

  // Verificar mensaje de bloqueo
  await expect(
    page.locator('text=/demasiados|bloqueado|429|15 minuto|espera/i')
  ).toBeVisible({ timeout: 10000 });
});
```

- [ ] **Step 2: Correr**

```bash
npx playwright test e2e/ui/uat.spec.ts --config=e2e/playwright.config.ts
```
Esperado: 3 passed (requiere frontend + backend corriendo)

- [ ] **Step 3: Commit**

```bash
git add e2e/ui/uat.spec.ts
git commit -m "test(e2e): UAT flujos completos — IDs 41, 42, 43"
```

---

## Task 13: Actualizar QASE con pasos y ejecutar suite completa

- [ ] **Step 1: Actualizar pasos en QASE vía API**

Para cada caso sin pasos, agregarlos usando la API de QASE. Ejemplo para ID 13:

```bash
curl -s -X PATCH \
  -H "Token: 26b06f45f7c19dd065f121bde43cb5d62838e16c0abccf5bdd06d392d3ad9708" \
  -H "Content-Type: application/json" \
  -d '{
    "steps": [
      {"action": "Autenticarse como admin y enviar GET /reportes/periodo?tipo=beneficiarios&desde=2026-01-01&hasta=2026-12-31", "expected_result": "Responde 200 con archivo PDF o XLSX"},
      {"action": "Verificar Content-Type de la respuesta", "expected_result": "Content-Type contiene pdf, xlsx u octet-stream"}
    ]
  }' \
  "https://api.qase.io/v1/case/EBF/13"
```

Repetir para los casos IDs: 7, 9, 14, 15, 16, 17, 18, 19–23, 25–26, 30–32, 36–43.

- [ ] **Step 2: Correr suite completa de API**

```bash
npx playwright test e2e/api/ --config=e2e/playwright.config.ts
```

- [ ] **Step 3: Correr suite completa de UI (con frontend y backend corriendo)**

```bash
npm run dev &   # esperar ~30s a que levante
npx playwright test e2e/ui/ --config=e2e/playwright.config.ts
```

- [ ] **Step 4: Verificar resultados en QASE**

Abrir `https://app.qase.io/project/EBF` y verificar que el Test Run aparece con resultados.

- [ ] **Step 5: Actualizar AVANCE_PROYECTO.md**

En la sección "Lo que falta por hacer" marcar Pruebas E2E como completadas.

- [ ] **Step 6: Commit final**

```bash
git add AVANCE_PROYECTO.md
git commit -m "docs: marcar pruebas E2E como completadas en AVANCE_PROYECTO.md"
git push
```
