# HabitPulse — Sprint 1 UAT cases (Lab 6)

Product Team: YaWan (team 31, section 131) — Nitithorn Ketkaew, Nara Kosiyaporn · Theme 8 Habit and Activity Tracking
Draft v0.3 (26 Nov 2026) — written by Nitithorn; confirmed in the Product Team dry run on 26 Nov 2026 (all steps PASS on `v0.2.1-lab6`); release under test updated to `v0.2.3-lab6` after the layout corrections KI-9 (#75, long notes) and KI-10 (#79, header on phone screens), which change no case step or expected result; reviewed by Nara in the PR that adds this file. Dry-run record: `dry-run.md`.

## 0. Release, scope and shared rules

| Item | Value |
|---|---|
| URL | https://sf4618437-4d7hbszvwq-as.a.run.app |
| Release under test | tag `v0.2.3-lab6`, commit `b51c5e7bfa2e6f008b3ec49da70510551e488ce4`, Cloud Run revision `sf4618437-00010-xj9` |
| Sprint 1 baseline | tag `v0.1.0-sprint1`, commit `bfd125f` (the tested release adds only deployment changes and pre-UAT corrections that bring the code in line with the Sprint 1 contract) |
| Scope | Sprint 1 features F-01 sign-in, F-02 templates, F-03 goals, F-04 daily logging, F-05 progress and privacy. Out of scope: F-06..F-09 (Sprint 2/3), editing/deleting/archiving, sign-up, password reset |
| Accounts | **MGR** `manager@example.test` (Program Manager "Dr. Morgan Staff") · **P1** `participant@example.test` (Participant "Alex Student") · **P2** `participant2@example.test` (Participant "Blake Student"). Passwords are sent privately, never in this document |

Shared rules for every case:
- `<tag>` = your team initials + run number, e.g. `XY-R1`. Every case creates its own template named `UAT<nn>-<tag>`, so the cases are independent and can run in any order. A rerun uses a new tag. Nothing can be deleted in Sprint 1; tagged test data may stay.
- **T** = today's date in Asia/Bangkok (YYYY-MM-DD). Entries are allowed for T back to T−6. Do not run date steps between 23:45 and 00:15 Bangkok time.
- Progress of an entry = value ÷ daily target × 100, truncated (not rounded) to one decimal, not capped; shown as a plain number (`150%`, `66.6%`, `50%`). The green "Achieved" badge appears when value ≥ target. The card shows "Achieved X of Y logged days".
- Browser checks: some fields have browser-side limits (`required`, `min`, `max`). When a step says "the browser blocks the submit", the browser shows its own message in its own language (for example a Thai browser shows "โปรดกรอกฟิลด์นี้") and nothing is sent to the server.
- The template list is a two-column grid; "first card" means the top-left card. Newest cards come first.
- Navigation: the header shows the display name, the role and **Sign out**. Manager nav: **Templates**. Participant nav: **Templates**, **Goals**. Participants set goals on **Templates** (button **Set goal**) and log entries on **Goals**.
- API views: while signed in, open `<URL>/api/...` in a new tab of the same browser to see the JSON the app returns (the same request with `fetch` in the Console gives the same result).
- Console helper (browser DevTools → Console, on the app tab, signed in as the user the step names):
  ```js
  const bkk = (daysAgo) => new Date(Date.now() + 7*3600e3 - daysAgo*864e5).toISOString().slice(0,10);
  const call = (method, path, body) => fetch(path, {method, headers:{'Content-Type':'application/json'},
    body: body && JSON.stringify(body)}).then(async r => console.log(r.status, await r.json().catch(()=>null)));
  ```
  `bkk(0)` = T, `bkk(1)` = T−1, `bkk(7)` = T−7, `bkk(-1)` = T+1.
- Record each run with: case ID, tester (name, team), date/time, tested version, inputs used, the **observed** actual result, PASS / FAIL / BLOCKED (+ reason) — see §3.

## 1. Cases

### UAT-01 — Normal journey: template → goal → entries → progress
- **Category:** normal domain journey
- **Requirement / AC:** FR-01, FR-03..FR-09; AC-01, AC-03, AC-07, AC-10, AC-11, AC-12, AC-17, AC-24
- **Purpose:** both roles complete the main Sprint 1 flow and the progress numbers are calculated correctly.
- **Roles:** MGR, then P1
- **Preconditions:** signed out; no template named `UAT01-<tag>`.
- **Inputs:** template name `UAT01-<tag>`, unit `minutes`, minimum `1`, maximum `120`; daily target `30`; entry T = `45`; entry T−1 = `20` with note `UAT note`.

| # | Action | Expected result |
|---|---|---|
| 1 | Sign in as MGR | Header shows "Dr. Morgan Staff" and "Program Manager"; nav shows only **Templates**; page "Activity Templates" with the "Create activity template" form |
| 2 | Fill Template name, Unit, Minimum value, Maximum value with the inputs; click **Create template** | New card `UAT01-<tag>` first in the list (top-left) with badge DRAFT, "Target range: 1 – 120 minutes" and a **Publish** button |
| 3 | Click **Publish** on that card | Badge changes to PUBLISHED; the Publish button disappears |
| 4 | **Sign out**; sign in as P1 | Sign-in page, then header "Alex Student" and "Participant"; nav **Templates**, **Goals** |
| 5 | On **Templates**, find `UAT01-<tag>` | Card shows "Target range: 1 – 120 minutes" and **Set goal**; no create form, no status badge, no Publish button |
| 6 | Click **Set goal**, enter Daily target (minutes) `30`, click **Save goal** | "Goal saved." on that card |
| 7 | Open **Goals** | Card `UAT01-<tag>` with badge ACTIVE, "Daily target: 30 minutes", "Achieved 0 of 0 logged days", "No entries logged yet." |
| 8 | Leave Date = T (default), Amount `45`, click **Save entry** | "Entry saved."; row "T · 45 minutes · 150%" with the Achieved badge; "Achieved 1 of 1 logged days" |
| 9 | Set Date = T−1, Amount `20`, Note `UAT note`, click **Save entry** | Row "T−1 · 20 minutes · UAT note · 66.6%" without the Achieved badge; the list stays ordered newest date first (T row above T−1) without reloading; "Achieved 1 of 2 logged days" |

### UAT-02 — Entry rules and boundaries
- **Category:** business rule / boundary
- **Requirement / AC:** BR-01, BR-02, BR-03, NFR-09; AC-18, AC-19, AC-20
- **Purpose:** an entry value must be within the template range (bounds included) and the date must be from T−6 to T.
- **Roles:** MGR (setup), P1
- **Preconditions:** signed out; no template named `UAT02-<tag>`.
- **Inputs:** template `UAT02-<tag>`, unit `pages`, minimum `5`, maximum `50`; daily target `10`; values 4, 51, 5, 50, 10; dates T, T−1, T−6, T−7, T+1.

| # | Action | Expected result |
|---|---|---|
| 1 | MGR creates and publishes `UAT02-<tag>`; sign out; P1 sets a goal on it with target `10` | "Goal saved." |
| 2 | P1 **Goals**, card `UAT02-<tag>`: Date T, Amount `4`, **Save entry** | Error "Value must be between 5 and 50 pages."; no row added |
| 3 | Date T, Amount `51`, **Save entry** | Same error; no row added |
| 4 | Date T, Amount `5`, **Save entry** | Row "T · 5 pages · 50%" without Achieved |
| 5 | Date T−1, Amount `50`, **Save entry** | Row "T−1 · 50 pages · 500%" with Achieved |
| 6 | Date T−6, Amount `10`, **Save entry** | Row "T−6 · 10 pages · 100%" with Achieved; rows ordered T, T−1, T−6; "Achieved 2 of 3 logged days" |
| 7 | Type T−7 in Date, Amount `10`, **Save entry** | The browser blocks the submit and shows its own message that the date must be T−6 or later; no request is sent; no row added |
| 8 | Open `<URL>/api/goals` in a new tab and note the `id` of the goal whose template name is `UAT02-<tag>` (= N). In the Console: `call('POST','/api/goals/N/entries',{entryDate:bkk(7),value:10})` | `422` with `{"error":{"code":"DATE_TOO_OLD","message":"Activity can only be recorded for today and up to 6 days in the past."}}` |
| 9 | Console: `call('POST','/api/goals/N/entries',{entryDate:bkk(-1),value:10})` | `422` with code `DATE_IN_FUTURE`, message "Cannot record an activity for a future date." |
| 10 | Open `<URL>/api/goals/N/entries` | Exactly 3 entries: T (5), T−1 (50), T−6 (10) |

### UAT-03 — Template and goal rules
- **Category:** business rule / boundary
- **Requirement / AC:** FR-04, FR-05, FR-07, BR-06, BR-08, BR-09; AC-07, AC-08, AC-11, AC-13, AC-14, AC-15
- **Purpose:** invalid templates are rejected, drafts are invisible to participants, and a goal target must be positive, inside the range and unique per template.
- **Roles:** MGR, P1
- **Preconditions:** signed out; no templates named `UAT03a/b/c/d/e-<tag>`.
- **Inputs:** templates `UAT03a-<tag>` (km, 10–10), `UAT03b-<tag>` (unit three spaces / empty, 1–10), `UAT03c-<tag>` (km, 0–10), `UAT03d-<tag>` (km, 1–5, stays DRAFT), `UAT03e-<tag>` (km, 1–100); targets 101, 0, 100, 5, 2, 0.

| # | Action | Expected result |
|---|---|---|
| 1 | Sign in as MGR. Create `UAT03a-<tag>`, unit `km`, minimum `10`, maximum `10` | Message "minValue must be strictly less than maxValue."; no card added |
| 2 | Same with minimum `10`, maximum `5` | Same message; no card added |
| 3 | Create `UAT03b-<tag>` with Unit = three spaces, minimum `1`, maximum `10` | Message "All template fields are required and must be valid numbers."; no card added |
| 4 | Create `UAT03b-<tag>` with Unit empty | The browser blocks the submit and shows its own "fill out this field" message; no card added |
| 5 | Create `UAT03c-<tag>` (km, 0–10) and `UAT03e-<tag>` (km, 1–100); publish only `UAT03e-<tag>`. Create `UAT03d-<tag>` (km, 1–5) and leave it DRAFT | Three new cards: `UAT03e` PUBLISHED, `UAT03c` and `UAT03d` DRAFT |
| 6 | Open `<URL>/api/templates`; note the `id` of `UAT03d-<tag>` (= D) | JSON lists the manager's templates with their status |
| 7 | **Sign out**; sign in as P1; open **Templates** | `UAT03e-<tag>` is listed; `UAT03c-<tag>` and `UAT03d-<tag>` are **not** listed |
| 8 | **Set goal** on `UAT03e-<tag>`: target `101`, **Save goal**; then target `0`, **Save goal** | The browser blocks both and shows its own range message (at most 100 / at least 1); no goal created |
| 9 | Target `100`, **Save goal** | "Goal saved." (the upper bound is accepted) |
| 10 | Reload the page (F5), open **Templates**, **Set goal** on `UAT03e-<tag>`, target `5`, **Save goal** | Error "You already have an active goal for this activity."; **Goals** still shows one `UAT03e-<tag>` goal with target 100 |
| 11 | Console (as P1): `call('POST','/api/goals',{templateId:D, dailyTarget:2})` | `422` with code `TEMPLATE_NOT_PUBLISHED`, message "This activity is not available for goals." |
| 12 | **Sign out**; MGR publishes `UAT03c-<tag>` (0–10); **Sign out**; P1 opens **Templates**, **Set goal** on `UAT03c-<tag>`, target `0`, **Save goal** | The browser accepts 0 (minimum is 0); the server answers "Daily target must be greater than 0 and between 0 and 10 km."; no goal created |

### UAT-04 — Ownership and role restrictions
- **Category:** forbidden role / ownership
- **Requirement / AC:** NFR-01, BR-05, BR-06, BR-07; AC-04, AC-09, AC-16, AC-23, AC-25, AC-26, AC-32
- **Purpose:** a participant cannot see or change another participant's records, a participant cannot manage templates, the Program Manager cannot see participants' goals, entries or progress, and a signed-out user gets nothing.
- **Roles:** MGR, P1, P2, anonymous
- **Preconditions:** signed out; no template named `UAT04-<tag>`.
- **Inputs:** template `UAT04-<tag>` (unit `glasses`, 1–20); P1 target `8`; P1 entry T = `6`; P2 attempt value `20` for T−1.

| # | Action | Expected result |
|---|---|---|
| 1 | MGR creates and publishes `UAT04-<tag>`; sign out; P1 sets a goal on it with target `8` and logs T = `6` on **Goals** | Row "T · 6 glasses · 75%" without Achieved |
| 2 | P1 opens `<URL>/api/goals`, notes the `id` of the goal whose template name is `UAT04-<tag>` (= N), then opens `<URL>/api/goals/N/progress` | `progress.days[0]` has value 6, percent 75, achieved false; `entriesCount` 1 |
| 3 | **Sign out**; sign in as P2; open **Goals** | No `UAT04-<tag>` card |
| 4 | P2 opens `<URL>/api/goals/N`, `<URL>/api/goals/N/entries`, `<URL>/api/goals/N/progress` | Each returns `{"error":{"code":"NOT_FOUND","message":"Goal not found."}}`; no data of P1 is shown |
| 5 | P2 Console: `call('POST','/api/goals/N/entries',{entryDate:bkk(1),value:20})` | `404` with message "Goal not found." |
| 6 | P2 Console: `call('POST','/api/templates',{name:'UAT04x-<tag>',unit:'u',minValue:1,maxValue:2})` | `403` with `{"error":{"code":"FORBIDDEN","message":"You do not have permission to do this."}}` |
| 7 | **Sign out**; sign in as MGR. Check the nav, then open `<URL>/api/goals`, `<URL>/api/goals/N`, `<URL>/api/goals/N/progress` | The nav has no **Goals**; each URL returns `403` `{"error":{"code":"FORBIDDEN","message":"You do not have permission to do this."}}` |
| 8 | MGR Console: `call('POST','/api/goals',{templateId:<id of UAT04-<tag>>, dailyTarget:5})` (the id is in `<URL>/api/templates`) | `403` with code `FORBIDDEN` |
| 9 | **Sign out**; in the same tab open `<URL>/api/goals` | `401` with `{"error":{"code":"UNAUTHENTICATED","message":"Please sign in."}}` |
| 10 | Sign in as P1; open `<URL>/api/goals/N/entries` and `<URL>/api/goals/N/progress` | Still exactly one entry (T, 6) and the same progress as step 2 — nothing was changed by P2 or MGR |

### UAT-05 — Duplicate entry, sign-out and persistence
- **Category:** state / history / persistence
- **Requirement / AC:** FR-02, FR-03, FR-08, BR-04, NFR-03, NFR-04; AC-05, AC-17, AC-21 (+ AC-27 journey)
- **Purpose:** one entry per goal per day, sign-out ends the session, and saved data is the same in another browser session.
- **Roles:** MGR (setup), P1 · needs a second browser or a private window
- **Preconditions:** signed out; no template named `UAT05-<tag>`.
- **Inputs:** template `UAT05-<tag>` (unit `steps`, 100–20000); target `8000`; entry T = `6000`; second T entry `9000`; entry T−2 = `8000`.

| # | Action | Expected result |
|---|---|---|
| 1 | MGR creates and publishes `UAT05-<tag>`; sign out; P1 sets a goal on it with target `8000` | "Goal saved." |
| 2 | P1 **Goals**: Date T, Amount `6000`, **Save entry** | Row "T · 6000 steps · 75%" |
| 3 | Date T again, Amount `9000`, **Save entry** | Error "An activity entry for this date already exists."; still one T row with 6000 |
| 4 | Reload the page (F5) and open **Goals** | Still signed in; the same single row |
| 5 | Click **Sign out**; in the same tab open `<URL>/api/auth/me` | The sign-in page is shown; `/api/auth/me` returns `401` `UNAUTHENTICATED` |
| 6 | In the second browser (or private window) sign in as P1 and open **Goals** | `UAT05-<tag>` shows "T · 6000 steps · 75%" |
| 7 | There: Date T−2, Amount `8000`, **Save entry** | Row "T−2 · 8000 steps · 100%" with Achieved, listed below the T row; "Achieved 1 of 2 logged days" |
| 8 | Back in the first browser sign in as P1 and open **Goals** | The same two rows and the same summary as step 7 |

### UAT-06 — Sign-in rules
- **Category:** supporting (F-01)
- **Requirement / AC:** FR-01, FR-02, NFR-03; AC-01, AC-02, AC-03
- **Purpose:** wrong credentials give one generic message, and a valid sign-in identifies the user without exposing secrets.
- **Roles:** P1
- **Preconditions:** signed out.
- **Inputs:** `participant@example.test` + a wrong password; `nobody-<tag>@example.test` + any password; `PARTICIPANT@EXAMPLE.TEST` + the correct password.

| # | Action | Expected result |
|---|---|---|
| 1 | Sign in with `participant@example.test` and a wrong password | "Email or password is incorrect."; the password field is cleared; still on Sign in |
| 2 | Sign in with `nobody-<tag>@example.test` and any password | Exactly the same message |
| 3 | Sign in with `PARTICIPANT@EXAMPLE.TEST` (upper case) and the correct password | Signed in as "Alex Student" |
| 4 | Open `<URL>/api/auth/me` | `{"user":{"id":…,"email":"participant@example.test","displayName":"Alex Student","role":"PARTICIPANT"}}` — no password or hash |

### UAT-07 — Uniform, safe errors
- **Category:** supporting (cross-cutting)
- **Requirement / AC:** NFR-05; AC-29
- **Purpose:** every error uses one JSON shape and never shows a stack trace, SQL or a file path.
- **Roles:** P1
- **Preconditions:** signed in as P1.
- **Inputs:** ids `abc`, `999999`, `3000000000`; a malformed JSON body.

| # | Action | Expected result |
|---|---|---|
| 1 | Open `<URL>/api/goals/abc` | `404` `{"error":{"code":"NOT_FOUND","message":"Goal not found."}}` |
| 2 | Open `<URL>/api/goals/999999` and `<URL>/api/goals/3000000000` | The same 404 for both |
| 3 | Open `<URL>/api/does-not-exist` | `404` `{"error":{"code":"NOT_FOUND","message":"The requested resource was not found"}}` |
| 4 | Console: `fetch('/api/goals',{method:'POST',headers:{'Content-Type':'application/json'},body:'{bad'}).then(async r=>console.log(r.status, await r.json()))` | `422` with code `VALIDATION_ERROR`, message "Malformed JSON payload in request body" |
| all | — | Every response is JSON with `error.code` and `error.message` only; no stack trace, SQL or file path |

### UAT-08 — Publishing a template twice
- **Category:** supporting (F-02)
- **Requirement / AC:** AC-31
- **Purpose:** an already published template cannot be published again.
- **Roles:** MGR
- **Preconditions:** signed out; no template named `UAT08-<tag>`.
- **Inputs:** template `UAT08-<tag>` (unit `u`, 1–10).

| # | Action | Expected result |
|---|---|---|
| 1 | Sign in as MGR; create and publish `UAT08-<tag>` | Badge PUBLISHED; no Publish button |
| 2 | Open `<URL>/api/templates`; note its `id` (= E). Console: `call('POST','/api/templates/E/publish')` | `409` with code `ALREADY_PUBLISHED`, message "Template is already published." |

### UAT-09 — Input robustness
- **Category:** supporting (covers the corrections made before UAT)
- **Requirement / AC:** AC-14, AC-29, D-10, F-04 §1–§2 (note), NFR-05
- **Purpose:** unusual or invalid input gets a clear 4xx answer and is never stored.
- **Roles:** MGR (setup), P1
- **Preconditions:** signed out; no template named `UAT09-<tag>`.
- **Inputs:** template `UAT09-<tag>` (unit `u`, 1–10); P1 target `5`; ids `3000000000`; notes of 501 characters, `123`, about 200 000 characters, 500 characters.

| # | Action | Expected result |
|---|---|---|
| 1 | MGR creates and publishes `UAT09-<tag>`; MGR Console: `call('POST','/api/templates/3000000000/publish')` | `404` with code `NOT_FOUND`, message "Template not found." |
| 2 | **Sign out**; P1 sets a goal on `UAT09-<tag>` with target `5`; open `<URL>/api/goals` and note its `id` (= N) | "Goal saved."; the goal is listed |
| 3 | P1 Console: `call('POST','/api/goals',{templateId:3000000000,dailyTarget:5})` | `422` with code `TEMPLATE_NOT_PUBLISHED` |
| 4 | P1 Console: `call('POST','/api/goals/3000000000/entries',{entryDate:bkk(0),value:5})` | `404` with message "Goal not found." |
| 5 | P1 Console: `call('POST','/api/goals/N/entries',{entryDate:bkk(0),value:5,note:'n'.repeat(501)})` | `422` `VALIDATION_ERROR` "Invalid entry data." with a detail `{"field":"note","message":"Must be at most 500 characters"}`; no entry |
| 6 | Same with `note:123` | `422` `VALIDATION_ERROR` with a detail `{"field":"note","message":"Must be text"}`; no entry |
| 7 | Same with `note:'x'.repeat(200000)` | `413` with code `PAYLOAD_TOO_LARGE`, message "The request is too large."; no entry |
| 8 | Same with `note:'n'.repeat(500)` | `201`; open `<URL>/api/goals/N/entries`: one entry for T with a 500-character note |

## 2. Coverage

| AC | Case(s) | AC | Case(s) |
|---|---|---|---|
| AC-01, AC-02, AC-03 | UAT-06 (AC-01, AC-03 also UAT-01) | AC-17 | UAT-01, UAT-05 |
| AC-04 | UAT-04 #9 | AC-18, AC-19, AC-20 | UAT-02 |
| AC-05 | UAT-05 #5 | AC-21 | UAT-05 #3 |
| AC-07, AC-10, AC-11 | UAT-01, UAT-03 | AC-23, AC-25 | UAT-04 #4–5, #10 |
| AC-08 | UAT-03 #1–4 | AC-24 | UAT-01, UAT-02, UAT-04, UAT-05 |
| AC-09 | UAT-04 #6 | AC-26, AC-32 | UAT-04 #7 |
| AC-12, AC-13, AC-15 | UAT-03 | AC-14 | UAT-03 #11, UAT-09 #3 |
| AC-16 | UAT-04 #8 | AC-27 | UAT-01 + UAT-05 |
| AC-29 | UAT-07, UAT-09 | AC-31 | UAT-08 |

Not testable by hand, covered by automated tests (see `docs/traceability.md`): AC-06 (passwords stored as hashes: TEST-06, `seed.test.ts`), AC-22 (two simultaneous entries store one row: TEST-22 ×5), AC-28 (data survives a process restart: TEST-28 and `scripts/verify-nfr04-restart.cjs`; persistence across sessions is in UAT-05), AC-30 (publishing another manager's template: TEST-30; production has only one manager), AC-33 (expired session: TEST-33).

## 3. Execution record (one row per run)

| Run ID | Case | Tester (name, team) | Observer | Date/time (Bangkok) | Version (tag / commit / revision) | Inputs used | Actual result (observed) | PASS / FAIL / BLOCKED | Reason if BLOCKED | Evidence IDs | Finding / Issue |
|---|---|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | | | |

Report every failure as an Issue on https://github.com/SANOP19/cpe334-p8-habit-tracker/issues with the "UAT finding (Lab 6)" form (or the same fields), one finding per Issue. Never paste passwords, cookies or tokens.
