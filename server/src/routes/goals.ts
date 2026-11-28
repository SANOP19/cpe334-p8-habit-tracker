import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { clock } from "../lib/clock.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { AppError } from "../middlewares/error-handler.js";
import { calculateProgress } from "../lib/progress.js";
import { isDbId } from "../lib/db-id.js";

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
  // Lab 7 CR #99 (F-04 v1.2 §2): correction tracking
  updatedAt: true,
  version: true,
} as const;

// Lab 7 CR #99 (FR-16): the user who made a correction is stored but not returned (always the owner).
const revisionSelect = {
  id: true,
  changedAt: true,
  previousValue: true,
  newValue: true,
  previousNote: true,
  newNote: true,
  reason: true,
} as const;

const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const MAX_NOTE_LENGTH = 500;
const MAX_REASON_LENGTH = 200; // Lab 7 CR #99, BR-13(c)
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
const entryNotFound = () => new AppError(404, "NOT_FOUND", "Entry not found.");
const entryLocked = () =>
  new AppError(422, "ENTRY_LOCKED", "Only entries from today and the past 6 days can be corrected.");
const staleEntry = () =>
  new AppError(409, "STALE_ENTRY", "This entry was changed elsewhere. Reload it and try again.");

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
    // A templateId above the INT4 range cannot exist: same answer as an unknown template (KI-1, #59).
    const template = isDbId(templateId)
      ? await prisma.activityTemplate.findUnique({ where: { id: templateId } })
      : null;
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
    if (!isDbId(id)) throw goalNotFound();

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
    if (!isDbId(goalId)) throw goalNotFound();

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
    // F-04 §2: the optional note must be text; null or absent means no note (Lab 6 KI-5, #63)
    if (note !== undefined && note !== null && typeof note !== "string") {
      details.push({ field: "note", message: "Must be text" });
    }
    // F-04 §1: an optional note of up to 500 characters, counted after trimming (Lab 6 KI-4, #62)
    if (typeof note === "string" && note.trim().length > MAX_NOTE_LENGTH) {
      details.push({ field: "note", message: `Must be at most ${MAX_NOTE_LENGTH} characters` });
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
    if (!isDbId(goalId)) throw goalNotFound();

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

// Lab 7 CR #99 — entry correction with revision history (F-04 v1.2 §1.7; FR-15, FR-16, BR-13).
// Checks 3-4 of §1.7: the goal belongs to the caller and the entry belongs to that goal (404 otherwise).
async function findOwnEntry(userId: number, rawGoalId: string, rawEntryId: string) {
  const goalId = Number(rawGoalId);
  if (!isDbId(goalId)) throw goalNotFound();
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, participantId: userId },
    include: { template: true },
  });
  if (!goal) throw goalNotFound();

  const entryId = Number(rawEntryId);
  if (!isDbId(entryId)) throw entryNotFound();
  const entry = await prisma.activityEntry.findFirst({ where: { id: entryId, goalId }, select: { id: true } });
  if (!entry) throw entryNotFound();
  return { goal, entryId };
}

// Trimmed note; "" and null both mean "no note" (same storage rule as POST).
const normalizeNote = (note: string | null): string | null => {
  if (note === null) return null;
  const trimmed = note.trim();
  return trimmed.length > 0 ? trimmed : null;
};

// PATCH /api/goals/:id/entries/:entryId — FR-15, BR-13 (AC-34..AC-38)
goalsRouter.patch("/:id/entries/:entryId", async (req, res, next) => {
  try {
    // Steps 1-2 are the router guard; steps 3-4:
    const { goal, entryId } = await findOwnEntry(req.user!.id, req.params.id, req.params.entryId);

    // Step 5: body shape
    const body = (req.body ?? {}) as Record<string, unknown>;
    const { value, note, reason, version } = body;
    const details: Array<{ field: string; message: string }> = [];
    if (Object.prototype.hasOwnProperty.call(body, "entryDate")) {
      details.push({ field: "entryDate", message: "Cannot be changed" });
    }
    if (value !== undefined && !isFiniteNumber(value)) {
      details.push({ field: "value", message: "Must be a valid number" });
    }
    if (note !== undefined && note !== null && typeof note !== "string") {
      details.push({ field: "note", message: "Must be text" });
    } else if (typeof note === "string" && note.trim().length > MAX_NOTE_LENGTH) {
      details.push({ field: "note", message: `Must be at most ${MAX_NOTE_LENGTH} characters` });
    }
    if (value === undefined && note === undefined) {
      details.push({ field: "body", message: "Provide value or note" });
    }
    if (typeof reason !== "string" || reason.trim().length < 1 || reason.trim().length > MAX_REASON_LENGTH) {
      details.push({ field: "reason", message: `Must be 1 to ${MAX_REASON_LENGTH} characters` });
    }
    if (!Number.isInteger(version) || (version as number) < 0) {
      details.push({ field: "version", message: "Must be a whole number of 0 or more" });
    }
    if (details.length > 0) {
      throw new AppError(422, "VALIDATION_ERROR", "Invalid correction data.", details);
    }

    const expectedVersion = version as number;
    const oldestAllowed = getOldestAllowedDate(clock.todayBangkok(), 6);

    // Steps 6-9 and the write run in one transaction: the conditional update decides concurrent
    // requests (the second waits for the first, re-reads the row and matches nothing), and the
    // revision is stored only together with a successful update (invariant: revisions = version).
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.activityEntry.findFirst({ where: { id: entryId, goalId: goal.id } });
      if (!current) throw entryNotFound();

      // Step 6: BR-13(a) window
      if (current.entryDate < oldestAllowed) throw entryLocked();

      // Step 7: BR-01 range of the new value
      if (isFiniteNumber(value) && (value < goal.template.minValue || value > goal.template.maxValue)) {
        throw new AppError(
          422,
          "VALUE_OUT_OF_RANGE",
          `Value must be between ${goal.template.minValue} and ${goal.template.maxValue} ${goal.template.unit}.`,
        );
      }

      // Step 8: BR-13(b) latest version only
      if (current.version !== expectedVersion) throw staleEntry();

      // Step 9: BR-13(c) a real change
      const newValue = isFiniteNumber(value) ? value : current.value;
      const newNote = note === undefined ? current.note : normalizeNote(note as string | null);
      if (newValue === current.value && newNote === current.note) {
        throw new AppError(422, "NO_CHANGE", "Nothing to change.");
      }

      const now = clock.now();
      const updated = await tx.activityEntry.updateMany({
        where: { id: entryId, goalId: goal.id, version: expectedVersion, entryDate: { gte: oldestAllowed } },
        data: { value: newValue, note: newNote, version: { increment: 1 }, updatedAt: now },
      });
      if (updated.count === 0) {
        // Changed between the read and the update: report why, store nothing.
        const latest = await tx.activityEntry.findFirst({ where: { id: entryId, goalId: goal.id } });
        if (!latest) throw entryNotFound();
        if (latest.entryDate < oldestAllowed) throw entryLocked();
        throw staleEntry();
      }

      const revision = await tx.activityEntryRevision.create({
        data: {
          entryId,
          previousValue: current.value,
          newValue,
          previousNote: current.note,
          newNote,
          reason: (reason as string).trim(),
          changedById: req.user!.id,
          changedAt: now,
        },
        select: revisionSelect,
      });
      const entry = await tx.activityEntry.findUniqueOrThrow({ where: { id: entryId }, select: entrySelect });
      return { entry, revision };
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/goals/:id/entries/:entryId/revisions — FR-16 (AC-34, AC-37)
goalsRouter.get("/:id/entries/:entryId/revisions", async (req, res, next) => {
  try {
    const { entryId } = await findOwnEntry(req.user!.id, req.params.id, req.params.entryId);
    const revisions = await prisma.activityEntryRevision.findMany({
      where: { entryId },
      orderBy: [{ changedAt: "desc" }, { id: "desc" }],
      select: revisionSelect,
    });
    res.status(200).json({ revisions });
  } catch (err) {
    next(err);
  }
});

// GET /api/goals/:id/progress — F-05 (AC-24..AC-26). Owner only; managers already stopped by the router guard.
goalsRouter.get("/:id/progress", async (req, res, next) => {
  try {
    const goalId = Number(req.params.id);
    if (!isDbId(goalId)) throw goalNotFound();

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
