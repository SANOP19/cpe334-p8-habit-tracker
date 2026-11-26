# HabitPulse UAT — Product Team dry run — preparation, NOT the independent UAT

Team YaWan's own run of our UAT cases on the live site before the handoff, to check that every step and
expected result is right. **A** = Nitithorn Ketkaew. The independent UAT is done by the partner team.

- Release: `v0.2.1-lab6` (`9ea9765`), revision `sf4618437-00008-bz9`, https://sf4618437-4d7hbszvwq-as.a.run.app
- Cases: `docs/labs/lab-06/uat-cases.md` (draft v0.1 at the time; v0.2 applied the wording fixes below) · tag `YW-DRY` · T = 2026-11-26 (Asia/Bangkok)
- Method: Nitithorn (A) signed in to each account himself in the Claude desktop app's browser; Claude Code then
  followed the case steps in that session (UI clicks/typing, and the cases' own API-tab/Console steps). No
  password typed or seen by the AI. Started 26 Nov 2026 00:17 ICT (after the 23:45–00:15 quiet window).

## Session 1 — MGR (`manager@example.test`), from 00:17 ICT

| Case / step | Expected (case) | Observed | Result |
|---|---|---|---|
| UAT-01 #1 | Header "Dr. Morgan Staff" + "Program Manager"; nav only Templates; "Activity Templates" + "Create activity template" | header "Dr. Morgan Staff · Program Manager · Sign out"; nav Templates; heading and form as expected | PASS |
| UAT-01 #2 | new card UAT01 at top, DRAFT, "Target range: 1 – 120 minutes", Publish | as expected | PASS |
| UAT-01 #3 | PUBLISHED, Publish button gone | as expected | PASS |
| UAT-03 #1 | "minValue must be strictly less than maxValue."; no card | as expected; card count unchanged | PASS |
| UAT-03 #2 | same message; no card | as expected | PASS |
| UAT-03 #3 | "All template fields are required and must be valid numbers."; no card | as expected (unit value was three spaces) | PASS |
| UAT-03 #4 | browser blocks ("fill out this field"); no card | blocked; `validity.valueMissing` true; browser message was in Thai ("โปรดกรอกฟิลด์นี้") | PASS — **case wording to fix**: the browser's message depends on its language |
| UAT-03 #5 | UAT03e PUBLISHED; UAT03c, UAT03d DRAFT | ids 5 (e, PUBLISHED via the card's Publish button), 4 (c, DRAFT), 6 (d, DRAFT) | PASS |
| UAT-03 #6 | `/api/templates` lists templates with status; D noted | D = 6 | PASS |
| Setup UAT-02/04/05/08/09 | MGR creates and publishes | created with the form; published with same-origin `POST /api/templates/:id/publish` (ids 7, 8, 9, 10, 11 → 200) to avoid clicking the wrong card in the two-column grid | PASS (setup) |
| UAT-08 #1–2 | PUBLISHED; publish again → 409 `ALREADY_PUBLISHED` "Template is already published." | 409 as expected | PASS |
| UAT-09 #1 | publish 3000000000 → 404 "Template not found." | 404 as expected | PASS |

Note for the cases: the template list is a two-column grid; "new card at the top" means first in the list (top-left).

## Session 2 — P1 (`participant@example.test`), from 00:28 ICT

UAT-06 #1–3 were typed by A on the sign-in page before this session started (A typed every password); the AI did not see those screens — A's observations are recorded below when reported.

| Case / step | Expected (case) | Observed | Result |
|---|---|---|---|
| UAT-06 #3 | signed in as "Alex Student" after the upper-case email | header "Alex Student · Participant" | PASS |
| UAT-06 #4 | `/api/auth/me` → user with lower-case email, no password/hash | `{"id":2,"email":"participant@example.test","displayName":"Alex Student","role":"PARTICIPANT"}` | PASS |
| UAT-01 #4 | header "Alex Student" + "Participant"; nav Templates, Goals | as expected | PASS |
| UAT-01 #5 | card with range and Set goal; no create form, badge or Publish | as expected (all 9 cards) | PASS |
| UAT-03 #7 | UAT03e listed; UAT03c and UAT03d not listed | as expected | PASS |
| UAT-01 #6 | "Goal saved." | as expected (goal id 3); saved with Enter in the target field | PASS |
| Setup | goals UAT02 (10), UAT04 (8), UAT05 (8000), UAT09 (5) | "Goal saved." each; ids 4, 5, 6, 7 | PASS (setup) |
| UAT-03 #8 | 101 and 0 blocked by the browser; no goal | blocked (`rangeOverflow` / `rangeUnderflow`; browser messages in Thai: "ค่าต้องน้อยกว่าหรือเท่ากับ 100", "ค่าต้องมากกว่าหรือเท่ากับ 1"); no goal | PASS |
| UAT-03 #9 | "Goal saved." for 100 | as expected (goal id 8) | PASS |
| UAT-03 #10 | after reload: "You already have an active goal for this activity."; one goal with target 100 | as expected; typed value kept | PASS |
| UAT-03 #11 | templateId D=6 → 422 `TEMPLATE_NOT_PUBLISHED` "This activity is not available for goals." | as expected | PASS |
| UAT-01 #7 | ACTIVE, "Daily target: 30 minutes", "Achieved 0 of 0 logged days", "No entries logged yet." | as expected; Date default 2026-11-26, min 2026-11-20, max 2026-11-26 | PASS |
| UAT-01 #8 | "Entry saved."; T · 45 minutes · 150% · Achieved; "Achieved 1 of 1" | "2026-11-26 45 minutes 150% Achieved"; "Achieved 1 of 1 logged days" | PASS |
| UAT-01 #9 | T−1 · 20 minutes · UAT note · 66.6%; T above T−1 without reload; "Achieved 1 of 2" | rows 2026-11-26 then 2026-11-25 "20 minutes UAT note 66.6%"; "Achieved 1 of 2 logged days" | PASS |
| UAT-02 #2–3 | 4 and 51 → "Value must be between 5 and 50 pages."; no row | as expected (both) | PASS |
| UAT-02 #4–6 | 50% / 500% Achieved / 100% Achieved; rows T, T−1, T−6; "Achieved 2 of 3" | 2026-11-26 5 pages 50%; 2026-11-25 50 pages 500% Achieved; 2026-11-20 10 pages 100% Achieved; "Achieved 2 of 3 logged days" | PASS |
| UAT-02 #7 | T−7 blocked by the browser; no row | blocked (`rangeUnderflow`, browser message in Thai "ค่าต้องเป็น 20/11/2026 หรือหลังจากนั้น"); entries unchanged | PASS |
| UAT-02 #8 | N noted; `bkk(7)` → 422 `DATE_TOO_OLD` with the contract message | N = 4; `bkk(7)` = 2026-11-19 → 422 `DATE_TOO_OLD` "Activity can only be recorded for today and up to 6 days in the past." | PASS |
| UAT-02 #9 | `bkk(-1)` → 422 `DATE_IN_FUTURE` "Cannot record an activity for a future date." | `bkk(-1)` = 2026-11-27 → as expected | PASS |
| UAT-02 #10 | exactly 3 entries T (5), T−1 (50), T−6 (10) | 2026-11-26:5, 2026-11-25:50, 2026-11-20:10 | PASS |
| UAT-04 #1 | T · 6 glasses · 75% without Achieved | "2026-11-26 6 glasses 75%" | PASS |
| UAT-04 #2 | days[0] value 6, percent 75, achieved false; entriesCount 1 | as expected; N = 5 | PASS |
| UAT-07 #1–4, all | 404 "Goal not found." ×3 (abc, 999999, 3000000000); 404 "The requested resource was not found"; 422 "Malformed JSON payload in request body"; JSON only, no stack/SQL/path | as expected; leak scan of all bodies: 0 | PASS (URLs fetched from the page with the same cookie instead of opening tabs) |
| UAT-09 #2 | goal saved; N noted | N = 7 | PASS |
| UAT-09 #3–8 | 422 TEMPLATE_NOT_PUBLISHED; 404; 422 note ≤500 detail; 422 "Must be text"; 413 PAYLOAD_TOO_LARGE; 201 with a 500-character note | all as expected; afterwards exactly one entry (T, note length 500) | PASS |
| UAT-05 #2 | T · 6000 steps · 75% | "2026-11-26 6000 steps 75%" | PASS |
| UAT-05 #3 | "An activity entry for this date already exists."; still one T row with 6000 | as expected; server has one entry | PASS |
| UAT-05 #4 | after reload still signed in; same single row | as expected | PASS |
| UAT-05 #5 | after Sign out: sign-in page; `/api/auth/me` → 401 `UNAUTHENTICATED` | A clicked Sign out (00:39); sign-in page shown; `/api/auth/me` → 401 "Please sign in." | PASS |
| UAT-04 #9 | signed out: `/api/goals` → 401 `UNAUTHENTICATED` "Please sign in." | as expected (checked here, right after P1 signed out, instead of after the MGR session — same signed-out state) | PASS |
| UAT-06 #1 (redone 00:4x) | "Email or password is incorrect."; password cleared; still on Sign in | A typed `participant@example.test` + a wrong password; page shows "Email or password is incorrect."; email kept, password field empty; still on Sign in; `/api/auth/me` 401 | PASS |
| UAT-06 #2 (redone) | exactly the same message for an unknown email | A typed `nobody-YW-DRY@example.test` + any password; "Email or password is incorrect." — identical to #1; password cleared; still on Sign in; `/api/auth/me` 401 | PASS |

## Session 3 — P2 (`participant2@example.test`, Blake Student), from 00:43 ICT

| Case / step | Expected (case) | Observed | Result |
|---|---|---|---|
| UAT-04 #3 | no `UAT04-<tag>` card on Goals | "My Goals — No goals yet. Choose a template on the Templates page to set one." (Blake has no goals) | PASS |
| UAT-04 #4 | `/api/goals/5`, `/entries`, `/progress` → 404 "Goal not found."; no P1 data | all three 404 `NOT_FOUND` "Goal not found."; no P1 data in the bodies | PASS |
| UAT-04 #5 | POST entry to goal 5 → 404 "Goal not found." | 404 as expected | PASS |
| UAT-04 #6 | POST /api/templates → 403 `FORBIDDEN` "You do not have permission to do this." | 403 as expected | PASS |

## Session 4 — MGR again, from 00:46 ICT

| Case / step | Expected (case) | Observed | Result |
|---|---|---|---|
| UAT-04 #7 | nav has no Goals; `/api/goals`, `/api/goals/5`, `/api/goals/5/progress` → 403 `FORBIDDEN` "You do not have permission to do this." | nav: Templates only; all three 403 as expected | PASS |
| UAT-04 #8 | POST /api/goals with UAT04's templateId (8) → 403 `FORBIDDEN` | 403 as expected | PASS |
| UAT-03 #12 (MGR part) | MGR publishes UAT03c (0–10) | published with its card's Publish button (located by heading); UAT03c PUBLISHED, UAT03d still DRAFT | PASS (setup) |

## UAT-05 #6–7 — second browser (A, Chrome private window, P1), ~00:50 ICT

Screenshots by A: `docs/evidence/lab-06/dry-run/EA-dry-UAT05-step6-second-browser.webp`, `EA-dry-UAT05-step7-second-browser.webp`.

| Case / step | Expected (case) | Observed | Result |
|---|---|---|---|
| UAT-05 #6 | UAT05 shows T · 6000 steps · 75% | "2026-11-26 6000 steps 75%", "Achieved 0 of 1 logged days" | PASS |
| UAT-05 #7 | T−2 · 8000 · 100% Achieved, below the T row; "Achieved 1 of 2" | "Entry saved."; rows 2026-11-26 6000 75% then 2026-11-24 8000 100% Achieved; "Achieved 1 of 2 logged days" | PASS |

**Observation O-9 (from A's screenshot):** on the UAT09 card the 500-character note without spaces ("nnnn…", UAT-09 #8) does not wrap and runs past the card and the page edge. Not a stated contract rule, but a visible layout problem; **Outcome:** corrected before the handoff as KI-9 (Issue #75, PR #76, release `v0.2.2-lab6`).

## Session 5 — P1 again (first browser), from 00:51 ICT

| Case / step | Expected (case) | Observed | Result |
|---|---|---|---|
| UAT-04 #10 | still one entry (T, 6) and the same progress as step 2 | entries `2026-11-26:6`; progress value 6, percent 75, achieved false, entriesCount 1 — unchanged | PASS |
| UAT-05 #8 | same two rows and summary as step 7 | "2026-11-26 6000 steps 75%", "2026-11-24 8000 steps 100% Achieved"; "Achieved 1 of 2 logged days" | PASS |
| UAT-03 #12 (P1 part) | browser accepts 0; server error "Daily target must be greater than 0 and between 0 and 10 km."; no goal | input min 0 (valid); message as expected; no goal for UAT03c | PASS |
| O-9 measured | — | UAT09 card 340 px wide; the note row's content is 4078 px wide; the whole Goals page scrolls horizontally (4536 px for an 882 px viewport) | observation |

## Summary

- All 9 cases, every step: **PASS** (UAT-06 #1–2 redone at 00:4x with A typing on the sign-in page; UAT-05 #6–7 by A in a second browser with screenshots).
- No contract deviation found. One layout observation **O-9** (long note without spaces overflows the card and the page).
- Case wording fixed in `uat-cases.md` v0.2 (before the handoff):
  1. Browser validation messages depend on the browser language (seen in Thai): UAT-02 #7, UAT-03 #4 and #8 should say "the browser blocks the submit and shows its own required/range message", not quote English text.
  2. The template list is a two-column grid: "new card at the top" → "first card in the list (top-left)".
  3. Optional clarity: in API steps, "open the URL in a new tab" can also be done with `fetch` in the Console — results are the same.
- Data created on production (tag `YW-DRY`): templates ids 3–11 (UAT01..UAT09, UAT03a/b were rejected and not created); P1 goals ids 3–8 with entries; no P2 data.

## After the dry run (26 Nov 2026)

- **O-9 → KI-9** (#75): long notes wrap inside the goal card; PR #76, release `v0.2.2-lab6`. Live check:
  `docs/evidence/lab-06/live-check/EP-live-check-v0.2.2-lab6.md`.
- **O-10 → KI-10** (#79), seen during that live check at a 375 px screen: the header did not fit and the
  page scrolled sideways (present since Sprint 1). Corrected in PR #80, release **`v0.2.3-lab6`**
  (`b51c5e7`, revision `sf4618437-00010-xj9`) — the release the partner team tests.
- Both corrections change only CSS classes/styles (no text, logic, server or data change). The dry-run
  steps that show the header and the entry history were re-read on `v0.2.3-lab6` with the same data and
  match the results above: `docs/evidence/lab-06/live-check/EP-live-check-v0.2.3-lab6.md`.
- Live check of KI-1..KI-8 on `v0.2.1-lab6` before the dry run: `docs/evidence/lab-06/live-check/EP-live-check-v0.2.1-lab6.md`.
