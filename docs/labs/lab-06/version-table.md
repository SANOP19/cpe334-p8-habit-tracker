# Lab 6 — Version table

| Version | Date | Author | Reviewer | Change |
|---|---|---|---|---|
| 1.0 | 2026-11-28 | Nitithorn Ketkaew | Nara Kosiyaporn | First version after both final decisions |

Every release goes `staging/sprint-1` → release PR → `main` (merge commit) → **Deploy demo** (tests, image
for the merge SHA, migrate job, service update, smoke test) → `gcloud run services describe` record by Nara
→ annotated tag by Nitithorn → sync PR `main` → `staging/sprint-1`. After the handoff (26 Nov 16:00 ICT)
the partner team was told before every deploy.

## HabitPulse (our product) — Cloud Run service `sf4618437`, https://sf4618437-4d7hbszvwq-as.a.run.app

| Role in Lab 6 | Tag | Commit | Revision | Release PR · Deploy run | Image digest (`sha256:`) | Contents |
|---|---|---|---|---|---|---|
| Sprint 1 baseline | `v0.1.0-sprint1` | `bfd125f` | — | #34 | — | Sprint 1 features F-01..F-05 |
| Previous deployment (Lab 5) | `v0.2.0-lab5` | `4b8ba1e` | `sf4618437-00007-n5h` | #53 | — | Lab 5 deployment; contains KI-1..KI-7 |
| Pre-UAT correction (superseded) | `v0.2.1-lab6` | `9ea9765` | `sf4618437-00008-bz9` | #73 · 45639588700 | `98932f52…` | KI-1..KI-8 (own audit) |
| Pre-UAT correction (superseded) | `v0.2.2-lab6` | `f9a61be` | `sf4618437-00009-q6m` | #77 · 45770519670 | `f6a1a044…` | + KI-9 #75 (dry run) |
| **Release tested by the partner** | **`v0.2.3-lab6`** | **`b51c5e7`** | **`sf4618437-00010-xj9`** | #81 · 45777361382 | `17eb3c3a…` | + KI-10 #79 (live check) |
| Part D corrected release (superseded before the re-test) | `v0.2.4-lab6` | `bc8f461` | `sf4618437-00011-w8p` | #92 · 46037520889 | `9b81a069…` | + #87 (PR #89), #86 (PR #90, F-02 v1.2), #88 (PR #91) |
| **Final release, re-tested and accepted by the partner** | **`v0.2.5-lab6`** | **`bd97c01`** | **`sf4618437-00012-r2h`** | #96 · 46050091297 | `f0a591b1…` | + #94 (PR #95, own finding) |

Details: each release's deploy record is a `gcloud run services describe` comment by Nara on the release PR;
the served client bundle was compared with a local build of the same tree for every release; live checks
are in `docs/evidence/lab-06/live-check/` and the Lab 6 log.

## CPMS (partner product) — Cloud Run service `s87d9c6b4`, https://s87d9c6b4-4d7hbszvwq-as.a.run.app

| Role in Lab 6 | Commit | Revision | Release PR · Deploy run | Contents |
|---|---|---|---|---|
| Release we tested (NK1, YW1, YW2, YW-EX) | `2174e0f` | `s87d9c6b4-00008-8lw` | — | Sprint 1 release; known defect #34 |
| First corrected release (NK2, YW3) | `fd2ff1d` | `s87d9c6b4-00009-bwv` | #44 · 46105362817 | fixes #34, #38–#42 |
| **Final release, re-tested and accepted by us (YW4)** | **`aa27be0`** | **`s87d9c6b4-00010-5tn`** | #48 · 46143902952 | + fix #45 (PR #47), agreed cases YW-EX-01..06 (PR #46) |
