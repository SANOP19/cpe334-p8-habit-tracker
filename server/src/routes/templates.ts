import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { AppError } from "../middlewares/error-handler.js";
import { isDbId } from "../lib/db-id.js";

// F-02 Activity Template Management — docs/sprints/sprint-1/F-02-templates.md
export const templatesRouter = Router();

// GET /api/templates — participant sees PUBLISHED; manager sees own templates (AC-11)
templatesRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const user = req.user!;
    const where =
      user.role === "PARTICIPANT"
        ? { status: "PUBLISHED" as const }
        : { createdById: user.id };

    const templates = await prisma.activityTemplate.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json({ templates });
  } catch (err) {
    next(err);
  }
});

// POST /api/templates — manager creates draft template (AC-07, AC-08, AC-09)
templatesRouter.post("/", requireAuth, requireRole("PROGRAM_MANAGER"), async (req, res, next) => {
  try {
    const { name, unit, minValue, maxValue } = req.body ?? {};
    const details: Array<{ field: string; message: string }> = [];

    if (typeof name !== "string" || name.trim() === "") {
      details.push({ field: "name", message: "Required" });
    }
    if (typeof unit !== "string" || unit.trim() === "") {
      details.push({ field: "unit", message: "Required" });
    }

    const isFiniteNumber = (val: unknown): val is number =>
      typeof val === "number" && Number.isFinite(val);

    if (!isFiniteNumber(minValue)) {
      details.push({ field: "minValue", message: "Must be a finite number" });
    }
    if (!isFiniteNumber(maxValue)) {
      details.push({ field: "maxValue", message: "Must be a finite number" });
    }

    if (details.length > 0) {
      throw new AppError(422, "VALIDATION_ERROR", "All template fields are required and must be valid numbers.", details);
    }

    const min = minValue as number;
    const max = maxValue as number;

    // F-02 v1.2 (Lab 6 Issue #86): a non-negative minimum, checked first, so that with min < max every template
    // has a range in which a positive daily target (F-03, BR-08) is possible.
    if (min < 0) {
      throw new AppError(422, "INVALID_RANGE", "minValue must be 0 or more.", [
        { field: "minValue", message: "Must be 0 or more" },
      ]);
    }

    if (min >= max) {
      throw new AppError(422, "INVALID_RANGE", "minValue must be strictly less than maxValue.", [
        { field: "minValue", message: "Must be strictly less than maxValue" },
        { field: "maxValue", message: "Must be strictly greater than minValue" },
      ]);
    }

    const template = await prisma.activityTemplate.create({
      data: {
        name: (name as string).trim(),
        unit: (unit as string).trim(),
        minValue: min,
        maxValue: max,
        status: "DRAFT",
        createdById: req.user!.id,
      },
    });

    res.status(201).json({ template });
  } catch (err) {
    next(err);
  }
});

// POST /api/templates/:id/publish — manager publishes own draft template (AC-10, AC-30, AC-31)
templatesRouter.post("/:id/publish", requireAuth, requireRole("PROGRAM_MANAGER"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!isDbId(id)) {
      throw new AppError(404, "NOT_FOUND", "Template not found.");
    }

    const template = await prisma.activityTemplate.findUnique({
      where: { id },
    });

    // Privacy isolation (AC-30): non-existent or other manager's template returns 404
    if (!template || template.createdById !== req.user!.id) {
      throw new AppError(404, "NOT_FOUND", "Template not found.");
    }

    // Idempotency check (AC-31): already published returns 409
    if (template.status === "PUBLISHED") {
      throw new AppError(409, "ALREADY_PUBLISHED", "Template is already published.");
    }

    const updated = await prisma.activityTemplate.update({
      where: { id },
      data: { status: "PUBLISHED" },
    });

    res.status(200).json({ template: updated });
  } catch (err) {
    next(err);
  }
});
