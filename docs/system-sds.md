# System-Level Software Design Specification (SDS)
## Habit and Activity Tracking System — CPE 334 Theme 8

| Version | Date | Author | Reviewer | Change |
|---|---|---|---|---|
| 0.1 | 2026-11-14 | Nara Kosiyaporn | Nitithorn Ketkaew | Sections 1–4: Architecture, data model, auth/session lifecycle, configuration & delivery (P4a, Issue #7) |

**Source:** `docs/project-brief.md` (P0, PR #2). Feature contracts (`docs/sprints/sprint-1/`) give the detailed endpoints, fields, and acceptance criteria; this document defines the overarching architectural patterns, data structures, and operational conventions they must adhere to.

---

## 1. Architecture and stack

### 1.1 Overview and architectural style

The Habit and Activity Tracking System (HabitPulse) is built as a three-tier client-server web application adhering to the **Separation of Concerns (SoC)** principle and the **Stateless Application Tier** architecture:

1. **Presentation Tier (Client):** A Single Page Application (SPA) built with React 18, TypeScript, Vite, and Bootstrap 5. It executes in the end-user's browser, managing view rendering, client-side route transitions, form input capture, and transient UX state.
2. **Application / API Tier (Server):** A stateless RESTful HTTP API service built with Express 4, TypeScript, and Node.js 24. It handles incoming HTTP requests, enforces authentication, verifies role permissions, coordinates domain business logic, executes database queries via Prisma ORM, and formats unified error responses.
3. **Data Tier (Database):** A relational database powered by PostgreSQL (compatible with versions 16–18), managing ACID-compliant persistent storage, relational integrity, unique constraints, and transaction isolation.

```mermaid
flowchart TD
    subgraph ClientTier ["Presentation Tier (Browser)"]
        SPA["React 18 SPA (Vite + Bootstrap 5)"]
        CookieJar["Browser Cookie Jar (HttpOnly habitpulse_session)"]
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

| Rule ID | Rule Summary | Authoritative Enforcement Layer | Violation Response |
|---|---|---|---|
| **BR-01** | Entry value within template `[minValue, maxValue]` | API Service Layer (querying associated template bounds) | `422 VALUE_OUT_OF_RANGE` |
| **BR-02** | Entry date cannot be in the future | API Service Layer (evaluating date against `clock.ts` in `Asia/Bangkok`) | `422 DATE_IN_FUTURE` |
| **BR-03** | Entry date back-dating window `[today - 6 days, today]` | API Service Layer (evaluating 7-day calendar window) | `422 DATE_TOO_OLD` |
| **BR-04** | At most one entry per goal per calendar day | **Dual Layer:** API Service check + PostgreSQL `@@unique([goalId, entryDate])` constraint | `409 DUPLICATE_ENTRY` |
| **BR-05** | Template `minValue < maxValue` | API Validation Layer / Service | `422 INVALID_RANGE` |
| **BR-06** | Published template cannot be modified or re-published | API Service State Guard (`status === 'PUBLISHED'`) | `409 ALREADY_PUBLISHED` |
| **BR-07** | Template modification restricted to creator manager | API Service Ownership Guard (`template.createdById === user.id`) | `404 NOT_FOUND` |
| **BR-08** | Goal `dailyTarget` inside template range `[minValue, maxValue]` | API Service Layer | `422 TARGET_OUT_OF_RANGE` |
| **BR-09** | At most one active goal per participant per template | **Dual Layer:** API Service check + PostgreSQL active goal query constraint | `409 DUPLICATE_ACTIVE_GOAL` |
| **BR-10** | Goal creation restricted to `PUBLISHED` templates | API Service Layer (`template.status === 'PUBLISHED'`) | `422 TEMPLATE_NOT_PUBLISHED` |
| **BR-11** | Goal and entry isolation between participants | Scoped database queries (`where: { id: goalId, participantId: user.id }`) | `404 NOT_FOUND` |
| **BR-12** | Program managers barred from participant data | Express Role Guard (`user.role !== 'PARTICIPANT'`) | `403 FORBIDDEN` |

---

## 2. Data model

### 2.1 Entity relationship overview and domain entities

The persistence model for Sprint 1 consists of 5 relational entities mapped via Prisma ORM:

1. **`User` (`users` table):** Represents system accounts.
   - `id`: Integer, Primary Key, Auto-increment.
   - `email`: String (VarChar 255), Unique index. System login identifier.
   - `passwordHash`: String (VarChar 255). Salted bcrypt hash of the account password.
   - `displayName`: String (VarChar 100). Human-readable name displayed in the UI header.
   - `role`: Enum (`PARTICIPANT`, `PROGRAM_MANAGER`). Fixed authorization role for the account.
   - `createdAt`: Timestamp with timezone (UTC). Account creation timestamp.

2. **`Session` (`sessions` table):** Represents authenticated server-side sessions.
   - `id`: String (UUID v4), Primary Key.
   - `tokenHash`: String (Char 64), Unique index. SHA-256 digest of the client session token.
   - `userId`: Integer, Foreign Key referencing `users(id)` with `ON DELETE CASCADE`.
   - `expiresAt`: Timestamp with timezone (UTC). Absolute session expiration timestamp.
   - `createdAt`: Timestamp with timezone (UTC). Session issuance timestamp.

3. **`ActivityTemplate` (`activity_templates` table):** Standard activity definitions created by managers.
   - `id`: Integer, Primary Key, Auto-increment.
   - `name`: String (VarChar 100). Title of the habit activity (e.g., "Daily Reading").
   - `unit`: String (VarChar 50). Measurement unit (e.g., "pages", "minutes").
   - `minValue`: Float (Double Precision). Lower bound of valid recording values.
   - `maxValue`: Float (Double Precision). Upper bound of valid recording values (`minValue < maxValue`).
   - `status`: Enum (`DRAFT`, `PUBLISHED`). Life-cycle state. Only `PUBLISHED` templates can be selected for goals.
   - `createdById`: Integer, Foreign Key referencing `users(id)` with `ON DELETE RESTRICT`.
   - `createdAt`: Timestamp with timezone (UTC).

4. **`Goal` (`goals` table):** A participant's commitment to an activity template.
   - `id`: Integer, Primary Key, Auto-increment.
   - `participantId`: Integer, Foreign Key referencing `users(id)` with `ON DELETE CASCADE`.
   - `templateId`: Integer, Foreign Key referencing `activity_templates(id)` with `ON DELETE RESTRICT`.
   - `dailyTarget`: Float (Double Precision). Participant's daily goal target within the template's bounds.
   - `status`: Enum (`ACTIVE`, `PAUSED`, `ARCHIVED`). Status of the goal (Sprint 1 uses `ACTIVE`).
   - `createdAt`: Timestamp with timezone (UTC).
   - *Constraint:* A participant may hold at most one `ACTIVE` goal per template (`BR-09`).

5. **`ActivityEntry` (`activity_entries` table):** Daily activity record logged by a participant.
   - `id`: Integer, Primary Key, Auto-increment.
   - `goalId`: Integer, Foreign Key referencing `goals(id)` with `ON DELETE CASCADE`.
   - `entryDate`: String (VarChar 10, format `YYYY-MM-DD`). The calendar day in `Asia/Bangkok` timezone.
   - `value`: Float (Double Precision). Quantity completed on that day.
   - `note`: String (Text), Nullable. Optional contextual comment from the participant.
   - `createdAt`: Timestamp with timezone (UTC). Timestamp when the record was received.
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

A reproducible seed script is implemented in `server/prisma/seed.ts` and executed via `npm run db:seed`:
- **Idempotency:** The seed script uses Prisma `upsert` operations based on unique constraints (`email`, `name`, `[goalId, entryDate]`), making it safe to run repeatedly on new or existing environments without duplicating data or failing on uniqueness violations.
- **Deterministic Baseline Data:**
  - **Program Manager:** `manager@habitpulse.local` (Name: "Dr. Arisara Manager", Role: `PROGRAM_MANAGER`). Password loaded from `SEED_MANAGER_PASSWORD` (default: `Manager123!`).
  - **Participant:** `participant@habitpulse.local` (Name: "Nara Participant", Role: `PARTICIPANT`). Password loaded from `SEED_PARTICIPANT_PASSWORD` (default: `Participant123!`).
  - **Sample Template:** "Daily Reading" (unit: "pages", `minValue`: 1, `maxValue`: 200, `status`: `PUBLISHED`).
  - **Sample Goal:** Active goal for `participant@habitpulse.local` linking to "Daily Reading" with `dailyTarget = 20.0`.
  - **Sample Entry:** Completed entry for today's date in `Asia/Bangkok` with `value = 25.0` (progress = 125%, `achieved = true`).

---

## 3. Authentication and session lifecycle

### 3.1 Password security and hashing

User passwords are encrypted using `bcryptjs`:
- Passwords submitted during sign-in are compared using `bcrypt.compare()`.
- Passwords created during seeding or registration are hashed using `bcrypt.hash()` with a configurable cost factor (`BCRYPT_ROUNDS`, minimum 10 rounds).
- Plaintext passwords are never persisted to disk, never written to log files, and never included in database serialization responses.

### 3.2 Split-secret session token architecture

To protect active sessions against database exfiltration attacks, HabitPulse employs the **split-secret token pattern**:
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
    Server-->>Browser: 200 OK + Set-Cookie: habitpulse_session=plaintextToken (HttpOnly)
    Browser-->>User: Displays Dashboard

    Note over User,DB: Authenticated Request Flow
    Browser->>Server: GET /api/auth/me (Cookie: habitpulse_session=plaintextToken)
    Server->>Server: Compute tokenHash = SHA-256(plaintextToken)
    Server->>DB: SELECT * FROM sessions JOIN users WHERE tokenHash = ? AND expiresAt > now
    DB-->>Server: Session & User data
    Server-->>Browser: 200 OK { user: { id, email, displayName, role } }

    Note over User,DB: Sign-out Flow
    User->>Browser: Clicks Sign Out
    Browser->>Server: POST /api/auth/logout (Cookie: habitpulse_session=plaintextToken)
    Server->>Server: Compute tokenHash = SHA-256(plaintextToken)
    Server->>DB: DELETE FROM sessions WHERE tokenHash = ?
    Server-->>Browser: 204 No Content + Set-Cookie: habitpulse_session=; Max-Age=0
    Browser-->>User: Redirects to Sign In screen
```

### 3.3 Cookie delivery and security flags

The session cookie is configured with strict security flags:
- **`Name`:** `habitpulse_session`
- **`HttpOnly`:** `true` — Prevents client-side scripts from reading `document.cookie`, mitigating Cross-Site Scripting (XSS) session theft.
- **`SameSite`:** `'lax'` — Protects against Cross-Site Request Forgery (CSRF) on cross-origin requests while permitting top-level link navigation.
- **`Secure`:** Set dynamically to `true` when `NODE_ENV === 'production'` (enforcing HTTPS transmission) and `false` during local development over HTTP.
- **`Path`:** `/` — Scope restricted to the entire application API.
- **`Max-Age`:** 86,400 seconds (24 hours).

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
| `DATABASE_URL` | **Required** | `postgresql://user:pass@localhost:5432/habitpulse?schema=public` | PostgreSQL connection string including credentials, host, port, database, and schema. |
| `SESSION_TTL_HOURS` | Optional | `24` | Lifespan of user sessions in hours. |
| `BCRYPT_ROUNDS` | Optional | `10` | Salt work factor for bcrypt password hashing (10 for dev/test, 12 in prod). |
| `TZ` | **Required** | `Asia/Bangkok` | Authoritative timezone for server-side calendar day computations (D-04). |
| `SEED_PARTICIPANT_PASSWORD` | Optional | `Participant123!` | Initial password for the seeded demo participant account. |
| `SEED_MANAGER_PASSWORD` | Optional | `Manager123!` | Initial password for the seeded demo program manager account. |

### 4.2 Secret handling and zero-leakage policy

1. **Version Control Protection:** The `.env` file containing actual connection strings and credentials is explicitly included in `.gitignore` and must **never** be committed to Git.
2. **Template Distribution:** A sanitized `.env.example` file is tracked in Git, documenting all required keys with dummy placeholder values.
3. **Client-Side Isolation:** Variables consumed by the Vite client are prefixed with `VITE_` (e.g., `VITE_API_URL`). Secrets (such as `DATABASE_URL` or seed passwords) do not use this prefix and are never bundled into client-side JavaScript assets.
4. **CI/CD Injection:** In automated CI/CD pipelines and cloud deployments, environment variables are securely injected through encrypted platform secrets (e.g., GitHub Actions Secrets or Google Cloud Secret Manager).

### 4.3 Database connection management

- Connection pooling is managed automatically by Prisma Client via PostgreSQL connection parameters (`connection_limit=10`).
- Health probes at `GET /api/health` issue a lightweight validation query (`prisma.$queryRaw\`SELECT 1\``) to verify active database connectivity and return HTTP 200 with `{ status: "ok", timestamp }`.
- In test environments, tests execute against an isolated test database (`DATABASE_URL` targeting a test schema or database instance) with automated transaction rollback or table truncation between test suites (`tests/harness.ts`).

### 4.4 Planned deployment topology (Cloud Run and Cloud SQL)

*Note: Deployment infrastructure is not part of Deliverable 1 implementation, but the system is designed specifically to support containerized cloud deployment on Google Cloud Platform (GCP):*

```mermaid
flowchart LR
    User([End User]) -->|HTTPS / 443| LB[Cloud Load Balancing / CDN]
    
    subgraph GCP ["Google Cloud Platform (asia-southeast1 / Bangkok)"]
        subgraph CloudRun ["Google Cloud Run (Serverless Containers)"]
            ClientContainer["Client Container
            - Nginx 1.25 Alpine
            - Static React Assets
            - Proxy /api to API Service"]
            ServerContainer["API Service Container
            - Node.js 24 Alpine
            - Express REST API
            - Prisma ORM Engine"]
        end

        subgraph CloudSQL ["Google Cloud SQL (Managed PostgreSQL)"]
            PGInstance[("Cloud SQL PostgreSQL 16
            - High Availability (HA)
            - Automated Backups")]
        end

        GSM["Secret Manager
        - DATABASE_URL
        - SEED passwords"]
    end

    LB --> ClientContainer
    ClientContainer -->|Internal Network /api| ServerContainer
    GSM -.->|Injects Secrets| ServerContainer
    ServerContainer -->|Cloud SQL Auth Proxy / Private IP| PGInstance
```

1. **Client Packaging:** Multi-stage Docker build compiling the React application into static bundles served by a hardened Nginx Alpine container.
2. **Server Packaging:** Lightweight Node.js 24 Alpine container running `node dist/index.js` with unprivileged user execution (`USER node`).
3. **Execution Platform:** Google Cloud Run (stateless, horizontally auto-scaling containers with zero scale-to-idle cost).
4. **Managed Storage:** Google Cloud SQL running PostgreSQL with Private IP connectivity inside a Virtual Private Cloud (VPC) and automated failover.
5. **Secret Delivery:** Environment secrets loaded dynamically via Google Cloud Secret Manager.

---

## 5. UI, API and access conventions
<!-- Authored in Part P4b: UI structure, API conventions, role/permission matrix (Issue #8 / PR #11) -->
