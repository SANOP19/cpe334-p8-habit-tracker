# Requirements Traceability Matrix
## Habit and Activity Tracking System — CPE 334 Theme 8

| Version | Date | Author | Reviewer | Change |
|---|---|---|---|---|
| 0.1 | 2026-11-14 | Nitithorn Ketkaew | Nara Kosiyaporn | First version: baseline mapped to features, sprints, AC and planned tests (PR1, Issue #16) |
| 0.2 | 2026-11-14 | Nitithorn Ketkaew | Nara Kosiyaporn | F-01 results filled in (PR2, Issue #17) |
| 0.3 | 2026-11-14 | Nara Kosiyaporn | Nitithorn Ketkaew | F-02 results filled in (PR3, Issue #18) |
| 0.4 | 2026-11-14 | Nitithorn Ketkaew | Nara Kosiyaporn | F-03 results; AC-32 delivered in PR4 instead of PR6 (PR4, Issue #19) |
| 0.5 | 2026-11-14 | Nara Kosiyaporn | Nitithorn Ketkaew | F-04 results filled in (PR5, Issue #20) |
| 0.6 | 2026-11-14 | Nara Kosiyaporn | Nitithorn Ketkaew | Review feedback addressed: NFR-04 partly verified; TEST-19b midnight probe added (PR5, Issue #20) |

**Chain:** requirement (`docs/srs.md` §4) → feature or responsibility (`docs/features.md`) → sprint → acceptance criterion (`docs/project-brief.md` §9) → planned test → status.
**Status values:** *Planned* (AC and test defined, not implemented) · *Foundation* (supporting test already passes on staging, but the AC-level test is still to come) · *Verified* (AC test executed and passing at a recorded commit) · *Later sprint* (feature and sprint allocated; AC written in that sprint's contract).
This version is written before Sprint 1 feature implementation; the **Actual test / result** column is filled in as each feature PR merges.

---

## 1. Functional requirements

| Req | Feature | Sprint | AC | Planned test | Delivered in | Actual test / result | Status |
|---|---|---|---|---|---|---|---|
| FR-01 | F-01 | 1 | AC-01, AC-02 | TEST-01, TEST-02 | PR2 (#17) | `server/tests/auth.test.ts` TEST-01, TEST-02a/b/c; `client/tests/signin.test.tsx` TEST-UI-01 — pass (`docs/evidence/F-01/green-run-*.txt`) | Verified |
| FR-02 | F-01 | 1 | AC-05 | TEST-05 | PR2 (#17) | `server/tests/auth.test.ts` TEST-05 (×2); `client/tests/app.test.tsx` TEST-UI-02 — pass | Verified |
| FR-03 | F-01 | 1 | AC-03 | TEST-03 | PR2 (#17) | `server/tests/auth.test.ts` TEST-03; `client/tests/app.test.tsx` TEST-UI-02 — pass | Verified |
| FR-04 | F-02 | 1 | AC-07, AC-08 | TEST-07, TEST-08 | PR3 (#18) | `server/tests/templates.test.ts` TEST-07, TEST-08, TEST-08b; `client/tests/templates.test.tsx` TEST-UI-03 — pass (`docs/evidence/F-02/green-run-*.txt`) | Verified |
| FR-05 | F-02 | 1 | AC-10, AC-30, AC-31 | TEST-10, TEST-30, TEST-31 | PR3 (#18) | `server/tests/templates.test.ts` TEST-10, TEST-30, TEST-31; `client/tests/templates.test.tsx` TEST-UI-04 — pass | Verified |
| FR-06 | F-02 | 1 | AC-11 | TEST-11 | PR3 (#18) | `server/tests/templates.test.ts` TEST-11a, TEST-11b; `client/tests/templates.test.tsx` TEST-UI-04 — pass | Verified |
| FR-07 | F-03 | 1 | AC-12 | TEST-12 | PR4 (#19) | `server/tests/goals.test.ts` TEST-12; `client/tests/goals.test.tsx` TEST-UI-05/06 — pass (`docs/evidence/F-03/green-run-*.txt`) | Verified |
| FR-08 | F-04 | 1 | AC-17 | TEST-17 | PR5 (#20) | `server/tests/logging.test.ts` TEST-17; `client/tests/logging.test.tsx` TEST-UI-07 — pass (`docs/evidence/F-04/green-run-*.txt`) | Verified |
| FR-09 | F-05 | 1 | AC-24, AC-27 | TEST-24, TEST-27 (E2E) | PR6 (#21), PR7 (#22) | — | Planned |
| FR-10 | F-06 | 2 | Sprint 2 contract | Sprint 2 STS | Sprint 2 | — | Later sprint |
| FR-11 | F-07 | 2 | Sprint 2 contract | Sprint 2 STS | Sprint 2 | — | Later sprint |
| FR-12 | F-07 | 2 | Sprint 2 contract | Sprint 2 STS | Sprint 2 | — | Later sprint |
| FR-13 | F-08 | 2 | Sprint 2 contract | Sprint 2 STS | Sprint 2 | — | Later sprint |
| FR-14 | F-09 | 3 | Sprint 3 contract | Sprint 3 STS | Sprint 3 | — | Later sprint |

## 2. Business rules

| Req | Feature | Sprint | AC | Planned test | Delivered in | Actual test / result | Status |
|---|---|---|---|---|---|---|---|
| BR-01 | F-04 | 1 | AC-18 | TEST-18 (boundary) | PR5 (#20) | `server/tests/logging.test.ts` TEST-18a, TEST-18b, TEST-18c — pass | Verified |
| BR-02 | F-04 | 1 | AC-19 | TEST-19 | PR5 (#20) | `server/tests/logging.test.ts` TEST-19 — pass | Verified |
| BR-03 | F-04 | 1 | AC-20 | TEST-20 (boundary, TDD evidence) | PR5 (#20) | `server/tests/logging.test.ts` TEST-20 — pass (`docs/evidence/F-04/green-run-server.txt`) | Verified |
| BR-04 | F-04 | 1 | AC-21, AC-22 | TEST-21 (TDD evidence), TEST-22 | PR5 (#20) | `server/tests/logging.test.ts` TEST-21, TEST-22 (concurrent, repeated 5×) and `db-constraints.test.ts` — pass | Verified |
| BR-05 | F-03, F-04, F-05 | 1 | AC-23, AC-25 | TEST-G1 (goals), TEST-23, TEST-25 (TDD evidence) | PR4 (#19), PR5 (#20), PR6 (#21) | Goals: `server/tests/goals.test.ts` TEST-G1 — pass; Entries: `server/tests/logging.test.ts` TEST-23 — pass. Progress: PR6 | Partly verified |
| BR-06 | F-02 | 1 | AC-09 | TEST-09 | PR3 (#18) | `server/tests/templates.test.ts` TEST-09, TEST-09b; `client/tests/templates.test.tsx` TEST-UI-04 — pass | Verified |
| BR-07 | F-03, F-05 | 1 | AC-26, AC-32 | TEST-26 (TDD evidence), TEST-32 | PR4 (#19) for AC-32, PR6 (#21) for AC-26 | AC-32: `server/tests/goals.test.ts` TEST-32 — pass. AC-26: still to come | Partly verified |
| BR-08 | F-03 | 1 | AC-13, AC-14 | TEST-13, TEST-14 | PR4 (#19) | `server/tests/goals.test.ts` TEST-13a/b/c, TEST-14 — pass | Verified |
| BR-09 | F-03 | 1 | AC-15 | TEST-15 | PR4 (#19) | `server/tests/goals.test.ts` TEST-15a, TEST-15b (concurrent, repeated 5×) and `db-constraints.test.ts` — pass | Verified |
| BR-10 | F-06 | 2 | Sprint 2 contract | Sprint 2 STS | Sprint 2 | — | Later sprint |
| BR-11 | F-07 | 2 | Sprint 2 contract | Sprint 2 STS | Sprint 2 | — | Later sprint |
| BR-12 | F-09 | 3 | Sprint 3 contract | Sprint 3 STS | Sprint 3 | — | Later sprint |

## 3. Non-functional requirements

| Req | Feature / responsibility | Sprint | AC or verification target | Planned verification | Delivered in | Actual test / result | Status |
|---|---|---|---|---|---|---|---|
| NFR-01 | F-01 | 1 | AC-04 | TEST-04 (every protected endpoint; extended by each feature PR) | PR2 (#17) onwards | `server/tests/auth.test.ts` TEST-04 — pass for F-01, F-02, F-03, and F-04 endpoints; later PRs add theirs | Partly verified |
| NFR-02 | F-01 | 1 | AC-06 | TEST-06 | PR2 (#17) | `server/tests/auth.test.ts` TEST-06 and `server/tests/seed.test.ts` — pass | Verified |
| NFR-03 | F-01 | 1 | AC-05, AC-33 | TEST-05, TEST-33 | PR2 (#17) | `server/tests/auth.test.ts` TEST-05, TEST-33 — pass | Verified |
| NFR-04 | CC-02 | 1 | AC-28 | TEST-28 | PR5 (#20) | `server/tests/logging.test.ts` TEST-28 (persisted across client reconnect) — pass; real app restart in PR7 | Partly verified |
| NFR-05 | CC-01 | 1 | AC-29 | TEST-29 | PR6 (#21) | Error handler (500 → `INTERNAL_ERROR`, malformed JSON → 422) tested in `server/tests/health.test.ts` (PR #12) | Foundation |
| NFR-06 | CC-02 | 1 | Clean clone runs by following README | Recorded clean-clone check by the member who did not write the README | PR7 (#22) | — | Planned |
| NFR-07 | CC-04 | 1 | Loading / empty / error states on main screens | Component tests + TEST-27 (E2E) + screenshots | PR2–PR7 | Shared components tested in `client/tests/components.test.tsx` (PR #9) | Foundation |
| NFR-08 | CC-03 | 1 | No secret in Git or client code | Diff review in every PR; `.env.example` check; GitHub secret scanning enabled | Every PR | — | Planned |
| NFR-09 | F-04 | 1 | AC-19, AC-20 | TEST-19, TEST-20 with mocked clock | PR5 (#20) | `server/tests/logging.test.ts` TEST-19, TEST-19b (midnight crossing 17:30 UTC = 00:30 Bangkok), TEST-20 — pass | Verified |
| NFR-10 | F-04 | 1 | AC-22 | TEST-22 | PR5 (#20) | `server/tests/logging.test.ts` TEST-22 (two simultaneous submissions, repeated 5×) — pass | Verified |

## 4. Acceptance criteria not tied to a single FR/BR/NFR

| AC | What it verifies | Source | Test | Delivered in |
|---|---|---|---|---|
| AC-16 | Manager creating a goal → 403 | Role matrix (SDS §5.4) | TEST-16 — pass | PR4 (#19) |
| AC-02 | Same 401 message for unknown email and wrong password | SDS §5.3 (no account enumeration) | TEST-02 | PR2 (#17) |
| AC-08 | minValue ≥ maxValue → 422 | Decision D-06 | TEST-08 | PR3 (#18) |

Every Sprint 1 AC (AC-01..AC-33) appears at least once in sections 1–4.

---

## 5. Coverage gaps

| Gap | Impact | Plan |
|---|---|---|
| FR-10..FR-14, BR-10..BR-12 have no AC yet | Expected: later-sprint features are allocated but not elaborated | Written in the Sprint 2 and Sprint 3 contracts |
| BR-11 streak rule is a draft | Behaviour on a day not yet recorded is undecided | Decide in the F-07 contract |
| Q-01..Q-03 (back-dating window, progress formula, Sprint 3 scope) are open | Answers could change BR-03, D-08 or Sprint 3 | Ask the instructor/TA; record in `docs/srs.md` §6.2 |
| Q-04 (whole numbers or decimals) is open | Affects BR-01 boundary tests | Decide in the F-04 contract (PR5) |
| Seed has one participant; cross-participant tests need two | AC-25 cannot be demonstrated with seed data | Second participant added in PR6 (#21) |

## 6. Approved changes to the baseline

| Change | Where | Reason |
|---|---|---|
| BR-08 requires dailyTarget > 0; AC-13 updated | PR #13 | A zero target would make the progress formula divide by zero |
| NFR-09 (timezone) and NFR-10 (concurrency) added | PR #13; added to brief in PR1 | Make two important quality properties explicit and testable |
| A proposed cross-platform NFR was removed | PR #13 | Could not be verified on the team's machines |
| AC-30, AC-31, AC-32 added | PR1 | Role-matrix cases found without tests in the P4b review |
| AC-33 added | PR1 | NFR-03 includes session expiry, but AC-05 covered only logout |
| AC-32 verified in PR4 (F-03) instead of PR6 (F-05) | PR4 | The goal endpoints and their role guard are built in F-03, so the manager-403 check belongs with them |
| Work allocation reduced from ~30 parts to 8 PRs | PR1 (brief §11) | Fewer review round-trips; no requirement or AC removed |
