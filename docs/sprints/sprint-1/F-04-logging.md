# Feature Contract — F-04 Daily Activity Logging

| Version | Date | Author | Reviewer | Change |
|---|---|---|---|---|
| 1.0 | 2026-11-14 | Nara Kosiyaporn | Nitithorn Ketkaew | Contract written before implementation (PR5, Issue #20) |
| 1.1 | 2026-11-14 | Nara Kosiyaporn | Nitithorn Ketkaew | Review feedback: TEST-19b midnight probe added, NFR-04 clarified |
| 1.2 | 2026-11-29 | Nitithorn Ketkaew | Nara Kosiyaporn | Lab 7 approved change (CR #99): entries become correctable inside the logging window with revision history, optimistic conflict detection and a required reason — FR-15, FR-16, BR-13; new §1.7, §2 routes, §3 data, §4 UI, AC-34..AC-39, STS rows; header, §1.1, §1.5, §7 updated. Written before implementation |

**Requirements:** FR-08 · **FR-15 (correct an entry), FR-16 (read its corrections)** · BR-01 (value within template range) · BR-02 (no future date) · BR-03 (today and up to 6 days back) · BR-04 (one entry per goal per day) · BR-05 (own goal entries only) · **BR-13 (correction integrity)** · NFR-04 (persistence across restart) · NFR-09 (Asia/Bangkok timezone) · NFR-10 (concurrency safety) · role matrix (SDS §5.4)
**Acceptance criteria:** AC-17, AC-18, AC-19, AC-20, AC-21, AC-22, AC-23, **AC-28** (cross-cutting persistence verified with entries), and **AC-34..AC-39** (entry correction, v1.2)
**Depends on:** F-01 (`requireAuth`, `requireRole`), F-03 (goals exist and belong to participant), P1 schema (`activity_entries` table with `@@unique([goalId, entryDate])`)
**Used by:** F-05 (progress calculation and history)

---

## 1. Feature design

### 1.1 Behaviour and workflow
1. A participant opens **Goals**, which lists their active goals.
2. Under each goal, the participant can record a daily activity entry by providing:
   - `entryDate`: date in `YYYY-MM-DD` format (defaults to today in `Asia/Bangkok`, allowed range is today and the past 6 days — 7 calendar days total).
   - `value`: numeric amount achieved (decimals allowed per Q-04 decision, must be within the template's `minValue` and `maxValue`).
   - `note`: optional brief note or reflection (string, up to 500 characters, or null/empty).
3. The client submits `POST /api/goals/:id/entries`.
4. The server validates authentication, role, ownership, body shape, date window, value range, and duplicate constraints (§1.2).
5. On success, the entry is saved and returned with HTTP 201 Created. The UI updates the goal's logged entries and displays "Entry saved."
6. Participants can view logged entries via `GET /api/goals/:id/entries`, ordered by `entryDate` descending.
7. (v1.2, CR #99) While an entry's date is inside the logging window (today and the 6 days before, Asia/Bangkok), the participant can correct its value and/or note with a reason (`PATCH /api/goals/:id/entries/:entryId`); each correction is stored as a revision (§1.7).
8. (v1.2) The participant can read an entry's corrections, newest first (`GET /api/goals/:id/entries/:entryId/revisions`). An entry's date never changes.

### 1.2 Decision on Q-04 (Whole numbers or decimals)
Per Issue #20 and SRS §6.2:
- **Decision:** Activity entry values support decimal (floating-point) quantities (e.g. 1.5 hours, 3.25 km, 2.5 liters).
- Schema storage: PostgreSQL `DOUBLE PRECISION` mapped as `Float` in Prisma `ActivityEntry.value`.
- Validation: Value must be a valid, finite JSON number (`typeof value === "number" && Number.isFinite(value)`). Non-numeric values (such as `"5.0"` or `true`) are rejected with 422 `VALIDATION_ERROR`.

### 1.3 Business rules and validation order
Validation runs in the following strict order (SDS §5.3):

| # | Check | Response |
|---|---|---|
| 1 | Signed in | 401 `UNAUTHENTICATED` (F-01) |
| 2 | Role is `PARTICIPANT` | 403 `FORBIDDEN` (program managers cannot record or read entries — SDS §5.4) |
| 3 | Goal `:id` is a positive integer, exists, and belongs to the caller (`participantId = caller.id`) | 404 `NOT_FOUND` (unknown goal or another participant's goal returns 404 to avoid leaking existence — BR-05, D-10) |
| 4 | Body shape: `entryDate` is a valid `YYYY-MM-DD` calendar date string; `value` is a finite number; `note` is optional string | 422 `VALIDATION_ERROR` with `details` per invalid field |
| 5 | Date window (BR-02, BR-03, NFR-09):<br>• If `entryDate > todayBangkok`<br>• If `entryDate < todayBangkok - 6 days` | <br>422 `DATE_IN_FUTURE` ("Cannot record an activity for a future date.")<br>422 `DATE_TOO_OLD` ("Activity can only be recorded for today and up to 6 days in the past.") |
| 6 | Value range (BR-01): `minValue ≤ value ≤ maxValue` of the goal's template | 422 `VALUE_OUT_OF_RANGE` ("Value must be between ${minValue} and ${maxValue} ${unit}.") |
| 7 | Duplicate check (BR-04, NFR-10): No existing entry for `(goalId, entryDate)` | 409 `DUPLICATE_ENTRY` ("An activity entry for this date already exists."). Checked by service and enforced by database unique constraint `@@unique([goalId, entryDate])`; concurrent race condition catching Prisma `P2002` returns 409 `DUPLICATE_ENTRY`, never a 500 |

### 1.4 Reading entries
- `GET /api/goals/:id/entries`: Returns all entries for the goal, ordered by `entryDate` descending (`createdAt` desc as secondary sort).
- Only accessible by the participant who owns the goal; managers receive 403 `FORBIDDEN`; other participants receive 404 `NOT_FOUND`.

### 1.5 Permissions
| Endpoint | Not signed in | Participant (owner) | Participant (not owner) | Program Manager |
|---|---|---|---|---|
| `POST /api/goals/:id/entries` | 401 | 201 / 409 / 422 | 404 | 403 |
| `GET /api/goals/:id/entries` | 401 | 200 `{ entries }` | 404 | 403 |
| `PATCH /api/goals/:id/entries/:entryId` (v1.2) | 401 | 200 / 409 / 422; entry of another own goal: 404 | 404 | 403 |
| `GET /api/goals/:id/entries/:entryId/revisions` (v1.2) | 401 | 200 `{ revisions }`; entry of another own goal: 404 | 404 | 403 |

### 1.6 Boundary cases
- Template range 1–200: values 1.0 and 200.0 accepted; 0.99 and 200.01 rejected.
- Template range 0–30: value 0.0 and 30.0 accepted; -0.01 and 30.01 rejected.
- Allowed date range: exactly 7 calendar days (`today`, `today - 1`, ..., `today - 6`).
  - Example if today is `2026-11-14`: `2026-11-14` (today) accepted; `2026-11-08` (6 days ago) accepted; `2026-11-07` (7 days ago) rejected with 422 `DATE_TOO_OLD`; `2026-11-15` (tomorrow) rejected with 422 `DATE_IN_FUTURE`.
- Note: `null`, `undefined`, or empty string `""` accepted as `null` or omitted; valid string up to 500 chars stored cleanly.
- (v1.2) Correction boundaries are listed in §1.7.

### 1.7 Correcting an entry and its revision history (v1.2, CR #99)
**Why:** Sprint 1 excluded editing (SRS §3.3, D-03), so a mistyped value left that day's progress wrong for good. The programme now wants participants to correct recent records themselves, in an auditable way: every correction keeps what was there before, when and why; a correction made from an out-of-date screen must not overwrite a newer one; records older than the logging window stay fixed.

**Rule BR-13 (correction integrity):**
- (a) An entry can be corrected only while `entryDate ≥ todayBangkok − 6 days` (the BR-03 window; the lock moves at 00:00 Asia/Bangkok) → otherwise 422 `ENTRY_LOCKED` "Only entries from today and the past 6 days can be corrected."
- (b) A correction must name the `version` it was based on, and it must equal the stored version → otherwise 409 `STALE_ENTRY` "This entry was changed elsewhere. Reload it and try again."
- (c) A correction must change something and carry a reason → identical value and note: 422 `NO_CHANGE` "Nothing to change."; reason missing, blank or longer than 200 characters: 422 `VALIDATION_ERROR`.
- The entry's date cannot be changed, so BR-04 (one entry per goal per day) keeps holding.

**Order of checks — `PATCH /api/goals/:id/entries/:entryId`:**

| # | Check | Response |
|---|---|---|
| 1 | Signed in | 401 `UNAUTHENTICATED` |
| 2 | Role is `PARTICIPANT` | 403 `FORBIDDEN` |
| 3 | Goal `:id` is a database id, exists and belongs to the caller | 404 `NOT_FOUND` "Goal not found." |
| 4 | Entry `:entryId` is a database id, exists and belongs to that goal | 404 `NOT_FOUND` "Entry not found." |
| 5 | Body: no `entryDate`; `value` (if present) a finite number; `note` (if present) a string or null, at most 500 characters after trimming; at least one of `value`, `note`; `reason` a string of 1–200 characters after trimming; `version` a whole number ≥ 0 | 422 `VALIDATION_ERROR` "Invalid correction data." with `details`: `entryDate` "Cannot be changed"; `value` "Must be a valid number"; `note` "Must be text" / "Must be at most 500 characters"; `body` "Provide value or note"; `reason` "Must be 1 to 200 characters"; `version` "Must be a whole number of 0 or more" |
| 6 | BR-13(a) window | 422 `ENTRY_LOCKED` |
| 7 | BR-01: the new value is within the template's `[minValue, maxValue]` | 422 `VALUE_OUT_OF_RANGE` "Value must be between X and Y unit." |
| 8 | BR-13(b): `version` equals the stored version | 409 `STALE_ENTRY` |
| 9 | BR-13(c): the resulting value or note differs from the stored one (note compared after trimming; `""` and `null` both mean no note) | 422 `NO_CHANGE` |
| — | Success | 200 `{ entry, revision }`. A field left out stays unchanged; `note: ""` or `null` removes the note |

**Transaction (consistency, NFR-10):** each correction runs in one database transaction: read the entry → checks 6–9 → update the entry with a WHERE clause on `id`, `goalId`, `version = <sent version>` and `entryDate ≥ todayBangkok − 6` (setting value/note, `version + 1`, `updatedAt = now`) → insert the revision with the values read in the same transaction → commit. If the update changes no row, nothing is stored and the request is answered 404 (entry gone), 422 `ENTRY_LOCKED` (window passed) or 409 `STALE_ENTRY` (changed meanwhile). In PostgreSQL the second of two simultaneous updates with the same version waits for the first, re-reads the row and matches nothing, so exactly one succeeds. **Invariant:** for every entry, the number of its revisions equals its `version`; entries saved before v1.2 have `version` 0 and no revisions.

**Reading corrections — `GET /api/goals/:id/entries/:entryId/revisions`:** checks 1–4 as above, then 200 with the entry's revisions, newest first (`changedAt` descending, then `id` descending); `[]` for an entry that was never corrected. The user who made the change is stored but not returned (it is always the owner).

**Boundaries (today = 2026-11-14 in Asia/Bangkok unless stated):**
- Dates: an entry dated `2026-11-14` or `2026-11-08` (6 days ago) can be corrected; `2026-11-07` (7 days ago) → 422 `ENTRY_LOCKED`.
- Midnight: at 2026-11-14 23:59:59 Asia/Bangkok (16:59:59 UTC) the `2026-11-08` entry can be corrected; at 2026-11-15 00:00:00 Asia/Bangkok (17:00:00 UTC) it is locked, although the UTC date is still 14 November.
- Value (template 10–50): 10 and 50 accepted; 9.99 and 50.01 → `VALUE_OUT_OF_RANGE`.
- Note: 500 characters accepted; 501 → `VALIDATION_ERROR`.
- Reason: 1 and 200 characters accepted; `""`, `"   "` and 201 characters → `VALIDATION_ERROR`.
- Version: `0` accepted for a new entry; `-1`, `1.5` or missing → `VALIDATION_ERROR`; a valid but out-of-date number → 409 `STALE_ENTRY`.

**Out of scope:** deleting entries; changing an entry's date; correcting locked entries; editing, deleting or reverting revisions; showing corrections to program managers or other participants.

---

## 2. API specification

### `POST /api/goals/:id/entries`
Request:
```json
{
  "entryDate": "2026-11-14",
  "value": 15.5,
  "note": "Morning session"
}
```

| Status | Body |
|---|---|
| 201 | `{ "entry": { "id": 1, "goalId": 1, "entryDate": "2026-11-14", "value": 15.5, "note": "Morning session", "createdAt": "...", "updatedAt": null, "version": 0 } }` (`updatedAt`, `version` since v1.2) |
| 401 | `{ "error": { "code": "UNAUTHENTICATED", "message": "..." } }` |
| 403 | `{ "error": { "code": "FORBIDDEN", "message": "..." } }` |
| 404 | `{ "error": { "code": "NOT_FOUND", "message": "Goal not found." } }` |
| 409 | `{ "error": { "code": "DUPLICATE_ENTRY", "message": "An activity entry for this date already exists." } }` |
| 422 | `VALIDATION_ERROR` (details on invalid fields)<br>`DATE_IN_FUTURE` ("Cannot record an activity for a future date.")<br>`DATE_TOO_OLD` ("Activity can only be recorded for today and up to 6 days in the past.")<br>`VALUE_OUT_OF_RANGE` ("Value must be between X and Y unit.") |

### `GET /api/goals/:id/entries`
| Status | Body |
|---|---|
| 200 | `{ "entries": [ { "id": 1, "goalId": 1, "entryDate": "2026-11-14", "value": 15.5, "note": "...", "createdAt": "...", "updatedAt": null, "version": 0 }, ... ] }` |
| 401 | 401 `UNAUTHENTICATED` |
| 403 | 403 `FORBIDDEN` |
| 404 | 404 `NOT_FOUND` |

### `PATCH /api/goals/:id/entries/:entryId` (v1.2)
Request (`value` and/or `note`; `reason` and `version` always):
```json
{
  "value": 25,
  "note": "fixed",
  "reason": "Typed 15 instead of 25",
  "version": 0
}
```

| Status | Body |
|---|---|
| 200 | `{ "entry": { "id": 1, "goalId": 1, "entryDate": "2026-11-14", "value": 25, "note": "fixed", "createdAt": "...", "updatedAt": "2026-11-14T05:30:00.000Z", "version": 1 }, "revision": { "id": 1, "changedAt": "2026-11-14T05:30:00.000Z", "previousValue": 15.5, "newValue": 25, "previousNote": "Morning session", "newNote": "fixed", "reason": "Typed 15 instead of 25" } }` |
| 401 / 403 | `UNAUTHENTICATED` / `FORBIDDEN` |
| 404 | `NOT_FOUND` "Goal not found." or "Entry not found." |
| 409 | `STALE_ENTRY` ("This entry was changed elsewhere. Reload it and try again.") |
| 422 | `VALIDATION_ERROR` ("Invalid correction data.", `details`)<br>`ENTRY_LOCKED` ("Only entries from today and the past 6 days can be corrected.")<br>`VALUE_OUT_OF_RANGE` ("Value must be between X and Y unit.")<br>`NO_CHANGE` ("Nothing to change.") |

### `GET /api/goals/:id/entries/:entryId/revisions` (v1.2)
| Status | Body |
|---|---|
| 200 | `{ "revisions": [ { "id": 2, "changedAt": "...", "previousValue": 25, "newValue": 30, "previousNote": "fixed", "newNote": "fixed", "reason": "again" }, { "id": 1, ... } ] }` (newest first; `[]` if never corrected) |
| 401 / 403 / 404 | as for `PATCH` |

---

## 3. Data & Schema
Uses existing `activity_entries` table from P1 baseline migration:
- `id`: Int, primary key, auto-increment.
- `goalId`: Int, references `goals(id)` ON DELETE CASCADE.
- `entryDate`: String (`YYYY-MM-DD`).
- `value`: Float (`DOUBLE PRECISION`).
- `note`: String? (nullable).
- `createdAt`: DateTime, default now().
- Unique constraint: `@@unique([goalId, entryDate])` enforces one entry per goal per day at the database engine level.

**v1.2 additions (one additive migration, `<timestamp>_entry_correction`):**
- `activity_entries.updatedAt`: DateTime? — null until the first correction (deliberately not Prisma `@updatedAt`, which would also be set on create).
- `activity_entries.version`: Int, NOT NULL, default 0 — existing rows get 0 ("never corrected"); +1 on each correction.
- New table `activity_entry_revisions`: `id` Int PK auto-increment; `entryId` Int → `activity_entries(id)` ON DELETE CASCADE; `previousValue`, `newValue` Float; `previousNote`, `newNote` String?; `reason` String; `changedById` Int → `users(id)` ON DELETE CASCADE; `changedAt` DateTime default now(); index `(entryId, changedAt)`.
- No existing data is rewritten. The pre-v1.2 application keeps working with this schema (it does not read the new columns or table; new rows get `version` 0), so a rollback to the previous image stays possible.
- The migration file must be UTF-8 without a byte-order mark (Sprint 1 defect #25).

---

## 4. UI specification
| Screen / element | Behaviour |
|---|---|
| Goals page (participant) | Each goal card includes an expandable or direct **Log activity** section and **History** section. |
| Log activity form | Contains:<br>• `Date` input defaulting to today's date in `Asia/Bangkok` (`min` = 6 days ago, `max` = today).<br>• `Value` number input (`step="any"`, placeholder between `minValue` and `maxValue`, labelled with template unit).<br>• `Note` text input (optional).<br>• **Save entry** button (disabled while submitting, displays `Loading`). |
| Success state | "Entry saved." displayed on the card, form resets/updates, new entry appears in the history list. |
| Error state | Server error message displayed via `ErrorMessage` component on the card; user input retained. |
| History list | Displays entries ordered newest date first: date badge, value with unit, optional note. If empty: "No entries logged yet." |
| Edit (v1.2) | Rows dated today or up to 6 days before (Asia/Bangkok) show an **Edit** button; older rows show none. Edit turns the row into a form with `Amount` (number, `step="any"`, placeholder `min - max`), `Note` (`maxLength` 500), `Reason` (required, `maxLength` 200), **Save** and **Cancel**; one row is edited at a time. Save sends `PATCH` with the row's `version`; it is disabled while saving (shared `Loading`), when nothing changed, or when the reason is empty. |
| Edit success (v1.2) | "Entry updated." in the row; the row shows the new value/note and an **Edited** badge; progress is requested again so percent/Achieved update. |
| Edit errors (v1.2) | 422: the server message in the row (`ErrorMessage`), input kept. 409 `STALE_ENTRY`: the server message in the row and the entry list is loaded again so the row shows the newer values. |
| Correction history (v1.2) | Rows with `version > 0` show a **History** button; it loads `GET …/revisions` and lists each correction newest first as `YYYY-MM-DD HH:mm` (Asia/Bangkok) · old value → new value (unit) · old note → new note (when changed) · reason. |

---

## 5. Acceptance criteria
| AC | Requirement | Given / When / Then |
|---|---|---|
| **AC-17** | FR-08 | Given a signed-in participant with an active goal, when they submit an entry with a valid value and date within the allowed window, then the response is 201 Created and the entry can be retrieved via `GET /api/goals/:id/entries`. |
| **AC-18** | BR-01 | When `value = minValue` or `value = maxValue`, the entry is accepted; when `value < minValue` or `value > maxValue`, the response is 422 `VALUE_OUT_OF_RANGE` and no entry is stored. |
| **AC-19** | BR-02, NFR-09 | When `entryDate` is tomorrow or later in `Asia/Bangkok`, the response is 422 `DATE_IN_FUTURE` and no entry is stored. |
| **AC-20** | BR-03, NFR-09 | When `entryDate` is 6 days before today in `Asia/Bangkok`, the entry is accepted (201); when `entryDate` is 7 days before today, the response is 422 `DATE_TOO_OLD` and no entry is stored. |
| **AC-21** | BR-04 | When an entry already exists for that goal and calendar day, a second submission returns 409 `DUPLICATE_ENTRY` and only the original entry remains stored. |
| **AC-22** | BR-04, NFR-10 | When two requests for the same goal and day are sent simultaneously, exactly one succeeds (201) and the other fails with 409 `DUPLICATE_ENTRY`. |
| **AC-23** | BR-05 | When a participant submits an entry or queries entries for a goal belonging to another participant, the response is 404 `NOT_FOUND`. |
| **AC-28** | NFR-04 | When data is written, and the application/database client is restarted, the saved goal entries remain intact and readable. |
| **AC-34** (v1.2) | FR-15, FR-16 | Given an entry dated today with `version` 0, when its owner corrects the value and note with a reason, then the response is 200, `version` is 1, `updatedAt` is set, GET entries shows the new values with the same `entryDate` and `createdAt`, and GET revisions returns one revision with the previous and new values and the reason. A second correction gives `version` 2 and two revisions, newest first. A new entry has `version` 0, `updatedAt` null and no revisions. |
| **AC-35** (v1.2) | BR-13(a), NFR-09 | An entry dated 6 days before today in Asia/Bangkok can be corrected; one dated 7 days before → 422 `ENTRY_LOCKED`, nothing stored. The 6-day-old entry becomes locked at 00:00 Asia/Bangkok. |
| **AC-36** (v1.2) | BR-13(c), BR-01, §2 | Each invalid correction (value out of range or not a number, `entryDate` present, neither value nor note, note too long or not text, reason missing/blank/too long, version missing or not a whole number ≥ 0, no change) → 422 with the stated code and field, and the entry and its revisions are unchanged. `note: ""` removes an existing note. |
| **AC-37** (v1.2) | BR-05, BR-07, NFR-01 | For both new routes: no session → 401; program manager → 403; another participant's goal → 404 "Goal not found."; an entry of another of the caller's goals or an unknown/out-of-range id → 404 "Entry not found."; nothing changes or leaks. |
| **AC-38** (v1.2) | BR-13(b), BR-04, NFR-10, FR-09 | A correction with an out-of-date `version` → 409 `STALE_ENTRY`, nothing stored; two simultaneous corrections with the same version → exactly one 200 and one 409; for every entry the number of revisions equals `version`; progress (percent, achieved, achievedCount) follows the corrected value. |
| **AC-39** (v1.2) | F-04 §4 | Edit appears only on rows inside the window; Save sends the correction with `version` and reason, shows "Entry updated.", the new values, the Edited badge and refreshed progress; Save is disabled while saving, without a change or without a reason; a 422 shows the message and keeps the input; a 409 shows the message and reloads the row; History lists the corrections newest first with Bangkok date-time, old → new and reason. |

---

## 6. Software Test Specification
| Test | AC | Level | Precondition / input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-17 | AC-17 | API + DB | Participant A with active goal | POST valid entry `{ entryDate: today, value: 25.5, note: "Good run" }` | 201 Created; GET entries returns the entry with matching values |
| TEST-18a | AC-18 | API + DB | Template range 10–50 | Post entries with values 10.0 and 50.0 on different dates | Both accepted (201 Created) |
| TEST-18b | AC-18 | API + DB | Template range 10–50 | Post entries with values 9.99, 50.01, -1.0 | All return 422 `VALUE_OUT_OF_RANGE`; 0 rows stored |
| TEST-18c | AC-18 | API | Goal exists | Post `{ value: "25", entryDate: today }`, `{ value: null }`, `{ entryDate: "invalid-date" }` | 422 `VALIDATION_ERROR` with field details |
| TEST-19 | AC-19 | API + DB | Clock set to fixed Bangkok date | Post entry with `entryDate = tomorrow` | 422 `DATE_IN_FUTURE`; no row stored |
| TEST-19b | NFR-09 | API + DB | Clock set to 17:30 UTC (= 00:30 Bangkok) | Post 15 Nov, 16 Nov, 9 Nov, 8 Nov | 15 & 9 Nov -> 201; 16 Nov -> 422 `DATE_IN_FUTURE`; 8 Nov -> 422 `DATE_TOO_OLD` |
| TEST-20 | AC-20 | API + DB | Clock set to fixed Bangkok date | Post entry for `today - 6 days`, then post entry for `today - 7 days` | 6 days ago -> 201 Created; 7 days ago -> 422 `DATE_TOO_OLD` |
| TEST-21 | AC-21 | API + DB | Entry already exists for date D | Post second entry for date D on same goal | 409 `DUPLICATE_ENTRY`; exactly 1 row exists |
| TEST-22 | AC-22 | Integration | Goal exists, no entry for date D | Send 2 simultaneous POST requests for date D (repeated 5×) | Exactly one 201 and one 409; exactly 1 row stored |
| TEST-23 | AC-23 | API + DB | Goal belongs to Participant B | Participant A calls POST and GET `/api/goals/:B_goal/entries` | Both return 404 `NOT_FOUND` |
| TEST-MGR | Role matrix | API | Manager signed in | Manager calls POST and GET `/api/goals/1/entries` | 403 `FORBIDDEN` |
| TEST-04 | AC-04 | API | No session cookie | POST and GET `/api/goals/1/entries` | 401 `UNAUTHENTICATED` |
| TEST-28 | AC-28 | Integration | Entry saved to database | Restart database client/pool and read back | Entry is retrieved with unchanged fields |
| TEST-UI-07 | AC-17, AC-18 (UI) | Component | GoalsPage with mocked API | Render goal, enter value and submit; test 422 error display; check history | Form submits correct payload; "Entry saved."; error message displayed |

**v1.2 tests (CR #99)** — server `server/tests/entry-correction.test.ts` (template 10–50, goal target 20, clock mocked; revisions are checked through the API); client `client/tests/entry-correction.test.tsx` (GoalsPage with mocked `fetch`); E2E `e2e/entry-correction.spec.ts`. Every existing test above stays unchanged; `server/tests/harness.ts` only adds the new table to its `TRUNCATE` list.

| Test | AC | Level | Precondition / input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-34a | AC-34 | API + DB | Clock 2026-11-14 12:00 Bangkok; entry 14 Nov value 15 | POST, GET revisions, then PATCH `{ value: 25, note: "fixed", reason: "typo", version: 0 }` | POST body `version` 0, `updatedAt` null; revisions `[]`; PATCH 200 with `entry.version` 1, `updatedAt` set, `revision` 15 → 25, null → "fixed", reason "typo"; GET entries shows 25/"fixed", same `entryDate` and `createdAt`; 1 row |
| TEST-34b | AC-34 | API + DB | After TEST-34a's correction | PATCH `{ value: 30, reason: "again", version: 1 }`; GET revisions | 200, `version` 2; 2 revisions newest first (25 → 30, then 15 → 25); note unchanged in the newest (`previousNote` = `newNote` = "fixed") |
| TEST-35a | AC-35 | API + DB | Clock 2026-11-13: POST 07 Nov; clock 2026-11-14: POST 08 Nov | PATCH each | 08 Nov → 200; 07 Nov → 422 `ENTRY_LOCKED` with the message; 07 Nov unchanged, revisions `[]` |
| TEST-35b | AC-35, NFR-09 | API + DB | Entry 08 Nov created at 2026-11-14 12:00 Bangkok | PATCH at 2026-11-14T16:59:59Z, then again (with the new version) at 2026-11-14T17:00:00Z | first 200; second 422 `ENTRY_LOCKED` |
| TEST-36 | AC-36 | API + DB | Entry 14 Nov value 15, version 0 | Correct with: values 10 and 50; 9.99 and 50.01; `"25"`; `entryDate`; only reason+version; note of 501 characters and `5`; note of 500 characters; reason missing, `""`, `"   "`, 201 and 200 characters; version −1, 1.5, missing; same value and note; `note: ""` on an entry with a note | 10, 50, 500-character note, 200-character reason, `note: ""` → 200; 9.99/50.01 → `VALUE_OUT_OF_RANGE`; same values → `NO_CHANGE`; all others → `VALIDATION_ERROR` with the matching field; after every 4xx the entry and its revisions equal the last accepted state |
| TEST-37 | AC-37 | API | A's entry E on goal G1; A's second goal G2 on another published template | PATCH and GET revisions as: no cookie; manager; participant B on `/G1/entries/E`; A on `/G2/entries/E`; A with `entryId` 2147483648 | 401; 403; 404 "Goal not found."; 404 "Entry not found."; 404; entry and revisions unchanged |
| TEST-38a | AC-38 | API + DB | Target 20; entry 14 Nov value 10 | GET progress; PATCH value 20; GET progress | 50 %, not achieved → 100 %, achieved; `achievedCount` 1; `entriesCount` 1 |
| TEST-38b | AC-38 | API + DB | Entry corrected once (version 1) | PATCH with `version: 0` | 409 `STALE_ENTRY`; value, version and revisions unchanged |
| TEST-38c | AC-38, NFR-10 | Integration | One entry; 5 rounds | Each round: two simultaneous PATCH with the current version and different values | each round exactly one 200 and one 409; final `version` 5; 5 revisions; 1 row |
| TEST-38d | AC-38 | API + DB | 3 entries; accepted and rejected corrections (stale, locked, invalid, no change) | GET entries and each entry's revisions | for every entry, revisions count = `version`; no revision from a rejected request |
| TEST-39a | AC-39 | Component | Clock 2026-11-14 12:00 Bangkok; entries 14 Nov and 07 Nov | Render | Edit only on the 14 Nov row |
| TEST-39b | AC-39 | Component | Entry 14 Nov value 15, version 0 | Edit, Amount 25, Reason "typo", Save | PATCH `/api/goals/7/entries/<id>` with `{ value: 25, note, reason: "typo", version: 0 }`; "Entry updated."; row 25 and Edited; progress requested again; Save disabled with an empty reason or no change |
| TEST-39c | AC-39 | Component | PATCH answers 422 `VALUE_OUT_OF_RANGE` | Save | message in the row; inputs kept |
| TEST-39d | AC-39 | Component | PATCH answers 409 `STALE_ENTRY`; entries reload returns the newer value | Save | message in the row; entries requested again; row shows the newer value |
| TEST-39e | AC-39 | Component | Edited entry; revisions returned with `changedAt` `2026-11-14T12:30:00.000Z` | History | revisions newest first; `2026-11-14 19:30`; "15 → 25"; reason |
| TEST-E2E-L7 | AC-34, AC-38, AC-39 | E2E | Participant with a goal (target 10) | Log 5 today; Edit to 10 with a reason; open History; reload | "Entry updated."; 100 %, Achieved, Edited; History "5 → 10" with the reason; all still shown after reload |

---

## 7. Feature Definition of Done
- All tests in §6 pass on PostgreSQL (`habit_tracker_test`); all existing suites (P1, F-01, F-02, F-03) pass; server and client builds pass.
- Commits follow strict 3-commit order: `docs(contract)` → `test(red)` → `feat(F-04)`.
- Red test execution logs saved in `docs/evidence/F-04/red-run-*.txt` and committed before implementation.
- `docs/traceability.md` rows for FR-08, BR-01, BR-02, BR-03, BR-04, NFR-04, NFR-09, NFR-10 updated to Verified.
- `docs/srs.md` §6.2 updated with Q-04 resolution.
- **v1.2 (CR #99):** this contract revision is reviewed and merged before any test or code commit; then commits follow `test(red)` → `feat` → evidence, separately for the API (PR-L7-2) and the UI (PR-L7-3); RED runs on code identical to `v0.2.5-lab6` (`bd97c01`) in the layer under test and fails on assertions only; all v1.2 tests and every earlier suite pass (server, client, E2E, `tsc`, build, `npm run test:restart`); the migration is additive and the previous image still passes its own server suite against the new schema; evidence in `docs/evidence/lab-07/99/`; traceability rows FR-15, FR-16, BR-13 updated to Verified.
