# Lab 7 — Change impact analysis: entry correction with revision history (CR #99)

| Version | Date | Author | Reviewer | Change |
|---|---|---|---|---|
| 1.0 | 2026-11-29 | Nitithorn Ketkaew | Nara Kosiyaporn | Written before implementation, together with the contract revision (F-04 v1.2, SRS 0.3, System SDS 0.5) |

**Change request:** Issue #99.
**Approval:** team decision, recorded on #99 by both members. Per the instructor's announcement "Lab 7 Spec Sheet Change", no Instructor/TA approval is needed for the change request.
**Contract:** `docs/sprints/sprint-1/F-04-logging.md` v1.2 §1.7.

## 1. Old and new behaviour

| | Before (Sprint 1) | After (this change) |
|---|---|---|
| Requirement | SRS §3.3 excludes "Editing or deleting an entry in Sprint 1 — … later correction would be a separate, specified change"; D-03 "…no editing in Sprint 1"; `release-notes.md` known limitation "Editing or deleting an entry — Not supported — Later change request if needed" | FR-15 correct own entry inside the logging window with a reason and the version seen; FR-16 read its corrections; BR-13 correction integrity (a) window lock, (b) latest version only, (c) a real change with a reason; D-03 revised; exclusion narrowed to deletion, date change, locked entries and editing corrections |
| API | `POST`/`GET /api/goals/:id/entries` only; a second POST for a day → 409 `DUPLICATE_ENTRY` | + `PATCH /api/goals/:id/entries/:entryId` (9-step order of checks; 200 / 404 / 409 `STALE_ENTRY` / 422 `VALIDATION_ERROR`, `ENTRY_LOCKED`, `VALUE_OUT_OF_RANGE`, `NO_CHANGE`); + `GET …/revisions`; entry responses gain `updatedAt`, `version` |
| Data | `activity_entries` (no change tracking) | + `updatedAt` (nullable), `version` (NOT NULL default 0); + table `activity_entry_revisions` (FKs ON DELETE CASCADE, index `(entryId, changedAt)`) |
| UI | read-only history list in the goal card | Edit (Amount, Note, required Reason) on rows inside the window; "Entry updated."; Edited badge; History panel; conflict message + reload |

**Versions.**
- Accepted Sprint 1 baseline where the old behaviour exists: `v0.1.0-sprint1` = `bfd125f`.
- Actual pre-change implementation: `v0.2.5-lab6` = `bd97c01`, Cloud Run revision `sf4618437-00012-r2h`. This is the Sprint 1 release the partner team accepted in Lab 6 on 28 Nov 2026.
- Intervening development on the F-04 files (`git log v0.1.0-sprint1..bd97c01 -- server/src/routes/goals.ts server/prisma client/src/components/GoalsPage.tsx client/src/types.ts`): Lab 6 corrections #59, #61–#65, #75, #88. None of them adds editing.
- `staging/sprint-1` (`7cd3cea`) also holds PR #98, the Lab 6 records. It is docs only and not part of this change; the code is identical to `bd97c01`.

## 2. Impact table

| Req | Feature | SRS | Feature SDS | System SDS | AC | STS tests | Code modules | Change |
|---|---|---|---|---|---|---|---|---|
| FR-15 | F-04 | §3.2 note, §3.3, §4.1 | F-04 §1.1, §1.5, §1.7, §2, §3, §4, §5, §6 | §2.1, §2.2, §5.3, §5.4 | AC-34, AC-39 | TEST-34a/b, TEST-39a–e, TEST-E2E-L7 | `server/src/routes/goals.ts`; `server/prisma/schema.prisma` + new migration; `client/src/types.ts`, `client/src/dates.ts`, `client/src/components/GoalsPage.tsx` | New |
| FR-16 | F-04 | §4.1 | F-04 §1.7, §2, §4 | §2.1, §5.4 | AC-34, AC-37, AC-39 | TEST-34b, TEST-37, TEST-39e | goals.ts; GoalsPage.tsx | New |
| BR-13 | F-04 | §4.2, §6.1 D-03 | F-04 §1.7 | §1.3, §5.3 | AC-35, AC-36, AC-38 | TEST-35a/b, TEST-36, TEST-38b/c/d, TEST-39d | goals.ts (reuses `getOldestAllowedDate`; transaction) | New |
| D-03 | F-04 | §6.1 | header, §1.1 | — | AC-21 | TEST-21 | — | Text revised |
| BR-01, note rules | F-04 | §4.2 | §1.2, §1.3 | §1.3 | AC-36 | TEST-36 | goals.ts helpers | Re-applied to updates |
| BR-04, NFR-10 | F-04 | §4.2, §4.3 | §1.3 row 7, §1.7 | §1.3, §5.3 | AC-21, AC-22, AC-38 | TEST-21, TEST-22, TEST-38c/d | unique constraint; conditional update | POST unchanged; corrections added |
| BR-05, BR-07, NFR-01 | F-04, F-05 | §4.2 | F-04 §1.5 | §5.4 | AC-04, AC-23, AC-37 | TEST-04, TEST-23, TEST-MGR, TEST-37 | router guard, goal scoping | Extended to 2 routes |
| FR-09, D-08 | F-05 | §4.1 | F-05 §1.1, §1.2 | — | AC-24, AC-38 | TEST-24, TEST-L6-87, TEST-38a | `server/src/lib/progress.ts` (unchanged) | Follows corrected values |
| NFR-04, NFR-05 | CC-01, CC-02 | §4.3 | — | §2.3 | AC-28, AC-29 | TEST-28, TEST-29, `npm run test:restart` | `server/tests/harness.ts` (TRUNCATE list) | Unchanged |

## 3. Dimensions

| Dimension | Effect | Reason / protection |
|---|---|---|
| Callers / dependencies | Two new routes. `entrySelect` gains `updatedAt` and `version`, so POST/GET entry responses get two extra fields. Progress reads current values. | No server test compares a whole entry object with `toEqual`; the client ignores unknown fields. Search below. |
| UI validation | Edit form with the same placeholders and `step="any"`; `maxLength` 500 (note) and 200 (reason); Save is disabled when unchanged or without a reason | TEST-39a–e |
| API validation | The server is authoritative; 9-step order of checks (F-04 §1.7) | TEST-35..38 |
| Roles / ownership | The existing router guard (`requireAuth`, `requireRole("PARTICIPANT")`) covers both new paths; goal scoping plus an entry–goal match give 404 | TEST-37, TEST-23, TEST-MGR |
| Persistence | Two new columns and one new table | TEST-34a/b, TEST-38d, TEST-28 |
| Historical data | Existing rows get `version` 0, `updatedAt` null and no revisions, so the invariant (revisions = version) holds for them; no value is rewritten; entries older than 6 days are locked | TEST-38d, TEST-35a; migration review |
| Migration | **Required**: additive (nullable column, defaulted column, new table, index). UTF-8 without BOM (Sprint 1 defect #25). Runs through `prisma migrate deploy` in CI and in the Cloud Run migrate job | Rollback check: the `bd97c01` server suite passes against the migrated schema |
| Test infrastructure | `server/tests/harness.ts` adds `"activity_entry_revisions"` to its `TRUNCATE … RESTART IDENTITY CASCADE` list. CASCADE would already empty it; the explicit name also restarts its id sequence. `e2e/*` and `scripts/verify-nfr04-restart.cjs` delete entries with `deleteMany`, and revisions follow by ON DELETE CASCADE | No assertion changes |
| Precision | Values remain `DOUBLE PRECISION`; the same finite-number check; percent via the unchanged `calculateProgress` (Lab 6 #87) | TEST-38a |
| Transactions / concurrency | One interactive transaction per correction. The optimistic version check in the UPDATE's WHERE clause decides simultaneous requests: the second one waits, re-reads and matches no row | TEST-38b/c/d |
| Time | Lock in Asia/Bangkok (server clock, as BR-03); revision times stored in UTC and shown in Asia/Bangkok | TEST-35b, TEST-39e |
| Sprint 2 dependency | F-06 (pause/archive) must decide whether entries of paused/archived goals can be corrected; that is recorded for the Sprint 2 contract | — |

**Search for the old rule and affected code** (`git grep -n -i -E "no editing|editing or deleting|edit an entry|editing an entry|DUPLICATE_ENTRY|entrySelect|updatedAt|TRUNCATE|immutable" -- docs server client e2e scripts README.md ':!docs/evidence'`, 29 Nov 2026):

| Hit | Disposition |
|---|---|
| SRS §3.3, D-03; brief D-03 | revised in this PR |
| F-04, System SDS | revised in this PR (new text) |
| `release-notes.md` "Editing or deleting an entry — Later change request if needed" | historical Sprint 1 release record, not edited; superseded by this CR |
| `server/src/routes/goals.ts` `entrySelect`, `DUPLICATE_ENTRY` | changed in PR-L7-2 (`entrySelect` gains 2 fields); `DUPLICATE_ENTRY` unchanged |
| `server/tests/harness.ts` TRUNCATE | PR-L7-2 adds the new table to the list |
| `server/tests/logging.test.ts` TEST-21/22 (`DUPLICATE_ENTRY`) | unchanged; they protect BR-04 |
| progress / triage / UAT "truncated" hits | unrelated meaning of the word ("truncated percent") |
| `docs/evidence/**` | historical test outputs, not edited |

**Historical records stating the old behaviour, not edited:**
- `docs/sprints/sprint-1/release-notes.md`;
- the Lab 6 UAT cases and handoff (`docs/labs/lab-06/*`), which were written for `v0.2.3-lab6` and do not cover correction (to be added before the final UAT re-tests);
- earlier evidence files.

## 4. Behaviour that must not change, and its protection

The following must keep working exactly as before:
- **Entry rules (BR-01..BR-04):** value range, future date, 7-day window, one entry per goal per day including simultaneous submissions (409).
- **Privacy and roles:** 404 for another participant's records, 403 for managers, 401 without a session.
- **Progress:** formula and truncation (D-08, #87).
- **Entry history:** newest date first (#64).
- **Input rules:** note rules (#62, #63), id range (#59), body size limit (#60).
- **Other features:** templates and goals, sign-in and sessions.
- **Errors and persistence:** uniform error shape, persistence across restart.
- **Layout fixes:** #75, #79, #88, #94.

Protection: the full existing suites run unchanged on every Lab 7 commit and on the release — server (Vitest + Supertest on PostgreSQL), client (Vitest + Testing Library), E2E (Playwright: journey, cards, layout, header), `tsc`, build, and the restart check. After deployment the live checks repeat the duplicate, date-window, ownership, role and persistence paths.

## 5. Out of scope
- deleting entries;
- changing an entry's date;
- correcting locked entries;
- editing, deleting or reverting revisions;
- showing corrections to program managers or to other participants;
- anything of Sprint 2 (F-06..F-08) or Sprint 3 (F-09).
