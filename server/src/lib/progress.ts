// Stub: implemented after the failing tests are recorded (F-05).
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

export function calculateProgress(
  _dailyTarget: number,
  _entries: Array<{ entryDate: string; value: number }>,
): ProgressSummary {
  return { entriesCount: 0, achievedCount: 0, days: [] };
}
