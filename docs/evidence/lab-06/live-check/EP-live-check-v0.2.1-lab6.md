# Live check of the pre-UAT corrections on v0.2.1-lab6 — Product Team preparation, not UAT

- URL: https://sf4618437-4d7hbszvwq-as.a.run.app · release `v0.2.1-lab6` = `9ea9765` · revision `sf4618437-00008-bz9`
- Method: Nitithorn (A) signed in himself in the Claude desktop app's browser; Claude Code then operated the
  signed-in session (UI clicks and same-origin `fetch` in the page). No password was typed or seen by the AI.
- Test data tag: `UAT00-YW-DRY`

## Manager session (`manager@example.test`, Dr. Morgan Staff, PROGRAM_MANAGER) — 2026-11-25 22:35 ICT

| Check | Expected | Actual | Result |
|---|---|---|---|
| Pre-existing templates | — | 1 template: "Daily Reading" (PUBLISHED, 1–200 pages) | recorded |
| Create template `UAT00-YW-DRY` (pages, 1–100) via the form | new card at the top, DRAFT, "Target range: 1 – 100 pages", Publish button | as expected (id 2) | PASS |
| Publish it | status PUBLISHED | PUBLISHED | PASS |
| KI-1: `POST /api/templates/3000000000/publish` | 404 `NOT_FOUND` "Template not found." | 404 `NOT_FOUND` "Template not found." | PASS |
| KI-1: `POST /api/templates/2147483648/publish` | 404 `NOT_FOUND` "Template not found." | 404 `NOT_FOUND` "Template not found." | PASS |

## Participant session (`participant@example.test`, Alex Student, PARTICIPANT) — 2026-11-25 22:37 ICT

Pre-existing data: goal id 1 "Daily Reading" (target 25) with entries 2026-11-20 and 2026-11-21 (from Lab 5 checks).
Device timezone of this browser: UTC+7 (Bangkok).

| Check | Expected | Actual | Result |
|---|---|---|---|
| Set goal on `UAT00-YW-DRY` from Templates (target 30) | "Goal saved."; goal ACTIVE target 30 | "Goal saved."; goal id 2 ACTIVE target 30 | PASS |
| Goals card before entries | "Achieved 0 of 0 logged days", "No entries logged yet." | as expected | PASS |
| KI-3: Date input default / min / max | 2026-11-25 / 2026-11-19 / 2026-11-25 (Asia/Bangkok) | 2026-11-25 / 2026-11-19 / 2026-11-25 | PASS (note: this device is already UTC+7, so the old device-timezone bug would not show here; the non-Bangkok case is covered by TEST-L6-61) |
| KI-7: Save entry while the request runs | `Loading` "Saving entry" shown, button disabled | both observed (MutationObserver on the card) | PASS |
| Entry T = 45 | row "2026-11-25 · 45 pages · 150% · Achieved"; "Achieved 1 of 1" | as expected | PASS |
| KI-7: entry date is a badge | `badge` class | `badge` | PASS |
| KI-6: entry T−1 = 20, note "UAT note", no reload | rows ordered 2026-11-25 then 2026-11-24; 66.6%; "Achieved 1 of 2" | 2026-11-25, then 2026-11-24 · 20 pages · UAT note · 66.6%; "Achieved 1 of 2 logged days" | PASS |
| KI-1: GET goal / entries / progress and POST entry with ids 2147483648 and 3000000000 | 404 `NOT_FOUND` "Goal not found." | 404 "Goal not found." (all 8) | PASS |
| KI-1: POST /api/goals templateId 2147483648 and 3000000000 | 422 `TEMPLATE_NOT_PUBLISHED` | 422 `TEMPLATE_NOT_PUBLISHED` (both) | PASS |
| KI-2: 200 KB entry body | 413 `PAYLOAD_TOO_LARGE` "The request is too large." | as expected | PASS |
| KI-4: note 501 characters | 422 `VALIDATION_ERROR`, detail note "Must be at most 500 characters" | as expected | PASS |
| KI-4 control: note 500 characters plus spaces (2026-11-23) | 201, stored length 500 | 201, length 500 | PASS |
| KI-5: note 123 | 422 `VALIDATION_ERROR`, detail note "Must be text" | as expected | PASS |
| KI-5 control: note null (2026-11-22) | 201, no note | 201, note null | PASS |
| Server order of entries | newest date first | 2026-11-25, 24, 23, 22 | PASS |

KI-8 is documentation only (contract text); checked in the repository (`EP-local-ui-check-v0.2.1-lab6.txt`).

## Result
All checks PASS on the live release `v0.2.1-lab6` (revision `sf4618437-00008-bz9`). Test data left in production
(tagged, harmless): template id 2 `UAT00-YW-DRY`; participant goal id 2 with entries 2026-11-22..25. Product Team
preparation only — not an independent UAT result.
