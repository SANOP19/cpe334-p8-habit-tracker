# System-Level Software Design Specification (SDS)
## Habit and Activity Tracking System — CPE 334 Theme 8

| Version | Date | Author | Reviewer | Change |
|---|---|---|---|---|
| 0.1 | 2026-11-14 | Nitithorn Ketkaew | Nara Kosiyaporn | Section 5: UI structure, API conventions, role/permission matrix (P4b, Issue #8) |
| 0.2 | 2026-11-14 | Nara Kosiyaporn | Nitithorn Ketkaew | Sections 1–4: Architecture, data model, auth/session lifecycle, configuration & delivery (P4a, Issue #7) |
| 0.3 | 2026-11-14 | Nitithorn Ketkaew | Nara Kosiyaporn | §5.4: role-matrix gaps now covered by AC-30..AC-32 (PR1, Issue #16) |

**Source:** `docs/project-brief.md` (P0, PR #2). Feature contracts (`docs/sprints/sprint-1/`) give the detailed endpoints, fields, and acceptance criteria; this document defines the overarching architectural patterns, data structures, and operational conventions they must adhere to.

---

## 1. Architecture and stack

### 1.1 Overview and architectural style

The Habit and Activity Tracking System is built as a three-tier client-server web application adhering to the **Separation of Concerns (SoC)** principle and the **Stateless Application Tier** architecture:

1. **Presentation Tier (Client):** A Single Page Application (SPA) built with React 18, TypeScript, Vite, and Bootstrap 5. It executes in the end-user's browser, managing view rendering, client-side route transitions, form input capture, and transient UX state.
2. **Application / API Tier (Server):** A stateless RESTful HTTP API service built with Express 4, TypeScript, and Node.js 24. It handles incoming HTTP requests, enforces authentication, verifies role permissions, coordinates domain business logic, executes database queries via Prisma ORM, and formats unified error responses.
3. **Data Tier (Database):** A relational database powered by PostgreSQL (compatible with versions 16–18), managing ACID-compliant persistent storage, relational integrity, unique constraints, and transaction isolation.

```mermaid
flowchart TD
    subgraph ClientTier ["Presentation Tier (Browser)"]
        SPA["React 18 SPA (Vite + Bootstrap 5)"]
        CookieJar["Browser Cookie Jar (HttpOnly session)"]
    end

    subgraph ServerTier ["Application / API Tier (Node.js 24 + Express 4)"]
        Router["Express Router (/api/*)"]
        AuthMid["Auth & Session Middleware"]
        RoleGuard["Role-Based Access Guard"]
        Controllers["Controllers & Service Layer (BR Enforcement)"]
        ClockSvc["Clock Service (Asia/Bangkok)"]
        PrismaORM["Prisma ORM Client"]
    end

    subgraph DataTier ["Persistence Tier (PostgreSQL)"]
        PG[("PostgreSQL Database
        - users
        - sessions
        - activity_templates
        - goals
        - activity_entries")]
    end

    SPA -->|JSON REST Requests credentials: include| Router
    CookieJar -.->|Sends Session Cookie| Router
    Router --> AuthMid
    AuthMid --> RoleGuard
    RoleGuard --> Controllers
    Controllers --> ClockSvc
    Controllers --> PrismaORM
    PrismaORM -->|SQL over Connection Pool| PG
```

### 1.2 Component communication and trust boundaries

Communication between the presentation tier and the API tier is strictly mediated via HTTP/1.1 (or HTTP/2 in production) with JSON payloads for all request and response bodies. 

The architecture establishes three distinct **Trust Boundaries**:

1. **External Boundary (Client to Server):** All input originating from the client browser is treated as untrusted and unverified. Client-side validation in React components exists solely for responsive user feedback; every request is re-validated authoritatively at the API boundary before processing.
2. **Authentication & Authorization Boundary (Middleware Layer):** Request contexts are hydrated with the authenticated user identity via the session cookie. Unauthenticated requests are rejected immediately with status `401 UNAUTHENTICATED`. Unauthorized operations based on role are rejected with status `403 FORBIDDEN`. Access to resources owned by other participants is rejected with `404 NOT_FOUND` to prevent identity enumeration.
3. **Data Integrity Boundary (ORM to PostgreSQL):** The database enforces structural integrity, foreign key relations, and uniqueness constraints. Even in the event of concurrent race conditions bypassing application-level checks, PostgreSQL unique indexes guarantee that invariant business rules (such as one entry per day per goal) cannot be violated.

### 1.3 Where business rules are enforced

A fundamental principle of the system design is that **the API service layer and database constraints form the authoritative enforcement boundary**. The client is never trusted to enforce domain logic or permissions.

| Rule / Invariant ID | Rule Summary | Authoritative Enforcement Layer | Violation Response |
|---|---|---|---|
| **BR-01** | Entry value within template `[minValue, maxValue]` | API Service Layer (querying template bounds) | `422 VALUE_OUT_OF_RANGE` |
| **BR-02** | No future date logging | API Service Layer (evaluating date against `clock.ts` in `Asia/Bangkok`) | `422 DATE_IN_FUTURE` |
| **BR-03** | Entry date back-dating window `[today - 6 days, today]` | API Service Layer (evaluating 7-day rolling window) | `422 DATE_TOO_OLD` |
| **BR-04** | Single entry per goal per calendar day | **Dual Layer:** API Service check + PostgreSQL `@@unique([goalId, entryDate])` | `409 DUPLICATE_ENTRY` |
| **BR-05** | Participant privacy isolation | Scoped database queries (`where: { id: goalId, participantId: user.id }`) | `404 NOT_FOUND` |
| **BR-06** | Role authorization for templates (Manager only) | Express Role Guard (`user.role !== 'PROGRAM_MANAGER'`) | `403 FORBIDDEN` |
| **BR-07** | Program manager barred from participant data | Express Role Guard (`user.role !== 'PARTICIPANT'`) | `403 FORBIDDEN` |
| **BR-08** | Goal requires published template and positive dailyTarget inside `[minValue, maxValue]` | API Service Layer (status guard & target check) | `422 TEMPLATE_NOT_PUBLISHED` / `422 TARGET_OUT_OF_RANGE` |
| **BR-09** | One active goal per participant per template | **Dual Layer:** API Service check + PostgreSQL partial unique index | `409 DUPLICATE_ACTIVE_GOAL` |
| **D-06 / Invariant** | Template `minValue < maxValue` | API Validation Layer + DB `CHECK ("minValue" < "maxValue")` | `422 INVALID_RANGE` |
| **D-06 / Invariant** | Published template cannot be re-published or modified | API Service State Guard (`status === 'PUBLISHED'`) | `409 ALREADY_PUBLISHED` |
| **D-06 / Invariant** | Template modification restricted to creator manager | API Service Ownership Guard (`template.createdById === user.id`) | `404 NOT_FOUND` |
| **D-10 / Invariant** | Unauthenticated access to protected endpoints blocked | Express Auth Middleware (verifying active session) | `401 UNAUTHENTICATED` |

---

## 2. Data model

### 2.1 Entity relationship overview and domain entities

The persistence model for Sprint 1 consists of 5 relational entities mapped via Prisma ORM:

1. **`User` (`users` table):** Represents system accounts.
   - `id`: Integer, Primary Key, Auto-increment.
   - `email`: String (Text), Unique index. System login identifier.
   - `passwordHash`: String (Text). Salted bcrypt hash of the account password.
   - `displayName`: String (Text). Human-readable name displayed in the UI header.
   - `role`: Enum (`PARTICIPANT`, `PROGRAM_MANAGER`). Fixed authorization role for the account.
   - `createdAt`: DateTime (UTC). Account creation timestamp.

2. **`Session` (`sessions` table):** Represents authenticated server-side sessions.
   - `id`: String (Text, UUID v4), Primary Key.
   - `tokenHash`: String (Text, 64-character SHA-256 hex digest), Unique index.
   - `userId`: Integer, Foreign Key referencing `users(id)` with `ON DELETE CASCADE`.
   - `expiresAt`: DateTime (UTC). Absolute session expiration timestamp.
   - `createdAt`: DateTime (UTC). Session issuance timestamp.

3. **`ActivityTemplate` (`activity_templates` table):** Standard activity definitions created by managers.
   - `id`: Integer, Primary Key, Auto-increment.
   - `name`: String (Text). Title of the habit activity (e.g., "Daily Reading").
   - `unit`: String (Text). Measurement unit (e.g., "pages", "minutes").
   - `minValue`: Float (Double Precision). Lower bound of valid recording values.
   - `maxValue`: Float (Double Precision). Upper bound of valid recording values (`minValue < maxValue`).
   - `status`: Enum (`DRAFT`, `PUBLISHED`). Life-cycle state. Only `PUBLISHED` templates can be selected for goals.
   - `createdById`: Integer, Foreign Key referencing `users(id)` with `ON DELETE RESTRICT`.
   - `createdAt`: DateTime (UTC).
   - *Constraint:* Database check constraint `CHECK ("minValue" < "maxValue")`.

4. **`Goal` (`goals` table):** A participant's commitment to an activity template.
   - `id`: Integer, Primary Key, Auto-increment.
   - `participantId`: Integer, Foreign Key referencing `users(id)` with `ON DELETE CASCADE`.
   - `templateId`: Integer, Foreign Key referencing `activity_templates(id)` with `ON DELETE RESTRICT`.
   - `dailyTarget`: Float (Double Precision). Participant's daily goal target (`dailyTarget > 0` within template bounds).
   - `status`: Enum (`ACTIVE`, `PAUSED`, `ARCHIVED`). Status of the goal (Sprint 1 uses `ACTIVE`).
   - `createdAt`: DateTime (UTC).
   - *Constraint:* Partial unique index on `("participantId", "templateId") WHERE status = 'ACTIVE'` (`BR-09`).

5. **`ActivityEntry` (`activity_entries` table):** Daily activity record logged by a participant.
   - `id`: Integer, Primary Key, Auto-increment.
   - `goalId`: Integer, Foreign Key referencing `goals(id)` with `ON DELETE CASCADE`.
   - `entryDate`: String (Text, format `YYYY-MM-DD`). The calendar day in `Asia/Bangkok` timezone.
   - `value`: Float (Double Precision). Quantity completed on that day.
   - `note`: String (Text), Nullable. Optional contextual comment from the participant.
   - `createdAt`: DateTime (UTC). Timestamp when the record was received.
   - *Constraint:* **`@@unique([goalId, entryDate])`** (`BR-04`). Guarantees no duplicate entries per goal per day.

### 2.2 Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    users ||--o{ sessions : "authenticates via"
    users ||--o{ activity_templates : "authors (manager)"
    users ||--o{ goals : "owns (participant)"
    activity_templates ||--o{ goals : "instantiated by"
    goals ||--o{ activity_entries : "accumulates"

    users {
        int id PK
        string email UK
        string passwordHash
        string displayName
        string role
        datetime createdAt
    }

    sessions {
        string id PK
        string tokenHash UK
        int userId FK
        datetime expiresAt
        datetime createdAt
    }

    activity_templates {
        int id PK
        string name
        string unit
        float minValue
        float maxValue
        string status
        int createdById FK
        datetime createdAt
    }

    goals {
        int id PK
        int participantId FK
        int templateId FK
        float dailyTarget
        string status
        datetime createdAt
    }

    activity_entries {
        int id PK
        int goalId FK
        string entryDate "YYYY-MM-DD"
        float value
        string note
        datetime createdAt
    }
```

### 2.3 Database migrations strategy

Database schema changes are managed strictly using **Prisma Migrate**:
- Schema definitions are authored declaratively in `server/prisma/schema.prisma`.
- Versioned SQL migration scripts are generated and stored under `server/prisma/migrations/<timestamp>_<name>/migration.sql`.
- In development and CI environments, schema synchronization is performed via `npx prisma migrate dev`.
- In production environments, migrations are applied non-interactively prior to starting the web service using:
  ```bash
  npx prisma migrate deploy
  ```
- All migration SQL files are committed to version control alongside `server/prisma/migration_lock.toml` to guarantee deterministic database states across all team members and deployment targets.

### 2.4 Reproducible database seed strategy

A reproducible seed script is implemented in `server/prisma/seed.ts` and executed via `npm run seed`:
- **Idempotency:** The seed script uses Prisma `upsert` operations based on unique constraints (`email`, `name`), making it safe to run repeatedly on new or existing environments without duplicating data or failing on uniqueness violations.
- **Deterministic Baseline Data:**
  - **Program Manager:** `manager@example.test` (Name: "Dr. Morgan Staff", Role: `PROGRAM_MANAGER`). Password loaded from required environment variable `SEED_MANAGER_PASSWORD`.
  - **Participant:** `participant@example.test` (Name: "Alex Student", Role: `PARTICIPANT`). Password loaded from required environment variable `SEED_PARTICIPANT_PASSWORD`.
  - **Sample Published Template:** "Daily Reading" (unit: "pages", `minValue`: 1, `maxValue`: 200, `status`: `PUBLISHED`).
- **Security:** Passwords are never written in code or documentation; missing seed password variables cause `seed.ts` to abort immediately with a clear error.

---

## 3. Authentication and session lifecycle

### 3.1 Password security and hashing

User passwords for seeded accounts are encrypted using `bcryptjs`:
- Passwords submitted during sign-in are compared using `bcrypt.compare()`.
- Passwords created during seeding are hashed using `bcrypt.hash()` with a work factor of 10 rounds (planned configurable `BCRYPT_ROUNDS` for F-01).
- Plaintext passwords are never persisted to disk, never written to log files, and never included in database serialization responses.

### 3.2 Split-secret session token architecture

To protect active sessions against database exfiltration attacks, the system employs the **split-secret token pattern**:
1. When a user successfully authenticates at `POST /api/auth/login`, the server generates a cryptographically secure pseudo-random 32-byte token using `crypto.randomBytes(32).toString('hex')` (64 hexadecimal characters).
2. The server computes a one-way cryptographic SHA-256 hash of this token:
   $$\text{tokenHash} = \text{SHA-256}(\text{plaintextToken})$$
3. Only the `tokenHash` is stored in the PostgreSQL `sessions` table, associated with the user's `userId` and an expiration timestamp `expiresAt`.
4. The plaintext token is returned exclusively to the client inside an `HttpOnly` cookie.
5. If the database is compromised, an attacker gaining access to `sessions.tokenHash` cannot forge the client cookie or authenticate as the user, because computing the pre-image of SHA-256 is computationally infeasible.

```mermaid
sequenceDiagram
    autonumber
    actor User as Participant / Manager
    participant Browser as Browser Client
    participant Server as Express API Server
    participant DB as PostgreSQL Database

    Note over User,DB: Sign-in Flow
    User->>Browser: Enters email and password
    Browser->>Server: POST /api/auth/login { email, password }
    Server->>DB: Query User by email
    DB-->>Server: User record with passwordHash
    Server->>Server: Verify bcrypt.compare(password, passwordHash)
    Server->>Server: Generate random 32-byte plaintextToken
    Server->>Server: Compute tokenHash = SHA-256(plaintextToken)
    Server->>Server: Calculate expiresAt = now + 24 hours
    Server->>DB: INSERT INTO sessions (tokenHash, userId, expiresAt)
    Server-->>Browser: 200 OK + Set-Cookie: session=plaintextToken (HttpOnly)
    Browser-->>User: Displays Dashboard

    Note over User,DB: Authenticated Request Flow
    Browser->>Server: GET /api/auth/me (Cookie: session=plaintextToken)
    Server->>Server: Compute tokenHash = SHA-256(plaintextToken)
    Server->>DB: SELECT * FROM sessions JOIN users WHERE tokenHash = ? AND expiresAt > now
    DB-->>Server: Session & User data
    Server-->>Browser: 200 OK { user: { id, email, displayName, role } }

    Note over User,DB: Sign-out Flow
    User->>Browser: Clicks Sign Out
    Browser->>Server: POST /api/auth/logout (Cookie: session=plaintextToken)
    Server->>Server: Compute tokenHash = SHA-256(plaintextToken)
    Server->>DB: DELETE FROM sessions WHERE tokenHash = ?
    Server-->>Browser: 204 No Content + Set-Cookie: session=; Max-Age=0
    Browser-->>User: Redirects to Sign In screen
```

### 3.3 Cookie delivery and security flags

The session cookie is configured with strict security flags:
- **`Name`:** `session` (neutral session cookie name)
- **`HttpOnly`:** `true` — Prevents client-side scripts from reading `document.cookie`, mitigating Cross-Site Scripting (XSS) session theft.
- **`SameSite`:** `'lax'` — Protects against Cross-Site Request Forgery (CSRF) on cross-origin requests while permitting top-level link navigation.
- **`Secure`:** Set dynamically to `true` when `NODE_ENV === 'production'` (enforcing HTTPS transmission) and `false` during local development over HTTP.
- **`Path`:** `/` — Scope restricted to the entire application API.
- **`Max-Age`:** Derived from `SESSION_TTL_HOURS * 3600` (default 24 hours = 86,400 seconds).

### 3.4 Session expiry and revocation lifecycle

- **Fixed Session TTL:** Sessions are assigned a fixed 24-hour lifetime upon creation (`expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)`). No indefinite sliding sessions are permitted.
- **Lookup Verification:** Every incoming request checks that `session.expiresAt > new Date()`. If the expiration time has elapsed, the session is rejected with `401 UNAUTHENTICATED`, and the client cookie is instructed to clear.
- **Explicit Invalidation (Logout):** When `POST /api/auth/logout` is called, the server deletes the session row from PostgreSQL by its `tokenHash` and issues a `Set-Cookie` header with `Max-Age=0`. The session token cannot be reused even if the cookie is cached.

---

## 4. Configuration and delivery

### 4.1 Twelve-factor application configuration

All configuration parameters and operational secrets are decoupled from code and injected via environment variables adhering to **The Twelve-Factor App** design methodology:

| Variable Name | Required | Default / Example Value | Description |
|---|---|---|---|
| `PORT` | Optional | `3000` | Port on which the Express HTTP server listens. |
| `NODE_ENV` | Optional | `development` | Runtime environment (`development`, `test`, `production`). |
| `DATABASE_URL` | **Required** | `postgresql://user:pass@localhost:5432/habittracker?schema=public` | PostgreSQL connection string for development and production. |
| `DATABASE_URL_TEST` | **Required for tests** | `postgresql://user:pass@localhost:5432/habittracker_test?schema=public` | Dedicated PostgreSQL test database URL used strictly by automated tests. |
| `SESSION_TTL_HOURS` | Optional | `24` | Lifespan of user sessions in hours. |
| `BCRYPT_ROUNDS` | Optional | `10` *(planned for F-01)* | Salt work factor for bcrypt password hashing. |
| `TZ` | **Required** | `Asia/Bangkok` | Authoritative timezone for server-side calendar day computations (D-04). |
| `SEED_PARTICIPANT_PASSWORD` | **Required** | *(injected secret)* | Initial password for the seeded demo participant account. |
| `SEED_MANAGER_PASSWORD` | **Required** | *(injected secret)* | Initial password for the seeded demo program manager account. |

### 4.2 Secret handling and zero-leakage policy

1. **Version Control Protection:** The `.env` and `.env.test` files containing actual connection strings and credentials are explicitly included in `.gitignore` and must **never** be committed to Git.
2. **Template Distribution:** A sanitized `.env.example` file is tracked in Git, documenting all required keys with dummy placeholder values.
3. **Client-Side Isolation:** Variables consumed by the Vite client are prefixed with `VITE_` (e.g., `VITE_API_URL`). Secrets (such as `DATABASE_URL` or seed passwords) do not use this prefix and are never bundled into client-side JavaScript assets.
4. **CI/CD Injection:** In automated CI/CD pipelines and cloud deployments, environment variables are securely injected through encrypted platform secrets (e.g., GitHub Actions Secrets or Google Cloud Secret Manager).

### 4.3 Database connection management

- Connection pooling is managed automatically by Prisma Client via PostgreSQL connection parameters.
- Health probes at `GET /api/health` return HTTP 200 with `{ status: "ok" }`.
- In test environments, tests execute against an isolated test database (`DATABASE_URL_TEST`) with atomic table truncation (`TRUNCATE TABLE ... RESTART IDENTITY CASCADE`) between test suites (`tests/harness.ts`). Connection error messages mask credentials to prevent credential exposure in test logs.

### 4.4 Planned deployment topology (Cloud Run and Cloud SQL)

*Note: Deployment infrastructure is planned for Lab 5 and beyond; Deliverable 1 establishes the container-ready architecture:*

```mermaid
flowchart LR
    User([End User]) -->|HTTPS / 443| Service["Cloud Run Service
    - Node.js 24 Alpine
    - Express REST API (/api/*)
    - Static React Assets (/*)"]

    subgraph GCP ["Google Cloud Platform (Bangkok / asia-southeast1)"]
        Service
        PG[("Cloud SQL PostgreSQL 16
        - db-f1-micro tier")]
        GSM["Secret Manager
        - DATABASE_URL
        - SEED passwords"]
        AR["Artifact Registry
        - habit-tracker image"]
    end

    AR -.->|Deploy Container| Service
    GSM -.->|Inject Secrets| Service
    Service -->|Cloud SQL Auth Proxy| PG
```

1. **Unified Container Packaging:** Lightweight multi-stage Docker build producing a single container image that hosts the Express API and serves the compiled static React SPA assets.
2. **Execution Platform:** Google Cloud Run (stateless, serverless container execution with automated scaling to zero).
3. **Managed Storage:** Google Cloud SQL running PostgreSQL 16 (`db-f1-micro` tier) with private connectivity.
4. **Secret Delivery:** Secrets delivered dynamically via Google Cloud Secret Manager.

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
Cases found without a test during the P4b review were added as acceptance criteria in version 0.3: publishing another manager's template → 404 (AC-30), publishing twice → 409 (AC-31), manager calling `GET /api/goals` → 403 (AC-32). See `docs/traceability.md`.
