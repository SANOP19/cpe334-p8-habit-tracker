# Working Sprint 1 and Verification

Release `v0.1.0-sprint1` · commit `bfd125f` · tested on staging `2bafb18` (identical tree). All evidence below refers to these versions unless stated otherwise.

## F.1 Setup summary (reproduction)

| Step | Command / content |
|---|---|
| Prerequisites | Node.js 24, npm 10+, PostgreSQL 16+ (we used 18) |
| Databases | Create a role and two databases (`habittracker`, `habittracker_test`) — README §3 |
| Environment | `cp server/.env.example server/.env`; set `DATABASE_URL`, `DATABASE_URL_TEST`, `SESSION_TTL_HOURS`, `TZ=Asia/Bangkok`, `SEED_MANAGER_PASSWORD`, `SEED_PARTICIPANT_PASSWORD` (placeholders only in Git) |
| Install | `npm install`; `cd server && npm install && cd ..` (also runs `prisma generate`); `cd client && npm install && cd ..`; `npx playwright install chromium` |
| Database | `npm run migrate` · `npm run migrate:test` · `npm run seed` |
| Run | `npm run dev:server` (API on :3000) and `npm run dev:client` (UI on :5173 with `/api` proxy) |
| Test | `npm test` (server + client + E2E) · `npm run test:restart` (NFR-04) · `npm run build` |
| Test accounts | Seeded synthetic accounts `manager@example.test`, `participant@example.test`, `participant2@example.test`; passwords come only from the local `server/.env` (never in Git or this report) |

Clean-clone check (NFR-06): passed by the member who did not write the README, from an empty test database, in 74 s (see Part B, NFR-06, and the PR #31 approval review).

## F.2 Program demonstrations

<div class="todo"><b>TODO (Nara):</b> three captioned screenshot sets of the release running locally. For each: feature/AC IDs, user role, starting conditions, brief steps, expected result, actual result. State the release commit once (above) and any exception.
<ol>
<li><b>Normal journey + retrieval:</b> participant signs in → sets a goal (F-03) → records an entry (F-04) → Goals page shows "125% Achieved" → reload and show the saved entry still listed (F-05, AC-12, AC-17, AC-24).</li>
<li><b>Business-rule rejection:</b> duplicate entry for the same day (409, AC-21) and/or value outside the range (422, AC-18) with the message visible.</li>
<li><b>Login/logout and forbidden operations:</b> sign in/out (AC-01, AC-05); participant 2 opening participant 1's goal progress → 404 (AC-25); manager calling <code>/api/goals</code> → 403 (AC-32). A UI screenshot alone does not prove backend protection — pair it with the API test excerpt in F.4 or a DevTools Network screenshot.</li>
</ol>
Use a fresh demo account or the seeded accounts; do not show passwords on screen.</div>

## F.3 Build and automated test results

Commands run on `2bafb18`; outputs are in `docs/evidence/release/`.

| Command | Files | Passed | Failed | Skipped |
|---|---|---|---|---|
| `npm run test:server` (Vitest + Supertest, real PostgreSQL) | 9 | 63 | 0 | 0 |
| `npm run test:client` (Vitest + React Testing Library) | 9 | 34 | 0 | 0 |
| `npm run test:e2e` (Playwright, Chromium) | 1 | 1 | 0 | 0 |
| `npm run test:restart` (NFR-04 stop/start check) | — | VERIFIED | — | — |
| `npm run build` (server `tsc`, client `tsc && vite build`) | — | OK | — | — |

<div class="todo"><b>TODO (Nara):</b> add a readable screenshot or excerpt of the terminal output of one full <code>npm test</code> run on the release, showing the pass/fail/skip counts and the commit (<code>git log --oneline -1</code>).</div>

### AC → test → result (automated)

Generated from the test names in the recorded release run. Manual checks are listed separately below.

<!-- AC_RESULTS_TABLE -->

Manual / recorded checks (supplement the automated tests): NFR-06 clean clone (PR #31 review), NFR-08 secret check (Part B), browser checks recorded in PRs #26, #27, #28, #29.

## F.4 Selected test excerpts and TDD evidence

<div class="todo"><b>TODO (Nara):</b> embed two short excerpts (setup + assertions only) with their results:
<ol>
<li><b>Domain rule:</b> <code>server/tests/logging.test.ts</code> TEST-20 (6 days ago accepted, 7 days ago → <code>DATE_TOO_OLD</code>) or TEST-21 (duplicate → 409).</li>
<li><b>Role/ownership restriction:</b> <code>server/tests/progress.test.ts</code> TEST-25 (own progress 200, other participant 404) or TEST-26 (manager 403).</li>
</ol>
For each, show the TDD sequence: the <code>test(red)</code> commit and its failing output, then the <code>feat</code> commit and the passing output (files in <code>docs/evidence/F-04/</code> and <code>docs/evidence/F-05/</code>), with commit IDs. Do not use TEST-23, TEST-29 or the E2E red run as TDD evidence (they passed or failed for unrelated reasons before implementation).</div>

## F.5 Engineering workflow and history

<div class="todo"><b>TODO (Nara):</b>
<ol>
<li><b>Two Issue → PR chains</b> (compact table + readable screenshots): suggested F-04 (Issue #20 → PR #29: contract <code>61f9b4c</code>, red <code>38e843e</code>, feat <code>2f3db9f</code>, reviewed by Nitithorn with changes requested, merged <code>0945644</code>) and F-05 (Issue #21 → PR #30). Show branch names, author/reviewer, one substantive review comment, merge into <code>staging/sprint-1</code>, and the release PR #34 into <code>main</code>.</li>
<li><b>History sequence:</b> for the sampled features, when the contract and test design were committed and when the implementation followed (commit IDs and dates from <code>git log</code>).</li>
<li><b>Final board status</b> screenshot (all Sprint 1 Issues done) and the release reference (tag <code>v0.1.0-sprint1</code>, PR #34).</li>
</ol></div>

## F.6 Contribution

<div class="todo"><b>TODO (both):</b> short table — for each person: authored PRs, reviewed PRs, pair work, and one sentence on what each can explain. Data: authored by Nitithorn P0, P2, P3a, P4b, PR1, PR2, PR4, PR6, PR8 (#2, #9, #10, #11, #24, #26, #28, #30, #32–#34); authored by Nara P1, P3b, P4a, PR3, PR5, PR7 (#12, #13, #14, #27, #29, #31); every PR reviewed by the other member.</div>

The AI-use declaration, known limitations and defect list follow (sections from `docs/sprints/sprint-1/release-notes.md` and `AI_USE.md`).
