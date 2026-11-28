# Lab 6 — Defect reporting and triage (Part C) and resolution (Part D)

| Version | Date | Author | Reviewer | Change |
|---|---|---|---|---|
| 1.0 | 2026-11-28 | Nitithorn Ketkaew | Nara Kosiyaporn | First version after both final decisions |

Teams: **YaWan** (Product Team for HabitPulse, Theme 8 — Nitithorn Ketkaew 67070505203, Nara Kosiyaporn
67070505218) and **CPMS** (partner, Theme 6 — Supanut Watthanasimakorn, Pongrit Boawan).
Severity rule (both teams): **critical** — cross-account leak or change, data loss, product unusable;
**major** — core rule wrong or main flow blocked without workaround; **minor** — wrong message, status or
display with an easy workaround and no wrong data.
Versions are listed in [`version-table.md`](version-table.md). Test methods are stated on every record
(manual, automated or AI-assisted); see `AI_USE.md`.

## 1. Incoming findings — partner's UAT of HabitPulse

Release under test: `v0.2.3-lab6` (`b51c5e7`, revision `sf4618437-00010-xj9`). The partner ran the 9 agreed
cases (67/67 steps PASS, 26 Nov 22:23–22:32 ICT, automated with Playwright, AI-assisted), 4 extra
coverage cases CP-EX-01..04 (all PASS) and exploratory testing, which produced three Issues.

| Issue | Reporter | Summary | Reproduced (version, who, when) | Classification | Reason (contract) | Severity | Owner | Disposition | Fix PR / release | Re-test (partner) |
|---|---|---|---|---|---|---|---|---|---|---|
| #87 `[EXP-02]` | Supanut W. (CPMS) | 9.99999999999 of target 10 showed 100 % while not achieved | Yes — `b51c5e7` locally (API + UI), Nitithorn, 27 Nov 01:57 ICT, AI-assisted | Accepted defect | F-05 §1.2 / D-08: percentage truncated, never 100 % unless the target is met | Minor (achieved, counts and stored value correct; only values within one part in 10¹² of the target) | Nitithorn | Corrected (RED → GREEN, D-12) | PR #89, `v0.2.4-lab6` | PASS on `v0.2.5-lab6`, 28 Nov 09:49 ICT |
| #86 `[EXP-01]` | Supanut W. (CPMS) | A template with range −10..0 could be created and published; no goal could ever be set | Yes — `b51c5e7` locally, Nitithorn, 27 Nov 01:57 ICT, AI-assisted | Accepted defect (gap in the F-02 rule) | FR-07, BR-08, D-07 cannot be met while F-02 only required `minValue < maxValue`; contract change F-02 v1.2 (`minValue` ≥ 0) | Minor (no wrong data; workaround: another template) | Nitithorn | Corrected after the contract change | PR #90, `v0.2.4-lab6` | PASS on `v0.2.5-lab6` |
| #88 `[EXP-03]` | Supanut W. (CPMS) | An 80-character name without spaces overflowed the template and goal cards | Yes — `b51c5e7` locally, Nitithorn, 27 Nov 01:58 ICT, AI-assisted | Accepted defect (related to #75 KI-9, not a duplicate) | F-02 §4, F-03 §4, F-04 §4, SRS A-05; names have no length limit | Minor (display only) | Nara | Corrected | PR #91, `v0.2.4-lab6` | PASS on `v0.2.5-lab6` |

Product Team finding during Part D (not a partner finding):

| Issue | Found by | Summary | Classification | Severity | Owner | Fix PR / release | Check |
|---|---|---|---|---|---|---|---|
| #94 (O-11) | Nitithorn, while reviewing PR #91 (CI run 46030798846) | A long display name pushed the role label and Sign out off a 375 px screen | Accepted defect (F-01 §UI, SRS A-05); not reachable with Sprint 1 data, corrected anyway before the partner's re-test so they re-test one release | Minor | Nara | PR #95, `v0.2.5-lab6` | Live check 28 Nov 01:44–01:48 ICT; partner re-test PASS (header at 375 px) |

Evidence: triage replies on each Issue (27 Nov 21:36 ICT); `docs/evidence/lab-06/86/`, `/87/`, `/88/`,
`/94/`; `docs/traceability.md` §8–§9.

## 2. Partner's decision on HabitPulse

**Accepted** — HabitPulse `v0.2.5-lab6`, commit `bd97c01`, revision `sf4618437-00012-r2h`, recorded by
the partner (Supanut Watthanasimakorn, Pongrit Boawan) on 28 Nov 2026: re-test 09:49 ICT, comments on
#86–#88 10:00–10:03 ICT, written decision in the team chat 10:05 ICT and in their report §7. No open
defect; the partner's known limitations are only the five ACs that can be checked by automated tests
only (AC-06, AC-22, AC-28, AC-30, AC-33).

## 3. Outgoing findings — our UAT of CPMS

Release under test: `2174e0f` (revision `s87d9c6b4-00008-8lw`). Our runs: NK1 (Nara, 25 Nov, AI-assisted),
YW1 (Nitithorn, 26 Nov, manual and AI-assisted), coverage review of the partner's cases against 50 ACs
(Nara) proposing six extra cases YW-EX-01..06, and exploratory run YW2 (Nitithorn, 26 Nov 16:49–17:23
ICT, AI-assisted), which also ran YW-EX-01..06 (no defect).

| Partner Issue | Found by | Summary | Proposed → partner's severity | Partner's disposition | Fix / revision | Our re-test |
|---|---|---|---|---|---|---|
| #34 (partner's own, UAT-06 step 3 FAIL in YW1) | Partner Product Team | Whitespace-only submission title saved | — / Major | Fixed | PR #37 → `s87d9c6b4-00009-bwv` | PASS — NK2 (Nara, 28 Nov 11:36 ICT) and YW3 (Nitithorn, 13:26–13:46 ICT) |
| #38 `[EXP-01]` | Nitithorn (YW2) | Whitespace-only milestone name saved as empty | Major / Major | Fixed | PR #37 → `00009-bwv` | PASS — NK2, YW3 |
| #39 `[EXP-15]` | Nitithorn (YW2) | Whitespace-only feedback via the API completed the milestone | Major / Major | Fixed | PR #37 → `00009-bwv` | PASS — NK2, YW3 |
| #40 `[EXP-25]` | Nitithorn (YW2) | Malformed JSON body → 500 | Minor / Minor | Fixed | PR #43 → `00009-bwv` | PASS — NK2, YW3 |
| #41 `[EXP-10]` | Nitithorn (YW2) | Upper-case `HTTPS://` link rejected | Minor / Minor | Fixed | PR #43 → `00009-bwv` | PASS — NK2, YW3 |
| #42 `[EXP-04]` | Nitithorn (YW2) | Long valid text without spaces widened the page | Minor / Minor | Fixed | PR #43 → `00009-bwv` | PASS — NK2 (867 px), YW3 (375–1280 px) |
| #45 `[YW3-01]` | Nitithorn (YW3) | The #42 fix (`overflow-wrap: anywhere` on `body`) split short words mid-word on phones and in tables | Minor / Minor | First a documented limitation (deferred), then fixed | PR #47 → `aa27be0`, `s87d9c6b4-00010-5tn` | PASS — YW4 (Nitithorn, 28 Nov 19:31–19:35 ICT) |

The partner also accepted YW-EX-01..06 as agreed cases (their PR #46); YW-EX-02 step 4 and YW-EX-06
step 3 were re-run in YW4: PASS.

## 4. Our decision on CPMS

| When | Release | Decision | Reason |
|---|---|---|---|
| 28 Nov 14:05 ICT | `fd2ff1d`, `s87d9c6b4-00009-bwv` | Accepted with minor limitations | All six corrections PASS (NK2, YW3); new minor #45 documented as a limitation and accepted as such by the partner |
| **28 Nov 19:38 ICT** | **`aa27be0`, `s87d9c6b4-00010-5tn`** | **Accepted** | #45 fixed and re-tested PASS (YW4); no open defect or limitation |

Both decisions are signed by Nitithorn Ketkaew and Nara Kosiyaporn (comments on partner Issues #42 and #45;
team chat 14:05 and 19:39 ICT). The NK2 comments of 12:50 ICT also stated "Accepted"; they were posted
before the YW3 check and are marked as superseded on each Issue.
