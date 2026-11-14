# Software Requirements Specification (SRS)
## Habit and Activity Tracking System — CPE 334 Theme 8

| Version | Date | Author | Reviewer | Change |
|---|---|---|---|---|
| 0.1 | 2026-11-14 | Nitithorn Ketkaew | Nara Kosiyaporn | Sections 1–3, 5 and 6: context, actors, scope, assumptions, decisions and questions (P3a, Issue #5) |
| 0.2 | 2026-11-14 | Nara Kosiyaporn | Nitithorn Ketkaew | Section 4: Functional Requirements, Business Rules, and Non-Functional Requirements (P3b, Issue #6) |

**Team:** Nitithorn Ketkaew (67070505203) · Nara Kosiyaporn (67070505218)  
**Source:** decisions agreed in `docs/project-brief.md` (P0, PR #2).

---

## 1. Stakeholder problem and chosen context

### 1.1 Stakeholder problem
A university wellbeing programme helps students build healthy routines. Today, staff describe activities informally ("study a bit every day", "exercise more"), so students record progress in different units and with unrealistic values, and nobody can tell whether a day's goal was met. Students also worry that staff can read their personal records.

The programme needs a system where:
- staff define each activity once, with a unit and a valid range, so every record is comparable and plausible;
- each student sets a personal daily target for an activity and records what they actually did each day;
- the system calculates progress against the target and rejects invalid, duplicate or out-of-period records;
- each student's goals and daily records stay private to that student.

### 1.2 Chosen context
**Study and exercise habit programme for university students** (decision D-01). Example activities: "Reading" in pages (0–200), "Walking" in kilometres (0–30), "Focused study" in minutes (0–600).

This is a **recording and self-monitoring** system. It does not diagnose, treat or advise on health.

---

## 2. Actors and responsibilities

| Actor | Role code | Responsibilities | May not |
|---|---|---|---|
| **Participant** (student) | `PARTICIPANT` | Signs in and out; views published activity templates; sets a personal goal with a daily target for a template; records one daily entry per goal; views own entries and calculated progress | Create or change templates; see another participant's goals, entries or progress |
| **Program Manager** (programme staff) | `PROGRAM_MANAGER` | Signs in and out; creates activity templates with a unit and valid range; publishes own templates so participants can use them | Create goals or entries; read any participant's goals, entries or progress |
| **System** | — | Authenticates users and keeps sessions; enforces roles and record ownership on the server; validates values, dates and duplicates; stores data persistently; calculates progress | — |

Each account has exactly one role (D-02). Accounts are created by the seed procedure; there is no self-registration.

---

## 3. Product scope and explicit exclusions

### 3.1 In scope for the whole product (Sprints 1–3)
- Sign-in, sign-out and current-user identity with server-side sessions
- Activity template creation and publication by program managers
- Personal goals with a daily target, and goal revision, pause and archive while keeping history
- Daily activity entries with validation of value range, date and duplicates
- Progress calculation, entry history, streaks, weekly and monthly summaries
- Reminder schedules shown in the application as placeholders
- Server-side enforcement of roles and record ownership
- Persistent storage with reproducible migrations and synthetic seed data

### 3.2 In scope for Sprint 1
Authentication and session; template creation and publication; goal setting; daily logging with business-rule validation; progress calculation and privacy isolation (features F-01..F-05 in `docs/project-brief.md` §5).

### 3.3 Explicit exclusions
| Excluded | Reason |
|---|---|
| Medical diagnosis, treatment or health advice | Recording system only; outside the stakeholder brief |
| Self-registration, password recovery, email verification | Not required by the course; accounts are seeded |
| Account administration and multiple roles per account | Not required; one role per account keeps permissions simple |
| Sending real reminders (email, SMS, push) | No external messaging services; reminders are placeholders |
| Sharing private records with staff, even with consent | Not defined by the stakeholder; avoids a privacy design that cannot be verified in scope |
| Editing or deleting an entry in Sprint 1 | Keeps the first slice small; later correction would be a separate, specified change |
| Integration with wearables or other external apps | No external APIs; synthetic data only |
| Real personal data | Synthetic demo data only |

---

## 4. Requirements

### 4.1 Functional Requirements (FR)

| ID | Observable System Behaviour | Actor | Sprint | Primary Verification |
|---|---|---|:---:|---|
| **FR-01** | A seeded user provides valid email and password credentials, and the system issues an authenticated server-side session stored in an HttpOnly cookie. | User | 1 | Integration test `TEST-01` |
| **FR-02** | An authenticated user requests logout; the system destroys the session record in the database and clears the session cookie. | User | 1 | API test `TEST-05` |
| **FR-03** | An authenticated user queries current identity; the system returns their unique ID, display name, and authorized role (`PARTICIPANT` or `PROGRAM_MANAGER`). | User | 1 | API test `TEST-03` |
| **FR-04** | A program manager creates a new activity template specifying name, unit, minValue, and maxValue (`minValue < maxValue`), initialized in `DRAFT` status. | Program Manager | 1 | API test `TEST-07` |
| **FR-05** | A program manager publishes an existing draft template they own; status changes from `DRAFT` to `PUBLISHED` making it selectable by participants. | Program Manager | 1 | API test `TEST-10` |
| **FR-06** | A participant retrieves the catalog of all published templates; a program manager retrieves all templates they created across draft and published statuses. | Participant / Program Manager | 1 | API test `TEST-11` |
| **FR-07** | A participant selects a published template and establishes a habit goal with a personal `dailyTarget` bounded by the template's `[minValue, maxValue]`. | Participant | 1 | Integration test `TEST-12` |
| **FR-08** | A participant records an activity entry (entry date, numeric value, optional note) for their own goal within allowable date and value constraints. | Participant | 1 | Integration test `TEST-17` |
| **FR-09** | A participant views their daily entry records and computed progress metrics (`percent` achieved against `dailyTarget`) for their own habit goals. | Participant | 1 | API test `TEST-24` |
| **FR-10** | A participant revises target values, pauses, or archives an active goal while preserving prior historical entry integrity. | Participant | 2 | Sprint 2 contract verification |
| **FR-11** | A participant accesses longitudinal historical views of logged activities and past goal revision milestones. | Participant | 2 | Sprint 2 contract verification |
| **FR-12** | The system computes consecutive-day streak metrics indicating continuous adherence to daily targets. | Participant / System | 2 | Sprint 2 contract verification |
| **FR-13** | A participant views aggregated weekly and monthly habit performance and completion rate analytics. | Participant | 2 | Sprint 2 contract verification |
| **FR-14** | A participant defines daily reminder schedules rendered as visual timetable cues (mocked schedules; external dispatch out of scope). | Participant | 3 | Sprint 3 contract verification |

---

### 4.2 Business Rules (BR)

| ID | Rule Specification | Violation Response | Layer Enforced | Sprint |
|---|---|:---:|---|:---:|
| **BR-01** | **Entry Value Within Range:** An activity entry value must be within the referenced template's defined `[minValue, maxValue]` range, inclusive. | `422 Unprocessable Entity` | Domain / API validation | 1 |
| **BR-02** | **No Future Date Logging:** An entry date cannot be in the future relative to server time in `Asia/Bangkok` timezone. | `422 Unprocessable Entity` | Domain / API validation | 1 |
| **BR-03** | **7-Day Rolling Back-Dating Window:** An entry date cannot be earlier than 6 days before today (exactly 7 calendar days eligible). | `422 Unprocessable Entity` | Domain / API validation | 1 |
| **BR-04** | **Single Entry Per Goal Per Calendar Day:** One entry per goal per day (enforced by a database unique constraint `@@unique([goalId, entryDate])`). | `409 Conflict` | Database unique constraint | 1 |
| **BR-05** | **Participant Privacy Isolation:** A participant can access only their own goals and entries. Access to another participant's record is rejected. | `404 Not Found` (no existence leak) | API service / Query scoping | 1 |
| **BR-06** | **Role Authorization for Templates:** Only a program manager can create or publish templates. A participant attempting either is rejected. | `403 Forbidden` | Authorization middleware | 1 |
| **BR-07** | **Program Manager Data Segregation:** A program manager cannot access participants' goals, entries, or progress. | `403 Forbidden` | Authorization middleware | 1 |
| **BR-08** | **Positive Goal Target in Range:** A goal needs a published template and a positive dailyTarget within its range (`dailyTarget > 0` and within `[minValue, maxValue]`). | `422 Unprocessable Entity` | Domain / API validation | 1 |
| **BR-09** | **One Active Goal Per Template:** At most one active goal (`status = ACTIVE`) per participant per template. | `409 Conflict` | Database partial unique index | 1 |
| **BR-10** | **Historical Invariance Upon Revision:** Revising a goal does not change the meaning or calculated percentages of past recorded progress. | defined in Sprint 2 contract | Domain service design | 2 |
| **BR-11** | **Consecutive-Day Streak Rule:** Streak counts consecutive calendar days where logged activity met or exceeded `dailyTarget` (draft — finalised in the Sprint 2 contract). | defined in Sprint 2 contract | Domain service calculation | 2 |
| **BR-12** | **Reminders Are Placeholders:** Reminders are display placeholders within the application and never send external messages. | — | Presentation layer only | 3 |

---

### 4.3 Non-Functional Requirements (NFR)

| ID | Requirement Target | Primary Verification | Sprint |
|---|---|---|:---:|
| **NFR-01** | Every protected endpoint rejects unauthenticated requests with 401 and returns no private data | API tests (`TEST-04`) | 1 |
| **NFR-02** | Passwords are stored only as hashes | Integration test reads the database; no password in logs (`TEST-06`) | 1 |
| **NFR-03** | A session stops working after logout and after expiry (next request with old cookie returns 401; session past expiresAt returns 401) | API tests (`TEST-05`) | 1 |
| **NFR-04** | Data survives an application restart | Integration test (`TEST-28`) | 1 |
| **NFR-05** | Error responses share one JSON shape `{"error": {"code": string, "message": string}}` and never expose stack traces or SQL | API tests (`TEST-29`) | 1 |
| **NFR-06** | A fresh clone runs and passes tests by following the README | Clean-clone check by the member who did not write the README | 1 |
| **NFR-07** | Main screens show loading, empty, and error states | UI/E2E tests and screenshots | 1 |
| **NFR-08** | No real secret in Git or client code | Review of diffs and `.env.example` | 1 |
| **NFR-09** | Timezone consistency: calendar days and rolling back-dating window evaluated in `Asia/Bangkok` | Unit tests with mocked clock | 1 |
| **NFR-10** | Concurrency robustness: simultaneous submissions for the same goal and day yield one record and 409 | Integration test (`TEST-22`) | 1 |

---

## 5. Assumptions

| ID | Assumption | Impact if wrong |
|---|---|---|
| A-01 | All users are in Thailand; one calendar (Asia/Bangkok) is enough to decide "today" | Entries near midnight could be assigned to the wrong day; would need per-user time zones |
| A-02 | A participant records an activity at most once per day as a daily total | If several partial records per day are needed, BR on duplicates and the progress formula change |
| A-03 | Activity values are numeric quantities in the template's unit | Non-numeric activities (e.g. mood) would need another template type |
| A-04 | Program managers only need to manage templates they created | Shared ownership of templates would need a change to the role matrix |
| A-05 | Users use a current desktop or mobile browser with cookies enabled | Session cookies would not work otherwise |
| A-06 | Seeded accounts are enough for development, demonstration and partner testing | A sign-up flow would be needed for real use |
| A-07 | Data volume is small (tens of users, hundreds of entries per user) | Larger volumes would need pagination and performance requirements |

---

## 6. Design decisions and questions

### 6.1 Decisions
| ID | Decision | Rationale | Status |
|---|---|---|---|
| D-01 | Context: study and exercise habit programme for university students | Familiar domain; simple numeric activities; synthetic data is easy to create | Agreed in PR #2 |
| D-02 | Roles `PARTICIPANT` and `PROGRAM_MANAGER`; one role per account; seeded accounts only | Matches the Theme 8 brief; one role per account makes backend checks simple and testable | Agreed in PR #2 |
| D-03 | One entry per goal per calendar day; no accumulation; no editing in Sprint 1 | The brief asks us to choose one-entry-per-day or accumulation; one entry is easier to verify and gives a clear duplicate rule enforceable by a database constraint | Agreed in PR #2 |
| D-04 | "Today" is decided by server time in Asia/Bangkok | The client clock can be wrong or manipulated; one fixed zone follows assumption A-01 | Agreed in PR #2 |
| D-05 | Entries allowed for today and up to 6 days before (7 days including today) | Lets participants catch up on a missed week without allowing old history to be rewritten; gives clear boundary tests (6 days accepted, 7 rejected) | Agreed in PR #2; confirm with TA (Q-01) |
| D-06 | Template fields name, unit, minValue, maxValue with minValue < maxValue; `DRAFT` → `PUBLISHED`; published templates cannot change in Sprint 1 | A valid range makes entries comparable; freezing published templates keeps existing goals and entries meaningful | Agreed in PR #2 |
| D-07 | A goal uses one published template, has a dailyTarget inside the range, and a participant has at most one active goal per template | A target outside the valid range could never be met; one active goal per template avoids ambiguous progress | Agreed in PR #2 |
| D-08 | percent = value ÷ dailyTarget × 100 (not capped); achieved when value ≥ dailyTarget | Simple, explainable and testable; not capping shows when a participant exceeded the target | Agreed in PR #2; confirm with TA (Q-02) |
| D-09 | Program managers cannot read individual goals, entries or progress | The Theme 8 brief says managers do not automatically gain access to private records; no consent design is in scope | Agreed in PR #2 |
| D-10 | Status codes: 401 not signed in, 403 wrong role, 404 another participant's record, 422 validation, 409 conflict | Consistent, testable error behaviour; 404 for other users' records does not reveal that the record exists | Agreed in PR #2 |
| D-11 | Server-side sessions in the database: random token in an HttpOnly cookie, only its hash stored, fixed expiry, logout deletes the session | Logout takes effect immediately and can be tested; JavaScript cannot read the cookie; a stolen database does not reveal usable tokens | Agreed in PR #2 |
| D-12 | Same stack as TokTickIT (React, Express, PostgreSQL with Prisma, Vitest, Playwright) | The course encourages reusing the Labs 1–4 stack; both members already know it | Agreed in PR #2 |

### 6.2 Questions and resolution
| ID | Question | Raised | Resolution | Status |
|---|---|---|---|---|
| Q-01 | Is a 7-day back-dating window (D-05) acceptable for the Sprint 1 date rule? | P0 | Ask the instructor/TA; record the answer here | Open |
| Q-02 | Is an uncapped percentage (D-08) acceptable, or should progress be capped at 100%? | P0 | Ask the instructor/TA; record the answer here | Open |
| Q-03 | Is Sprint 3 (reminder placeholders plus hardening) enough scope, or should another feature be added? | P0 | Ask the instructor/TA during the sprint plan (P4d) | Open |
| Q-04 | Are entry values whole numbers or decimals, and how many decimal places? | P3a | Decide in the F-04 contract (P5d) and update this table | Open |
| Q-05 | Should a program manager see anonymous, aggregated usage of their templates? | P3a | Not in the stakeholder brief; excluded by D-09 to avoid an unverified privacy design | Resolved: excluded |
