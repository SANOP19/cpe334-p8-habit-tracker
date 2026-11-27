// F-05 progress calculation (decision D-08) — docs/sprints/sprint-1/F-05-progress-privacy.md §1.2
// percent = value ÷ dailyTarget × 100, truncated (not rounded) to one decimal and not capped,
// so 100% is only ever shown when the target is actually met.

export interface ProgressDay {
  entryDate: string;
  value: number;
  percent: number;
  achieved: boolean;
}

export interface ProgressSummary {
  entriesCount: number;
  achievedCount: number;
  days: ProgressDay[];
}

// Relative tolerance for floating-point noise: 0.3 / 0.1 is 2.9999999999999996 in binary, so without it
// truncation would give 299.9 instead of 300. It is relative (not a fixed 1e-9) so that a real value just
// below a 0.1 step, such as 9.99999999999 of 10, is still truncated (Lab 6 Issue #87).
const NOISE = 1e-14;

export function percentOf(value: number, dailyTarget: number): number {
  const tenths = (value / dailyTarget) * 1000;
  const percent = Math.floor(tenths + Math.abs(tenths) * NOISE) / 10;
  // D-08: 100% or more only when the target is met, and at least 100% when it is met.
  return value < dailyTarget ? Math.min(percent, 99.9) : Math.max(percent, 100);
}

export function calculateProgress(
  dailyTarget: number,
  entries: Array<{ entryDate: string; value: number }>,
): ProgressSummary {
  const days = entries
    .map((e) => ({
      entryDate: e.entryDate,
      value: e.value,
      percent: percentOf(e.value, dailyTarget),
      achieved: e.value >= dailyTarget,
    }))
    .sort((a, b) => (a.entryDate < b.entryDate ? 1 : a.entryDate > b.entryDate ? -1 : 0));

  return {
    entriesCount: days.length,
    achievedCount: days.filter((d) => d.achieved).length,
    days,
  };
}
