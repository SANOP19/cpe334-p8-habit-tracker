# Feature & Release Contract — PR7: Sprint 1 Release Preparation

| Version | Date | Author | Reviewer | Change |
|---|---|---|---|---|
| 1.0 | 2026-11-14 | Nara Kosiyaporn | Nitithorn Ketkaew | Contract written before implementation (PR7, Issue #22) |
| 1.1 | 2026-11-14 | Nara Kosiyaporn | Nitithorn Ketkaew | Addressed review feedback: dedicated E2E account, migrate:deploy & migrate:test, postinstall prisma generate, NFR-04 restart verification script, and clean README instructions |

**Requirements:** FR-09 (full habit tracking lifecycle) · NFR-06 (clean-clone repeatability) · NFR-07 (UI feedback states) · NFR-08 (zero secrets) · NFR-04 (data integrity)
**Acceptance criteria:** AC-27 (end-to-end participant journey), NFR-06 (clean clone following README)
**Depends on:** PR1–PR6 (all Sprint 1 features F-01 through F-05 merged into `staging/sprint-1`)
**Prepares for:** PR8 (Sprint 1 release tag `v0.1.0-sprint1` to `main`)

---

## 1. Scope & Deliverables

### 1.1 Deliverables
1. **End-to-End Test (`e2e/journey.spec.ts` - TEST-27 / AC-27):**
   Automated browser journey using Playwright executing the primary stakeholder flow:
   - Sign in as participant (`participant@example.test`)
   - Browse published templates and select "Daily Reading"
   - Set an active goal with daily target = 20 pages
   - View goal on the Goals page
   - Record daily activity entry: date = today, amount = 25 pages, note = "E2E run reading session"
   - Confirm UI feedback: "Entry saved.", entry listed with "25 pages", percentage "125%", and "Achieved" badge
   - Attempt duplicate submission for same date → verify error message "An activity entry for this date already exists."
   - Sign out → verify session destroyed and user redirected to sign-in screen
2. **Comprehensive `README.md`:**
   - Architecture overview & technology stack
   - Prerequisites (Node.js 24 LTS, PostgreSQL 16+, npm)
   - Configuration & environment variables setup (`.env.example` reference with placeholder values only — zero secrets committed)
   - Database initialization: migration (`npm run db:migrate`), seeding (`npm run seed`)
   - Development server startup (backend on port 3000, Vite frontend on port 5173 with proxy)
   - Test execution: server suite, client suite, and E2E Playwright test
   - Safe demo accounts guide
   - Clean-clone verification protocol for reviewer
3. **Root Package Orchestration (`package.json`):**
   - Root npm scripts to run unit, integration, and E2E tests in a unified manner
4. **Full Test Execution on Staging:**
   - Full test run evidence captured in `docs/evidence/PR7/`
   - Complete trace from requirements to verified status in `docs/traceability.md`

---

## 2. End-to-End Specification (AC-27 / TEST-27)

| Step | Action | Expected Result |
|---|---|---|
| 1 | Navigate to `/` (Sign In page) | Sign in form displayed (`#email`, `#password`, "Sign In" button) |
| 2 | Enter `participant@example.test` and seed password, click "Sign In" | Signed in successfully; redirected to Templates page (`/templates`); navbar displays participant name and role badge |
| 3 | Find published template card "Daily Reading", click "Set goal" | Goal setting input expands with "Daily target (pages)" |
| 4 | Enter target `20`, click "Save goal" | "Goal saved." appears on card; goal stored in DB |
| 5 | Navigate to Goals page (`/goals`) | Goals page displays "Daily Reading" card with "Daily target: 20 pages" and "ACTIVE" badge |
| 6 | In "Log activity" section: fill Date (today), Amount = `25`, Note = "E2E session", click "Save entry" | "Entry saved." appears; entry row displayed showing today's date, "25 pages", "125%", and green "Achieved" badge |
| 7 | Attempt second entry on the same date with Amount = `30`, click "Save entry" | Error message appears: "An activity entry for this date already exists." (409 Conflict); previous entry unchanged |
| 8 | Click "Sign Out" in navbar | Session cookie cleared; redirected back to `/` with Sign In form |

---

## 3. Clean-Clone Protocol (NFR-06)
The reviewer (@SANOP19) will clone the repository into a separate temporary directory and execute:
1. Copy `.env.example` to `.env` in `server/` with test credentials
2. Install dependencies: `npm install` (root, server, client)
3. Setup database: `npm run migrate` and `npm run seed` in `server`
4. Run tests: `npm test` across server and client, and `npx playwright test`
5. Verify all tests pass without manual code changes or undocumented steps

---

## 4. Software Test Specification
| Test | AC / Req | Level | Action | Expected Result |
|---|---|---|---|---|
| TEST-27 | AC-27 / FR-09 | E2E (Playwright) | Run full participant lifecycle journey in headless Chromium | All 8 journey steps pass sequentially without error |
| TEST-ALL | CC-02 | Suite | Run all test suites across project | Server: 63+ passed; Client: 34+ passed; E2E: 1 passed |
| TEST-BUILD | CC-02 | Build | Run TypeScript and Vite builds | Server `tsc` exits 0; Client `vite build` exits 0 |
| TEST-CLEAN | NFR-06 | Review | Reviewer follows README on fresh clone | App runs and tests pass with 0 missing steps |

---

## 5. Definition of Done
- `e2e/journey.spec.ts` written and passing against live server and client.
- `README.md` complete and accurate.
- All test suites passing (server, client, E2E) on PostgreSQL 18.
- Traceability matrix updated: FR-09 marked Verified, NFR-06 marked Ready for Reviewer Check.
- Evidence files saved in `docs/evidence/PR7/`.
- Review requested from @SANOP19 with clean-clone instructions.
