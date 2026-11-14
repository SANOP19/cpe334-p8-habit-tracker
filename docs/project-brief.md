# Project Brief — Habit and Activity Tracking System (Theme 8)

**Status:** Draft for team review (Part P0, Issue #1). Decisions marked *proposed* are not final until both members agree in the PR review.
**Scope of this brief:** Project Deliverable 1 — engineering baseline for the whole product and the Sprint 1 increment.
**Team:** Nitithorn Ketkaew (67070505203, @SANOP19) · Nara Kosiyaporn (67070505218, @narakosi-dev)

This brief is the shared starting point. The formal documents (`docs/srs.md`, `docs/features.md`, `docs/traceability.md`, `docs/system-sds.md`, `docs/sprints/`) are written from it in parts P3–P5. When a formal document changes a decision, update this brief in the same PR.

---

## 1. Context and actors

**Problem:** Students in a university wellbeing programme want to build study and exercise habits. Programme staff need consistent activity definitions (units and valid ranges); students need to record daily progress against personal goals and see how they are doing, while their records stay private.

| Actor | Role code | Responsibilities |
|---|---|---|
| Participant | `PARTICIPANT` | Chooses published activity templates, sets personal daily goals, records daily activity, views own progress |
| Program Manager | `PROGRAM_MANAGER` | Creates and publishes activity templates (unit, valid range). Does **not** see individual participant records |

**Out of scope:** medical diagnosis or treatment advice (this is a recording system); self-registration, password recovery, email verification, account administration, multiple roles per account; real notifications or external services; consent-based sharing of private records.

---

## 2. Decisions

| ID | Topic | Decision | Status |
|---|---|---|---|
| D-01 | Context | Study and exercise habit programme for university students | proposed |
| D-02 | Roles | `PARTICIPANT`, `PROGRAM_MANAGER`; one role per account; seeded accounts only | proposed |
| D-03 | Duplicate entries | One entry per goal per calendar day (no accumulation). Editing an entry is not in Sprint 1 | proposed |
| D-04 | Calendar day | "Today" is decided by server time in Asia/Bangkok | proposed |
| D-05 | Back-dating | An entry may be recorded for today or up to 6 days before today (7 days including today) | proposed |
| D-06 | Template | Fields: name, unit, minValue, maxValue (minValue < maxValue). Status `DRAFT` → `PUBLISHED`. A published template cannot be changed in Sprint 1 | proposed |
| D-07 | Goal | A goal links one participant to one published template with a dailyTarget inside [minValue, maxValue]. At most one active goal per participant per template | proposed |
| D-08 | Progress | percent = value ÷ dailyTarget × 100 (not capped); `achieved` is true when value ≥ dailyTarget | proposed |
| D-09 | Privacy | Program managers cannot read individual goals, entries or progress | proposed |
| D-10 | Error codes | Not signed in → 401. Wrong role → 403. Record that belongs to another participant → 404 (do not reveal that it exists). Validation failure → 422. Conflict with existing data → 409 | proposed |
| D-11 | Session | Server-side sessions stored in the database: random token in an HttpOnly cookie, only its hash stored, fixed expiry; logout deletes the session row | **agreed** |
| D-12 | Stack | Same stack as TokTickIT (section 3) | **agreed** |
| D-13 | Questions for TA | Back-dating window, progress formula, whether Sprint 3 needs an extra feature | open |

---

## 3. Stack and repository layout

| Layer | Technology |
|---|---|
| Runtime | Node.js 24, TypeScript |
| UI | React 18, Vite, Bootstrap 5 |
| API | Express 4 (`tsx` in development, `tsc` build) |
| Database | PostgreSQL, Prisma (migrations and seed) |
| Passwords | bcryptjs |
| Server tests | Vitest + Supertest against a real test database |
| Client tests | Vitest + React Testing Library |
| End-to-end tests | Playwright |

Layout: `client/`, `server/` (`src/`, `prisma/`, `tests/`), `e2e/`, `docs/`.
Environment variables (placeholders in `.env.example`, never real values in Git): `DATABASE_URL`, `PORT`, `SESSION_TTL_HOURS`, `TZ=Asia/Bangkok`, seed passwords (`SEED_*_PASSWORD`).
Docker, CI/CD and cloud deployment are not part of Deliverable 1; the design only has to allow them later (configuration from environment, data only in the database).

---

## 4. Requirements (draft IDs)

### Functional requirements
| ID | Observable behaviour | Sprint |
|---|---|---|
| FR-01 | A user signs in with email and password and receives a session | 1 |
| FR-02 | A user signs out; the old session no longer works | 1 |
| FR-03 | The system returns the current user (id, display name, role) | 1 |
| FR-04 | A program manager creates a template (name, unit, minValue, maxValue) in `DRAFT` | 1 |
| FR-05 | A program manager publishes their template | 1 |
| FR-06 | A participant lists published templates; a program manager lists their own templates | 1 |
| FR-07 | A participant creates a goal from a published template with a dailyTarget | 1 |
| FR-08 | A participant records an entry (date, value, optional note) for their own goal | 1 |
| FR-09 | A participant views entries and computed progress for their own goal | 1 |
| FR-10 | A participant revises, pauses or archives a goal while history is kept | 2 |
| FR-11 | A participant views entry history and goal revision history | 2 |
| FR-12 | The system calculates a consecutive-day streak | 2 |
| FR-13 | A participant views weekly and monthly progress summaries | 2 |
| FR-14 | A participant defines a reminder schedule that is displayed (placeholder, nothing is sent) | 3 |

### Business rules
| ID | Rule | Response when violated | Sprint |
|---|---|---|---|
| BR-01 | Entry value must be within the template's [minValue, maxValue], bounds included | 422 | 1 |
| BR-02 | Entry date cannot be in the future | 422 | 1 |
| BR-03 | Entry date cannot be earlier than 6 days before today | 422 | 1 |
| BR-04 | One entry per goal per day (enforced by a database unique constraint) | 409 | 1 |
| BR-05 | A participant can access only their own goals and entries | 404 | 1 |
| BR-06 | Only a program manager can create or publish templates | 403 | 1 |
| BR-07 | A program manager cannot access participants' goals, entries or progress | 403 | 1 |
| BR-08 | A goal needs a published template and a positive dailyTarget within its range (dailyTarget > 0) | 422 | 1 |
| BR-09 | At most one active goal per participant per template | 409 | 1 |
| BR-10 | Revising a goal does not change the meaning of past progress | defined in Sprint 2 contract | 2 |
| BR-11 | Streak rule | defined in Sprint 2 contract | 2 |
| BR-12 | Reminders are placeholders and never send messages | — | 3 |

### Non-functional requirements
| ID | Target | Verification | Sprint |
|---|---|---|---|
| NFR-01 | Every protected endpoint rejects unauthenticated requests with 401 and returns no private data | API tests | 1 |
| NFR-02 | Passwords are stored only as hashes | Integration test reads the database; no password in logs | 1 |
| NFR-03 | A session stops working after logout and after expiry | API tests | 1 |
| NFR-04 | Data survives an application restart | Integration test | 1 |
| NFR-05 | Error responses share one JSON shape and never expose stack traces or SQL | API tests | 1 |
| NFR-06 | A fresh clone runs and passes tests by following the README | Clean-clone check by the member who did not write the README | 1 |
| NFR-07 | Main screens show loading, empty and error states | UI/E2E tests and screenshots | 1 |
| NFR-08 | No real secret in Git or client code | Review of diffs and `.env.example` | 1 |

---

## 5. Features and sprints

| Feature | Name | Requirements | Sprint |
|---|---|---|---|
| F-01 | Authentication and session | FR-01..03, NFR-01..03 | 1 |
| F-02 | Activity template management | FR-04..06, BR-06 | 1 |
| F-03 | Goal setting | FR-07, BR-08, BR-09 | 1 |
| F-04 | Daily activity logging | FR-08, BR-01..04 | 1 |
| F-05 | Progress and privacy isolation | FR-09, BR-05, BR-07 | 1 |
| F-06 | Goal revision, pause, archive | FR-10, BR-10 | 2 |
| F-07 | History and streak | FR-11, FR-12, BR-11 | 2 |
| F-08 | Progress summaries | FR-13 | 2 |
| F-09 | Reminder schedule placeholders | FR-14, BR-12 | 3 |
| — | Cross-cutting: errors, config, persistence, setup | NFR-04..08 | established 1, re-checked every sprint |
| — | Cross-cutting: hardening, regression, usability | all | 3 |

| Sprint | Goal | Features |
|---|---|---|
| 1 | Small working slice with authentication, permissions and persistence | F-01..F-05 |
| 2 | Core expansion under engineering contracts | F-06..F-08 |
| 3 | Remaining features, integration and hardening | F-09 + cross-cutting |

---

## 6. Role / permission matrix (Sprint 1)

| Operation | Anonymous | Participant | Program Manager |
|---|---|---|---|
| Sign in | allowed | allowed | allowed |
| Sign out, current user | 401 | allowed | allowed |
| Create / publish template | 401 | 403 | allowed (own templates) |
| List templates | 401 | published only | own templates, any status |
| Create goal | 401 | allowed | 403 |
| Record entry | 401 | own goals (others → 404) | 403 |
| Read goals, entries, progress | 401 | own only (others → 404) | 403 |

---

## 7. Data model (Sprint 1)

| Table | Fields | Constraints |
|---|---|---|
| `users` | id, email, passwordHash, displayName, role, createdAt | email unique |
| `sessions` | id, tokenHash, userId, expiresAt, createdAt | tokenHash unique; userId → users |
| `activity_templates` | id, name, unit, minValue, maxValue, status, createdById, createdAt | minValue < maxValue; createdById → users |
| `goals` | id, participantId, templateId, dailyTarget, status, createdAt | one active goal per (participantId, templateId); foreign keys |
| `activity_entries` | id, goalId, entryDate, value, note, createdAt | **unique (goalId, entryDate)**; goalId → goals |

Sprint 2 and 3 tables are described in the System SDS and created only when their sprint starts.

---

## 8. Sprint 1 API

| Method and path | Who | Purpose |
|---|---|---|
| `POST /api/auth/login` | anyone | Sign in, set session cookie |
| `POST /api/auth/logout` | signed in | Delete session |
| `GET /api/auth/me` | signed in | Current user |
| `POST /api/templates` | manager | Create draft template |
| `POST /api/templates/:id/publish` | manager (owner) | Publish template |
| `GET /api/templates` | signed in | List templates (by role) |
| `POST /api/goals` | participant | Create goal |
| `GET /api/goals` | participant | Own goals |
| `GET /api/goals/:id` | participant (owner) | Goal detail |
| `POST /api/goals/:id/entries` | participant (owner) | Record entry |
| `GET /api/goals/:id/entries` | participant (owner) | List entries |
| `GET /api/goals/:id/progress` | participant (owner) | Computed progress |

Error body for every failure: `{ "error": { "code": "...", "message": "..." } }`.

---

## 9. Sprint 1 acceptance criteria and planned tests

| Feature | AC | Expected outcome | Test | Level |
|---|---|---|---|---|
| F-01 | AC-01 | Valid sign-in → 200 and a session | TEST-01 | API + DB |
| | AC-02 | Wrong password or unknown email → 401 with the same message; no session | TEST-02 | API |
| | AC-03 | `/me` returns the user of the session | TEST-03 | API |
| | AC-04 | Every protected endpoint without a session → 401 | TEST-04 | API |
| | AC-05 | After logout, `/me` with the old cookie → 401 | TEST-05 | API |
| | AC-06 | Stored password is a hash, not the plain text | TEST-06 | Integration |
| F-02 | AC-07 | Manager creates a draft template; it is stored | TEST-07 | API + DB |
| | AC-08 | minValue ≥ maxValue or missing unit → 422 | TEST-08 | Unit + API |
| | AC-09 | Participant creating a template → 403 | TEST-09 | API |
| | AC-10 | Manager publishes → status `PUBLISHED` | TEST-10 | API + DB |
| | AC-11 | Participant sees only published templates | TEST-11 | API |
| F-03 | AC-12 | Participant creates a valid goal → 201 and stored | TEST-12 | API + DB |
| | AC-13 | dailyTarget outside range or non-positive (<= 0) → 422 | TEST-13 | Unit + API |
| | AC-14 | Draft or unknown template → 422 | TEST-14 | API |
| | AC-15 | Second active goal for the same template → 409 | TEST-15 | API + DB |
| | AC-16 | Manager creating a goal → 403 | TEST-16 | API |
| F-04 | AC-17 | Valid entry → 201 and can be read back | TEST-17 | API + DB |
| | AC-18 | value = min and value = max accepted; below min or above max → 422 | TEST-18 | Unit + API (boundary) |
| | AC-19 | Future date → 422 | TEST-19 | Unit + API |
| | AC-20 | Date 6 days ago accepted; 7 days ago → 422 | TEST-20 | Unit + API (boundary) |
| | AC-21 | Second entry for the same goal and day → 409; one row stored | TEST-21 | API + DB |
| | AC-22 | Two simultaneous submissions for the same goal and day → one row stored | TEST-22 | Integration |
| | AC-23 | Entry for another participant's goal → 404 | TEST-23 | API |
| F-05 | AC-24 | percent and achieved are calculated correctly | TEST-24 | Unit + API |
| | AC-25 | Participant A reading B's goal, entries or progress → 404 | TEST-25 | API |
| | AC-26 | Manager reading individual goals, entries or progress → 403 | TEST-26 | API |
| | AC-27 | UI journey: sign in → set goal → record → see progress → duplicate rejected → sign out | TEST-27 | E2E |
| Cross | AC-28 | Data is still there after an application restart | TEST-28 | Integration |
| | AC-29 | Errors use one shape and contain no stack trace | TEST-29 | API |

NFR-06, NFR-07 and NFR-08 are verified by recorded checks (clean clone, screenshots, diff review).
TDD evidence (failing test committed before implementation) is required at least for TEST-20, TEST-21, TEST-25 and TEST-26.

---

## 10. Product Definition of Done

1. Behaviour matches the feature contract.
2. Every planned test was executed; meaningful tests pass; nothing disabled or weakened; failures and skips are reported.
3. The teammate reviewed the PR with a specific comment, and it is integrated in staging.
4. Setup instructions and documents are current.
5. Incomplete work is disclosed.
6. Evidence exists: command, tested commit, pass/fail/skip counts.

---

## 11. Work allocation

Rules: every part has one **author** and one **reviewer**; the reviewer pulls the branch and runs it before approving; authors never approve their own PR; before merging, the reviewer explains the change back to the author. Roles swap between sprints. Each part starts with its own Issue.

| Part | What | Author | Reviewer | Needs merged first |
|---|---|---|---|---|
| P0 | This brief | Nitithorn | Nara | — |
| P1 | Server foundation: Express, Prisma schema/migration/seed, test DB harness, Playwright config | Nara | Nitithorn | P0 |
| P2 | Client foundation: Vite/React, UI shell, shared loading/empty/error states | Nitithorn | Nara | P0 |
| P3a | SRS: context, actors, scope, assumptions, decisions | Nitithorn | Nara | P0 |
| P3b | SRS: FR / BR / NFR with verification | Nara | Nitithorn | P0 |
| P4a | SDS: architecture, data model, auth/session, configuration, deployment plan | Nara | Nitithorn | P0 |
| P4b | SDS: screens and states, API conventions, role matrix | Nitithorn | Nara | P0 |
| P4c | Feature inventory + traceability | Nitithorn | Nara | P3b |
| P4d | Three-sprint plan + TA questions | both | — | P3a, P3b |
| P5a | Contract F-01 | Nitithorn | Nara | P3b, P4a, P4b |
| P5b | Contract F-02 | Nara | Nitithorn | P3b, P4a, P4b |
| P5c | Contract F-03 | Nitithorn | Nara | P5b |
| P5d | Contract F-04 | Nara | Nitithorn | P5c |
| P5e | Contract F-05 + cross-cutting AC | Nitithorn | Nara | P5d |
| P5f | Product DoD + full STS table | Nara | Nitithorn | P5a–P5e |
| P6a | Build F-01 (failing tests → implementation) | Nitithorn | Nara | P1, P2, P5a |
| P6b | Build F-02 | Nara | Nitithorn | P6a, P5b |
| P6c | Build F-03 | Nitithorn | Nara | P6b, P5c |
| P6d | Build F-04 (TDD session done together) | Nara | Nitithorn | P6c, P5d |
| P6e | Build F-05 | Nitithorn | Nara | P6d, P5e |
| P6f | E2E journey, concurrent duplicate test, restart test | Nara | Nitithorn | P6e |
| P7a | Integration run on staging | Nitithorn | Nara | P6f |
| P7b | README and seeded test accounts | Nitithorn | Nara | P6f |
| P7c | Clean-clone check of the README | Nara | — | P7b |
| P7d | Release PR to main + tag `v0.1.0-sprint1` | Nitithorn | Nara | P7a, P7c |
| P8a | Evidence: normal journey, rule rejection, test excerpts, TDD | Nitithorn | Nara | P7d |
| P8b | Evidence: sign-in/out and forbidden cases, AC → test → result table | Nara | Nitithorn | P7d |
| P8c | Issue/PR chains, history, contribution, AI declaration, limitations | both | — | P7d |
| P9a | PDF Parts A–C | Nitithorn | Nara | P4c, P5f |
| P9b | PDF Parts D–F, front matter, contents, navigation table | Nara | Nitithorn | P8a–P8c |
| P9c | Final audit and cross-questioning | both | — | P9a, P9b |

Parts that can run in parallel right after P0 is merged: **P1, P3b, P4a (Nara)** and **P2, P3a, P4b (Nitithorn)**.
