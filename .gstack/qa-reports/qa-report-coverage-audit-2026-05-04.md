# QA Report — Coverage Audit
**Date:** 2026-05-04  
**Branch:** main  
**Scope:** Last 10 commits + test coverage  
**Mode:** Diff-aware (no URL — code audit)  
**Test run:** 288 tests, 15 suites, 2.4s

---

## Summary

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| Statements | 86.43% | 70% | ✅ PASS |
| Branches | 77.16% | 70% | ✅ PASS |
| Functions | 91.98% | — | ✅ |
| Lines | 88.46% | — | ✅ |
| Tests | 288/288 | — | ✅ ALL PASS |

---

## Recent Commits Audited (last 10)

| SHA | Message | Type |
|-----|---------|------|
| `3f039ec` | feat(citas): rediseño completo con Bento Grid y doble vista | Frontend UI |
| `13fc891` | arreglo foto para pp | Frontend fix |
| `4481826` | captcha | ⚠️ Backend: new security utility |
| `fb77560` | Nueva funcionalidad campos de informacion y mejoras en los preregistros | Full-stack |
| `ab1f051` | Mejoras preregistro | Full-stack |
| `a5b2dd5` | mejora public site y registro | Full-stack |
| `7214c76` | style(citas): igualar altura de tarjetas en el calendario | Frontend style |
| `559e746` | style(citas): mejorar layout de contenedor principal | Frontend style |
| `7d5fbb2` | feat(citas): optimizacion UI y confirmaciones de estado | Frontend feat |
| `3e9c0c9` | test: update inventario.criteria mocks to match SP-based model | Tests |

---

## Issues Found

### ISSUE-001 — `verifyTurnstile.js` has 0% test coverage (CRITICAL)
**Severity:** Critical  
**Category:** Security / Functional  
**File:** `src/utils/verifyTurnstile.js`  
**Coverage:** 9.09% statements, 0% branches, 0% functions, 10.52% lines  
**Lines uncovered:** 18–50 (the entire logic body)

**What's not tested:**
- Empty token → should throw `CAPTCHA_REQUIRED`
- Production env with missing `TURNSTILE_SECRET_KEY` → should throw `CAPTCHA_CONFIG`
- Dev env with missing key → should fall back to test secret (silent)
- Cloudflare API call success → `json.success === true` → should return cleanly
- Cloudflare API call failure → `json.success !== true` → should throw `CAPTCHA_FAILED`
- Cloudflare API returns non-JSON → `.catch(() => ({}))` fallback path

**Risk:** The captcha is the only security gate on the public pre-registration endpoint (`POST /api/v1/beneficiarios/solicitud-publica`). If `verifyTurnstileToken` has a regression (e.g., env var handling changes), bots can flood the pre-registration form and create fake beneficiary records. None of these paths are caught by the current test suite.

**Fix Status:** Deferred (no fix attempted — this audit is read-only)

---

### ISSUE-002 — `administradores.service.js` at 65.26% statements (HIGH)
**Severity:** High  
**Category:** Functional  
**File:** `src/services/administradores.service.js`  
**Coverage:** 65.26% statements, 62.5% branches  
**Uncovered:** Lines 43, 62–67, 145–156, 167–179

**What's not tested:**
- Line 43: `normalizePasswordHash` when `value` is not a string (number/Buffer from Oracle)
- Lines 62–67: Legacy plaintext password migration path (`stored === password` → hash and update)
- Lines 145–156: `changePassword` — wrong current password rejected (`401`), valid flow
- Lines 167–179: `updateFotoPerfilByUpload` — admin photo upload with authorization check

**Risk:** The legacy password migration path (lines 62–67) runs in production when admin accounts have plaintext passwords. If it regresses, those admins can't log in. The `changePassword` function has no test at all — a regression there silently breaks that feature.

**Fix Status:** Deferred

---

### ISSUE-003 — `beneficiarios.controller.js` uncovered endpoints (HIGH)
**Severity:** High  
**Category:** Functional  
**File:** `src/controllers/beneficiarios.controller.js`  
**Coverage:** 69.49% statements  
**Uncovered:** Lines 102, 109–115, 122–146

**What's not tested:**
- `uploadFotoPerfil` (lines 106–118): missing file → `MISSING_FILE` error
- `createPublicSolicitud` (lines 121–130): the Turnstile call + service delegation
- `approvePreRegistro` (lines 132–138): approve path
- `rejectPreRegistro` (lines 141–148): reject path

**Risk:** The pre-registration approve/reject paths (lines 132–148) are core admin workflows with no controller-level test. The public solicitud endpoint (122–130) that calls Turnstile is also completely untested at the controller layer — if the response format changes or error propagation breaks, it won't be caught.

**Fix Status:** Deferred

---

### ISSUE-004 — `dbTransform.js` at 55% statements (MEDIUM)
**Severity:** Medium  
**Category:** Functional  
**File:** `src/utils/dbTransform.js`  
**Coverage:** 55% statements, 37.5% branches  
**Uncovered:** Lines 29–30, 39–41

**Risk:** This utility transforms Oracle row data. Untested branches likely handle null/undefined column values — if Oracle returns unexpected nulls, the transform silently fails downstream.

**Fix Status:** Deferred

---

### ISSUE-005 — `servicios.model.js` at 67.69% branch coverage (MEDIUM)
**Severity:** Medium  
**Category:** Functional  
**File:** `src/models/servicios.model.js`  
**Coverage:** 78.04% statements, 67.69% branches  
**Uncovered:** Lines 49–59, 104–118, 133, 177, 213–214, 329–333

**What's not tested:**
- `findBeneficiarioActivo` (lines 49–59): likely called before service creation
- Paginated `findByCurp` (lines 104–118)
- `createWithHistorialTransaction` (329–333)

**Fix Status:** Deferred

---

## Coverage by File (sorted by risk)

| File | Stmts | Branch | Risk |
|------|-------|--------|------|
| `utils/verifyTurnstile.js` | 9% | 0% | 🔴 Critical — security gate |
| `services/administradores.service.js` | 65% | 63% | 🟠 High — auth + admin ops |
| `utils/dbTransform.js` | 55% | 38% | 🟡 Medium — data transform |
| `controllers/beneficiarios.controller.js` | 69% | 88% | 🟡 Medium — public endpoints |
| `models/servicios.model.js` | 78% | 68% | 🟡 Medium — core model |
| `models/inventario.model.js` | 92% | 65% | 🟡 Medium — inventory |
| `models/membresias.model.js` | 88% | 65% | 🟡 Medium — memberships |
| `services/beneficiarios.service.js` | 82% | 74% | 🟡 Medium — large service |
| `controllers/beneficiarios.controller.js` | 69% | 88% | 🟡 Medium |

---

## Top 3 Things to Fix

1. **Write tests for `verifyTurnstile.js`** — mock `fetch`, test all 5 paths (empty token, missing key in prod, missing key in dev, Cloudflare success, Cloudflare failure). This is a one-file test file, ~50 lines. The captcha is the only protection on the public endpoint.

2. **Add tests for `changePassword` and legacy login path in `administradores.service.js`** — the legacy plaintext→bcrypt migration (lines 62–67) runs in production. One test that simulates a plaintext password record catches any regression here.

3. **Add controller tests for `createPublicSolicitud`, `approvePreRegistro`, `rejectPreRegistro`** — these three public-facing endpoints have zero controller-level coverage. Mock `verifyTurnstileToken` and `BeneficiarioService`, test happy path + error propagation.

---

## Commit Quality Notes

- The `captcha` commit (`4481826`) added `verifyTurnstile.js` and wired it to the public endpoint but shipped with no tests. The pattern was repeated in the controller — `createPublicSolicitud` also has no tests.
- The 3 citas UI commits (7d5fbb2, 559e746, 7214c76) are purely frontend; no backend coverage impact.
- The SP migration commits (c75a9cc, 7d0ba95, d9a36c0, 87d5205 — just outside this window) were well-tested: `inventario.criteria.test.js` was updated to match.
- Commit messages are inconsistent — some follow `type(scope): msg` convention, others don't (`captcha`, `arreglo foto para pp`).

---

## Health Score

| Category | Score | Weight | Weighted |
|----------|-------|--------|---------|
| Console | 100 | 15% | 15.0 |
| Links | 100 | 10% | 10.0 |
| Visual | — | 10% | 10.0 |
| Functional | 72 | 20% | 14.4 |
| UX | — | 15% | 15.0 |
| Performance | — | 10% | 10.0 |
| Content | — | 5% | 5.0 |
| Accessibility | — | 15% | 15.0 |

**Health Score: ~82/100** (functional score reduced by 3 untested critical/high-risk paths)

**PR Summary:** QA found 5 coverage gaps; 0 fixes (read-only audit). Critical: `verifyTurnstile.js` has 0% coverage — security gate on public endpoint is unverified by tests.
