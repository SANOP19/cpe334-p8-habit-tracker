import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { clock } from "../lib/clock.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { AppError } from "../middlewares/error-handler.js";
import { calculateProgress } from "../lib/progress.js";

// F-03 Goal setting & F-04 Daily activity logging — docs/sprints/sprint-1/F-04-logging.md
export const goalsRouter = Router();

// Steps 1-2 of the order of checks (SDS §5.3): signed in, and a participant (managers get 403 — AC-16, AC-32).
goalsRouter.use(requireAuth, requireRole("PARTICIPANT"));

// Shape returned to the client: never includes participantId (only the caller's own goals are returned).
const goalSelect = {
  id: true,
  templateId: true,
  dailyTarget: true,
  status: true,
  createdAt: true,
  template: { select: { id: true, name: true, unit: true, minValue: true, maxValue: true } },
} as const;

const entrySelect = {
  id: true,
  goalId: true,
  entryDate: true,
  value: true,
  note: true,
  createdAt: true,
} as const;

const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const isPositiveInteger = (value: unknown): value is number => Number.isInteger(value) && (value as number) > 0;

const isValidCalendarDate = (dateStr: unknown): dateStr is string => {
  if (typeof dateStr !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split("-").map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  return dateObj.getUTCFullYear() === y && dateObj.getUTCMonth() === m - 1 && dateObj.getUTCDate() === d;
};

function getOldestAllowedDate(todayStr: string, daysBack = 6): string {
  const [y, m, d] = todayStr.split("-").map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  dateObj.setUTCDate(dateObj.getUTCDate() - daysBack);
  return dateObj.toISOString().slice(0, 10);
}

const duplicateGoal = () =>
  new AppError(409, "DUPLICATE_ACTIVE_GOAL", "You already have an active goal for this activity.");
const duplicateEntry = () =>
  new AppError(409, "DUPLICATE_ENTRY", "An activity entry for this date already exists.");
const goalNotFound = () => new AppError(404, "NOT_FOUND", "Goal not found.");

// POST /api/goals — AC-12..AC-15
goalsRouter.post("/", async (req, res, next) => {
  try {
    const { templateId, dailyTarget } = (req.body ?? {}) as { templateId?: unknown; dailyTarget?: unknown };

    // Step 3: body shape. Other fields (participantId, status, …) are ignored.
    const details: Array<{ field: string; message: string }> = [];
    if (!isPositiveInteger(templateId)) details.push({ field: "templateId", message: "Must be a positive whole number" });
    if (!isFiniteNumber(dailyTarget)) details.push({ field: "dailyTarget", message: "Must be a number" });
    if (details.length > 0) {
      throw new AppError(422, "VALIDATION_ERROR", "Choose a template and enter a daily target.", details);
    }

    // Step 4: template must exist and be published (same answer for both, so drafts are not revealed).
    const template = await prisma.activityTemplate.findUnique({ where: { id: templateId as number } });
    if (!template || template.status !== "PUBLISHED") {
      throw new AppError(422, "TEMPLATE_NOT_PUBLISHED", "This activity is not available for goals.");
    }

    // Step 5: BR-08 — positive and within the template range.
    const target = dailyTarget as number;
    if (target <= 0 || target < template.minValue || target > template.maxValue) {
      throw new AppError(
        422,
        "TARGET_OUT_OF_RANGE",
        `Daily target must be greater than 0 and between ${template.minValue} and ${template.maxValue} ${template.unit}.`,
      );
    }

    // Step 6: BR-09 — one active goal per template (service check + partial unique index for races).
    const existing = await prisma.goal.findFirst({
      where: { participantId: req.user!.id, templateId: template.id, status: "ACTIVE" },
      select: { id: true },
    });
    if (existing) throw duplicateGoal();

    try {
      const goal = await prisma.goal.create({
        data: { participantId: req.user!.id, templateId: template.id, dailyTarget: target },
        select: goalSelect,
      });
      res.status(201).json({ goal });
    } catch (err) {
      if ((err as { code?: string }).code === "P2002") throw duplicateGoal();
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/goals — the caller's own goals only (BR-05)
goalsRouter.get("/", async (req, res, next) => {
  try {
    const goals = await prisma.goal.findMany({
      where: { participantId: req.user!.id },
      orderBy: { createdAt: "desc" },
      select: goalSelect,
    });
    res.status(200).json({ goals });
  } catch (err) {
    next(err);
  }
});

// GET /api/goals/:id — 404 for unknown ids and for other participants' goals (D-10)
goalsRouter.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!isPositiveInteger(id)) throw goalNotFound();

    const goal = await prisma.goal.findFirst({
      where: { id, participantId: req.user!.id },
      select: goalSelect,
    });
    if (!goal) throw goalNotFound();
    res.status(200).json({ goal });
  } catch (err) {
    next(err);
  }
});

// POST /api/goals/:id/entries — F-04 (AC-17..AC-23)
goalsRouter.post("/:id/entries", async (req, res, next) => {
  try {
    const goalId = Number(req.params.id);
    if (!isPositiveInteger(goalId)) throw goalNotFound();

    // Step 3: Goal must exist and belong to the signed-in participant (404 otherwise — BR-05, D-10)
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, participantId: req.user!.id },
      include: { template: true },
    });
    if (!goal) throw goalNotFound();

    // Step 4: Body shape validation
    const { entryDate, value, note } = (req.body ?? {}) as {
      entryDate?: unknown;
      value?: unknown;
      note?: unknown;
    };

    const details: Array<{ field: string; message: string }> = [];
    if (!isValidCalendarDate(entryDate)) {
      details.push({ field: "entryDate", message: "Must be a valid date in YYYY-MM-DD format" });
    }
    if (!isFiniteNumber(value)) {
      details.push({ field: "value", message: "Must be a valid number" });
    }
    if (details.length > 0) {
      throw new AppError(422, "VALIDATION_ERROR", "Invalid entry data.", details);
    }

    const dateStr = entryDate as string;
    const numericValue = value as number;

    // Step 5: Date window rules (BR-02, BR-03, NFR-09)
    const today = clock.todayBangkok();
    const oldestAllowed = getOldestAllowedDate(today, 6);

    if (dateStr > today) {
      throw new AppError(422, "DATE_IN_FUTURE", "Cannot record an activity for a future date.");
    }
    if (dateStr < oldestAllowed) {
      throw new AppError(422, "DATE_TOO_OLD", "Activity can only be recorded for today and up to 6 days in the past.");
    }

    // Step 6: Value range rules (BR-01)
    if (numericValue < goal.template.minValue || numericValue > goal.template.maxValue) {
      throw new AppError(
        422,
        "VALUE_OUT_OF_RANGE",
        `Value must be between ${goal.template.minValue} and ${goal.template.maxValue} ${goal.template.unit}.`,
      );
    }

    // Step 7: Duplicate check (BR-04, NFR-10)
    const existing = await prisma.activityEntry.findUnique({
      where: { goalId_entryDate: { goalId, entryDate: dateStr } },
      select: { id: true },
    });
    if (existing) {
      throw duplicateEntry();
    }

    try {
      const entry = await prisma.activityEntry.create({
        data: {
          goalId,
          entryDate: dateStr,
          value: numericValue,
          note: typeof note === "string" && note.trim().length > 0 ? note.trim() : null,
        },
        select: entrySelect,
      });
      res.status(201).json({ entry });
    } catch (err) {
      if ((err as { code?: string }).code === "P2002") {
        throw duplicateEntry();
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/goals/:id/entries — F-04 (AC-17, AC-23)
goalsRouter.get("/:id/entries", async (req, res, next) => {
  try {
    const goalId = Number(req.params.id);
    if (!isPositiveInteger(goalId)) throw goalNotFound();

    const goal = await prisma.goal.findFirst({
      where: { id: goalId, participantId: req.user!.id },
      select: { id: true },
    });
    if (!goal) throw goalNotFound();

    const entries = await prisma.activityEntry.findMany({
      where: { goalId },
      orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
      select: entrySelect,
    });
    res.status(200).json({ entries });
  } catch (err) {
    next(err);
  }
});

// GET /api/goals/:id/progress — F-05 (AC-24..AC-26). Owner only; managers already stopped by the router guard.
goalsRouter.get("/:id/progress", async (req, res, next) => {
  try {
    const goalId = Number(req.params.id);
    if (!isPositiveInteger(goalId)) throw goalNotFound();

    const goal = await prisma.goal.findFirst({
      where: { id: goalId, participantId: req.user!.id },
      select: {
        id: true,
        dailyTarget: true,
        template: { select: { unit: true } },
        entries: { select: { entryDate: true, value: true } },
      },
    });
    if (!goal) throw goalNotFound();

    const summary = calculateProgress(goal.dailyTarget, goal.entries);
    res.status(200).json({
      progress: { goalId: goal.id, dailyTarget: goal.dailyTarget, unit: goal.template.unit, ...summary },
    });
  } catch (err) {
    next(err);
  }
});
