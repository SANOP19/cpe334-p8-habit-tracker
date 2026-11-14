# Three-Sprint Plan
## Habit and Activity Tracking System — CPE 334 Theme 8

| Version | Date | Author | Reviewer | Change |
|---|---|---|---|---|
| 0.1 | 2026-11-14 | Nitithorn Ketkaew | Nara Kosiyaporn | First version (PR1, Issue #16) |

Features are defined in `docs/features.md`; requirement coverage is in `docs/traceability.md`. Together the three sprints cover every baseline FR, BR and NFR.

---

## Sprint 1 — Small working domain slice
**Goal:** a participant can sign in, choose a published template, set a goal, record daily activity and see calculated progress; a program manager can create and publish templates; the server enforces authentication, roles, record ownership and the logging rules, and data persists in PostgreSQL.

| Item | Detail |
|---|---|
| Features | F-01 Authentication and session · F-02 Template management · F-03 Goal setting · F-04 Daily logging · F-05 Progress and privacy |
| Cross-cutting established | CC-01 error handling · CC-02 persistence and setup · CC-03 configuration and secrets · CC-04 UI states |
| Dependencies | Server and client foundation (P1, P2, merged) → F-01 → F-02 → F-03 → F-04 → F-05 → release preparation |
| Completion outcome | Reviewed release on `main`, tag `v0.1.0-sprint1`; AC-01..AC-33 executed with recorded results; README setup verified on a clean clone |
| Checkpoint | Deliverable 1 |

**Why this scope is feasible:** the slice has five tables and twelve endpoints and reuses the stack both members used in Labs 1–4 (React, Express, PostgreSQL with Prisma, Vitest, Playwright). The foundations (server, database constraints, test harness, client shell) are already merged, so each feature PR adds one bounded behaviour on top. It still meets the course minimum: real authentication with two roles, a domain transaction (recording an entry) with business-rule rejection (range, date, duplicate), and access restrictions tested on the backend.

**Delivery order (8 PRs):**

| PR | Content | Author | Reviewer |
|---|---|---|---|
| PR1 | Remaining baseline documents (this plan, features, traceability, DoD) | Nitithorn | Nara |
| PR2 | F-01 | Nitithorn | Nara |
| PR3 | F-02 | Nara | Nitithorn |
| PR4 | F-03 | Nitithorn | Nara |
| PR5 | F-04 (main TDD evidence) | Nara | Nitithorn |
| PR6 | F-05 | Nitithorn | Nara |
| PR7 | Release preparation: E2E journey, README, full run | Nara | Nitithorn |
| PR8 | Release to `main` and tag | Nitithorn | Nara |

---

## Sprint 2 — Core expansion
**Goal:** participants can manage goals over time and understand their history: revise, pause or archive goals without changing past progress, see entry and revision history, streaks, and weekly/monthly summaries.

| Item | Detail |
|---|---|
| Features | F-06 Goal revision, pause, archive · F-07 History and streak · F-08 Progress summaries |
| Requirements | FR-10..FR-13, BR-10, BR-11 |
| Dependencies | Sprint 1 goals, entries and progress calculation (F-03..F-05). F-07 depends on F-06 (revision history); F-08 depends on F-05 and F-07 |
| Data changes (planned) | Goal target history (effective-from date) so past progress uses the target that applied on that day; goal status transitions `ACTIVE` ↔ `PAUSED`, `ACTIVE`/`PAUSED` → `ARCHIVED` |
| Completion outcome | Contracts written before implementation; all Sprint 2 AC verified; Sprint 1 regression passing; reviewed Sprint 2 release |
| Checkpoint | Deliverable 2 (Sprint 2 complete) |

**Roles swap:** in Sprint 2 the member who did not author a related Sprint 1 feature authors the new one where possible (e.g. Nara authors F-06 goal revision, which builds on Nitithorn's F-03), so neither member keeps a fixed area.

---

## Sprint 3 — Remaining features, integration and hardening
**Goal:** complete the product and make it robust: reminder schedule placeholders, error handling and usability improvements, authorization review of every endpoint added since Sprint 1, regression tests and defect fixes.

| Item | Detail |
|---|---|
| Features | F-09 Reminder schedule placeholders · CC-05 hardening, usability and regression |
| Requirements | FR-14, BR-12; all NFR re-checked on the final version |
| Dependencies | F-03 for reminders; all earlier features for hardening |
| Completion outcome | All baseline requirements implemented or explicitly reported; full regression suite passing on the final release; remaining defects and debt listed |
| Checkpoint | Progress shown at Deliverable 2; completed for the final delivery |

Question Q-03 (whether Sprint 3 needs an additional feature) has a working team decision (SRS §6.2: Sprint 3 stays as planned) but the instructor/TA has not answered; any added feature will be recorded as an approved change in `docs/traceability.md` §6.
