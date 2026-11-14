# Sprint 1 Release Notes — `v0.1.0-sprint1`

| Item | Value |
|---|---|
| Product | Habit and Activity Tracking System (CPE 334, Theme 8) |
| Release | `v0.1.0-sprint1` (tag on the merge commit of the release PR into `main`) |
| Release candidate | `staging/sprint-1` at `3ed2771` (+ this documentation PR) |
| Team | Nitithorn Ketkaew (67070505203) · Nara Kosiyaporn (67070505218) |

## 1. Scope delivered
| Feature | Summary | PR |
|---|---|---|
| F-01 Authentication and session | Sign in, current user, sign out; server-side sessions (hashed token, HttpOnly cookie, fixed expiry); `requireAuth` / `requireRole` | #26 |
| F-02 Activity template management | Managers create and publish templates (unit, min < max); participants see published only | #27 |
| F-03 Goal setting | Participants set a positive daily target within range; one active goal per template | #28 |
| F-04 Daily activity logging | One entry per goal per day; value in range; today and 6 days back (Asia/Bangkok); race-safe duplicate check | #29 |
| F-05 Progress and privacy | Per-day percent and achieved; other participants 404, managers 403; uniform safe errors | #30 |
| Release preparation | E2E journey, README, real restart check, root scripts | #31 |

Requirements: FR-01..FR-09, BR-01..BR-09, NFR-01..NFR-10 — **all Verified** (`docs/traceability.md` v0.9). Acceptance criteria AC-01..AC-33 all have executed, passing tests.

## 2. Verification on the release candidate (`3ed2771`)
| Command | Result | Evidence |
|---|---|---|
| `npm run test:server` | 9 files, **63 passed**, 0 failed, 0 skipped | `docs/evidence/release/server.txt` |
| `npm run test:client` | 9 files, **34 passed**, 0 failed, 0 skipped | `docs/evidence/release/client.txt` |
| `npm run test:e2e` | **1 passed** (TEST-27 participant journey) | `docs/evidence/release/e2e.txt` |
| `npm run test:restart` | **NFR-04 VERIFIED** (data survives stop/start of the server) | `docs/evidence/release/restart.txt` |
| `npm run build` | server `tsc` and client `tsc && vite build` succeed | `docs/evidence/release/build.txt` |
| Clean clone (NFR-06) | Pass — README only, empty test DB, 74 s | PR #31 approval review |
| Secret check (NFR-08) | Pass — no `.env` in history, no real credentials in tracked files, 0 secret-scanning alerts | `docs/traceability.md` NFR-08 |

**Failed or skipped tests: none.**

## 3. Defects found and fixed during Sprint 1
| ID | Defect | Fix | Verified by |
|---|---|---|---|
| #25 | Init migration failed on an empty database (UTF-8 BOM at the start of `migration.sql`) | BOM removed, no SQL change (PR #26) | `migrate deploy` on fresh dev and test databases; clean clone |
| Review findings | Tests silently using an in-memory fake DB; test run able to wipe the dev DB; DB password in error output; evidence files saved as UTF-16; README missing setup steps; restart script with a fixed date | Fixed in PRs #12, #29, #31 before merge | Re-run by the reviewer each time |

## 4. Known limitations and incomplete work
| Item | Impact | Plan |
|---|---|---|
| Goal revision/pause/archive, history and streak, weekly/monthly summaries (FR-10..FR-13, BR-10, BR-11) | Not in Sprint 1 by plan | Sprint 2 contracts |
| Reminder placeholders (FR-14, BR-12), hardening | Not in Sprint 1 by plan | Sprint 3 |
| Questions Q-01..Q-03 (back-dating window, uncapped percent, Sprint 3 scope) not yet answered by the instructor/TA | The current decisions (D-05, D-08) may change | Ask the TA; record in `docs/srs.md` §6.2; any change follows the change process |
| Editing or deleting an entry | Not supported (excluded in SRS §3.3) | Later change request if needed |
| The date picker uses the device's date | A device outside Thailand may offer a date the server rejects; the server message explains it | Acceptable for Sprint 1 |
| No CI, Docker or cloud deployment yet | Tests run locally only | Lab 5 |
| E2E and restart check need local PostgreSQL and free ports 3000/3009/5173 | Must be run on a developer machine | Documented in README |
