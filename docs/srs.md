# Software Requirements Specification (SRS)
## Habit and Activity Tracking System — CPE 334 Theme 8

| Version | Date | Author | Reviewer | Change |
|---|---|---|---|---|
| 0.1 | 2026-11-14 | Nitithorn Ketkaew | Nara Kosiyaporn | Sections 1–3, 5 and 6: context, actors, scope, assumptions, decisions and questions (P3a, Issue #5) |

**Team:** Nitithorn Ketkaew (67070505203) · Nara Kosiyaporn (67070505218)
**Source:** decisions agreed in `docs/project-brief.md` (P0, PR #2). Requirement IDs (section 4) are written in P3b.

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

*Functional requirements (FR), business rules (BR) and non-functional requirements (NFR) are written in part P3b (Issue #6).*

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
