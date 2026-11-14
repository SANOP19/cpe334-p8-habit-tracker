import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { AppError } from "../middlewares/error-handler.js";

// F-03 Goal setting — docs/sprints/sprint-1/F-03-goals.md
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

const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const isPositiveInteger = (value: unknown): value is number => Number.isInteger(value) && (value as number) > 0;

const duplicateGoal = () =>
  new AppError(409, "DUPLICATE_ACTIVE_GOAL", "You already have an active goal for this activity.");
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
