# Live check of v0.2.2-lab6 (KI-9, Issue #75)

- Release: `v0.2.2-lab6` (`f9a61be`), revision `sf4618437-00009-q6m`, https://sf4618437-4d7hbszvwq-as.a.run.app
- When: 26 Nov 2026 14:07–14:09 ICT. Nitithorn signed in as `participant@example.test` (Alex Student) in the
  Claude desktop app's browser; Claude Code opened the Goals page and measured the layout in that session
  (read-only; no data created or changed). No password typed or seen by the AI.
- Data: the existing `UAT09-YW-DRY` card from the dry run, entry 2026-11-26 with a 500-character note without spaces.
- Served bundle: `/assets/index-8RFH1RM3.js` (same name as the local build of `f9a61be`'s tree).

| Viewport | Row scrollWidth / clientWidth | Percent right vs card right | Page scrollWidth vs viewport | Result |
|---|---|---|---|---|
| 1489 px (desktop pane) | 607 / 607 | 1301.5 ≤ 1384.3 | 1474 ≤ 1489 | note wraps inside the card (row 218.5 px tall); no sideways scroll — **PASS** |
| 375 px (mobile emulation) | 318 / 318 | 279.8 ≤ 362.7 | 481 > 375 | the goal card is fine — **KI-9 PASS**; the page still scrolls sideways because of the **top bar** (see O-10) |

Before the fix (dry run O-9, `v0.2.1-lab6`): the same row was 4078 px wide and the page 4536 px at 882 px.

**Observation O-10 (new, not KI-9):** at 375 px the navigation bar's right group ("Alex Student · Participant ·
Sign out", `div.d-flex.align-items-center.gap-2`) ends at x = 481, so the page scrolls sideways and the
Sign out button is off screen until the user scrolls. Seen on the live site; the SRS (A-05) assumes desktop
**or mobile** browsers. Pre-existing since Sprint 1: `client/src/components/Layout.tsx` (navbar with
`navbar-expand`, line 46; right group line 64) is unchanged since `v0.1.0-sprint1`. **Outcome:** A chose to correct it before the handoff as KI-10 (Issue #79, PR #80, release `v0.2.3-lab6`); see `EP-live-check-v0.2.3-lab6.md`.

Evidence: `EP-live-KI9-v0.2.2-lab6-desktop.jpg`, `EP-live-KI9-v0.2.2-lab6-mobile375.jpg`.
