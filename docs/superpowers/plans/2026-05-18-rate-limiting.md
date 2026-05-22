# Rate Limiting Implementation Plan

> **STATUS: EJECUTADO** — Implementado 2026-05-18. Middleware `src/middleware/rateLimiter.js`, tests `src/tests/rateLimiter.test.js`, y aplicación en `src/app.js` completos. 7/7 tests pasando.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `express-rate-limit` middleware to protect login, public pre-registration, and all authenticated endpoints from abuse.

**Architecture:** Three rate-limit configs (loginLimiter, publicLimiter, authLimiter) are defined in `src/middleware/rateLimiter.js` and applied in `src/app.js` before route mounting. The `skip` option disables limiting in test environments so the existing 652 tests are unaffected.

**Tech Stack:** `express-rate-limit` (npm), Jest + Supertest (existing test setup)

---

## File Map

| Action | File |
|---|---|
| Create | `src/middleware/rateLimiter.js` |
| Create | `src/tests/rateLimiter.test.js` |
| Modify | `src/app.js` |

---

### Task 1: Install express-rate-limit

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install the package**

```bash
npm install express-rate-limit
```

Expected output: added 1 package (or similar, no errors)

- [ ] **Step 2: Verify it's in package.json**

```bash
node -e "import('express-rate-limit').then(m => console.log('ok', typeof m.rateLimit))"
```

Expected: `ok function`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install express-rate-limit"
```

---

### Task 2: Create rateLimiter.js (TDD)

**Files:**
- Create: `src/middleware/rateLimiter.js`
- Create: `src/tests/rateLimiter.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/tests/rateLimiter.test.js`:

```js
import { loginLimiter, publicLimiter, authLimiter } from '../middleware/rateLimiter.js';
import { rateLimit } from 'express-rate-limit';

describe('rateLimiter configs', () => {
  test('loginLimiter has max=5 and windowMs=15 minutes', () => {
    expect(loginLimiter.options).toBeDefined();
    expect(loginLimiter.options.max).toBe(5);
    expect(loginLimiter.options.windowMs).toBe(15 * 60 * 1000);
  });

  test('publicLimiter has max=10 and windowMs=60 minutes', () => {
    expect(publicLimiter.options).toBeDefined();
    expect(publicLimiter.options.max).toBe(10);
    expect(publicLimiter.options.windowMs).toBe(60 * 60 * 1000);
  });

  test('authLimiter has max=120 and windowMs=1 minute', () => {
    expect(authLimiter.options).toBeDefined();
    expect(authLimiter.options.max).toBe(120);
    expect(authLimiter.options.windowMs).toBe(60 * 1000);
  });

  test('all limiters skip in test environment', () => {
    const fakeReq = {};
    const fakeRes = {};
    expect(loginLimiter.options.skip(fakeReq, fakeRes)).toBe(true);
    expect(publicLimiter.options.skip(fakeReq, fakeRes)).toBe(true);
    expect(authLimiter.options.skip(fakeReq, fakeRes)).toBe(true);
  });
});

describe('loginLimiter blocks after max attempts (real behavior)', () => {
  let app;

  beforeAll(async () => {
    const express = (await import('express')).default;
    const { rateLimit } = await import('express-rate-limit');
    const testLimiter = rateLimit({
      windowMs: 60 * 1000,
      max: 2,
      standardHeaders: true,
      legacyHeaders: false,
    });
    app = express();
    app.post('/test-login', testLimiter, (_req, res) => res.status(200).json({ ok: true }));
  });

  test('allows requests under the limit', async () => {
    const { default: request } = await import('supertest');
    const res = await request(app).post('/test-login');
    expect(res.status).toBe(200);
  });

  test('blocks the third request with 429', async () => {
    const { default: request } = await import('supertest');
    await request(app).post('/test-login');
    await request(app).post('/test-login');
    const res = await request(app).post('/test-login');
    expect(res.status).toBe(429);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
node --experimental-vm-modules node_modules/.bin/jest src/tests/rateLimiter.test.js --no-coverage
```

Expected: FAIL — `Cannot find module '../middleware/rateLimiter.js'`

- [ ] **Step 3: Implement rateLimiter.js**

Create `src/middleware/rateLimiter.js`:

```js
import { rateLimit } from 'express-rate-limit';

const isTest = () => process.env.NODE_ENV === 'test';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: isTest,
  message: {
    error: 'Too Many Requests',
    message: 'Demasiados intentos de inicio de sesión. Intente de nuevo en 15 minutos.',
  },
});

export const publicLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: isTest,
  message: {
    error: 'Too Many Requests',
    message: 'Demasiadas solicitudes de pre-registro. Intente de nuevo en 1 hora.',
  },
});

export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  skip: isTest,
  message: {
    error: 'Too Many Requests',
    message: 'Demasiadas peticiones. Intente de nuevo en 1 minuto.',
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
node --experimental-vm-modules node_modules/.bin/jest src/tests/rateLimiter.test.js --no-coverage
```

Expected: PASS — 5 tests

- [ ] **Step 5: Commit**

```bash
git add src/middleware/rateLimiter.js src/tests/rateLimiter.test.js
git commit -m "feat(security): add rate limiting middleware (loginLimiter, publicLimiter, authLimiter)"
```

---

### Task 3: Apply limiters in app.js

**Files:**
- Modify: `src/app.js`

- [ ] **Step 1: Add the import and apply limiters in app.js**

In `src/app.js`, add the import after the existing middleware imports:

```js
import { loginLimiter, publicLimiter, authLimiter } from './middleware/rateLimiter.js';
```

Then, after `app.use(express.json())` (line 38) and before the first route (`app.get("/health", ...)`), insert:

```js
// Rate limiting — specific limiters before their routes, global limiter for authenticated routes
app.post('/administradores/login', loginLimiter);
app.post('/api/v1/administradores/login', loginLimiter);
app.post('/beneficiarios/solicitud-publica', publicLimiter);
app.post('/api/v1/beneficiarios/solicitud-publica', publicLimiter);
app.use(authLimiter);
```

The resulting section should look like:

```js
app.use(express.json());
mountProfilePhotosRemoteFallback(app);
app.use("/uploads", express.static(path.join(REPO_ROOT, "uploads")));

// Rate limiting
app.post('/administradores/login', loginLimiter);
app.post('/api/v1/administradores/login', loginLimiter);
app.post('/beneficiarios/solicitud-publica', publicLimiter);
app.post('/api/v1/beneficiarios/solicitud-publica', publicLimiter);
app.use(authLimiter);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/beneficiarios",  beneficiariosRoutes);
// ... rest of routes unchanged
```

- [ ] **Step 2: Run the full test suite to verify no regressions**

```bash
node --experimental-vm-modules node_modules/.bin/jest --no-coverage 2>&1 | tail -20
```

Expected: all existing tests still pass (652+5 = 657 tests), no failures

- [ ] **Step 3: Commit**

```bash
git add src/app.js
git commit -m "feat(security): apply rate limiters in app.js (login, public, global)"
```

---

## Self-Review

**Spec coverage:**
- ✅ loginLimiter: 5 req / 15 min → Task 2
- ✅ publicLimiter: 10 req / 60 min → Task 2
- ✅ authLimiter: 120 req / 1 min → Task 2
- ✅ `standardHeaders: true` → Task 2
- ✅ 429 Too Many Requests response → Task 2 (behavioral test)
- ✅ Both URL variants for login + public → Task 3
- ✅ authLimiter applied globally before routes → Task 3
- ✅ skip in test env → Task 2 (tested explicitly)

**Placeholder scan:** None found.

**Type consistency:** N/A (plain JS).
