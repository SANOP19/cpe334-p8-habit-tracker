import type { Role } from "./components/Layout";

// Current user as returned by the API (never contains a password hash or token).
export interface User {
  id: number;
  email: string;
  displayName: string;
  role: Role;
}

export type TemplateStatus = "DRAFT" | "PUBLISHED";

export interface ActivityTemplate {
  id: number;
  name: string;
  unit: string;
  minValue: number;
  maxValue: number;
  status: TemplateStatus;
  createdById: number;
  createdAt: string;
}

export interface Goal {
  id: number;
  templateId: number;
  dailyTarget: number;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
  createdAt: string;
  template: Pick<ActivityTemplate, "id" | "name" | "unit" | "minValue" | "maxValue">;
}

export interface ActivityEntry {
  id: number;
  goalId: number;
  entryDate: string;
  value: number;
  note: string | null;
  createdAt: string;
}

// F-05: progress returned by GET /api/goals/:id/progress
export interface GoalProgress {
  goalId: number;
  dailyTarget: number;
  unit: string;
  entriesCount: number;
  achievedCount: number;
  days: Array<{ entryDate: string; value: number; percent: number; achieved: boolean }>;
}
