# AI use declaration

Compiled for the Sprint 1 release (PR8). Sources: each PR's description and review. Both members inspected, ran and can explain every AI-assisted change before it was accepted; acceptance always required the teammate's review and the tests passing on a real PostgreSQL database.

## Tools
| Tool | Used by | Typical use |
|---|---|---|
| Claude Code | Nitithorn | Planning, drafting documents, contracts, tests and code; running tests, clean-clone and browser checks; drafting review comments |
| Antigravity | Nara | Drafting documents, contracts, tests and code; running checks; drafting review comments |

## By part
| Part / PR | Task assisted | Tool | Author | Reviewer |
|---|---|---|---|---|
| P0 · #2 | Project brief | Claude Code | Nitithorn | Nara |
| P1 · #12 | Server foundation: scaffolding, TDD tests, test harness | Antigravity | Nara | Nitithorn |
| P2 · #9 | Client foundation: tests and implementation | Claude Code | Nitithorn | Nara |
| P3a · #10 | SRS context, actors, scope, assumptions, decisions | Claude Code | Nitithorn | Nara |
| P3b · #13 | SRS FR / BR / NFR | Antigravity | Nara | Nitithorn |
| P4a · #14 | System SDS architecture, data model, auth lifecycle, configuration | Antigravity | Nara | Nitithorn |
| P4b · #11 | System SDS UI, API conventions, role matrix | Claude Code | Nitithorn | Nara |
| PR1 · #24 | Features, traceability, sprint plan, DoD; ID consistency check | Claude Code | Nitithorn | Nara |
| PR2 · #26 | F-01 contract, tests, implementation; defect fix #25; browser check | Claude Code | Nitithorn | Nara |
| PR3 · #27 | F-02 contract, tests, implementation, evidence | Antigravity | Nara | Nitithorn |
| PR4 · #28 | F-03 contract, tests, implementation; browser check | Claude Code | Nitithorn | Nara |
| PR5 · #29 | F-04 contract, tests, implementation, evidence | Antigravity | Nara | Nitithorn |
| PR6 · #30 | F-05 contract, tests, implementation; app check | Claude Code | Nitithorn | Nara |
| PR7 · #31 | E2E journey, README, restart check, root scripts | Antigravity | Nara | Nitithorn |
| PR8 | Release checks, traceability update, this declaration, release notes | Claude Code | Nitithorn | Nara |

## Reviews
| Reviews | Assistance | Reviewer |
|---|---|---|
| P1, P3b, P4a, PR3, PR5, PR7 (incl. three clean-clone runs) | Claude Code ran the tests, red-commit re-runs, probes and clean clones, and drafted the review text; the reviewer read and posted it | Nitithorn |
| P0, P2, P3a, P4b, PR1, PR2, PR4, PR6, PR8 | Antigravity ran checks and drafted reviews; reviewer inspected and posted (confirmed by Nara in the PR #32 review) | Nara |

## Lab 5 (deployment and CI/CD)
| Issue / PR | Task assisted | Tool | Author | Reviewer |
|---|---|---|---|---|
| #37 · PR #45 | `/api/ready`, serving the built client in production, env docs | Claude Code | Nitithorn | Nara |
| #38 · PR #46 | Dockerfile, Compose, adapted portal deploy files, offline deploy tests | Antigravity | Nara | Nitithorn |
| #39 · PR #47 | `ci-docker.yml` (`test-and-docker`), Dependabot, review follow-ups | Claude Code | Nitithorn | Nara |
| PR #48 | Release 1 description and commit-range check | Antigravity | Nara | Nitithorn |
| #41 · PR #50 | Merge-gate proof (one failing test, closed unmerged) | Claude Code | Nitithorn | — |
| #41 | Ruleset and environment `demo` settings, checked through the GitHub API | Claude Code | Nitithorn | Nara |
| #42 · PR #49 | Sync of `staging/lab-5` with `main` | Claude Code | Nitithorn | Nara |
| #42 · PR #51 | Visible release change, Validate-step fix in `deploy.yml` | Claude Code | Nitithorn | Nara |
| #44 · PR #52 | `docs/labs/lab-05/deployment.md`, this section | Claude Code | Nitithorn | Nara |
| #36, #40 | Portal connection, seed secrets, first deploy from Cloud Shell, C-04 | Antigravity explained each step and read logs; Nara ran every command and clicked every portal button | Nara | Nitithorn |
| #36, #40 | Checking the cloud evidence (resource names against `deploy.sh`, image digest against the commit, live URL probes) and drafting the check comments | Claude Code | Nitithorn | — |

Lab 5 limits on AI (in addition to the list below):
- No AI tool ran `gcloud`, `kit.sh` or `deploy.sh` against the cloud, clicked the portal's one-time "Create resources" button, or changed IAM, billing or the database.
- Seed passwords were typed by Nara at `kit.sh`'s hidden prompt and never given to an AI tool, an Issue or a screenshot.
- Deploy results were accepted only from recorded evidence: workflow runs, `gcloud ... describe` output and screenshots with the URL bar visible.

## Lab 6 (independent UAT and defect management)
Partner team: CPMS (Theme 6). The partner's own AI use is declared in their report.

### Product Team work on HabitPulse
| Issue / PR | Task assisted | Tool | Author | Reviewer |
|---|---|---|---|---|
| — | Lab 6 plan and the pre-UAT audit of Sprint 1 against the contracts that found KI-1..KI-8 | Claude Code | Nitithorn | Nara |
| #59–#66 · PR #69–#72 | Pre-UAT corrections KI-1..KI-8: RED tests, fixes, evidence, traceability §7 | Claude Code | Nitithorn | Nara |
| #75 · PR #76, #79 · PR #80 | KI-9 (found in the dry run), KI-10 (found in the live check) | Claude Code | Nitithorn | Nara |
| PR #68 | UAT finding Issue form | Claude Code | Nitithorn | Nara |
| PR #73, #77, #81, #92, #96 · #67, #74, #78, #82, #93, #97 | Release and sync PR texts, pre-release checks, deploy/digest/bundle checks, tags | Claude Code | Nitithorn | Nara (merged, ran `gcloud`) |
| PR #83 | UAT cases, Product Team dry run, live checks | Claude Code (dry run and live checks: Nitithorn signed in, Claude Code operated the browser) | Nitithorn | Nara |
| PR #84 | UAT handoff | Antigravity | Nara | Nitithorn |
| #86–#88 | Triage: local reproduction (temporary tests, deleted), classification and severity proposal, Issue replies | Claude Code | Nitithorn | Nara (checked the reasoning) |
| #87 · PR #89, #86 · PR #90 | Part D corrections (F-02 v1.2 contract change for #86) | Claude Code | Nitithorn | Nara |
| #88 · PR #91, #94 · PR #95 | Part D correction and the Product Team correction O-11 | Antigravity (from task prompts / Issue instructions prepared with Claude Code) | Nara | Nitithorn (review checks run and review / merge posted with Claude Code on Nitithorn's instruction) |
| — | Live check of `v0.2.5-lab6` before the partner's re-test | Claude Code operated the browser; Nitithorn signed in | Nitithorn | — |
| this PR | `docs/labs/lab-06/triage.md`, `version-table.md`, this section | Claude Code | Nitithorn | Nara |

### UAT of the partner's product (CPMS)
| Run / item | What the AI did | What the student did | Tester |
|---|---|---|---|
| NK1 (25 Nov), NK2 re-test (28 Nov) | Antigravity drove the browser through the cases and drafted the result rows and Issue comments | Nara reviewed every result and decided PASS/FAIL | Nara |
| YW1 (26 Nov) | UAT-01, UAT-02: Claude Code gave the next step, read the page and drafted rows; UAT-06: Claude Code operated the browser | Nitithorn clicked and typed in UAT-01/02, signed in to every account and decided PASS/FAIL | Nitithorn |
| YW2 exploratory, YW3 and YW4 re-tests (26–28 Nov) | Claude Code operated the browser, sent single API requests and measured layouts | Nitithorn signed in to every account and decided PASS/FAIL | Nitithorn |
| Coverage review (proposed YW-EX-01..06, which were then run in YW2) | Antigravity drafted the review | Nara checked it against the 50 ACs | Nara |
| Findings #38–#42, #45 and decision comments | Claude Code drafted the reports; screenshots checked byte for byte | Nitithorn and Nara reviewed every text before posting; both decided the decisions | Nitithorn, Nara |

Lab 6 limits on AI (in addition to the list below):
- Passwords were exchanged only privately between the teams (ours by direct message, the partner's in the team chat) and never put in Git, an Issue or a screenshot. In Nitithorn's runs Claude Code never typed or saw a password: Nitithorn signed in to every account. In Nara's runs (NK1, NK2) Nara typed the passwords; Antigravity did not type them.
- PASS/FAIL, triage decisions and both acceptance decisions were made by the students; every run record names the tester and says "AI-assisted".
- No AI tool deployed, merged into `main`, ran `gcloud` or changed the partner's data beyond normal user actions with our own run tags.

## Lab 7 (maintenance change: entry correction with revision history, Issue #99)
| Part / PR | Task assisted | Tool | Author | Reviewer |
|---|---|---|---|---|
| Plan | Choice of the change (after the instructor's announcement), complexity and scope, step plan, checks of the plan against the handout | Claude Code | Nitithorn | Nara |
| #99 | Change-request text; label, Issue and Nitithorn's approval comment posted with `gh` at Nitithorn's instruction (Nara posts Nara's own approval) | Claude Code | Nitithorn | Nara |
| PR-L7-1 | Contract revision (SRS 0.3, F-04 v1.2, F-05 v1.2, System SDS 0.5, brief, features, traceability 2.0) and `docs/labs/lab-07/impact-CR-99.md` | Claude Code | Nitithorn | Nara |

Rows for PR-L7-2 (API) and PR-L7-3 (UI) are added in those PRs by their authors.

## What AI was not trusted with
- No secret was ever given to an AI tool; local passwords stay in `server/.env` (ignored by Git).
- "All tests pass" was never accepted from an AI statement: every result in the report comes from a recorded run (command, commit, counts) in `docs/evidence/`.
- Failing tests were committed and run before implementations, so AI could not write a test to fit existing code.
