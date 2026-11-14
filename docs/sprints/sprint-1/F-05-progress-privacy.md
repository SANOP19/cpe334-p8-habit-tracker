# Feature Contract — F-05 Progress and Privacy Isolation

| Version | Date | Author | Reviewer | Change |
|---|---|---|---|---|
| 1.0 | 2026-11-14 | Nitithorn Ketkaew | Nara Kosiyaporn | Contract written before implementation (PR6, Issue #21) |

**Requirements:** FR-09 · BR-05 (participant isolation) · BR-07 (manager privacy) · NFR-05 (safe, uniform errors) · decision D-08 (progress formula), D-10 (404 vs 403)
**Acceptance criteria:** AC-24, AC-25, AC-26, AC-29 (AC-32 was delivered in F-03, PR #28; AC-27 E2E is in PR7)
**Depends on:** F-01 (auth), F-03 (goals router and its participant-only guard), F-04 (entries)
**Also in this PR:** a second seeded participant, needed to demonstrate AC-25 with seed data (gap listed in `docs/traceability.md` §5).

---

## 1. Feature design

### 1.1 Behaviour and workflow
1. A participant opens **Goals**. For each goal the client calls `GET /api/goals/:id/progress`.
2. The server checks the session, the role and that the goal belongs to the caller, then calculates progress from the stored entries and the goal's daily target.
3. The Goals page shows, per goal, "Achieved X of Y logged days" and, next to each logged entry, its percentage and an "Achieved" badge when the target was met. After a new entry is saved, progress is fetched again.

### 1.2 Progress calculation (D-08)
For each entry of the goal:
- `percent = value ÷ dailyTarget × 100`, **truncated** (not rounded) to one decimal place, and **not capped** — so 25 of 20 shows 125%, and 19.99 of 20 shows 99.9% (never 100% unless the target is met).
- `achieved = value ≥ dailyTarget`.

Summary: `entriesCount` = number of entries; `achievedCount` = number of entries with `achieved = true`. Days without an entry are not counted (streaks and weekly/monthly summaries are Sprint 2, FR-12/FR-13).

The calculation is a pure function (`calculateProgress`) so it can be unit-tested without the database.

### 1.3 Privacy rules (checked in this order — SDS §5.3)
| # | Check | Response |
|---|---|---|
| 1 | Signed in | 401 `UNAUTHENTICATED` |
| 2 | Role is `PARTICIPANT` | 403 `FORBIDDEN` — program managers never read individual goals, entries or progress (BR-07, AC-26) |
| 3 | Goal exists and belongs to the caller | 404 `NOT_FOUND` — other participants' goals look the same as non-existent ones (BR-05, AC-25, D-10) |

The same three checks already protect `GET /api/goals/:id` and `/api/goals/:id/entries` (F-03, F-04); this feature adds the progress endpoint and verifies all three together.

### 1.4 Uniform errors (NFR-05, AC-29)
Every error response — 401, 403, 404, 409, 422, malformed JSON, unknown route and unexpected 500 — has exactly the body `{ "error": { "code", "message" } }` (plus optional `details` on 422), never a stack trace, SQL, Prisma error code or file path. Implemented by the P1 error handler; this feature adds the test that checks all kinds together.

---

## 2. API specification

### `GET /api/goals/:id/progress`
| Status | Body |
|---|---|
| 200 | `{ "progress": { "goalId": 7, "dailyTarget": 20, "unit": "pages", "entriesCount": 2, "achievedCount": 1, "days": [ { "entryDate": "2026-11-14", "value": 25, "percent": 125, "achieved": true }, { "entryDate": "2026-11-13", "value": 10, "percent": 50, "achieved": false } ] } }` — `days` newest first |
| 401 | `UNAUTHENTICATED` |
| 403 | `FORBIDDEN` (program manager) |
| 404 | `NOT_FOUND` (another participant's goal, unknown or non-numeric id) |

## 3. Data
No schema change. Seed (`server/prisma/seed.ts`) adds a second participant `participant2@example.test` ("Blake Student") using `SEED_PARTICIPANT_PASSWORD`; it is idempotent (upsert by email) like the existing accounts.

## 4. UI specification
| Element | Behaviour |
|---|---|
| Goal card — summary | "Achieved X of Y logged days" above the entries list; hidden while loading. |
| Goal card — entries list | Each entry shows its percentage ("125%") and a green "Achieved" badge when `achieved`. |
| After saving an entry | Progress is fetched again so the summary and percentages update. |
| Progress fails to load | The card still works; a muted line "Progress is not available right now." is shown (not an alert, so it does not hide entry-form errors). |

## 5. Acceptance criteria
| AC | Given / When / Then |
|---|---|
| **AC-24** | Given a goal with daily target 20 and entries 25, 10 and 20, when the participant requests progress, then the percentages are 125, 50 and 100, `achieved` is true, false, true, `entriesCount` is 3 and `achievedCount` is 2. A value of 19.99 gives 99.9 and not achieved. |
| **AC-25** | Given participants A and B each with a goal and an entry, when A requests B's goal, B's entries or B's progress, then each response is 404 `NOT_FOUND` and contains none of B's data. |
| **AC-26** | When a program manager requests a participant's goal, entries or progress, then each response is 403 `FORBIDDEN` with only the error body. |
| **AC-29** | For each kind of error (401, 403, 404, 409, 422, malformed JSON, unknown route, unexpected 500) the body is exactly `{ error: { code, message } }` (422 may add `details`) and contains no stack trace, SQL, Prisma code or path. |
| (seed) | After seeding, two participants and one program manager exist, so AC-25 can be demonstrated with seed accounts. |

## 6. Software Test Specification
| Test | AC | Level | Precondition / input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-24a | AC-24 | Unit | `calculateProgress(20, entries)` | Values 25, 10, 20, 19.99, and target 3 with value 1 | 125/true, 50/false, 100/true, 99.9/false, 33.3/false; counts correct |
| TEST-24b | AC-24 | API + DB | Goal target 20 with entries 25 (14 Nov), 10 (13 Nov), 20 (12 Nov) | `GET /api/goals/:id/progress` | 200; days newest first with the expected percent/achieved; `entriesCount` 3, `achievedCount` 2 |
| TEST-24c | AC-24 | API + DB | Goal with no entries | `GET …/progress` | 200; `days` empty; counts 0 |
| TEST-25 | AC-25 | API + DB | A and B each have a goal with an entry | A requests B's goal, entries, progress; A requests `/api/goals/abc/progress` | All 404 `NOT_FOUND`; response text contains none of B's values or notes |
| TEST-26 | AC-26 | API + DB | Manager signed in; A has a goal with an entry | Manager requests A's goal, entries, progress | All 403 `FORBIDDEN`, body is only the error |
| TEST-29 | AC-29 | API | Error of each kind triggered | Inspect each body | Exactly `error.code` + `error.message` (+ `details` on 422); no `stack`, `at `, `prisma`, `P20`, `SELECT`, `\\src\\` or `/src/` |
| TEST-S2 | (seed) | Integration | Seed passwords set | Run `seedDatabase()` | `participant2@example.test` exists with role `PARTICIPANT`; running the seed twice still gives 3 users |
| TEST-04 | AC-04 | API | — | `GET /api/goals/1/progress` added to the protected list | 401 without a session |
| TEST-UI-08 | AC-24 (UI) | Component | `fetch` mocked: goal, entries, progress | Render Goals | "Achieved 1 of 2 logged days", "125%" with "Achieved" badge, "50%" without |

**TDD note.** TEST-24 and TEST-25 fail before implementation (no calculation, no progress endpoint). **TEST-26 and TEST-29 are expected to pass already**, because the participant-only guard (F-03) and the error handler (P1) exist; they are regression checks that the new endpoint keeps those guarantees, not red→green evidence. The brief's TDD list is updated from TEST-26 to TEST-24 accordingly.

## 7. Feature Definition of Done
- All tests in §6 pass; earlier suites still pass; builds pass.
- Commits in order: contract → failing tests → implementation.
- `docs/traceability.md`: FR-09, BR-05, BR-07, NFR-05 verified; AC-24..26, AC-29 filled in; seed gap closed.
- Reviewer signs in as participant 1 and checks percentages; signs in as participant 2 and confirms participant 1's goal id returns 404 for progress.
