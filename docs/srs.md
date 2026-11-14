# Software Requirements Specification (SRS) — HabitPulse

**System Theme:** Theme 8 — Habit and Activity Tracking System  
**Product Name:** HabitPulse  
**Course:** KMUTT CPE 334 Software Engineering (Semester 1/2026)  
**Authors:** Nitithorn Ketkaew (67070505203, @SANOP19) · Nara Kosiyaporn (67070505218, @narakosi-dev)

---

## 1. Stakeholder Problem and Context
*(Authored in Part P3a — Issue #5)*

---

## 2. Actors and Responsibilities
*(Authored in Part P3a — Issue #5)*

---

## 3. Product Scope, Exclusions and Decisions
*(Authored in Part P3a — Issue #5)*

---

## 4. System Requirements

### 4.1 Functional Requirements (FR)

| ID | Observable System Behaviour | Actor | Sprint | Primary Verification |
|---|---|---|:---:|---|
| **FR-01** | A registered user provides valid email and password credentials, and the system issues an authenticated server-side session stored in an HttpOnly cookie. | User | 1 | Integration test `TEST-01` |
| **FR-02** | An authenticated user requests logout; the system destroys the session record in the database and clears the session cookie. | User | 1 | Integration test `TEST-05` |
| **FR-03** | An authenticated user queries current identity; the system returns their unique ID, display name, and authorized role (`PARTICIPANT` or `PROGRAM_MANAGER`). | User | 1 | API test `TEST-03` |
| **FR-04** | A program manager creates a new activity template specifying name, unit, minValue, and maxValue (`minValue < maxValue`), initialized in `DRAFT` status. | Program Manager | 1 | API test `TEST-07` |
| **FR-05** | A program manager publishes an existing draft template they own; status changes from `DRAFT` to `PUBLISHED` making it selectable by participants. | Program Manager | 1 | API test `TEST-10` |
| **FR-06** | A participant retrieves the catalog of all published templates; a program manager retrieves all templates they created across draft and published statuses. | Participant / Program Manager | 1 | API test `TEST-11` |
| **FR-07** | A participant selects a published template and establishes a habit goal with a personal `dailyTarget` bounded by the template's `[minValue, maxValue]`. | Participant | 1 | Integration test `TEST-12` |
| **FR-08** | A participant records an activity entry (entry date, numeric value, optional note) for their active goal within allowable date and value constraints. | Participant | 1 | Integration test `TEST-17` |
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
| **BR-01** | **Target & Entry Value Boundedness:** An activity entry value must be a valid numeric quantity within the referenced template's defined `[minValue, maxValue]` range, inclusive. | `422 Unprocessable Entity` | Domain / API validation | 1 |
| **BR-02** | **No Future Date Logging:** An entry date cannot be in the future relative to the current calendar date calculated by server time in `Asia/Bangkok` timezone. | `422 Unprocessable Entity` | Domain / API validation | 1 |
| **BR-03** | **7-Day Rolling Back-Dating Window:** An entry date can be recorded for today or up to 6 calendar days prior to today (exactly 7 calendar days eligible). Dates 7 or more days in the past are rejected. | `422 Unprocessable Entity` | Domain / API validation | 1 |
| **BR-04** | **Single Entry Per Goal Per Calendar Day:** Exactly one entry is permitted per habit goal per calendar day; accumulation or duplicate submission for the same date is rejected. | `409 Conflict` | Database unique constraint `@@unique([goalId, entryDate])` | 1 |
| **BR-05** | **Participant Data Isolation & Privacy:** A participant may only view, inspect, or record entries against their own goals. Inquiries targeting resources owned by other participants return 404 to avoid ID enumeration. | `404 Not Found` | Application / Database query filter | 1 |
| **BR-06** | **Template Authoring Authorization:** Only users with `PROGRAM_MANAGER` role are authorized to create or publish activity templates; participant attempts are rejected. | `403 Forbidden` | Authorization middleware | 1 |
| **BR-07** | **Manager Privacy Boundary:** Users with `PROGRAM_MANAGER` role are strictly restricted from inspecting individual participant habit goals, entry logs, or personal progress. | `403 Forbidden` | Authorization middleware | 1 |
| **BR-08** | **Valid Goal Target Range:** A habit goal requires a published template (`status = PUBLISHED`) and a positive `dailyTarget` satisfying `minValue <= dailyTarget <= maxValue`. | `422 Unprocessable Entity` | Domain / API validation | 1 |
| **BR-09** | **Unique Active Goal per Template:** A participant may maintain at most one goal in `ACTIVE` status for any given activity template at a given time. | `409 Conflict` | Application / Database constraint | 1 |
| **BR-10** | **Historical Progress Invariance:** Updating or archiving a habit goal does not retroactively alter the evaluation or target of previously recorded activity entries. | N/A | Schema audit / immutable history | 2 |
| **BR-11** | **Unbroken Streak Continuity:** A habit streak increases by 1 for each contiguous calendar day with an entry value `>= dailyTarget`. Any calendar day without an entry meeting the target resets current streak to 0. | N/A | Analytics service | 2 |
| **BR-12** | **Simulated Reminder Invariance:** Scheduled reminders are purely client-facing schedule indicators and do not trigger outbound network emails, SMS, or external push traffic. | N/A | UI presentation layer | 3 |

---

### 4.3 Non-Functional Requirements (NFR)

| ID | Quality Attribute | Measurable Target & Constraint | Verification Method | Sprint |
|---|---|---|---|:---:|
| **NFR-01** | **Access Control & Authentication** | 100% of protected API endpoints reject requests without a valid, unexpired session cookie with HTTP `401 Unauthorized` and return zero sensitive payload data. | Automated Supertest API negative test suite (`TEST-04`) | 1 |
| **NFR-02** | **Credential Storage Security** | User passwords must never be stored, logged, or serialized in plaintext. All stored passwords must be cryptographic hashes generated via `bcryptjs` with salt rounds >= 10. | Automated test inspecting database records (`TEST-06`); audit of logs and JSON serialization | 1 |
| **NFR-03** | **Session Lifetime & Revocation** | Database session records expire after `SESSION_TTL_HOURS` (default 24h). Immediate database deletion upon logout invalidates old cookies within 100ms. | Automated API test with expired timestamp and post-logout verification (`TEST-05`) | 1 |
| **NFR-04** | **Data Durability & Persistence** | 100% of persisted users, templates, goals, and entries survive a full application container/server restart without corruption or omission. | Automated persistence / application restart test harness (`TEST-28`) | 1 |
| **NFR-05** | **Safe Standardized Error Handling** | All 4xx and 5xx API responses conform strictly to standard JSON shape `{ "error": { "code": string, "message": string } }` without exposing raw SQL, stack traces, or internal server paths. | Negative API integration test assertions (`TEST-29`) across validation and auth errors | 1 |
| **NFR-06** | **Reproducible Engineering Setup** | A clean repository clone on a machine with Node.js 24 and PostgreSQL executes `npm ci`, migrations, seeding, and full test suite cleanly in under 5 minutes without manual file patches. | Independent clean-clone execution check by peer reviewer | 1 |
| **NFR-07** | **User Interface State Clarity** | Primary client screens implement distinct, observable visual representations for loading states, empty collection states, and actionable error alerts. | Automated React component / Playwright E2E assertions and visual screenshot audit | 1 |
| **NFR-08** | **Zero Secret Exposure** | Zero real passwords, cryptographic secrets, session tokens, or private connection strings exist in repository source files, Git commit history, or client bundles. | Automated diff inspection, `.env.example` placeholder verification, and GitHub Secret Scanning | 1 |
