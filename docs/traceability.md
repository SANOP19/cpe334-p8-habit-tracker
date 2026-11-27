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
| 0.7 | 2026-11-14 | Nitithorn Ketkaew | Nara Kosiyaporn | F-05 results; seed gap closed (PR6, Issue #21) |
| 0.8 | 2026-11-14 | Nara Kosiyaporn | Nitithorn Ketkaew | PR7 results: E2E TEST-27 verified (FR-09 Verified), NFR-06 checklist ready for reviewer clean clone (PR7, Issue #22) |
| 0.9 | 2026-11-14 | Nitithorn Ketkaew | Nara Kosiyaporn | Pre-release: NFR-01, NFR-06, NFR-07, NFR-08 verified; Q-04 gap closed (PR8, Issue #23) |
| 1.0 | 2026-11-25 | Nitithorn Ketkaew | Nara Kosiyaporn | Lab 6 pre-UAT corrections section added; KI-1 ids outside the INT4 range (Issue #59) |
| 1.1 | 2026-11-25 | Nitithorn Ketkaew | Nara Kosiyaporn | Lab 6 pre-UAT corrections KI-2 oversized body, KI-4 note length, KI-5 note type (Issues #60, #62, #63) |
| 1.2 | 2026-11-25 | Nitithorn Ketkaew | Nara Kosiyaporn | Lab 6 pre-UAT corrections KI-3 Bangkok log date, KI-6 history order, KI-7 saving state and date badge (Issues #61, #64, #65) |
| 1.3 | 2026-11-25 | Nitithorn Ketkaew | Nara Kosiyaporn | KI-8 F-02 contract wording (Issue #66) as an approved change; section 7 rows point to their merged PRs and are ordered by Issue |
| 1.4 | 2026-11-26 | Nitithorn Ketkaew | Nara Kosiyaporn | Lab 6 pre-UAT correction KI-9 long notes overflow the goal card (Issue #75), found in the Product Team dry run |
| 1.5 | 2026-11-26 | Nitithorn Ketkaew | Nara Kosiyaporn | Lab 6 pre-UAT correction KI-10 header does not fit a phone-width screen (Issue #79), found in the Product Team live check of `v0.2.2-lab6` |
| 1.6 | 2026-11-27 | Nitithorn Ketkaew | Nara Kosiyaporn | Section 8 added: Lab 6 Part D corrections of partner-team findings; #87 percentage rounded up to 100 below the target (PT EXP-02) |
| 1.7 | 2026-11-27 | Nitithorn Ketkaew | Nara Kosiyaporn | #86 negative template minimum (PT EXP-01): F-02 v1.2 approved change (§6) and section 8 row; TEST-L6-86 added to FR-04 / AC-08 |
| 1.8 | 2026-11-27 | Nara Kosiyaporn | Nitithorn Ketkaew | #88 long template names and units overflow the cards (PT EXP-03): section 8 row |
| 1.9 | 2026-11-28 | Nara Kosiyaporn | Nitithorn Ketkaew | #94 long display name overflows the phone-width header (Product Team observation O-11) |

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
| FR-04 | F-02 | 1 | AC-07, AC-08 | TEST-07, TEST-08 | PR3 (#18) | `server/tests/templates.test.ts` TEST-07, TEST-08, TEST-08b, TEST-L6-86 (Lab 6 #86); `client/tests/templates.test.tsx` TEST-UI-03 — pass (`docs/evidence/F-02/green-run-*.txt`) | Verified |
| FR-05 | F-02 | 1 | AC-10, AC-30, AC-31 | TEST-10, TEST-30, TEST-31 | PR3 (#18) | `server/tests/templates.test.ts` TEST-10, TEST-30, TEST-31; `client/tests/templates.test.tsx` TEST-UI-04 — pass | Verified |
| FR-06 | F-02 | 1 | AC-11 | TEST-11 | PR3 (#18) | `server/tests/templates.test.ts` TEST-11a, TEST-11b; `client/tests/templates.test.tsx` TEST-UI-04 — pass | Verified |
| FR-07 | F-03 | 1 | AC-12 | TEST-12 | PR4 (#19) | `server/tests/goals.test.ts` TEST-12; `client/tests/goals.test.tsx` TEST-UI-05/06 — pass (`docs/evidence/F-03/green-run-*.txt`) | Verified |
| FR-08 | F-04 | 1 | AC-17 | TEST-17 | PR5 (#20) | `server/tests/logging.test.ts` TEST-17; `client/tests/logging.test.tsx` TEST-UI-07 — pass (`docs/evidence/F-04/green-run-*.txt`) | Verified |
| FR-09 | F-05 | 1 | AC-24, AC-27 | TEST-24, TEST-27 (E2E) | PR6 (#21), PR7 (#22) | `server/tests/progress.test.ts` TEST-24a/b/c, TEST-L6-87 (Lab 6 #87); `client/tests/progress.test.tsx` TEST-UI-08; `e2e/journey.spec.ts` TEST-27 — pass (`docs/evidence/PR7/`) | Verified |
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
| BR-05 | F-03, F-04, F-05 | 1 | AC-23, AC-25 | TEST-G1, TEST-23, TEST-25 (TDD evidence) | PR4 (#19), PR5 (#20), PR6 (#21) | `server/tests/goals.test.ts` TEST-G1, `logging.test.ts` TEST-23, `progress.test.ts` TEST-25 (goal, entries and progress together, with own-goal positive control) — pass (`docs/evidence/F-05/`) | Verified |
| BR-06 | F-02 | 1 | AC-09 | TEST-09 | PR3 (#18) | `server/tests/templates.test.ts` TEST-09, TEST-09b; `client/tests/templates.test.tsx` TEST-UI-04 — pass | Verified |
| BR-07 | F-03, F-05 | 1 | AC-26, AC-32 | TEST-26 (TDD evidence), TEST-32 | PR4 (#19), PR6 (#21) | `server/tests/goals.test.ts` TEST-32; `progress.test.ts` TEST-26 (goal, entries, progress) — pass | Verified |
| BR-08 | F-03 | 1 | AC-13, AC-14 | TEST-13, TEST-14 | PR4 (#19) | `server/tests/goals.test.ts` TEST-13a/b/c, TEST-14 — pass | Verified |
| BR-09 | F-03 | 1 | AC-15 | TEST-15 | PR4 (#19) | `server/tests/goals.test.ts` TEST-15a, TEST-15b (concurrent, repeated 5×) and `db-constraints.test.ts` — pass | Verified |
| BR-10 | F-06 | 2 | Sprint 2 contract | Sprint 2 STS | Sprint 2 | — | Later sprint |
| BR-11 | F-07 | 2 | Sprint 2 contract | Sprint 2 STS | Sprint 2 | — | Later sprint |
| BR-12 | F-09 | 3 | Sprint 3 contract | Sprint 3 STS | Sprint 3 | — | Later sprint |

## 3. Non-functional requirements

| Req | Feature / responsibility | Sprint | AC or verification target | Planned verification | Delivered in | Actual test / result | Status |
|---|---|---|---|---|---|---|---|
| NFR-01 | F-01 | 1 | AC-04 | TEST-04 (every protected endpoint) | PR2 (#17) onwards | `server/tests/auth.test.ts` TEST-04 covers all 11 protected endpoints (every route except `POST /api/auth/login`), with no cookie and with an unknown cookie — pass (`docs/evidence/release/server.txt`) | Verified |
| NFR-02 | F-01 | 1 | AC-06 | TEST-06 | PR2 (#17) | `server/tests/auth.test.ts` TEST-06 and `server/tests/seed.test.ts` — pass | Verified |
| NFR-03 | F-01 | 1 | AC-05, AC-33 | TEST-05, TEST-33 | PR2 (#17) | `server/tests/auth.test.ts` TEST-05, TEST-33 — pass | Verified |
| NFR-04 | CC-02 | 1 | AC-28 | TEST-28 | PR7 (#22) | `server/tests/logging.test.ts` TEST-28 (client reconnect) and real process restart script `scripts/verify-nfr04-restart.cjs` (`docs/evidence/PR7/nfr04-restart.txt`) — pass | Verified |
| NFR-05 | CC-01 | 1 | AC-29 | TEST-29 | PR6 (#21) | `server/tests/progress.test.ts` TEST-29 (401, 403, 404, 409, 422, malformed JSON, unknown route, 500) and `health.test.ts` — pass | Verified |
| NFR-06 | CC-02 | 1 | Clean clone runs by following README | Recorded clean-clone check by the member who did not write the README | PR7 (#22) | Clean clone by Nitithorn following only README.md, empty test DB, commit `19c33fa`: install, migrate, seed, server 63 / client 34 / E2E 1 passed, restart check and build OK, 74 s — recorded in the PR #31 approval review (two earlier runs failed and were fixed) | Verified |
| NFR-07 | CC-04 | 1 | Loading / empty / error states on main screens | Component tests + TEST-27 (E2E) + screenshots | PR2–PR7 | `client/tests/components.test.tsx` (shared states), `signin.test.tsx` (loading), `templates.test.tsx` and `goals.test.tsx` (empty, error), `progress.test.tsx` (quiet failure), `e2e/journey.spec.ts` — pass. Screenshots for the report are taken from the release | Verified |
| NFR-08 | CC-03 | 1 | No secret in Git or client code | Diff review in every PR; `.env.example` check; GitHub secret scanning enabled | Every PR; release check | Release check on `3ed2771`: no `.env` file ever committed (full history), no credential-bearing connection string and none of the real local seed/DB passwords in any tracked file; only synthetic test-fixture passwords in tests; GitHub secret scanning and push protection enabled, 0 alerts | Verified |
| NFR-09 | F-04 | 1 | AC-19, AC-20 | TEST-19, TEST-20 with mocked clock | PR5 (#20) | `server/tests/logging.test.ts` TEST-19, TEST-19b (midnight crossing 17:30 UTC = 00:30 Bangkok), TEST-20 — pass | Verified |
| NFR-10 | F-04 | 1 | AC-22 | TEST-22 | PR5 (#20) | `server/tests/logging.test.ts` TEST-22 (two simultaneous submissions, repeated 5×) — pass | Verified |

## 4. Acceptance criteria not tied to a single FR/BR/NFR

| AC | What it verifies | Source | Test | Delivered in |
|---|---|---|---|---|
| AC-16 | Manager creating a goal → 403 | Role matrix (SDS §5.4) | TEST-16 — pass | PR4 (#19) |
| AC-02 | Same 401 message for unknown email and wrong password | SDS §5.3 (no account enumeration) | TEST-02 | PR2 (#17) |
| AC-08 | minValue ≥ maxValue → 422; from F-02 v1.2 also minValue < 0 → 422 | Decision D-06; Lab 6 #86 | TEST-08, TEST-L6-86 | PR3 (#18); Lab 6 #86 |

Every Sprint 1 AC (AC-01..AC-33) appears at least once in sections 1–4.

---

## 5. Coverage gaps

| Gap | Impact | Plan |
|---|---|---|
| FR-10..FR-14, BR-10..BR-12 have no AC yet | Expected: later-sprint features are allocated but not elaborated | Written in the Sprint 2 and Sprint 3 contracts |
| BR-11 streak rule is a draft | Behaviour on a day not yet recorded is undecided | Decide in the F-07 contract |
| Q-01..Q-03 (back-dating window, progress formula, Sprint 3 scope) are open | Answers could change BR-03, D-08 or Sprint 3 | Ask the instructor/TA; record in `docs/srs.md` §6.2 |
| ~~Q-04 (whole numbers or decimals) is open~~ | Closed | Decimals supported; decided in the F-04 contract and recorded in `docs/srs.md` §6.2 (PR #29) |
| ~~Seed has one participant; cross-participant tests need two~~ | Closed | `participant2@example.test` added to the seed in PR6 (#21), TEST-S2 |

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
| F-02 §4 empty-state text "…template below." corrected to "…template above." | Lab 6 PR-4 (Issue #66) | The contract text contradicted the reviewed layout (create form above the list); the code was already right, so only the text changes |
| F-02 v1.2: `minValue` must be 0 or more (422 `INVALID_RANGE`, checked before `minValue < maxValue`); AC-08 extended | Lab 6 Part D (Issue #86, partner-team finding EXP-01) | D-06 allowed any `minValue < maxValue`, so a template such as −10..0 could be published although F-03 / BR-08 need a positive target inside the range: no goal could ever be set. A non-negative minimum makes every template usable and rules out negative entries and percentages; existing templates are not changed |

---

## 7. Lab 6 pre-UAT corrections

Contract deviations found by the Product Team's own audit (24 Nov 2026) and dry run (26 Nov 2026) before independent UAT. Each code deviation was corrected with a failing test first; KI-8 is a correction of contract text only. They restore Sprint 1 behaviour; no requirement or AC changes.

| Issue | Deviation | Contract | Test | Delivered in | Result |
|---|---|---|---|---|---|
| #59 KI-1 | Ids above 2147483647 returned 500 (INT4 overflow in Prisma) | D-10 (F-04 §2 check 3), AC-14, NFR-05 | `server/tests/ids.test.ts` TEST-L6-59a/b/c, control TEST-L6-59d | PR #69 (PR-1) | RED 3 failed / 1 passed, GREEN 4 passed; server 76, client 35, E2E 1 (`docs/evidence/lab-06/59/`) |
| #60 KI-2 | JSON body over the 100 KB limit returned 500 | NFR-05 (client errors are not 500) | `server/tests/health.test.ts` TEST-L6-60 (with a 50 KB control) | PR #70 (PR-2) | RED 1 failed, GREEN 1 passed (`docs/evidence/lab-06/60/`) |
| #61 KI-3 | Log date default/min/max came from the device timezone | F-04 §4 UI, NFR-09 (Asia/Bangkok) | `client/tests/logging.test.tsx` TEST-L6-61 (device set to UTC, 17:30 UTC) | PR #71 (PR-3) | RED 1 failed (received 2026-11-23, expected 2026-11-24), GREEN 1 passed (`docs/evidence/lab-06/61/`) |
| #62 KI-4 | Notes longer than 500 characters were stored | F-04 §1 (note up to 500 characters) | `server/tests/logging.test.ts` TEST-L6-62 (with a 500-character control) | PR #70 (PR-2) | RED 1 failed, GREEN 1 passed (`docs/evidence/lab-06/62/`) |
| #63 KI-5 | Non-string notes were stored as null with 201 | F-04 §2 check 4 (invalid field → 422 with details) | `server/tests/logging.test.ts` TEST-L6-63 (with a `null` control) | PR #70 (PR-2) | RED 1 failed, GREEN 1 passed (`docs/evidence/lab-06/63/`); PR-2 regression: server 79, client 35, E2E 1 (`docs/evidence/lab-06/regression-pr-2.txt`) |
| #64 KI-6 | An older-date entry appeared on top of the history until reload | F-04 §4 UI (newest date first) | `client/tests/logging.test.tsx` TEST-L6-64 | PR #71 (PR-3) | RED 1 failed, GREEN 1 passed (`docs/evidence/lab-06/64/`) |
| #65 KI-7 | Save entry showed "Saving..." instead of Loading; date was not a badge | F-04 §4 UI | `client/tests/logging.test.tsx` TEST-L6-65 | PR #71 (PR-3) | RED 1 failed (badge), after part 1 still failed (Loading), GREEN 1 passed (`docs/evidence/lab-06/65/`); PR-3 regression: server 79, client 38, E2E 1 (`docs/evidence/lab-06/regression-pr-3.txt`) |
| #66 KI-8 | F-02 contract text said the empty state points "below"; the form is above | F-02 §4 (contract text only) | none — documentation only; the code (`TemplatesPage.tsx`) already said "above" | PR-4 | Contract v1.1 and §6 approved change; no behaviour change |
| #75 KI-9 | A 500-character note without spaces made the history row, the card and the page thousands of pixels wide | F-04 §1 (note up to 500 characters), §4 (history row), NFR-07 | `e2e/layout.spec.ts` TEST-L6-75 (Playwright, real layout) | branch `fix/75-note-wrap` (PR-5) | RED 1 failed (row 4078 px for a 516 px row), GREEN 1 passed; server 79, client 38, E2E 2 (`docs/evidence/lab-06/75/`) |
| #79 KI-10 | At 375 px the header's user group (display name, role label, Sign out) ended at x = 482 (Participant) / 469 (Program Manager), so the page scrolled sideways and Sign out was off screen | F-01 §UI (Header), SRS A-05 (desktop or mobile browser), NFR-07 | `e2e/header.spec.ts` TEST-L6-79 (Playwright at 375 px for both roles, plus a 1280 px one-line control) | branch `fix/79-header-mobile` (PR-6) | RED 2 failed / 1 passed (control), GREEN 3 passed; server 79, client 38, E2E 5 (`docs/evidence/lab-06/79/`) |

---

## 8. Lab 6 Part D corrections (partner-team findings)

Defects found by the partner team (CPMS, Theme 6) in independent UAT of `v0.2.3-lab6` (`b51c5e7`) and accepted in our triage. Each is corrected with a failing test first, for release `v0.2.4-lab6`.

| Issue | Deviation | Contract | Test | Delivered in | Result |
|---|---|---|---|---|---|
| #87 (PT EXP-02, minor) | A value just below a 0.1 step was rounded up: 9.99999999999 of 10 showed 100% while not achieved | F-05 §1.2 (truncated; never 100% unless the target is met), D-08, AC-24 | `server/tests/progress.test.ts` TEST-L6-87 (unit + API, with a floating-point noise control) | branch `fix/87-percent-truncation` | RED 3 failed / 1 passed (control), GREEN 4 passed; server 83, client 38, E2E 5 (`docs/evidence/lab-06/87/`) |
| #86 (PT EXP-01, minor) | A template with a negative minimum (e.g. −10..0) was created (201) and published, although no positive daily target fits its range, so no goal could be set; a range such as −10..10 also allowed −100% | F-02 v1.2 §1.3 (approved change, §6), AC-08, F-03 / BR-08, D-06 | `server/tests/templates.test.ts` TEST-L6-86 (with 0..1 and 0.5..10.5 controls); `client/tests/templates.test.tsx` TEST-UI-L6-86 | branch `fix/86-template-min-zero` | Contract first (`b5cb443`); RED 1 failed server (201 instead of 422) / 1 failed client (no `min`), GREEN 12 and 6 passed; server 84, client 39, E2E 5 (`docs/evidence/lab-06/86/`) |
| #88 (PT EXP-03, minor) | An 80-character template name and 40-character unit without spaces overflowed the template and goal cards (title x = 969 / 1605, badge x = 1049 / 1685, unit label x = 478 / 667, page scroll width up to 1049 at 375 px and 1685 at 1280 px) | F-02 §4, F-03 §4, F-04 §4, SRS A-05 | `e2e/cards.spec.ts` TEST-L6-88 (Playwright at 375 and 1280 px, with a short-name control) | branch `fix/88-card-wrap` | RED 6 failed / 1 passed (control), GREEN 7 passed; server 84, client 39, E2E 12 (`docs/evidence/lab-06/88/`) |

---

## 9. Lab 6 Product Team correction during Part D

Defect found by the Product Team while reviewing PR #91, not a partner-team finding.

| Issue | Deviation | Contract | Test | Delivered in | Result |
|---|---|---|---|---|---|
| #94 (Product Team O-11, minor) | At 375 px a long display name (30 characters with spaces or 40 characters without spaces) stayed on one line (`text-nowrap`) and pushed the role label and Sign out off screen (page scroll width 396–682 px on Windows Chromium; 388 px for `E2E Cards Manager` in CI run 46030798846) | F-01 §UI (Header), SRS A-05 | `e2e/header.spec.ts` TEST-L6-94 (375 px, both roles, two name shapes, seed-name control) | branch `fix/94-header-long-name` | RED 4 failed / 5 passed, GREEN 9 passed; server 84, client 39, E2E 18 (`docs/evidence/lab-06/94/`) |
