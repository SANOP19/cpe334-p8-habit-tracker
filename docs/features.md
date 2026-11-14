# Feature Inventory
## Habit and Activity Tracking System — CPE 334 Theme 8

| Version | Date | Author | Reviewer | Change |
|---|---|---|---|---|
| 0.1 | 2026-11-14 | Nitithorn Ketkaew | Nara Kosiyaporn | First version (PR1, Issue #16) |

Requirement IDs are defined in `docs/srs.md` §4. Acceptance criteria (AC) and planned tests for Sprint 1 are listed in `docs/project-brief.md` §9 and mapped in `docs/traceability.md`.

---

## 1. Product features

| ID | Feature | Description | Requirements | Depends on | Sprint |
|---|---|---|---|---|---|
| **F-01** | Authentication and session | Seeded users sign in with email and password, see their identity, and sign out. Server-side sessions in the database; random token in an HttpOnly cookie; only its hash stored; fixed expiry. Provides the `requireAuth` / `requireRole` checks used by every later feature. | FR-01, FR-02, FR-03, NFR-01, NFR-02, NFR-03 | Server and client foundation (P1, P2) | 1 |
| **F-02** | Activity template management | A program manager creates a template (name, unit, minValue < maxValue) as a draft and publishes it. Participants see only published templates; managers see their own. | FR-04, FR-05, FR-06, BR-06 | F-01 | 1 |
| **F-03** | Goal setting | A participant creates a goal from a published template with a daily target that is positive and within the template range; at most one active goal per template. | FR-07, BR-08, BR-09 | F-01, F-02 | 1 |
| **F-04** | Daily activity logging | A participant records one entry per goal per calendar day; value within range; date not in the future and not more than 6 days back (Asia/Bangkok); simultaneous duplicates cannot both be stored. | FR-08, BR-01, BR-02, BR-03, BR-04, NFR-09, NFR-10 | F-03 | 1 |
| **F-05** | Progress and privacy isolation | A participant sees entries and calculated progress (percent, achieved) for their own goals. Other participants' records return 404; program managers receive 403 on all goal data. | FR-09, BR-05, BR-07 | F-04 | 1 |
| **F-06** | Goal revision, pause and archive | A participant changes a goal's target, pauses or archives it; past progress keeps its original meaning. | FR-10, BR-10 | F-03, F-05 | 2 |
| **F-07** | History and streak | Entry history and goal revision history; consecutive-day streak calculation. | FR-11, FR-12, BR-11 | F-04, F-06 | 2 |
| **F-08** | Progress summaries | Weekly and monthly summaries of achievement for a participant's own goals. | FR-13 | F-05, F-07 | 2 |
| **F-09** | Reminder schedule placeholders | A participant defines reminder times that are displayed in the application only; nothing is sent. | FR-14, BR-12 | F-03 | 3 |

---

## 2. Cross-cutting system responsibilities

Some requirements are not owned by one feature. Each responsibility is established in one sprint and re-checked in every later sprint (regression).

| ID | Responsibility | Requirements | Established | Re-checked |
|---|---|---|---|---|
| **CC-01** | Safe, uniform error handling (one error shape, no stack traces or SQL, unexpected errors logged on the server) | NFR-05 | Sprint 1 — server foundation (P1, PR #12) | Every feature PR; Sprint 3 hardening |
| **CC-02** | Persistence and reproducible setup (migrations, seed, separate test database, data survives restart, README) | NFR-04, NFR-06 | Sprint 1 — P1 and release preparation (PR7) | Every release |
| **CC-03** | Configuration and secret handling (settings from environment, `.env.example` placeholders, no secrets in Git or client) | NFR-08 | Sprint 1 — P1, reviewed in every PR | Every PR review |
| **CC-04** | Shared UI states (loading, empty, error) | NFR-07 | Sprint 1 — client foundation (P2, PR #9) | Every feature with a screen |
| **CC-05** | Hardening, usability and regression | All | Sprint 3 | Final release |

---

## 3. Coverage check

- Every FR (FR-01..FR-14) belongs to exactly one feature.
- Every BR (BR-01..BR-12) belongs to a feature.
- Every NFR (NFR-01..NFR-10) belongs to a feature or a cross-cutting responsibility.
- Features F-06..F-09 have requirements and a sprint now; their acceptance criteria and tests are written in their sprint's contracts.
