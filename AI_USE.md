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
| PR1, PR2 | Antigravity ran checks and drafted reviews | Nara |
| P0, P2, P3a, P4b, PR4, PR6, PR8 | *To be confirmed by Nara in the PR8 review* | Nara |

## What AI was not trusted with
- No secret was ever given to an AI tool; local passwords stay in `server/.env` (ignored by Git).
- "All tests pass" was never accepted from an AI statement: every result in the report comes from a recorded run (command, commit, counts) in `docs/evidence/`.
- Failing tests were committed and run before implementations, so AI could not write a test to fit existing code.
