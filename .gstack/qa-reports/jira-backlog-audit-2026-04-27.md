# Jira Backlog Audit — EspinaBifida (SCRUM)
**Date:** 2026-04-27  
**Project:** AccessCode / SCRUM  
**Branch:** main  
**Method:** acli jira + git log cross-reference  

---

## Executive Summary

| Category | Count |
|---|---|
| Stories shipped but Epics stuck at To Do | 2 |
| Story Done but subtasks still To Do | 4 subtasks (SCRUM-73) |
| Orphaned/superseded To Do subtasks (old sprint) | ~20 (SCRUM-49→67) |
| Real work in commits with no Jira ticket | 4 feature areas |
| To Do stories that have commits in code | 3 (SCRUM-28, 30, 20) |

---

## Finding 1 — Epics stuck at "To Do" despite all children Done

Both Epics need to be closed.

| Epic | Status | Children status |
|---|---|---|
| SCRUM-68 Backend Hardening Sprint | **To Do** | SCRUM-69 to SCRUM-74 → all **Done** |
| SCRUM-31 Backend Core System | **To Do** | SCRUM-32 to SCRUM-37 → all **Done** |

**Action:** Transition SCRUM-68 and SCRUM-31 to Done.

---

## Finding 2 — SCRUM-73 marked Done, but 4 subtasks are still To Do

Story SCRUM-73 ("Inventario: endpoints de movimientos y consulta de stock") = **Done**  
But its subtasks:

| Subtask | Status | Commit evidence |
|---|---|---|
| SCRUM-91 POST /api/v1/movimientos | **To Do** | `d9a36c0` adds SP_REGISTRAR_MOVIMIENTO_INVENTARIO, but endpoint not verified |
| SCRUM-92 GET /api/v1/inventario con stock calculado | **To Do** | Not found in recent commits |
| SCRUM-93 Lógica entradas/salidas con cálculo de stock | **To Do** | SP exists but stock calculation endpoint TBD |
| SCRUM-94 Garantizar stock nunca baje de cero | **To Do** | No zero-guard commit found |

**Action:** Either close these subtasks as "Won't Do" (superseded by SPs), or create tickets for the remaining endpoint work and keep SCRUM-73 in progress.

---

## Finding 3 — ~20 orphaned "To Do" subtasks from old sprint (SCRUM-49 to SCRUM-67)

These were created as part of the "Backend Core System" epic (SCRUM-31) and have been superseded by the higher-quality "Backend Hardening Sprint" work (SCRUM-68). The functionality they describe is now shipped:

| Old Subtask | New equivalent (Done) |
|---|---|
| SCRUM-51 Implement active membership assertion | SCRUM-85 validateActiveMembership() → Done |
| SCRUM-52 Scheduled membership expiration job | SCRUM-83 Auto-inactivación membresías → Done |
| SCRUM-53 Create Oracle schema for service catalog | SCRUM-88 transacción atómica Oracle → Done |
| SCRUM-54 POST /services enforcing active membership | SCRUM-87 + commit `e72b3c8` → Done |
| SCRUM-58 Create Oracle schema for items/stock | commit `87d5205` stored procedures → Done |
| SCRUM-63 Configure Jest and coverage thresholds | SCRUM-99 → Done |
| SCRUM-64 Unit tests membership validity | SCRUM-95 → Done |
| SCRUM-65 Oracle repository integration tests | SCRUM-96 → Done |
| SCRUM-66 End to end tests core service flow | SCRUM-97 → Done |
| SCRUM-67 Deterministic test data seeding | SCRUM-97 E2E → Done |
| SCRUM-60/61 Inventory endpoints | partially covered by SPs |
| SCRUM-55 Prevent duplicate service per day | Not found in commits — real gap |
| SCRUM-62 Inventory anomaly detection report | Not found in commits — real gap |

**Action:** Close SCRUM-49 through SCRUM-67 as "Won't Do" with note "superseded by SCRUM-68 sprint". Two exceptions: SCRUM-55 and SCRUM-62 may still be open work — verify before closing.

---

## Finding 4 — Real work in commits with no Jira tickets

These feature areas have significant commit activity but no corresponding Jira ticket, or the ticket is still "To Do":

### 4a. Citas / Appointments (SCRUM-30 = To Do)
Story "Agenda de citas" = **To Do** but 5+ commits exist:
- `21a2fea` fix(citas): sync fecha/hora, dynamic calendar, functional form & status update
- `c05051a` fix: usar SEQ_CITAS.NEXTVAL en INSERT
- `5271fdf` fix: citas - validacion específica de campos faltantes
- `89c5f75` fix(tests): actualizar pruebas de citas

**Action:** Move SCRUM-30 to "In Progress" or "Done" — substantial work has shipped.

### 4b. Pre-registro (SCRUM-20 = To Do)
- `90dfed0` pre registro integrado

**Action:** Move SCRUM-20 to at least "In Progress".

### 4c. Fotos de perfil — No Jira ticket
7 commits across 3 days (2026-04-21 to 2026-04-23):
- `64103fe`, `c967c89`, `403699e`, `6bf4167`, `715bfcb`, `8e27a92`, `b33b5be`, `cfcff2e`

**Action:** Create a Jira story or link to existing ticket for photo profile feature.

### 4d. Módulo Usuarios — No Jira ticket
- `60ce5c7` modificaciones pestaña usuarios
- `2960dbb` pestaña para usuarios

**Action:** Create a Jira story or find existing ticket.

---

## Finding 5 — Stories that appear Done in code but ticket shows "To Do"

| Jira Story | Jira Status | Evidence in commits |
|---|---|---|
| SCRUM-28 Estado de membresía | To Do | `7d0ba95`, `83` → shipped |
| SCRUM-27 Registro de membresías | To Do | `7d0ba95`, `84-86` → shipped |
| SCRUM-26 Validación de inventario | To Do | `d9a36c0`, `87d5205` → partially shipped |

These are likely from an older sprint that was superseded. Close as "Won't Do" if SCRUM-71 and SCRUM-73 cover the same scope.

---

## Alignment Score

| Area | Jira ↔ Code alignment | Status |
|---|---|---|
| Beneficiarios CRUD | ✅ Aligned | SCRUM-70 Done, commits match |
| Membresías lifecycle | ✅ Aligned | SCRUM-71 Done, commits match |
| Servicios médicos | ✅ Aligned | SCRUM-72 Done, commits match |
| Inventario (SPs) | ⚠️ Partial | SCRUM-73 Done but 4 subtasks open |
| Testing / Coverage | ✅ Aligned | SCRUM-74 Done, test commits match |
| Citas | ❌ Drift | Significant code, ticket still "To Do" |
| Fotos de perfil | ❌ No ticket | 7 commits, 0 Jira coverage |
| Usuarios tab | ❌ No ticket | 2 commits, 0 Jira coverage |
| Epic status | ❌ Stale | 2 Epics stuck at "To Do" |

---

## Recommended Actions (priority order)

1. **Close SCRUM-68 and SCRUM-31** as Done — immediate, 2-minute task
2. **Resolve SCRUM-73 inventory subtasks** — either close as "Won't Do" or create proper endpoint tickets
3. **Move SCRUM-30 (citas) to Done** — code is there, close the ticket
4. **Create story for Fotos de Perfil** — 7 commits with no Jira coverage
5. **Close SCRUM-49 to SCRUM-67** as "Won't Do / Superseded" — cleans ~20 stale tickets
6. **Verify SCRUM-55** (prevent duplicate service) and **SCRUM-62** (inventory anomaly) — may still be open work
