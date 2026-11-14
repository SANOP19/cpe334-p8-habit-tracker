# Feature Contract — F-03 Goal Setting

| Version | Date | Author | Reviewer | Change |
|---|---|---|---|---|
| 1.0 | 2026-11-14 | Nitithorn Ketkaew | Nara Kosiyaporn | Contract written before implementation (PR4, Issue #19) |

**Requirements:** FR-07 · BR-08 (published template, dailyTarget > 0 and within range) · BR-09 (one active goal per template) · BR-05 (own goals only) · role matrix (SDS §5.4)
**Acceptance criteria:** AC-12, AC-13, AC-14, AC-15, AC-16, and **AC-32** (moved here from F-05: the same role guard that answers AC-16 answers it, so it is verified with the goal endpoints)
**Depends on:** F-01 (`requireAuth`, `requireRole`), F-02 (published templates), P1 schema (`goals` table, partial unique index on active goals)
**Used by:** F-04 (entries belong to a goal), F-05 (progress per goal)

---

## 1. Feature design

### 1.1 Behaviour and workflow
1. A participant opens **Templates**, which lists published templates. Each card has **Set goal**.
2. The participant enters a daily target in the template's unit and confirms. The client sends `POST /api/goals` with `templateId` and `dailyTarget` only — never a user ID.
3. The server takes the participant from the session, checks the rules (§1.2) and stores the goal with status `ACTIVE`.
4. The participant opens **Goals** to see their own goals (template name, unit, daily target, status) and can open one goal's detail (F-04/F-05 add entries and progress there).

### 1.2 Business rules and validation (checked in this order)
| # | Check | Response |
|---|---|---|
| 1 | Signed in | 401 `UNAUTHENTICATED` (F-01) |
| 2 | Role is `PARTICIPANT` | 403 `FORBIDDEN` (program managers cannot create or read goals — BR-07, AC-16, AC-32) |
| 3 | Body: `templateId` is a positive integer; `dailyTarget` is a finite JSON number | 422 `VALIDATION_ERROR` with `details` per field (strings such as `"10"` and booleans are rejected) |
| 4 | Template exists and is `PUBLISHED` | 422 `TEMPLATE_NOT_PUBLISHED` (same answer for unknown and draft, so drafts are not revealed) |
| 5 | `dailyTarget > 0` and `minValue ≤ dailyTarget ≤ maxValue` | 422 `TARGET_OUT_OF_RANGE`, message names the allowed range and unit |
| 6 | No other `ACTIVE` goal of this participant for this template | 409 `DUPLICATE_ACTIVE_GOAL`. Checked in the service and guaranteed by the partial unique index; a unique-violation from two simultaneous requests is translated to the same 409, never a 500 |

Other fields in the body (e.g. `participantId`, `status`) are ignored.

### 1.3 Reading goals
- `GET /api/goals`: the signed-in participant's goals only, newest first.
- `GET /api/goals/:id`: the goal if it belongs to the signed-in participant; otherwise 404 `NOT_FOUND` (also for a non-numeric id), so other participants' goal IDs are not revealed (BR-05, D-10).

### 1.4 Permissions
| Endpoint | Not signed in | Participant | Program Manager |
|---|---|---|---|
| `POST /api/goals` | 401 | allowed; owner = caller | 403 |
| `GET /api/goals` | 401 | own goals | 403 |
| `GET /api/goals/:id` | 401 | own: 200 · other's / unknown: 404 | 403 |

### 1.5 Boundary cases
- Template range 1–200: targets 1 and 200 accepted; 0.5 and 200.5 rejected.
- Template range 0–30: target 0 is inside the range but rejected (must be > 0); 0.1 accepted.
- Negative target → rejected.
- A participant may hold active goals for different templates at the same time.
- Two different participants may each have an active goal for the same template.

---

## 2. API specification

### `POST /api/goals`
Request: `{ "templateId": 3, "dailyTarget": 20 }`
| Status | Body |
|---|---|
| 201 | `{ "goal": { "id", "templateId", "dailyTarget", "status": "ACTIVE", "createdAt", "template": { "id", "name", "unit", "minValue", "maxValue" } } }` |
| 403 | `FORBIDDEN` |
| 409 | `{ "error": { "code": "DUPLICATE_ACTIVE_GOAL", "message": "You already have an active goal for this activity." } }` |
| 422 | `VALIDATION_ERROR` (with `details`), `TEMPLATE_NOT_PUBLISHED`, or `TARGET_OUT_OF_RANGE` (e.g. "Daily target must be greater than 0 and between 1 and 200 pages.") |

### `GET /api/goals`
200 `{ "goals": [ goal, … ] }` (same goal shape) · 401 · 403

### `GET /api/goals/:id`
200 `{ "goal": goal }` · 401 · 403 · 404 `NOT_FOUND`

The response never contains `participantId` of another user (only the caller's own goals are ever returned).

## 3. Data
No schema change. Uses `goals` from the P1 migration: `participantId` → users, `templateId` → activity_templates, `status` default `ACTIVE`, partial unique index `goals_participant_template_active_idx` on (`participantId`, `templateId`) where `status = 'ACTIVE'`.

## 4. UI specification
| Screen / element | Behaviour |
|---|---|
| Templates (participant) | Each published template card shows **Set goal**. Clicking it shows a number input labelled "Daily target (unit)" with the template range as `min`/`max` hints, and **Save goal** / **Cancel**. While saving: button disabled, `Loading`. On success: "Goal saved." on that card. On 409/422: `ErrorMessage` with the server message on that card; the typed value is kept. |
| Templates (manager) | Unchanged from F-02 (no Set goal). |
| Goals (participant) | `Loading` while fetching; `EmptyState` "No goals yet. Choose a template on the Templates page to set one."; otherwise one card per goal: template name, "Daily target: 20 pages", status badge. Load failure → `ErrorMessage`. |

## 5. Acceptance criteria
| AC | Given / When / Then |
|---|---|
| **AC-12** | Given a signed-in participant and a published template, when they create a goal with a valid target, then the response is 201 with status `ACTIVE`, the goal is stored with `participantId` = the caller (even if the body names another user), and it appears in their `GET /api/goals`. |
| **AC-13** | When `dailyTarget` is ≤ 0, below `minValue` or above `maxValue`, the response is 422 `TARGET_OUT_OF_RANGE` and nothing is stored; targets equal to `minValue` and `maxValue` are accepted. A non-number target is 422 `VALIDATION_ERROR`. |
| **AC-14** | When the template is a draft or does not exist, the response is 422 `TEMPLATE_NOT_PUBLISHED` and nothing is stored. |
| **AC-15** | Given an active goal for a template, when the same participant creates another goal for that template, the response is 409 `DUPLICATE_ACTIVE_GOAL` and only one goal exists; two simultaneous requests also leave exactly one goal. |
| **AC-16** | When a program manager calls `POST /api/goals`, the response is 403 `FORBIDDEN` and nothing is stored. |
| **AC-32** | When a program manager calls `GET /api/goals` or `GET /api/goals/:id`, the response is 403 `FORBIDDEN` with no goal data. |
| (BR-05 for goals) | `GET /api/goals` returns only the caller's goals; `GET /api/goals/:id` for another participant's goal returns 404. (AC-25 for entries and progress is completed in F-05.) |

## 6. Software Test Specification
| Test | AC | Level | Precondition / input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-12 | AC-12 | API + DB | Participant A, B; published template 1–200 | A posts `{templateId, dailyTarget: 20, participantId: B.id}`; then `GET /api/goals` | 201, status `ACTIVE`, template summary; DB row has `participantId = A`; list contains it |
| TEST-13a | AC-13 | API + DB | Template 1–200 | Targets 1 and 200 (separate templates to avoid AC-15), then 0.5, 200.5, -5 | 1 and 200 → 201; others → 422 `TARGET_OUT_OF_RANGE`; no extra rows |
| TEST-13b | AC-13 | API + DB | Template 0–30 | Target 0, then 0.1 | 0 → 422 `TARGET_OUT_OF_RANGE`; 0.1 → 201 |
| TEST-13c | AC-13 | API | — | `dailyTarget: "10"`, `true`, missing; `templateId` missing / `"x"` | 422 `VALIDATION_ERROR` with field details |
| TEST-14 | AC-14 | API + DB | Draft template | Post goal for the draft, then for id 999999 | Both 422 `TEMPLATE_NOT_PUBLISHED`; 0 rows |
| TEST-15a | AC-15 | API + DB | A has active goal on template T | A posts another goal on T; A posts on template U; B posts on T | 409 `DUPLICATE_ACTIVE_GOAL`; U → 201; B → 201; A has exactly 1 goal on T |
| TEST-15b | AC-15 | Integration | No goal yet | Two `POST /api/goals` for the same template sent at the same time | One 201 and one 409; exactly 1 row |
| TEST-16 | AC-16 | API + DB | Manager signed in | `POST /api/goals` | 403 `FORBIDDEN`; 0 rows |
| TEST-32 | AC-32 | API | Manager signed in; A has a goal | `GET /api/goals`, `GET /api/goals/:id` | 403 `FORBIDDEN`, body has only `error` |
| TEST-G1 | BR-05 | API + DB | A and B each have a goal | A calls `GET /api/goals`; A calls `GET /api/goals/:B-goal`; A calls `/api/goals/abc` | List has only A's goal; 404 `NOT_FOUND` twice |
| TEST-04 | AC-04 | API | — | The three goal endpoints added to the protected list in `auth.test.ts` | 401 without a session |
| TEST-UI-05 | AC-12, AC-13 (UI) | Component | Participant view, `fetch` mocked | Set goal → type 20 → Save; then a 422 response | POST body `{templateId, dailyTarget: 20}`; "Goal saved."; 422 message shown, value kept |
| TEST-UI-06 | AC-12 (UI) | Component | `fetch` mocked | Render Goals with 0 goals, then with 1 goal | Empty state; then card "Daily target: 20 pages" |

**TDD:** tests committed and run before the implementation; outputs in `docs/evidence/F-03/`.

## 7. Feature Definition of Done
- All tests in §6 pass on the last commit; earlier suites (P1, F-01, F-02) still pass; builds pass.
- Commits in order: contract → failing tests → implementation.
- `docs/traceability.md` rows for FR-07, BR-08, BR-09 and AC-16/AC-32 updated; AC-32 delivery moved from PR6 to PR4.
- Reviewer signs in as a participant in the browser, sets a goal, tries an out-of-range target and a second goal on the same template, and sees the goal on the Goals page.
