# Habit and Activity Tracking System

CPE 334 Software Engineering Group Project · Semester 1/2026 · KMUTT  
**Theme 8: Habit and Activity Tracking System**

---

## 1. Team Members
| Name | Student ID | GitHub | Role in Sprint 1 |
|---|---|---|---|
| Nitithorn Ketkaew | 67070505203 | [@SANOP19](https://github.com/SANOP19) | Author PR1, PR2 (F-01), PR4 (F-03), PR6 (F-05), PR8 · Reviewer PR3, PR5, PR7 |
| Nara Kosiyaporn | 67070505218 | [@narakosi-dev](https://github.com/narakosi-dev) | Author P1, PR3 (F-02), PR5 (F-04), PR7 (E2E & Release Prep) · Reviewer PR1, PR2, PR4, PR6, PR8 |

---

## 2. System Overview & Architecture
Habit and Activity Tracking System is a web-based habit and activity tracking platform designed for university students and program managers.
- **Frontend:** React 18, TypeScript, Vite, Bootstrap 5 (Responsive Single Page Application with client proxy).
- **Backend:** Node.js 24 LTS, Express, TypeScript, Prisma ORM, PostgreSQL.
- **Security:** Session-based authentication stored in PostgreSQL, random 256-bit token delivered via HttpOnly/SameSite (and Secure in production) cookies, only SHA-256 token hashes stored in DB, bcrypt password hashing with salt rounds = 10, role-based access control (`PARTICIPANT` vs `PROGRAM_MANAGER`).
- **Testing:** Vitest, Supertest, React Testing Library, Playwright for End-to-End browser automation.

---

## 3. Prerequisites & Database Setup
Before setting up the project, ensure you have:
1. **Node.js:** v24.x LTS (v20+ supported)
2. **PostgreSQL:** v16+ or v18 running locally
3. **npm:** v10+

### Database Provisioning
Connect to your local PostgreSQL instance (via `psql` or pgAdmin) as superuser and create a dedicated role and two databases:

```sql
-- Create role (credentials are examples; use alphanumeric characters only)
CREATE ROLE habituser WITH LOGIN PASSWORD 'habitpassword';

-- Create development and test databases
CREATE DATABASE habittracker OWNER habituser;
CREATE DATABASE habittracker_test OWNER habituser;
```

> [!NOTE]
> Use alphanumeric characters (letters and digits only) for the password to avoid URL encoding complications in the `DATABASE_URL` and `DATABASE_URL_TEST` connection strings.

---

## 4. Environment Variables Setup
The server reads its configuration from `server/.env`. A template is provided at `server/.env.example`.

Copy the example file to `.env`:
```bash
cp server/.env.example server/.env
```

Configure your local PostgreSQL connection and seed passwords in `server/.env`:
```env
PORT=3000
DATABASE_URL="postgresql://<user>:<password>@localhost:<port>/<dbname>?schema=public"
DATABASE_URL_TEST="postgresql://<user>:<password>@localhost:<port>/<dbname_test>?schema=public"
SESSION_TTL_HOURS=24
TZ="Asia/Bangkok"

# Seed passwords (read by seed.ts, hashed with bcryptjs)
SEED_MANAGER_PASSWORD="your-strong-manager-password"
SEED_PARTICIPANT_PASSWORD="your-strong-participant-password"
```

> [!IMPORTANT]
> **Zero Secrets Policy:** Never commit `.env` or any production credentials into Git. Only placeholder variable names are permitted in documentation and `.env.example`.

---

## 5. Quickstart & Clean-Clone Protocol (NFR-06)
To setup and run the application from a clean repository clone:

### 5.1 Install Dependencies
```bash
# 1. Install root dependencies
npm install

# 2. Install server dependencies (runs "prisma generate" in server/node_modules)
cd server && npm install && cd ..

# 3. Install client dependencies
cd client && npm install && cd ..

# 4. Install Playwright Chromium browser binary for E2E tests
npx playwright install chromium
```

> [!NOTE]
> Installing dependencies via `cd server && npm install && cd ..` triggers the `postinstall` script inside `server/`, generating the Prisma Client directly into `server/node_modules/@prisma/client`.

### 5.2 Initialize Database (Migrations & Seed)
Ensure your PostgreSQL daemon is running, then run migrations on both dev and test databases, followed by seeding:

```bash
# 1. Apply committed migrations to development database (uses migrate deploy, no CREATEDB shadow DB needed)
npm run migrate
# (or: npm --prefix server run migrate:deploy)

# 2. Apply committed migrations to test database (required for test:server)
npm run migrate:test
# (or: npm --prefix server run migrate:test)

# 3. Seed initial accounts and template
npm run seed
```

### 5.3 Demo Accounts (from Seed)
Seeded accounts use reserved `.test` domains:
| Role | Email | Display Name | Password |
|---|---|---|---|
| Program Manager | `manager@example.test` | Dr. Morgan Staff | `${SEED_MANAGER_PASSWORD}` from `server/.env` |
| Participant 1 | `participant@example.test` | Alex Student | `${SEED_PARTICIPANT_PASSWORD}` from `server/.env` |
| Participant 2 | `participant2@example.test` | Blake Student | `${SEED_PARTICIPANT_PASSWORD}` from `server/.env` |

---

## 6. Running the Development Application
Start the backend and frontend development servers:

- **Option A (Separate terminals):**
  ```bash
  # Terminal 1: Backend API (runs on http://localhost:3000)
  npm run dev:server

  # Terminal 2: Frontend Client (runs on http://localhost:5173 with /api proxy)
  npm run dev:client
  ```

Open your browser and navigate to `http://localhost:5173`.

---

## 7. Testing & Verification

### 7.1 Running All Tests
```bash
# Run server, client, and e2e test suites
npm test
```

### 7.2 Running Individual Test Suites
```bash
# Server unit and integration tests (PostgreSQL):
npm run test:server

# Client component tests (React Testing Library + JSDOM):
npm run test:client

# End-to-End browser tests (Playwright):
npm run test:e2e

# NFR-04 Application Restart & Data Persistence verification:
npm run test:restart
```

> [!NOTE]
> `npm run test:restart` verifies NFR-04 by spawning an isolated server instance, logging an activity entry, killing the process with `SIGTERM`, launching a brand new server process, and reading back the entry to verify persistence. It automatically builds `server/dist` if not already present.

### 7.3 Production Builds
Verify that both TypeScript compilation and Vite bundling pass cleanly:
```bash
npm run build
```

---

## 8. Project Documentation
- **Project Brief:** [`docs/project-brief.md`](docs/project-brief.md)
- **Software Requirements Specification (SRS):** [`docs/srs.md`](docs/srs.md)
- **System Software Design Specification (SDS):** [`docs/system-sds.md`](docs/system-sds.md)
- **Requirements Traceability Matrix:** [`docs/traceability.md`](docs/traceability.md)
- **Sprint Plan:** [`docs/sprints/plan.md`](docs/sprints/plan.md)
- **Sprint 1 Feature Contracts:**
  - F-01 Authentication & Session: [`docs/sprints/sprint-1/F-01-auth.md`](docs/sprints/sprint-1/F-01-auth.md)
  - F-02 Activity Template Management: [`docs/sprints/sprint-1/F-02-templates.md`](docs/sprints/sprint-1/F-02-templates.md)
  - F-03 Goal Setting: [`docs/sprints/sprint-1/F-03-goals.md`](docs/sprints/sprint-1/F-03-goals.md)
  - F-04 Daily Activity Logging: [`docs/sprints/sprint-1/F-04-logging.md`](docs/sprints/sprint-1/F-04-logging.md)
  - F-05 Progress & Privacy Isolation: [`docs/sprints/sprint-1/F-05-progress-privacy.md`](docs/sprints/sprint-1/F-05-progress-privacy.md)
  - PR7 Release Preparation: [`docs/sprints/sprint-1/PR7-release-prep.md`](docs/sprints/sprint-1/PR7-release-prep.md)
- **AI Tool Usage Declaration:** [`AI_USE.md`](AI_USE.md)
- **Contributing Guidelines:** [`CONTRIBUTING.md`](CONTRIBUTING.md)
