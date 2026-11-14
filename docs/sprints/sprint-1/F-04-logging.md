# Feature Contract — F-04 Daily Activity Logging

| Version | Date | Author | Reviewer | Change |
|---|---|---|---|---|
| 1.0 | 2026-11-14 | Nara Kosiyaporn | Nitithorn Ketkaew | Contract written before implementation (PR5, Issue #20) |
| 1.1 | 2026-11-14 | Nara Kosiyaporn | Nitithorn Ketkaew | Review feedback: TEST-19b midnight probe added, NFR-04 clarified |

**Requirements:** FR-08 · BR-01 (value within template range) · BR-02 (no future date) · BR-03 (today and up to 6 days back) · BR-04 (one entry per goal per day) · BR-05 (own goal entries only) · NFR-04 (persistence across restart) · NFR-09 (Asia/Bangkok timezone) · NFR-10 (concurrency safety) · role matrix (SDS §5.4)
**Acceptance criteria:** AC-17, AC-18, AC-19, AC-20, AC-21, AC-22, AC-23, and **AC-28** (cross-cutting persistence verified with entries)
**Depends on:** F-01 (`requireAuth`, `requireRole`), F-03 (goals exist and belong to participant), P1 schema (`activity_entries` table with `@@unique([goalId, entryDate])`)
**Used by:** F-05 (progress calculation and history)

---

## 1. Feature design

### 1.1 Behaviour and workflow
1. A participant opens **Goals**, which lists their active goals.
2. Under each goal, the participant can record a daily activity entry by providing:
   - `entryDate`: date in `YYYY-MM-DD` format (defaults to today in `Asia/Bangkok`, allowed range is today and the past 6 days — 7 calendar days total).
   - `value`: numeric amount achieved (decimals allowed per Q-04 decision, must be within the template's `minValue` and `maxValue`).
   - `note`: optional brief note or reflection (string, or null/empty; a 500-character limit is the intended maximum but is not enforced in Sprint 1 — listed as a known limitation).
3. The client submits `POST /api/goals/:id/entries`.
4. The server validates authentication, role, ownership, body shape, date window, value range, and duplicate constraints (§1.2).
5. On success, the entry is saved and returned with HTTP 201 Created. The UI updates the goal's logged entries and displays "Entry saved."
6. Participants can view logged entries via `GET /api/goals/:id/entries`, ordered by `entryDate` descending.

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

### 1.6 Boundary cases
- Template range 1–200: values 1.0 and 200.0 accepted; 0.99 and 200.01 rejected.
- Template range 0–30: value 0.0 and 30.0 accepted; -0.01 and 30.01 rejected.
- Allowed date range: exactly 7 calendar days (`today`, `today - 1`, ..., `today - 6`).
  - Example if today is `2026-11-14`: `2026-11-14` (today) accepted; `2026-11-08` (6 days ago) accepted; `2026-11-07` (7 days ago) rejected with 422 `DATE_TOO_OLD`; `2026-11-15` (tomorrow) rejected with 422 `DATE_IN_FUTURE`.
- Note: `null`, `undefined`, or empty string `""` accepted as `null` or omitted; any string is stored trimmed (the intended 500-character maximum is not enforced in Sprint 1).

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
| 201 | `{ "entry": { "id": 1, "goalId": 1, "entryDate": "2026-11-14", "value": 15.5, "note": "Morning session", "createdAt": "..." } }` |
| 401 | `{ "error": { "code": "UNAUTHENTICATED", "message": "..." } }` |
| 403 | `{ "error": { "code": "FORBIDDEN", "message": "..." } }` |
| 404 | `{ "error": { "code": "NOT_FOUND", "message": "Goal not found." } }` |
| 409 | `{ "error": { "code": "DUPLICATE_ENTRY", "message": "An activity entry for this date already exists." } }` |
| 422 | `VALIDATION_ERROR` (details on invalid fields)<br>`DATE_IN_FUTURE` ("Cannot record an activity for a future date.")<br>`DATE_TOO_OLD` ("Activity can only be recorded for today and up to 6 days in the past.")<br>`VALUE_OUT_OF_RANGE` ("Value must be between X and Y unit.") |

### `GET /api/goals/:id/entries`
| Status | Body |
|---|---|
| 200 | `{ "entries": [ { "id": 1, "goalId": 1, "entryDate": "2026-11-14", "value": 15.5, "note": "...", "createdAt": "..." }, ... ] }` |
| 401 | 401 `UNAUTHENTICATED` |
| 403 | 403 `FORBIDDEN` |
| 404 | 404 `NOT_FOUND` |

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

---

## 4. UI specification
| Screen / element | Behaviour |
|---|---|
| Goals page (participant) | Each goal card includes an expandable or direct **Log activity** section and **History** section. |
| Log activity form | Contains:<br>• `Date` input defaulting to today's date in `Asia/Bangkok` (`min` = 6 days ago, `max` = today).<br>• `Value` number input (`step="any"`, placeholder between `minValue` and `maxValue`, labelled with template unit).<br>• `Note` text input (optional).<br>• **Save entry** button (disabled while submitting, displays `Loading`). |
| Success state | "Entry saved." displayed on the card, form resets/updates, new entry appears in the history list. |
| Error state | Server error message displayed via `ErrorMessage` component on the card; user input retained. |
| History list | Displays entries ordered newest date first: date badge, value with unit, optional note. If empty: "No entries logged yet." |

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

---

## 7. Feature Definition of Done
- All tests in §6 pass on PostgreSQL (`habit_tracker_test`); all existing suites (P1, F-01, F-02, F-03) pass; server and client builds pass.
- Commits follow strict 3-commit order: `docs(contract)` → `test(red)` → `feat(F-04)`.
- Red test execution logs saved in `docs/evidence/F-04/red-run-*.txt` and committed before implementation.
- `docs/traceability.md` rows for FR-08, BR-01, BR-02, BR-03, BR-04, NFR-04, NFR-09, NFR-10 updated to Verified.
- `docs/srs.md` §6.2 updated with Q-04 resolution.
