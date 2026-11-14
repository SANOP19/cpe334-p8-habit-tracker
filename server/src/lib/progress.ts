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

export function percentOf(value: number, dailyTarget: number): number {
  // The tiny epsilon absorbs floating-point error such as 0.1 * 3 = 0.30000000000000004.
  return Math.floor((value / dailyTarget) * 1000 + 1e-9) / 10;
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
