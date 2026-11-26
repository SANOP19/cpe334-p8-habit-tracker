# Live check of v0.2.3-lab6 (KI-10, Issue #79; KI-9 re-checked)

- Release: `v0.2.3-lab6` (`b51c5e7`), revision `sf4618437-00010-xj9` (B's `gcloud` record on PR #81 = Deploy demo
  run 45777361382, digest `sha256:17eb3c3a625cc49557637f269474f2c807be97e4e6f0c743174e31945b77fe22`).
- When: 26 Nov 2026 14:52 ICT. Same signed-in session as the v0.2.2-lab6 check (Nitithorn signed in as
  `participant@example.test`, Alex Student); Claude Code opened Templates and Goals and measured the header
  (read-only; no data created or changed). No password typed or seen by the AI.
- Served bundle: `/assets/index-B_Yp1GGV.js` = the local build of the same tree.

| Viewport | Page | Header items outside the screen | Page scrollWidth vs viewport | Header | Result |
|---|---|---|---|---|---|
| 375 px (mobile emulation) | Templates | none | 375 = 375 | 2 lines, 95 px: brand + links (top 8); Alex Student · Participant · Sign out right-aligned on line 2 (top 56–61), Sign out ends at x = 363 | **PASS** |
| 375 px (mobile emulation) | Goals (incl. the `UAT09-YW-DRY` card with the 500-character note) | none | 375 = 375 | same | **PASS** (KI-9 and KI-10 together) |
| 1474 px (desktop pane) | Goals | none | 1474 = 1474 | 1 line, 57 px; item tops within 10 px | **PASS** (wide screens unchanged) |

Before the fix (`v0.2.2-lab6`, O-10): at 375 px the user group ended at x = 481 and the page was 481 px wide.

Evidence: `EP-live-KI10-v0.2.3-lab6-mobile375.jpg`.

## Re-check of the dry-run steps touched by KI-9 / KI-10 (26 Nov 2026 15:06 ICT, same P1 session, read-only)

Code changed between `v0.2.1-lab6` (dry run) and `v0.2.3-lab6`: class names/styles only in
`client/src/components/GoalsPage.tsx` (history row) and `client/src/components/Layout.tsx` (header);
no text, logic, server, schema or deploy change (`git diff v0.2.1-lab6 v0.2.3-lab6 -- client/src server/src`).
Case steps that show these two areas were re-read on the live release using the dry-run data:

| Case / step (dry run result) | Live on `v0.2.3-lab6` | Same as the dry run? |
|---|---|---|
| Header for P1 (UAT-01 #4, shared rules) | "Habit Tracker · Templates · Goals · Alex Student · Participant · Sign out" | yes |
| UAT-01 #8–9 (`UAT01-YW-DRY`) | 2026-11-26 45 minutes 150% Achieved; 2026-11-25 20 minutes UAT note 66.6%; "Achieved 1 of 2 logged days" | yes |
| UAT-02 #4–6 (`UAT02-YW-DRY`) | 2026-11-26 5 pages 50%; 2026-11-25 50 pages 500% Achieved; 2026-11-20 10 pages 100% Achieved; "Achieved 2 of 3 logged days" | yes |
| UAT-04 #1 (`UAT04-YW-DRY`) | 2026-11-26 6 glasses 75% (no Achieved) | yes |
| UAT-05 #2, #7 (`UAT05-YW-DRY`) | 2026-11-26 6000 steps 75%; 2026-11-24 8000 steps 100% Achieved (below T); "Achieved 1 of 2 logged days" | yes |

Layout of these 8 rows at 1474 px: each row 30 px high (one line), percent/badge on the same line and to
the right of the text, inside the card, no row overflow; page not wider than the viewport.
Not re-checked live: the MGR header (needs a manager sign-in) — covered on the same code by
TEST-L6-79 (Program Manager at 375 px and 1280 px) and TEST-27; Sign out was not clicked live (A's
session) — covered by TEST-27 and client TEST-UI-02 on the same code.
Evidence: `EP-live-v0.2.3-lab6-history-rows.jpg`.
