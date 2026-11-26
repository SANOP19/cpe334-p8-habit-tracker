# HabitPulse — Sprint 1 UAT Handoff (Lab 6)

**Document version:** v1.0, 2026-11-26, written by Nara Kosiyaporn, reviewed by Nitithorn Ketkaew

---

## 1. Product, team and contacts

| Item | Details |
|---|---|
| **Product** | HabitPulse — Habit and Activity Tracking System (CPE 334, Theme 8) |
| **Product Team** | Team YaWan (team 31, section 131): Nitithorn Ketkaew (67070505203, `@SANOP19`) and Nara Kosiyaporn (67070505218, `@narakosi-dev`) |
| **Repository** | https://github.com/SANOP19/cpe334-p8-habit-tracker (public) |
| **Partner (UAT) Team** | CPMS Team — Course Project Management System (Theme 6) |
| **Contacts** | Our shared group chat with the partner team (no personal phone numbers or personal email addresses are listed in this document) |

---

## 2. Release under test

| Item | Value |
|---|---|
| **Live URL** | https://sf4618437-4d7hbszvwq-as.a.run.app *(first load may take ~3 seconds due to Cloud Run cold start)* |
| **Release under test** | Tag `v0.2.3-lab6`, commit `b51c5e7bfa2e6f008b3ec49da70510551e488ce4`, Cloud Run revision `sf4618437-00010-xj9` |
| **Sprint 1 baseline** | Tag `v0.1.0-sprint1`, commit `bfd125fa3a51cb3e3382d6938906960109cbce53` |

**What changed since the Sprint 1 baseline:**
- Lab 5 deployment additions only (`/api/ready` readiness probe, serving the built client from the Express server, and the page tagline).
- Pre-UAT corrections **KI-1..KI-10** (see Section 9) to align the implementation and wording with the Sprint 1 contract.
- **No new features were added.** The Sprint 1 scope and contract are unchanged, except for the approved empty-state wording correction **KI-8** recorded in [docs/traceability.md](https://github.com/SANOP19/cpe334-p8-habit-tracker/blob/staging/sprint-1/docs/traceability.md) §6.

---

## 3. Scope

- **In scope (Sprint 1):**
  - **F-01** Authentication and session (sign in, current-user identity, sign out)
  - **F-02** Activity template management (Program Manager creates `DRAFT` templates and publishes them; Participants view published templates)
  - **F-03** Goal setting (Participant creates an active goal from a published template with a positive `dailyTarget` within range)
  - **F-04** Daily activity logging (Participant logs one entry per goal per calendar day in `Asia/Bangkok`, value within range, date within `T−6` to `T`, optional note up to 500 characters)
  - **F-05** Progress and privacy isolation (Participant views own entries and progress; other participants' records return `404`; Program Managers receive `403` on all goal data)
- **Out of scope (do not test / not a defect if absent):**
  - **F-06..F-09** (Sprint 2/3): goal revision, pause/archive, streaks, weekly/monthly summaries, reminder placeholders
  - Editing, deleting, or archiving templates, goals, or entries
  - Sign-up / self-registration, password reset, email verification, or admin account management

---

## 4. Accounts and roles

All accounts are synthetic. Passwords are **never** stored in this file, the repository, Issues, or screenshots.

| Label | Role | Login email | Display name |
|---|---|---|---|
| **MGR** | `PROGRAM_MANAGER` | `manager@example.test` | Dr. Morgan Staff |
| **P1** | `PARTICIPANT` | `participant@example.test` | Alex Student |
| **P2** | `PARTICIPANT` | `participant2@example.test` | Blake Student |

- **Password delivery:** Nara sends the passwords by direct message to each partner-team member.
- **Limitations:** Only one Program Manager account exists in production; both Participant accounts (**P1** and **P2**) share one password.

---

## 5. Data setup

- **Run tag (`<tag>`):** Every case creates its own template named `UAT<nn>-<tag>`, where `<tag>` is your team's initials + run number (for example, `XY-R1`). Use a new `<tag>` if you rerun a case.
- **Date (`T`):** `T` is today's date (`YYYY-MM-DD`) in `Asia/Bangkok` (ICT, UTC+7). Entries are allowed from `T−6` through `T`.
- **Quiet window:** Do **not** run date-sensitive steps between **23:45 and 00:15 Bangkok time**.
- **Existing data you may see:**
  - The seeded template `"Daily Reading"`
  - Templates, goals, and entries named `UAT00-YW-DRY`..`UAT09-YW-DRY` (and `UAT03e-YW-DRY`) left by our Product Team dry run on 26 Nov 2026. These do not affect your run because every case uses its own `<tag>`.

---

## 6. Reset and cleanup

- **No reset or delete:** Sprint 1 has no delete or archive feature by design.
- Tagged test data (`UAT<nn>-<tag>`) may remain in the shared database after testing; no manual cleanup is needed.

---

## 7. Order of the cases

All 9 cases are independent and can be executed in any order.
- **Suggested order:** `UAT-06 → UAT-01 → UAT-02 → UAT-03 → UAT-04 → UAT-05 → UAT-07 → UAT-08 → UAT-09`
- **Full step-by-step cases:** [docs/labs/lab-06/uat-cases.md](https://github.com/SANOP19/cpe334-p8-habit-tracker/blob/staging/sprint-1/docs/labs/lab-06/uat-cases.md) (see §0 for shared rules, §1 for steps, §2 for AC coverage, §3 for the execution record template).

| Case ID | Title | Category | Main AC |
|---|---|---|---|
| **UAT-01** | Normal journey: template → goal → entries → progress | Normal journey | AC-01, AC-03, AC-07, AC-10, AC-11, AC-12, AC-17, AC-24 |
| **UAT-02** | Entry rules and boundaries | Business rule / boundary | AC-18, AC-19, AC-20 |
| **UAT-03** | Template and goal rules | Business rule / boundary | AC-07, AC-08, AC-11, AC-13, AC-14, AC-15 |
| **UAT-04** | Ownership and role restrictions | Forbidden role / ownership | AC-04, AC-09, AC-16, AC-23, AC-25, AC-26, AC-32 |
| **UAT-05** | Duplicate entry, sign-out and persistence | State / history / persistence | AC-05, AC-17, AC-21, AC-27 |
| **UAT-06** | Sign-in rules | Other (supporting, F-01) | AC-01, AC-02, AC-03 |
| **UAT-07** | Uniform, safe errors | Other (supporting, cross-cutting) | AC-29 |
| **UAT-08** | Publishing a template twice | Other (supporting, F-02) | AC-31 |
| **UAT-09** | Input robustness | Other (supporting, pre-UAT fixes) | AC-14, AC-29 |

---

## 8. API views and Console helper

Some steps in `UAT-02`–`UAT-09` verify API responses directly:
- **API views:** While signed in, open `<URL>/api/...` in a new tab of the same browser to inspect the returned JSON.
- **Console helper:** Use the `bkk(daysAgo)` and `call(method, path, body)` helper snippets in browser DevTools Console on the app tab, as documented in the **Shared rules** section of [docs/labs/lab-06/uat-cases.md](https://github.com/SANOP19/cpe334-p8-habit-tracker/blob/staging/sprint-1/docs/labs/lab-06/uat-cases.md).

---

## 9. Corrections made before UAT

Found by the Product Team's own audit, dry run, and live check before handoff. Each code fix had a failing test first (RED), the fix (GREEN), peer review, CI, and a release. You may re-test any of these.

| KI | What was wrong | Corrected behaviour | Issue | Fix PR | Release |
|---|---|---|---|---|---|
| **KI-1** | IDs ≥ 2^31 returned 500 | Returns 404/422 like an unknown ID | [#59](https://github.com/SANOP19/cpe334-p8-habit-tracker/issues/59) | [#69](https://github.com/SANOP19/cpe334-p8-habit-tracker/pull/69) | `v0.2.1-lab6` ([#73](https://github.com/SANOP19/cpe334-p8-habit-tracker/pull/73)) |
| **KI-2** | Body > 100 KB returned 500 | Returns 413 `PAYLOAD_TOO_LARGE` | [#60](https://github.com/SANOP19/cpe334-p8-habit-tracker/issues/60) | [#70](https://github.com/SANOP19/cpe334-p8-habit-tracker/pull/70) | `v0.2.1-lab6` |
| **KI-3** | Log date default/min/max used device time zone | Computed in `Asia/Bangkok` | [#61](https://github.com/SANOP19/cpe334-p8-habit-tracker/issues/61) | [#71](https://github.com/SANOP19/cpe334-p8-habit-tracker/pull/71) | `v0.2.1-lab6` |
| **KI-4** | Note > 500 characters was accepted | Returns 422 on `note` | [#62](https://github.com/SANOP19/cpe334-p8-habit-tracker/issues/62) | [#70](https://github.com/SANOP19/cpe334-p8-habit-tracker/pull/70) | `v0.2.1-lab6` |
| **KI-5** | Non-text note was silently stored as `null` | Returns 422 on `note` | [#63](https://github.com/SANOP19/cpe334-p8-habit-tracker/issues/63) | [#70](https://github.com/SANOP19/cpe334-p8-habit-tracker/pull/70) | `v0.2.1-lab6` |
| **KI-6** | Older-date entry appeared on top until reload | List re-sorted newest date first | [#64](https://github.com/SANOP19/cpe334-p8-habit-tracker/issues/64) | [#71](https://github.com/SANOP19/cpe334-p8-habit-tracker/pull/71) | `v0.2.1-lab6` |
| **KI-7** | `"Saving..."` text; date not a badge | `<Loading label="Saving entry" />`; date badge | [#65](https://github.com/SANOP19/cpe334-p8-habit-tracker/issues/65) | [#71](https://github.com/SANOP19/cpe334-p8-habit-tracker/pull/71) | `v0.2.1-lab6` |
| **KI-8** | F-02 contract text said empty state points `"below"`, but form is above | Contract wording updated to `"above"` (approved change; code unchanged) | [#66](https://github.com/SANOP19/cpe334-p8-habit-tracker/issues/66) | [#72](https://github.com/SANOP19/cpe334-p8-habit-tracker/pull/72) | `v0.2.1-lab6` |
| **KI-9** | Long note without spaces overflowed the goal card | Note wraps inside the card | [#75](https://github.com/SANOP19/cpe334-p8-habit-tracker/issues/75) | [#76](https://github.com/SANOP19/cpe334-p8-habit-tracker/pull/76) | `v0.2.2-lab6` ([#77](https://github.com/SANOP19/cpe334-p8-habit-tracker/pull/77)) |
| **KI-10** | On a 375 px phone screen, header overflowed | Header wraps; no sideways scroll | [#79](https://github.com/SANOP19/cpe334-p8-habit-tracker/issues/79) | [#80](https://github.com/SANOP19/cpe334-p8-habit-tracker/pull/80) | `v0.2.3-lab6` ([#81](https://github.com/SANOP19/cpe334-p8-habit-tracker/pull/81)) |

---

## 10. How to report a finding

- Open **one GitHub Issue per finding** on https://github.com/SANOP19/cpe334-p8-habit-tracker/issues using the **"UAT finding (Lab 6)"** form ([.github/ISSUE_TEMPLATE/uat-finding.md](https://github.com/SANOP19/cpe334-p8-habit-tracker/blob/staging/sprint-1/.github/ISSUE_TEMPLATE/uat-finding.md)).
- **Required fields:** tested version (tag, commit, revision, URL), case ID and step, preconditions/test data, steps to reproduce, expected result (quote the case or Sprint 1 contract), actual result observed, severity with user impact, defect vs feature request, reproduction count, and evidence (screenshots/responses **without passwords, cookies, or tokens**).
- **Severity guide:**
  - `critical` — cross-account data leak or modification, data loss, or product unusable
  - `major` — a core business rule is wrong or the main flow is blocked without a workaround
  - `minor` — wrong status/message/display with an easy workaround and no wrong data
- After opening the Issue, notify us in the shared group chat.

---

## 11. Results we need back

For each case run, please record and send back:
- Tester name and team
- Date and time tested (ICT)
- Tested version (`v0.2.3-lab6` / `b51c5e7` / `sf4618437-00010-xj9`)
- Inputs used (including `<tag>`)
- Observed actual result
- Status: `PASS`, `FAIL`, or `BLOCKED` (with the reason; **`BLOCKED` is not a pass**)
- Screenshots of key steps (no credentials visible)

You may use the execution record table in [docs/labs/lab-06/uat-cases.md](https://github.com/SANOP19/cpe334-p8-habit-tracker/blob/staging/sprint-1/docs/labs/lab-06/uat-cases.md) §3.

---

## 12. Deploy rule

- We **do not deploy** while the partner team is testing.
- If a fix requires a new deployment, we will **announce the deploy in the shared group chat before it happens** and provide the new version, commit, and revision for re-testing.

---

## 13. Not manually testable items and their automated evidence

These Sprint 1 ACs cannot be verified manually on the live UI and are covered by automated tests (see [docs/traceability.md](https://github.com/SANOP19/cpe334-p8-habit-tracker/blob/staging/sprint-1/docs/traceability.md)):

| AC | Requirement / check | Automated evidence |
|---|---|---|
| **AC-06** | Passwords stored only as salted bcrypt hashes | `TEST-06` (`server/tests/auth.test.ts`, `server/tests/seed.test.ts`) |
| **AC-22** | Two simultaneous entries for the same goal and day store only one row | `TEST-22` ×5 (`server/tests/logging.test.ts`) |
| **AC-28** | Data survives a process restart *(cross-session persistence is in UAT-05)* | `TEST-28` and [scripts/verify-nfr04-restart.cjs](https://github.com/SANOP19/cpe334-p8-habit-tracker/blob/staging/sprint-1/scripts/verify-nfr04-restart.cjs) |
| **AC-30** | Manager cannot publish another manager's template *(production has one manager)* | `TEST-30` (`server/tests/templates.test.ts`) |
| **AC-33** | Expired session returns 401 | `TEST-33` (`server/tests/auth.test.ts`) |
