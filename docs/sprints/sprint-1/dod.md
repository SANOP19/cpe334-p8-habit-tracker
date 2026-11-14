# Product Definition of Done
## Habit and Activity Tracking System — CPE 334 Theme 8

| Version | Date | Author | Reviewer | Change |
|---|---|---|---|---|
| 0.1 | 2026-11-14 | Nitithorn Ketkaew | Nara Kosiyaporn | First version (PR1, Issue #16) |

Work is **done** only when every item below is true **and** supported by evidence that someone else can check. A statement that "all tests pass" from a person or an AI agent is not evidence.

---

## 1. Product Definition of Done

| # | Criterion | Evidence required |
|---|---|---|
| 1 | **Required behaviour implemented** as specified in the feature contract (UI, API, data) | Contract file in `docs/sprints/sprint-1/`; demo screenshot or API response for the main journey |
| 2 | **Planned verification executed**: every AC has its planned test, run on the current code | AC → test → result table; test file and test name for each AC |
| 3 | **Meaningful tests pass**: assertions check the specified behaviour, including negative, boundary and role cases; no test disabled, skipped or weakened to pass | Test output with pass / fail / skip counts, the command used and the tested commit SHA |
| 4 | **Rule work done test-first** where the contract marks TDD | Commit with the failing test and its run output, followed by the implementing commit and the passing run |
| 5 | **Reviewed and integrated**: PR reviewed by the teammate with a specific check, question, finding or reason; merged into `staging/sprint-1`; integration tests pass on staging | PR link with the review comment; merge commit; staging test run |
| 6 | **Setup and documents current**: README, `.env.example`, migrations, seed, SRS/SDS/contracts match the code | Diff of updated documents in the same PR; clean-clone check at release |
| 7 | **Security basics hold**: protected endpoints reject unauthenticated, wrong-role and other-owner requests on the server; no secret in Git, logs, screenshots or client code | API tests for 401 / 403 / 404; reviewer's diff check |
| 8 | **Incomplete work disclosed**: anything not done, failing or skipped is listed with its reason | "Known limitations" section in the PR or release notes |

---

## 2. Checklist for each feature PR (PR2–PR6)

- [ ] Issue linked (`Closes #…`) with feature, requirement and AC IDs
- [ ] Commit 1 `docs(contract)`: feature SDS, UI/API/data specification, AC, STS rows, feature DoD
- [ ] Commit 2 `test(red)`: tests for every AC; run output showing them fail for the expected reason
- [ ] Commit 3 `feat`: implementation; full server and client suites pass; build passes
- [ ] Commits not squashed
- [ ] PR description: command, pass/fail/skip counts, tested commit, AI assistance used
- [ ] Reviewer pulled the branch, ran the suites, tried at least one rejected and one forbidden case, and wrote a specific review
- [ ] Reviewer explained the change back to the author before merge
- [ ] `docs/traceability.md` "Actual test / result" filled in for this feature's AC
- [ ] Issue closed with the merge commit after merge

## 3. Release Definition of Done (PR8)

- [ ] Every Sprint 1 Issue closed; every Sprint 1 AC has an executed result in `docs/traceability.md`
- [ ] Full server, client and end-to-end suites run on the release commit; output recorded
- [ ] README followed on a clean clone by the member who did not write it (NFR-06)
- [ ] Release PR `staging/sprint-1` → `main` reviewed and merged
- [ ] Tag `v0.1.0-sprint1` on the merge commit; commit SHA recorded
- [ ] Known limitations, failed or skipped tests listed
