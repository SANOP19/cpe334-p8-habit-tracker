# Feature Contract — F-02 Activity Template Management

| Version | Date | Author | Reviewer | Change |
|---|---|---|---|---|
| 1.0 | 2026-11-14 | Nara Kosiyaporn | Nitithorn Ketkaew | Contract written before implementation (PR3, Issue #18) |
| 1.1 | 2026-11-25 | Nitithorn Ketkaew | Nara Kosiyaporn | §4 empty-state text corrected from "below" to "above": the reviewed layout puts the create form above the list and the code already says "above" (Lab 6 pre-UAT KI-8, Issue #66) |

**Requirements:** FR-04, FR-05, FR-06 · BR-06 · decisions D-05, D-06, D-10, D-11  
**Acceptance criteria:** AC-07, AC-08, AC-09, AC-10, AC-11, AC-30, AC-31  
**Depends on:** server foundation (P1, PR #12: `activity_templates` table with CHECK constraint `minValue < maxValue`, test harness), client foundation (P2, PR #9: `Layout`, `apiRequest`, shared states), F-01 authentication (PR2, PR #26: `requireAuth`, `requireRole`, session cookie)  
**Used by:** F-03 (Goal setting) allows participants to choose only published templates.

---

## 1. Feature design (feature-level SDS)

### 1.1 Behaviour and workflow
1. **Create Draft Template (Manager only):** A signed-in program manager submits template attributes (`name`, `unit`, `minValue`, `maxValue`). The server validates the payload, verifies `minValue < maxValue`, and inserts an `activity_templates` row with status `DRAFT` and `createdById = req.user.id`.
2. **Publish Template (Manager owner only):** The program manager publishes their own draft template via `POST /api/templates/:id/publish`. The server verifies ownership; if the template is owned by another manager, the server returns 404 (privacy isolation, AC-30). If already published, it returns 409 `ALREADY_PUBLISHED` (AC-31). On success, status becomes `PUBLISHED` and it immediately becomes available for participants.
3. **List Templates:**
   - **Participant:** `GET /api/templates` returns all templates whose status is `PUBLISHED`. Draft templates are filtered out on the server.
   - **Program Manager:** `GET /api/templates` returns templates created by that manager (`createdById = req.user.id`), showing both `DRAFT` and `PUBLISHED` states.
4. **Permissions:** Enforced via `requireAuth` and `requireRole("PROGRAM_MANAGER")` middleware.

### 1.2 Template lifecycle
- **States:** `DRAFT` $\rightarrow$ `PUBLISHED`.
- **Transitions:** In Sprint 1, templates are created as `DRAFT` and can transition once to `PUBLISHED`. (Unpublishing, editing, or archiving templates is out of scope for Sprint 1).

### 1.3 Business rules and validation
| Rule | Behaviour |
|---|---|
| Required fields | `name` (non-empty string), `unit` (non-empty string), `minValue` (finite number), `maxValue` (finite number) are required $\rightarrow$ otherwise 422 `VALIDATION_ERROR` with `details` per field. |
| Range constraint (BR-06, D-06) | `minValue` must be strictly less than `maxValue` (`minValue < maxValue`). If `minValue >= maxValue`, the request is rejected with 422 `INVALID_RANGE`. The database CHECK constraint provides defence-in-depth. |
| Program Manager only | Non-manager (Participant) calling `POST /api/templates` or `POST /api/templates/:id/publish` receives 403 `FORBIDDEN`. |
| Creator isolation (AC-30) | A manager attempting to publish a template created by a different manager receives 404 `NOT_FOUND` (preventing template enumeration or unauthorized publication). |
| Idempotency / Double publish (AC-31) | Publishing an already published template returns 409 `ALREADY_PUBLISHED`. |
| Unauthenticated access | Request without valid session returns 401 `UNAUTHENTICATED`. |

### 1.4 Permissions
| Endpoint | Unauthenticated | Participant | Program Manager |
|---|---|---|---|
| `POST /api/templates` | 401 | 403 `FORBIDDEN` | allowed |
| `POST /api/templates/:id/publish` | 401 | 403 `FORBIDDEN` | own draft only (404 for other manager, 409 if already published) |
| `GET /api/templates` | 401 | sees only `PUBLISHED` | sees own templates (`createdById = self`) |

---

## 2. API specification

### `POST /api/templates`
Headers: `Cookie: session=<token>`  
Request:
```json
{
  "name": "Daily Steps",
  "unit": "steps",
  "minValue": 0,
  "maxValue": 50000
}
```
Responses:
| Status | Body | Description |
|---|---|---|
| 201 | `{ "template": { "id": 1, "name": "Daily Steps", "unit": "steps", "minValue": 0, "maxValue": 50000, "status": "DRAFT", "createdById": 1, "createdAt": "..." } }` | Created |
| 401 | `{ "error": { "code": "UNAUTHENTICATED", "message": "Please sign in." } }` | Not signed in |
| 403 | `{ "error": { "code": "FORBIDDEN", "message": "You do not have permission to do this." } }` | Non-manager |
| 422 | `{ "error": { "code": "INVALID_RANGE", "message": "minValue must be strictly less than maxValue.", "details": [...] } }` | `minValue >= maxValue` |
| 422 | `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }` | Missing field or non-numeric value |

### `POST /api/templates/:id/publish`
Headers: `Cookie: session=<token>`  
Responses:
| Status | Body | Description |
|---|---|---|
| 200 | `{ "template": { "id": 1, "name": "Daily Steps", "unit": "steps", "minValue": 0, "maxValue": 50000, "status": "PUBLISHED", "createdById": 1, "createdAt": "..." } }` | Published |
| 401 | `{ "error": { "code": "UNAUTHENTICATED", "message": "Please sign in." } }` | Not signed in |
| 403 | `{ "error": { "code": "FORBIDDEN", "message": "You do not have permission to do this." } }` | Non-manager |
| 404 | `{ "error": { "code": "NOT_FOUND", "message": "Template not found." } }` | Template does not exist or owned by another manager |
| 409 | `{ "error": { "code": "ALREADY_PUBLISHED", "message": "Template is already published." } }` | Already published |

### `GET /api/templates`
Headers: `Cookie: session=<token>`  
Responses:
| Status | Body | Description |
|---|---|---|
| 200 | `{ "templates": [ { "id": 1, "name": "Daily Steps", "unit": "steps", "minValue": 0, "maxValue": 50000, "status": "PUBLISHED", "createdById": 1, "createdAt": "..." } ] }` | Filtered by role |
| 401 | `{ "error": { "code": "UNAUTHENTICATED", "message": "Please sign in." } }` | Not signed in |

---

## 3. Data

No new database migration required. Uses `activity_templates` table created in P1:
- `id` (serial primary key)
- `name` (text, not null)
- `unit` (text, not null)
- `minValue` (float, not null)
- `maxValue` (float, not null)
- `status` (`TemplateStatus` enum: `DRAFT`, `PUBLISHED`, default `DRAFT`)
- `createdById` (integer, references `users.id`)
- `createdAt` (timestamp with time zone)
- Database Check Constraint: `CHECK ("minValue" < "maxValue")`

---

## 4. UI specification

When user navigates to the "Templates" tab (`page === "templates"`):

### Program Manager view:
- **Header & Action:** "Activity Templates" heading with a "Create template" form.
- **Creation Form:** Inputs for `name`, `unit`, `minValue`, `maxValue`, and a "Create template" submit button.
- **States:**
  - While submitting: submit button disabled, `<Loading label="Creating template" />`.
  - On error: `<ErrorMessage message={error} />`.
  - While initial load: `<Loading label="Loading templates" />`.
  - When no templates created: `<EmptyState message="No templates yet. Create your first template above." />`.
- **Template List:** Cards or table showing `name`, `unit`, `range` (`minValue - maxValue`), `status badge` (`DRAFT` or `PUBLISHED`).
- **Publish Action:** For templates with `status === "DRAFT"`, display a "Publish" button. When clicked:
  - Calls `POST /api/templates/:id/publish`.
  - While publishing: button disabled with loading indicator.
  - On success: status badge updates to `PUBLISHED`, and publish button is removed.

### Participant view:
- **Header:** "Activity Templates" heading.
- **Template List:** Cards or list showing only published templates (`name`, `unit`, `range`).
- **States:**
  - When no published templates exist: `<EmptyState message="No published activity templates available." />`.
  - While loading: `<Loading label="Loading templates" />`.
- **Restrictions:** Form and publish buttons are not rendered for participants.

---

## 5. Acceptance criteria

| AC | Given / When / Then |
|---|---|
| **AC-07** | Given a signed-in program manager, when they submit a template with name, unit, and minValue < maxValue, then the response is 201 Created with status `DRAFT`, `createdById` set to the manager, and the template persists in the database. |
| **AC-08** | Given a program manager, when they submit a template with minValue >= maxValue, then the response is 422 `INVALID_RANGE`, and no row is created. |
| **AC-09** | Given a signed-in participant, when they attempt to create a template via `POST /api/templates`, then the server returns 403 `FORBIDDEN`. |
| **AC-10** | Given a manager's draft template, when the manager publishes it, then the response is 200 with status `PUBLISHED`, and it becomes available to participants. |
| **AC-11** | Given a signed-in participant, when they call `GET /api/templates`, then only templates with status `PUBLISHED` are returned. Given a signed-in manager, when they call `GET /api/templates`, then their own templates (both draft and published) are returned. |
| **AC-30** | Given a draft template owned by Manager A, when Manager B attempts to publish it via `POST /api/templates/:id/publish`, then the response is 404 `NOT_FOUND`. |
| **AC-31** | Given an already published template, when the manager attempts to publish it again, then the response is 409 `ALREADY_PUBLISHED`. |

---

## 6. Software Test Specification

| Test | AC | Level | Precondition / input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-07 | AC-07 | API + DB | Signed-in manager | `POST /api/templates` with valid name, unit, min < max | 201 Created; body has template with status `DRAFT`; DB row exists |
| TEST-08 | AC-08 | API + DB | Signed-in manager | `POST /api/templates` with minValue >= maxValue | 422 `INVALID_RANGE`; DB count = 0 |
| TEST-08b | AC-08 | API | Signed-in manager | `POST /api/templates` with missing required fields | 422 `VALIDATION_ERROR` with details |
| TEST-08c | AC-08 | API | Signed-in manager | `POST /api/templates` with boolean or string min/max | 422 `VALIDATION_ERROR` with details |
| TEST-09 | AC-09 | API | Signed-in participant | `POST /api/templates` with valid body | 403 `FORBIDDEN`; no DB row created |
| TEST-10 | AC-10 | API + DB | Signed-in manager with draft template | `POST /api/templates/:id/publish` | 200 OK; status updated to `PUBLISHED` in DB |
| TEST-11a | AC-11 | API + DB | Participant signed in; DB has 1 draft and 1 published template | `GET /api/templates` | 200 OK; returns array with only the published template |
| TEST-11b | AC-11 | API + DB | Manager signed in; DB has 1 draft and 1 published owned by manager, and 1 published by another | `GET /api/templates` | 200 OK; returns own draft and own published templates |
| TEST-30 | AC-30 | API + DB | Manager A owns draft; Manager B signed in | `POST /api/templates/:id/publish` by Manager B | 404 `NOT_FOUND`; template status remains `DRAFT` |
| TEST-31 | AC-31 | API + DB | Manager owns published template | `POST /api/templates/:id/publish` second time | 409 `ALREADY_PUBLISHED`; status remains `PUBLISHED` |
| TEST-04-ext | AC-04 | API | No session cookie | `POST /api/templates`, `POST /api/templates/:id/publish`, `GET /api/templates` | 401 `UNAUTHENTICATED` |
| TEST-UI-03 | AC-07, AC-08 (UI) | Component | Manager signed in | Submit template form (valid, then invalid min >= max) | Form validation, loading state, error display, refresh list |
| TEST-UI-04 | AC-10, AC-11 (UI) | Component | Participant vs Manager view | Render templates page for each role; click Publish | Participant sees published list only; Manager sees own with publish buttons |

---

## 7. Feature Definition of Done

- All tests in §6 pass against real PostgreSQL test database; server and client builds pass.
- Commits in order: contract $\rightarrow$ failing tests $\rightarrow$ implementation.
- All endpoints enforce authentication and role isolation.
- `docs/traceability.md` rows for FR-04..06, BR-06 updated with test files and results.
- Code reviewed and approved by Nitithorn before merging.
