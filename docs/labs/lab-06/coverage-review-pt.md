# Coverage Review of Partner Team's Sprint 1 UAT Cases (CPMS)

**Version:** v1.0, 2026-11-26, written by Nara Kosiyaporn (team YaWan), reviewed by Nitithorn Ketkaew
**Partner product:** Course Project Management System (CPMS), Theme 6 — repository https://github.com/FramePongrit/Course-Project-Management-System
**Tested release:** `main` @ `2174e0f`, Cloud Run revision `s87d9c6b4-00008-8lw`

**Sources reviewed (pinned commits):**
- Sprint 1 contract index & contracts (`2174e0f`):
  - [docs/sprints/sprint-1/README.md](https://github.com/FramePongrit/Course-Project-Management-System/blob/2174e0f/docs/sprints/sprint-1/README.md)
  - [docs/sprints/sprint-1/F-01-authentication.md](https://github.com/FramePongrit/Course-Project-Management-System/blob/2174e0f/docs/sprints/sprint-1/F-01-authentication.md) (`AC-01-01`..`09`)
  - [docs/sprints/sprint-1/F-02-authorization.md](https://github.com/FramePongrit/Course-Project-Management-System/blob/2174e0f/docs/sprints/sprint-1/F-02-authorization.md) (`AC-02-01`..`06`)
  - [docs/sprints/sprint-1/F-04-milestone-creation.md](https://github.com/FramePongrit/Course-Project-Management-System/blob/2174e0f/docs/sprints/sprint-1/F-04-milestone-creation.md) (`AC-04-01`..`06`)
  - [docs/sprints/sprint-1/F-05-submission.md](https://github.com/FramePongrit/Course-Project-Management-System/blob/2174e0f/docs/sprints/sprint-1/F-05-submission.md) (`AC-05-01`..`10`)
  - [docs/sprints/sprint-1/F-06-feedback.md](https://github.com/FramePongrit/Course-Project-Management-System/blob/2174e0f/docs/sprints/sprint-1/F-06-feedback.md) (`AC-06-01`..`08`)
  - [docs/sprints/sprint-1/F-07-milestone-status.md](https://github.com/FramePongrit/Course-Project-Management-System/blob/2174e0f/docs/sprints/sprint-1/F-07-milestone-status.md) (`AC-07-01`..`07`)
  - [docs/sprints/sprint-1/F-08-project-progress.md](https://github.com/FramePongrit/Course-Project-Management-System/blob/2174e0f/docs/sprints/sprint-1/F-08-project-progress.md) (`AC-08-01`..`04`)
  - *(Verified at `2174e0f`: no `F-03` contract file exists; `docs/sprints/sprint-1/README.md` notes F-03 is seed data specified in `system-sds.md` §2.4 with no ACs of its own. Note also that the feature contracts define **50** ACs in total: `F-05` defines `AC-05-01..10` and `F-06` defines `AC-06-01..08`, though the partner's index summary table in `README.md` only prints `AC-01-01…08` and `AC-05-01…09`.)*
- Reference SRS and traceability (`2174e0f`): [docs/srs.md](https://github.com/FramePongrit/Course-Project-Management-System/blob/2174e0f/docs/srs.md), [docs/traceability.md](https://github.com/FramePongrit/Course-Project-Management-System/blob/2174e0f/docs/traceability.md)
- Partner UAT cases (`400a9ff`): [docs/labs/lab-06/uat-cases.md](https://github.com/FramePongrit/Course-Project-Management-System/blob/400a9ff/docs/labs/lab-06/uat-cases.md) (`UAT-01`..`UAT-06`)

**Method:** Every Sprint 1 AC (`AC-01-01`..`AC-08-04`, all 50 ACs) in the partner's feature contracts at `2174e0f` was compared line-by-line against the Case Summary, `Requirement / AC` mappings, and individual numbered steps and expected results in `docs/labs/lab-06/uat-cases.md` at `400a9ff`.

---

## 1. Acceptance Criteria × UAT Case Matrix (50 ACs)

| AC ID | Short AC text (from partner contract) | Covered by UAT case / step | Coverage | Testability |
|---|---|---|---|---|
| **AC-01-01** | Seeded ACTIVE user with correct email+password logs in → 200 + session cookie | `UAT-01` #1, #4 (exercised at every sign-in; omitted from §4 table) | `covered` | Manual (UI) |
| **AC-01-02** | Correct email, wrong password → 401, generic message, no cookie | — | `not covered` | Manual (UI) |
| **AC-01-03** | Unknown email → 401, generic message (no user enumeration) | — | `not covered` | Manual (UI) |
| **AC-01-04** | Request with valid session cookie to `/api/me` → 200 with current user | `UAT-01` #1, #4 (UI renders role/name, but `/api/me` JSON not inspected) | `partly` (API `/api/me` payload and absence of secrets not checked) | Manual (UI + browser tab) |
| **AC-01-05** | Request to `/api/me` with no/invalid cookie → 401, no user data | — | `not covered` | Manual (browser tab / Console) |
| **AC-01-06** | Logged-in user logs out, then calls protected endpoint with cleared cookie → 204 then 401 | `UAT-01` #4, `UAT-03` #2, #5–7 (clicks Logout before switching user) | `partly` (never tests that a post-logout call returns 401) | Manual (browser tab / Console) |
| **AC-01-07** | INVITED account (null password hash) attempts login → 401 (BR-15) | — | `not covered` | Automated only (`TEST-01-07`; invitations are Sprint 2, no INVITED user seeded for UAT) |
| **AC-01-08** | Seeded user password column is a bcrypt hash, not plaintext (BR-15, NFR-03) | — | `not covered` | Automated only (`TEST-01-09`) |
| **AC-01-09** | Second account with already-used email rejected by DB unique constraint (BR-14) | — | `not covered` | Automated only (`TEST-01-08`; no account creation in Sprint 1) |
| **AC-02-01** | No session → any protected endpoint → 401, no domain data (NFR-01) | — | `not covered` | Manual (UI + browser tab / Console) |
| **AC-02-02** | Student A requests Student B's team Project/Milestone/Submission → 404, no leak | `UAT-03` #3–4 (`STU-A1` opens Beta Milestone URL & dashboard) | `partly` (checks Milestone UI 404, not `/api/projects/<betaId>`, `/submission`, or `/feedback`) | Manual (UI + browser tab / Console) |
| **AC-02-03** | Student attempts Supervisor write (create Milestone, record Feedback) → 403 | — | `not covered` | Manual (Console) |
| **AC-02-04** | Supervisor requests Team they are not assigned to → 404 | `UAT-03` #1, #6 (`SUP-B` opens Team Alpha project URL) | `covered` | Manual (UI) |
| **AC-02-05** | Supervisor attempts Student write (create/overwrite Submission) → 403 | — | `not covered` | Manual (Console) |
| **AC-02-06** | Request supplies forged `userId`/`role`/`teamId` → ignored; uses session only | — | `not covered` | Manual (Console) |
| **AC-04-01** | Assigned Supervisor posts valid Milestone (future deadline, unique name) → 201 + GET | `UAT-01` #3–4, `UAT-02` #4, `UAT-03` #1 | `covered` | Manual (UI) |
| **AC-04-02** | Deadline in the past or now (BR-03) → 422; nothing persisted | `UAT-02` #2–3 | `covered` | Manual (UI) |
| **AC-04-03** | Milestone name already used in that Project (BR-04) → 409; no second row | `UAT-02` #5–6 | `covered` | Manual (UI) |
| **AC-04-04** | Student attempts to create a Milestone → 403 | — | `not covered` | Manual (Console) |
| **AC-04-05** | Supervisor creates Milestone for non-assigned Project → 404 | — | `not covered` | Manual (Console) |
| **AC-04-06** | No Sprint-1 endpoint mutates/deletes a Milestone (BR-08) → 404/405 | — | `not covered` | Manual (Console) |
| **AC-05-01** | Team member submits valid data before deadline, first time → 200; `firstSubmittedBy/At` set | `UAT-01` #6–7 (UI submit & reload) | `partly` (`firstSubmittedBy/At` audit fields not inspected via API) | Manual (UI + browser tab) |
| **AC-05-02** | Member overwrites before deadline → 200; `lastUpdatedBy/At` changes; `firstSubmittedBy/At` unchanged | `UAT-04` #1–2 (UI overwrite) | `partly` (`firstSubmittedBy/At` preserved and `lastUpdatedBy` changed not verified via API) | Manual (UI + browser tab) |
| **AC-05-03** | Submit/overwrite at or after deadline (BR-01) → 422 `CUTOFF_PASSED`; no persistence | `UAT-05` #2 (UI disables form on `"Sprint 0 Proposal"`) | `partly` (UI disabled only; backend `422 CUTOFF_PASSED` API enforcement never tested) | Manual (UI + Console) |
| **AC-05-04** | Title empty, or link not `http(s)` (NFR-08) → 422; nothing persisted | `UAT-06` #2–5 (UI empty/spaces title, `ftp://` link; #3 fails on #34) | `partly` (`type="url"` blocks `ftp://` client-side; server `422` for bad link and length bounds not tested) | Manual (UI + Console) |
| **AC-05-05** | Two concurrent first-submits for one (milestone, team) (BR-02) → both 200; 1 row | — | `not covered` | Automated only (`TEST-05-05`; concurrent race condition) |
| **AC-05-06** | Student of another team submits → 404 | — | `not covered` | Manual (Console) |
| **AC-05-07** | Supervisor submits → 403 | — | `not covered` | Manual (Console) |
| **AC-05-08** | Any delete attempt on a Submission (BR-07) → 404/405; record remains | — | `not covered` | Manual (Console) |
| **AC-05-09** | GET Milestone's submission after saving → 200 returns persisted Submission | `UAT-01` #6–7, `UAT-03` #7 | `covered` | Manual (UI) |
| **AC-05-10** | Member overwrites Submission after Feedback recorded (BR-20) → 409 `FEEDBACK_RECORDED` | `UAT-04` #6 (UI disables form with frozen message) | `partly` (UI disabled only; backend `409 FEEDBACK_RECORDED` never tested via API) | Manual (UI + Console) |
| **AC-06-01** | Assigned Supervisor records Feedback while Submission exists → 201; persisted | `UAT-04` #4 | `covered` | Manual (UI) |
| **AC-06-02** | Feedback recorded before deadline (Submission exists) → 201 allowed; Completed | `UAT-04` #4–5 (`UAT <RUN> Demo` deadline +3 days; omitted from §4) | `covered` | Manual (UI) |
| **AC-06-03** | Feedback attempted with no Submission (incl. Missed) (BR-05) → 422 `NO_SUBMISSION` | `UAT-05` #3 (UI disables feedback on Missed milestone) | `partly` (no Open milestone check; backend `422 NO_SUBMISSION` not tested via API) | Manual (UI + Console) |
| **AC-06-04** | Second Feedback attempted for same (Team, Milestone) (BR-06) → 409; original intact | — | `not covered` | Manual (Console) |
| **AC-06-05** | Student attempts to record Feedback → 403 | — | `not covered` | Manual (Console) |
| **AC-06-06** | Unassigned Supervisor attempts to record Feedback → 404 | — | `not covered` | Manual (Console) |
| **AC-06-07** | Team member / assigned Supervisor GETs Feedback → 200; outsider → 404 | `UAT-04` #4, #6 (team & assigned supervisor view) | `partly` (outsider `404` on Feedback never tested) | Manual (UI + browser tab) |
| **AC-06-08** | Feedback's `submissionId` equals Submission current at recording time (BR-18) | — | `not covered` | Manual (browser tab) + `TEST-06-08` |
| **AC-07-01** | No submission, before deadline → `Open` | `UAT-01` #3–4, `UAT-02` #4, `UAT-03` #1 | `covered` | Manual (UI) |
| **AC-07-02** | Submission, no feedback, before deadline → `Submitted` | `UAT-01` #8, `UAT-03` #7, `UAT-04` #2 | `covered` | Manual (UI) |
| **AC-07-03** | Submission, no feedback, deadline passed → `Awaiting Feedback` | — | `not covered` | Manual (UI, seeded `"Sprint 1 Architecture"`) |
| **AC-07-04** | Feedback exists (before or after deadline) → `Completed` | `UAT-04` #5, #7 (pre-deadline feedback only) | `partly` (post-deadline `Awaiting Feedback` → `Completed` not tested; note: do not mutate shared seeded data) | Manual (UI) / Automated (`TEST-07-04`) |
| **AC-07-05** | No submission, deadline passed → `Missed` | `UAT-05` #1, #4 | `covered` | Manual (UI) |
| **AC-07-06** | Client attempts to set status directly → no setter; status always server-derived | — | `not covered` | Manual (Console) |
| **AC-07-07** | Clock advanced across deadline → `Open`→`Missed` / `Submitted`→`Awaiting Feedback` | — | `not covered` | Automated only (`TEST-07-07`; fixed/injectable clock) |
| **AC-08-01** | Student views Project progress → 200; Milestones with derived status; deadlines in ICT | `UAT-01` #4, #8, `UAT-04` #7, `UAT-05` #1 | `covered` | Manual (UI) |
| **AC-08-02** | Assigned Supervisor views Project progress → 200; same Milestones/status | `UAT-01` #3, `UAT-04` #5, `UAT-05` #4 (omitted from §4 table) | `covered` | Manual (UI) |
| **AC-08-03** | Progress response contains no numeric percentage/score (EX-05) | `UAT-01` #4 (Student dashboard UI only) | `partly` (Supervisor UI & `GET /api/projects/:id/progress` JSON schema not checked) | Manual (UI + browser tab) |
| **AC-08-04** | Student requests another Team's progress, or Supervisor an unassigned one → 404 | `UAT-03` #6 (`SUP-B` opens Team Alpha project URL) | `partly` (Student requesting Team Beta `/progress` not tested) | Manual (browser tab / Console) |

---

## 2. Gaps (Manually Testable, Ordered by Importance)

### Priority 1 — Access control and data protection
1. **No-session & post-logout enforcement (`AC-02-01`, `AC-01-05`, `AC-01-06`):** `UAT-01..06` never verify that logged-out requests to `/api/me`, `/api/projects`, or `POST /api/projects/:id/milestones` return `401`, or that clicking **Logout** invalidates the session cookie for subsequent requests.
2. **Cross-role write enforcement (`AC-02-03`, `AC-04-04`, `AC-06-05`, `AC-02-05`, `AC-05-07`):** F-02 explicitly states *"A hidden UI control is not protection (BR-17)"*, yet zero cases test a Student calling `POST .../milestones` or `POST .../feedback` (`403`), or a Supervisor calling `PUT .../submission` (`403`).
3. **Forged client-supplied identity (`AC-02-06`):** No case tests whether supplying `userId`, `role`, or `teamId` in a request body or query is ignored by the server.
4. **Cross-team write & API isolation (`AC-04-05`, `AC-05-06`, `AC-06-06`, `AC-02-02`, `AC-06-07`, `AC-08-04`):** `UAT-03` only tests cross-team UI reads on Milestone/Project pages; it never tests cross-team writes (`SUP-B` creating milestones or feedback on Team Alpha, `STU-A1` submitting to Team Beta → `404`), nor `STU-A1` requesting Team Beta's `/progress`, `/submission`, or `/feedback` endpoints (`404`).

### Priority 2 — Business rules and data integrity
5. **Backend enforcement behind disabled UI states (`AC-05-03`, `AC-05-10`, `AC-06-03`, `AC-06-04`):** `UAT-04` and `UAT-05` only observe disabled forms in the UI. They never verify the backend rejects:
   - overwrite after feedback (`409 FEEDBACK_RECORDED`, `AC-05-10`),
   - submission after cutoff (`422 CUTOFF_PASSED`, `AC-05-03`),
   - feedback on an Open or Missed milestone with no submission (`422 NO_SUBMISSION`, `AC-06-03`),
   - duplicate second feedback (`409`, `AC-06-04`).
6. **Immutability & server-derived status (`AC-04-06`, `AC-05-08`, `AC-07-06`):** No check confirms `PUT`/`PATCH`/`DELETE` on milestones or `DELETE` on submissions return `404`/`405`, or that client-supplied `status` cannot override server derivation.
7. **Missing `Awaiting Feedback` state (`AC-07-03`, `AC-07-04`):** `srs.md` A-06 explicitly specifies two seeded past-deadline milestones (`Missed` and `Awaiting Feedback`), and `"Sprint 1 Architecture"` exists on the live app, yet `UAT-05` only checks `"Sprint 0 Proposal"` (`Missed`). *(Note: testing `AC-07-04` post-deadline transition on the shared seeded `"Sprint 1 Architecture"` would permanently mutate seeded demo data, so only a read-only check of `Awaiting Feedback` is safe for `YW-EX`.)*
8. **Audit metadata, `submissionId` binding, and server-side link/length validation (`AC-05-01`, `AC-05-02`, `AC-06-08`, `AC-05-04`):** UI checks in `UAT-01`, `UAT-04`, and `UAT-06` do not inspect `firstSubmittedBy/At`, `lastUpdatedBy/At`, `feedback.submissionId`, or server-side `422` validation when bypassing HTML5 `type="url"`.

### Priority 3 — Authentication messages and display schema
9. **Generic 401 login failures & `/me` payload (`AC-01-02`, `AC-01-03`, `AC-01-04`):** `UAT-01..06` never test wrong password or unknown email on `/login`, nor inspect `/api/me` directly.
10. **Progress API schema (`AC-08-03`):** Only Student UI is checked for absence of percentage/score; `GET /api/projects/:id/progress` JSON and Supervisor progress view are not checked.

---

## 3. Proposed Additional Cases (`YW-EX-01` .. `YW-EX-06`)

All cases below are runnable by one person using the partner's five accounts (`SUP-A`, `SUP-B`, `STU-A1`, `STU-A2`, `STU-B1`). Any API step runs as a single `fetch(...)` call in the browser DevTools Console or by opening a URL in a signed-in browser tab. **Never modify another team's real data or seeded `"Sprint 1 Architecture"`.**

---

### YW-EX-01 — Invalid login, `/api/me`, and post-logout access rejection
- **Covers:** `AC-01-02`, `AC-01-03`, `AC-01-04`, `AC-01-05`, `AC-01-06`, `AC-02-01`
- **Purpose:** invalid credentials return a generic error, `/api/me` returns user identity without secrets, and unauthenticated or logged-out calls are rejected with `401`.
- **Preconditions:** signed out (start on `/login`).
- **Inputs:** valid email `alice@student.university.ac.th` + wrong password `WrongPass123!`; unknown email `nobody-<RUN>@university.ac.th` + `WrongPass123!`; valid `STU-A1` credentials.

| # | Action | Expected result |
|---|--------|-----------------|
| 1 | Open `<URL>/api/me` and `<URL>/api/projects` in the browser while signed out | Both return `401` with no user or project data (`AC-01-05`, `AC-02-01`) |
| 2 | On `/login`, sign in with `alice@student.university.ac.th` and wrong password `WrongPass123!` | Inline generic error `"Invalid email or password"` (or same generic message); stays on `/login` (`AC-01-02`) |
| 3 | Sign in with unknown email `nobody-<RUN>@university.ac.th` and `WrongPass123!` | Exact same generic error message as step 2; does not reveal unknown email (`AC-01-03`) |
| 4 | Sign in with valid **STU-A1** credentials; open `<URL>/api/me` in a new tab | `200` JSON with `id`, `name`, `email`, `role` (`STUDENT`); no `password` or `passwordHash` (`AC-01-04`) |
| 5 | Click **Logout** on the app tab; in the Console or address bar call `fetch('/api/me')` and `fetch('/api/projects')` | Both return `401` with no domain data (`AC-01-06`) |

---

### YW-EX-02 — Role restrictions and forged identity fields (server-side)
- **Covers:** `AC-02-03`, `AC-02-05`, `AC-02-06`, `AC-04-04`, `AC-05-07`, `AC-06-05`
- **Purpose:** hidden UI controls are backed by server `403` role checks, and client-supplied `userId`/`role`/`teamId` values are ignored.
- **Preconditions:** `UAT-01` completed with tag `<RUN>` (so Team Alpha project id `<alphaProjectId>` and milestone `UAT <RUN> Rule` id `<ruleId>` from `UAT-02` exist in `Open` state; Team Beta project id `<betaTeamId>` noted if available).

| # | Action | Expected result |
|---|--------|-----------------|
| 1 | Sign in as **STU-A1**; copy `<alphaProjectId>` and `<ruleId>` from `<URL>/api/projects` and milestone URL | IDs noted |
| 2 | Console (`STU-A1`): `fetch('/api/projects/<alphaProjectId>/milestones',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'UAT <RUN> Forged',description:'x',deadline:'2026-12-30T10:00:00+07:00',role:'SUPERVISOR'})}).then(async r=>console.log(r.status,await r.json()))` | `403`; forged `role` is ignored; no milestone created (`AC-02-03`, `AC-02-06`, `AC-04-04`) |
| 3 | Console (`STU-A1`): `fetch('/api/milestones/<ruleId>/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:'forged feedback',role:'SUPERVISOR'})}).then(async r=>console.log(r.status,await r.json()))` | `403`; no feedback created (`AC-02-03`, `AC-06-05`) |
| 4 | Console (`STU-A1`): `fetch('/api/milestones/<ruleId>/submission',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'UAT <RUN> ForgedSub',description:'',link:'https://github.com/example/forged',teamId:'forged-team-id',userId:'forged-user-id'})}).then(async r=>console.log(r.status,await r.json()))` | `200` acting **only** on `STU-A1`'s Team Alpha scope (or `404`/`403` if target is outside scope); forged `teamId`/`userId` ignored (`AC-02-06`) |
| 5 | **Logout**, sign in as **SUP-A**; Console: `fetch('/api/milestones/<ruleId>/submission',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'Sup Sub',description:'',link:'https://github.com/example/sup',role:'STUDENT'})}).then(async r=>console.log(r.status,await r.json()))` | `403`; submission unchanged (`AC-02-05`, `AC-02-06`, `AC-05-07`) |

---

### YW-EX-03 — Cross-team write rejection and API progress/submission/feedback isolation
- **Covers:** `AC-02-02`, `AC-04-05`, `AC-05-06`, `AC-06-06`, `AC-06-07`, `AC-08-04`
- **Purpose:** unassigned supervisors and other-team students receive `404` on both reads and writes across all API endpoints.
- **Preconditions:** `UAT-01` and `UAT-03` completed with tag `<RUN>` (so Team Alpha `<alphaProjectId>` & `<demoId>`, and Team Beta `<betaProjectId>` & `<betaId>` exist; **SUP-B** also records feedback `"Beta feedback <RUN>"` on `UAT <RUN> Beta` so Beta has feedback to test `AC-06-07`).

| # | Action | Expected result |
|---|--------|-----------------|
| 1 | Sign in as **SUP-B**, open `UAT <RUN> Beta` (`<betaId>`), record feedback `Beta feedback <RUN>` | Saved (`201`); Team Beta feedback exists |
| 2 | Console (`SUP-B`): `fetch('/api/projects/<alphaProjectId>/milestones',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'UAT <RUN> Cross',description:'x',deadline:'2026-12-30T10:00:00+07:00'})}).then(async r=>console.log(r.status,await r.json()))` | `404`; nothing created on Team Alpha (`AC-04-05`) |
| 3 | Console (`SUP-B`): `fetch('/api/milestones/<demoId>/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:'cross team'})}).then(async r=>console.log(r.status,await r.json()))` | `404`; no feedback added to Team Alpha (`AC-06-06`) |
| 4 | **Logout**, sign in as **STU-A1**; open `<URL>/api/projects/<betaProjectId>/progress`, `<URL>/api/milestones/<betaId>/submission`, and `<URL>/api/milestones/<betaId>/feedback` | Each returns `404` with no Team Beta data (`AC-02-02`, `AC-06-07`, `AC-08-04`) |
| 5 | Console (`STU-A1`): `fetch('/api/milestones/<betaId>/submission',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'Hijack',description:'',link:'https://github.com/example/x'})}).then(async r=>console.log(r.status,await r.json()))` | `404`; Team Beta submission unchanged (`AC-05-06`) |

---

### YW-EX-04 — Backend enforcement of cutoff, freeze, immutability, duplicate feedback, and derived status
- **Covers:** `AC-04-06`, `AC-05-03`, `AC-05-08`, `AC-05-10`, `AC-06-03`, `AC-06-04`, `AC-07-06`
- **Purpose:** business rules hold on the API even when bypassing disabled UI controls.
- **Preconditions:** `UAT-04` completed with tag `<RUN>` (`UAT <RUN> Demo` `<demoId>` is `Completed`); `UAT <RUN> Empty` created by `SUP-A` with future deadline and **no submission** (`<emptyId>`); seeded `"Sprint 0 Proposal"` (`<missedId>`, `Missed`).

| # | Action | Expected result |
|---|--------|-----------------|
| 1 | Sign in as **SUP-A**; Console: `fetch('/api/milestones/<demoId>/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:'second feedback'})}).then(async r=>console.log(r.status,await r.json()))` | `409`; original feedback unchanged (`AC-06-04`) |
| 2 | Console (`SUP-A`): `fetch('/api/milestones/<emptyId>/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:'no sub feedback'})}).then(async r=>console.log(r.status,await r.json()))` | `422` `NO_SUBMISSION` (`AC-06-03`) |
| 3 | Console (`SUP-A`): `fetch('/api/milestones/<emptyId>',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Renamed',status:'Completed'})}).then(r=>console.log(r.status))` and `fetch('/api/milestones/<emptyId>',{method:'DELETE'}).then(r=>console.log(r.status))` | Both return `404` or `405` (no edit/delete endpoint; milestone and derived status unchanged) (`AC-04-06`, `AC-07-06`) |
| 4 | **Logout**, sign in as **STU-A1**; Console: `fetch('/api/milestones/<demoId>/submission',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'After Feedback',description:'',link:'https://github.com/example/x'})}).then(async r=>console.log(r.status,await r.json()))` | `409` `FEEDBACK_RECORDED`; submission unchanged (`AC-05-10`) |
| 5 | Console (`STU-A1`): `fetch('/api/milestones/<demoId>/submission',{method:'DELETE'}).then(r=>console.log(r.status))` | `404` or `405`; submission remains (`AC-05-08`) |
| 6 | Console (`STU-A1`): `fetch('/api/milestones/<missedId>/submission',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'Late',description:'',link:'https://github.com/example/late'})}).then(async r=>console.log(r.status,await r.json()))` | `422` `CUTOFF_PASSED`; `"Sprint 0 Proposal"` remains `Missed` with no submission (`AC-05-03`) |

---

### YW-EX-05 — Audit fields, feedback `submissionId` binding, and progress schema check
- **Covers:** `AC-05-01`, `AC-05-02`, `AC-06-08`, `AC-08-03`
- **Purpose:** verify `firstSubmittedBy/At` preservation on overwrite, `feedback.submissionId` binding, and absence of numeric score/percentage fields in progress API responses.
- **Preconditions:** `UAT-04` completed with tag `<RUN>` (Alice submitted `UAT <RUN> Demo` first, Bob overwrote it, Prof. Somchai recorded feedback).

| # | Action | Expected result |
|---|--------|-----------------|
| 1 | Sign in as **STU-A1**; open `<URL>/api/milestones/<demoId>/submission` in a new tab | `200`; `firstSubmittedBy` identifies Alice (`STU-A1`), `lastUpdatedBy` identifies Bob (`STU-A2`), and `lastUpdatedAt` is later than `firstSubmittedAt` (`AC-05-01`, `AC-05-02`) |
| 2 | Open `<URL>/api/milestones/<demoId>/feedback` in the same browser | `200`; `feedback.submissionId` equals the `submission.id` from step 1 (`AC-06-08`) |
| 3 | Open `<URL>/api/projects/<alphaProjectId>/progress` (once as **STU-A1**, and once after switching to **SUP-A**) | `200` for both; milestone objects contain derived `status` only — no `percentage`, `percent`, `score`, or `grade` field (`AC-08-03`) |

---

### YW-EX-06 — Seeded `Awaiting Feedback` status and server-side submission URL/length validation
- **Covers:** `AC-05-04`, `AC-07-03`
- **Purpose:** confirm the seeded past-deadline milestone with a submission renders as `Awaiting Feedback`, and verify server `422` validation on invalid links and oversized titles when bypassing HTML5 controls.
- **Preconditions:** seeded milestone `"Sprint 1 Architecture"` (Team Alpha, deadline `15 Nov 2026`, has submission, no feedback); an `Open` milestone `<emptyId>` from `YW-EX-04`.

| # | Action | Expected result |
|---|--------|-----------------|
| 1 | Sign in as **STU-A1**; find `"Sprint 1 Architecture"` on the dashboard; **do not modify or record feedback on it** | Status badge shows **`Awaiting Feedback`** (`AC-07-03`) |
| 2 | **Logout**, sign in as **SUP-A**; open Team Alpha project page and check `"Sprint 1 Architecture"` (**read-only — do not submit feedback**) | Status badge shows **`Awaiting Feedback`** (`AC-07-03`) |
| 3 | **Logout**, sign in as **STU-A1**; Console on `<emptyId>`: `fetch('/api/milestones/<emptyId>/submission',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'Valid',description:'',link:'not-a-url'})}).then(async r=>console.log(r.status,await r.json()))` and again with `title: 'a'.repeat(201), link: 'https://github.com/example/x'` | Both return `422`; `GET /api/milestones/<emptyId>/submission` remains `null` (`AC-05-04`) |

---

## 4. Summary

| Classification | Count | ACs |
|---|---:|---|
| **Covered** | 13 | `AC-01-01`, `AC-02-04`, `AC-04-01`, `AC-04-02`, `AC-04-03`, `AC-05-09`, `AC-06-01`, `AC-06-02`, `AC-07-01`, `AC-07-02`, `AC-07-05`, `AC-08-01`, `AC-08-02` |
| **Partly covered** | 13 | `AC-01-04`, `AC-01-06`, `AC-02-02`, `AC-05-01`, `AC-05-02`, `AC-05-03`, `AC-05-04`, `AC-05-10`, `AC-06-03`, `AC-06-07`, `AC-07-04`, `AC-08-03`, `AC-08-04` |
| **Not covered (manual testable)** | 19 | `AC-01-02`, `AC-01-03`, `AC-01-05`, `AC-02-01`, `AC-02-03`, `AC-02-05`, `AC-02-06`, `AC-04-04`, `AC-04-05`, `AC-04-06`, `AC-05-06`, `AC-05-07`, `AC-05-08`, `AC-06-04`, `AC-06-05`, `AC-06-06`, `AC-06-08`, `AC-07-03`, `AC-07-06` |
| **Not covered (automated only)** | 5 | `AC-01-07` (`TEST-01-07`), `AC-01-08` (`TEST-01-09`), `AC-01-09` (`TEST-01-08`), `AC-05-05` (`TEST-05-05`), `AC-07-07` (`TEST-07-07`) |
| **Total Sprint 1 ACs** | **50** | (`F-01` 9 + `F-02` 6 + `F-04` 6 + `F-05` 10 + `F-06` 8 + `F-07` 7 + `F-08` 4) |

**Main risk areas:**
1. **Unverified server-side enforcement (BR-17 / BR-01 / BR-05 / BR-06 / BR-20):** All negative role checks (`403`), cross-team writes (`404`), forged body/query claims, and backend protections behind disabled UI states (`422 CUTOFF_PASSED`, `422 NO_SUBMISSION`, `409 FEEDBACK_RECORDED`, `409` duplicate feedback) have zero UAT coverage.
2. **Missing auth negative flows & `Awaiting Feedback` state:** Wrong-password / unknown-email login, post-logout `401` session invalidation, and the `Awaiting Feedback` milestone status (`AC-07-03`) are not exercised in `UAT-01..06`.
3. **Audit & schema verification:** `firstSubmittedBy/At`, `lastUpdatedBy/At`, `feedback.submissionId`, and non-percentage progress API responses are not inspected.

> If the partner team does not agree to a proposed case, team YaWan still runs it as an exploratory test (CL-2) and reports the result.
