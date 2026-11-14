# Contributing / Team workflow

## Branches
- `main`: accepted releases only. Never push directly.
- `staging/sprint-N`: integration branch for sprint N.
- `feature/F-xx-short-name`, `fix/short-name`: one bounded Issue each, branched from the current staging branch.

## Flow
1. Create an Issue linked to the requirement (FR/BR/NFR) and the feature contract.
2. Branch from `staging/sprint-N`.
3. Commit the contract (spec, AC, STS) first, then failing tests, then the implementation.
4. Open a PR into `staging/sprint-N`. The teammate reviews. Authors never approve their own PR.
5. Integrate, run the full test suite and acceptance checks on staging.
6. Open a reviewed release PR `staging/sprint-N` -> `main`, then tag the release.

## Commit prefixes
`docs(contract):` spec/AC/STS · `test(red):` failing test that expresses the intended behaviour · `feat(F-xx):` implementation · `fix:` defect · `docs:` other documents · `chore:` tooling

## Reviews
A review must state a specific check, question, finding or reason for approval. The reviewer runs the tests.

## Pair work
When both people worked on a change, name both in the Issue or PR.

## Secrets
Never commit `.env` or real credentials. Use `.env.example` with placeholders. Demo data is synthetic.
