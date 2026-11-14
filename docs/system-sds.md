# System-Level Software Design Specification (SDS)
## Habit and Activity Tracking System — CPE 334 Theme 8

| Version | Date | Author | Reviewer | Change |
|---|---|---|---|---|
| 0.1 | 2026-11-14 | Nitithorn Ketkaew | Nara Kosiyaporn | Section 5: UI structure, API conventions, role/permission matrix (P4b, Issue #8) |

**Source:** `docs/project-brief.md` (P0, PR #2). Feature contracts (`docs/sprints/sprint-1/`) give the detailed endpoints, fields and acceptance criteria; this document fixes the conventions they must follow.

---

## 1. Architecture and stack
*Written in part P4a (Issue #7).*

## 2. Data model
*Written in part P4a (Issue #7).*

## 3. Authentication and session lifecycle
*Written in part P4a (Issue #7).*

## 4. Configuration and delivery
*Written in part P4a (Issue #7).*

---

## 5. UI, API and access conventions

### 5.1 Screens and navigation

The client is a single-page React application (`client/`). Navigation is chosen from the signed-in user's role returned by `GET /api/auth/me` — never from a value the user can select. Hiding a link is a convenience only; every permission is enforced by the API (section 5.3).

| Screen | Who sees it | Purpose | Main actions | Sprint |
|---|---|---|---|---|
| Sign in | Not signed in | Enter email and password | Sign in | 1 |
| Templates (manager view) | Program Manager | List own templates with status | Create template, publish a draft | 1 |
| Templates (participant view) | Participant | List published templates | Choose a template to set a goal | 1 |
| Goals | Participant | List own goals with template, unit and daily target | Open a goal | 1 |
| Goal detail | Participant (owner) | Record today's or a recent entry; see entries and progress | Record entry | 1 |
| Header (every screen when signed in) | Signed-in users | Show display name and role | Sign out | 1 |
| History, streak, summaries | Participant | Sprint 2 views | — | 2 |
| Reminder schedule | Participant | Sprint 3 placeholder view | — | 3 |

Navigation items by role (implemented in `client/src/components/Layout.tsx`, `navItemsFor`):

| Role | Navigation |
|---|---|
| Not signed in | Sign in |
| Participant | Templates, Goals |
| Program Manager | Templates |

After sign-in the client calls `GET /api/auth/me`, then opens Templates. After sign-out, or when any request returns 401, the client clears the user and shows Sign in.

### 5.2 Shared UI behaviour

| Situation | Behaviour | Component |
|---|---|---|
| Waiting for the API | Show a spinner with a label; disable the submit button so it is not sent twice | `Loading` |
| List with no items | Show a short message that says what to do next (e.g. "No goals yet — choose a template to start") | `EmptyState` |
| Request rejected | Show the `message` returned by the server above the form; keep what the user typed | `ErrorMessage` |
| Network failure | Show "Cannot reach the server. Check your connection and try again." | `ErrorMessage` |
| Unexpected server error | Show "Something went wrong. Please try again." — never a stack trace | `ErrorMessage` |
| Form validation | The browser checks required fields, number type and min/max for convenience; **the server checks again and is the authority** | form inputs |
| Success | Show the saved data as returned by the server (not the values the user typed) so the screen shows what was stored | page |

### 5.3 API conventions

**General**
- Base path `/api`; JSON request and response bodies; field names in `camelCase`.
- Resources are plural nouns (`/api/templates`, `/api/goals`); actions that change state and are not plain creation use a sub-path verb (`/api/templates/:id/publish`).
- IDs are positive integers. Dates without time use `YYYY-MM-DD` and mean a calendar day in Asia/Bangkok. Timestamps use ISO 8601 UTC.
- The current user is taken **only** from the session cookie. Request bodies never contain a user ID, owner ID or role, and the server ignores such fields if sent.
- Successful creation returns `201` with the created resource; reads return `200`; sign-out returns `204` with no body.
- List endpoints return a JSON array. (Pagination is not needed for the data volume in assumption A-07.)

**Status codes and order of checks**

Every protected endpoint applies the checks in this order and stops at the first failure, so the same request always gets the same answer:

| Order | Check | Status | Example |
|---|---|---|---|
| 1 | Valid, unexpired session? | 401 | No cookie, expired or signed-out session |
| 2 | Role allowed for this endpoint? | 403 | Participant calls `POST /api/templates`; manager calls `GET /api/goals/:id` |
| 3 | Record exists **and belongs to the user**? | 404 | Participant opens another participant's goal |
| 4 | Request body valid and business rules satisfied? | 422 | Value outside range; date in the future; draft template |
| 5 | Conflicts with existing data? | 409 | Second entry for the same goal and day |
| — | Anything unexpected | 500 | Database unavailable |

Using 404 (not 403) at step 3 means a participant cannot learn whether another participant's record exists (decision D-10).

**Error body**

Every error response uses one shape:

```json
{
  "error": {
    "code": "VALUE_OUT_OF_RANGE",
    "message": "Value must be between 0 and 20 pages.",
    "details": [{ "field": "value", "message": "Must be between 0 and 20" }]
  }
}
```

`code` and `message` are always present; `message` is safe to show to the user. `details` is optional and lists field problems for 422 responses. The client (`client/src/api.ts`) converts this body into `ApiError(status, code, message)`.

**Error codes**

| Code | Status | Meaning |
|---|---|---|
| `UNAUTHENTICATED` | 401 | No valid session |
| `INVALID_CREDENTIALS` | 401 | Sign-in failed; same message for unknown email and wrong password |
| `FORBIDDEN` | 403 | Role not allowed for this operation |
| `NOT_FOUND` | 404 | Record does not exist or belongs to someone else |
| `VALIDATION_ERROR` | 422 | Missing or malformed fields (see `details`) |
| `INVALID_RANGE` | 422 | Template minValue is not less than maxValue |
| `TEMPLATE_NOT_PUBLISHED` | 422 | Goal requested for a draft or unknown template |
| `TARGET_OUT_OF_RANGE` | 422 | dailyTarget outside the template range |
| `VALUE_OUT_OF_RANGE` | 422 | Entry value outside the template range (BR-01) |
| `DATE_IN_FUTURE` | 422 | Entry date after today (BR-02) |
| `DATE_TOO_OLD` | 422 | Entry date more than 6 days before today (BR-03) |
| `DUPLICATE_ENTRY` | 409 | An entry already exists for this goal and day (BR-04) |
| `DUPLICATE_ACTIVE_GOAL` | 409 | The participant already has an active goal for this template (BR-09) |
| `ALREADY_PUBLISHED` | 409 | Template is already published |
| `INTERNAL_ERROR` | 500 | Unexpected failure; message is generic |

Feature contracts may add codes; they must follow this table's style and be added here.

**Validation and safe error handling**
- The API validates every request body on the server before any database write, even when the UI already checked it.
- Business rules are enforced in the API service layer; uniqueness rules (BR-04, BR-09) are also enforced by database constraints so that simultaneous requests cannot both succeed. A constraint violation is translated to the 409 code above, not returned as a database error.
- One error-handling middleware produces every error body. Unexpected errors are logged on the server with details and returned to the client as `INTERNAL_ERROR` with a generic message: no stack trace, SQL or internal identifiers (NFR-05).
- Sign-in failures do not reveal whether the email exists.

### 5.4 Role / permission matrix (Sprint 1)

Enforced by server middleware and service checks. A hidden button or link in the UI is **not** authorization.

| Endpoint | Operation | Not signed in | Participant | Program Manager |
|---|---|---|---|---|
| `POST /api/auth/login` | Sign in | allowed | allowed | allowed |
| `POST /api/auth/logout` | Sign out | 401 | allowed (own session) | allowed (own session) |
| `GET /api/auth/me` | Current user | 401 | allowed (self) | allowed (self) |
| `POST /api/templates` | Create draft template | 401 | 403 | allowed; becomes owner |
| `POST /api/templates/:id/publish` | Publish template | 401 | 403 | own template: allowed · another manager's: 404 · already published: 409 |
| `GET /api/templates` | List templates | 401 | published templates only | own templates, any status |
| `POST /api/goals` | Create goal | 401 | allowed; goal owned by caller | 403 |
| `GET /api/goals` | List goals | 401 | own goals only | 403 |
| `GET /api/goals/:id` | Goal detail | 401 | own: allowed · others: 404 | 403 |
| `POST /api/goals/:id/entries` | Record entry | 401 | own goal: allowed · others: 404 | 403 |
| `GET /api/goals/:id/entries` | List entries | 401 | own goal: allowed · others: 404 | 403 |
| `GET /api/goals/:id/progress` | Progress | 401 | own goal: allowed · others: 404 | 403 |

**Record access summary**

| Record | Participant | Program Manager |
|---|---|---|
| Activity template | Read published | Create, publish and read own |
| Goal | Create and read own | None |
| Activity entry | Create and read own (through own goal) | None |
| Progress | Read own | None |
| User / session | Own identity only | Own identity only |

**Verification.** The brief's Sprint 1 acceptance criteria already cover: unauthenticated access (AC-04), participant creating a template (AC-09), participant seeing only published templates (AC-11), manager creating a goal (AC-16), entry on another participant's goal (AC-23), cross-participant reads (AC-25) and manager reads of participant data (AC-26).
Not yet covered, and to be added as acceptance criteria in the feature contracts: publishing another manager's template → 404 and publishing twice → 409 (F-02 contract, P5b); manager calling `GET /api/goals` → 403 (F-05 contract, P5e).
