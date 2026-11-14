import { useEffect, useState, type FormEvent } from "react";
import { apiRequest, ApiError } from "../api";
import type { ActivityTemplate, Goal } from "../types";
import type { Role } from "./Layout";
import { ErrorMessage } from "./ErrorMessage";
import { EmptyState } from "./EmptyState";
import { Loading } from "./Loading";

// F-02 Activity Template Management — docs/sprints/sprint-1/F-02-templates.md §4
export function TemplatesPage({ role }: { role: Role }) {
  const [templates, setTemplates] = useState<ActivityTemplate[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states (Manager only)
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiRequest<{ templates: ActivityTemplate[] }>("/api/templates")
      .then((data) => {
        if (active) {
          setTemplates(data.templates);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof ApiError ? err.message : "Failed to load activity templates.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const min = Number(minValue);
    const max = Number(maxValue);

    if (min >= max) {
      setFormError("minValue must be strictly less than maxValue.");
      setSubmitting(false);
      return;
    }

    try {
      const { template } = await apiRequest<{ template: ActivityTemplate }>("/api/templates", {
        method: "POST",
        body: {
          name: name.trim(),
          unit: unit.trim(),
          minValue: min,
          maxValue: max,
        },
      });

      setTemplates((prev) => (prev ? [template, ...prev] : [template]));
      setName("");
      setUnit("");
      setMinValue("");
      setMaxValue("");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Failed to create activity template.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePublish(id: number) {
    setPublishingId(id);
    try {
      const { template } = await apiRequest<{ template: ActivityTemplate }>(`/api/templates/${id}/publish`, {
        method: "POST",
      });
      setTemplates((prev) =>
        prev ? prev.map((t) => (t.id === id ? { ...t, status: template.status } : t)) : []
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to publish activity template.");
    } finally {
      setPublishingId(null);
    }
  }

  if (loading) {
    return <Loading label="Loading templates" />;
  }

  const isManager = role === "PROGRAM_MANAGER";

  return (
    <div>
      <h1 className="h4 mb-4">Activity Templates</h1>
      <ErrorMessage message={error} />

      {isManager && (
        <div className="card mb-4">
          <div className="card-header">
            <strong>Create activity template</strong>
          </div>
          <div className="card-body">
            <ErrorMessage message={formError} />
            <form onSubmit={handleCreate}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label htmlFor="template-name" className="form-label">
                    Template name
                  </label>
                  <input
                    id="template-name"
                    type="text"
                    className="form-control"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Daily Steps"
                  />
                </div>
                <div className="col-md-6">
                  <label htmlFor="template-unit" className="form-label">
                    Unit
                  </label>
                  <input
                    id="template-unit"
                    type="text"
                    className="form-control"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="e.g. steps, ml, pages"
                  />
                </div>
                <div className="col-md-6">
                  <label htmlFor="template-min" className="form-label">
                    Minimum value
                  </label>
                  <input
                    id="template-min"
                    type="number"
                    step="any"
                    className="form-control"
                    required
                    value={minValue}
                    onChange={(e) => setMinValue(e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label htmlFor="template-max" className="form-label">
                    Maximum value
                  </label>
                  <input
                    id="template-max"
                    type="number"
                    step="any"
                    className="form-control"
                    required
                    value={maxValue}
                    onChange={(e) => setMaxValue(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-3 d-flex align-items-center gap-2">
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  Create template
                </button>
                {submitting && <Loading label="Creating template" />}
              </div>
            </form>
          </div>
        </div>
      )}

      {templates && templates.length === 0 ? (
        <EmptyState
          message={
            isManager
              ? "No templates yet. Create your first template above."
              : "No published activity templates available."
          }
        />
      ) : (
        <div className="row g-3">
          {templates?.map((t) => (
            <div className="col-md-6" key={t.id}>
              <div className="card h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h5 className="card-title mb-0">{t.name}</h5>
                    {isManager && (
                      <span
                        className={`badge ${
                          t.status === "PUBLISHED" ? "text-bg-success" : "text-bg-secondary"
                        }`}
                      >
                        {t.status}
                      </span>
                    )}
                  </div>
                  <p className="card-text text-muted mb-2">
                    Target range: {t.minValue} – {t.maxValue} {t.unit}
                  </p>
                  {!isManager && <SetGoalForm template={t} />}
                  {isManager && t.status === "DRAFT" && (
                    <button
                      type="button"
                      className="btn btn-outline-success btn-sm"
                      onClick={() => handlePublish(t.id)}
                      disabled={publishingId === t.id}
                    >
                      {publishingId === t.id ? "Publishing..." : "Publish"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// F-03: participant sets a daily goal from a published template — docs/sprints/sprint-1/F-03-goals.md §4
function SetGoalForm({ template }: { template: ActivityTemplate }) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const inputId = `goal-target-${template.id}`;

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiRequest<{ goal: Goal }>("/api/goals", {
        method: "POST",
        body: { templateId: template.id, dailyTarget: Number(target) },
      });
      setSaved(true);
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save the goal.");
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return <p className="text-success mb-0">Goal saved.</p>;
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => setOpen(true)}>
        Set goal
      </button>
    );
  }

  return (
    <form onSubmit={handleSave} className="mt-2">
      <ErrorMessage message={error} />
      <label htmlFor={inputId} className="form-label">
        Daily target ({template.unit})
      </label>
      <input
        id={inputId}
        type="number"
        step="any"
        min={template.minValue}
        max={template.maxValue}
        required
        className="form-control mb-2"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
      />
      <div className="d-flex align-items-center gap-2">
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
          Save goal
        </button>
        <button type="button" className="btn btn-link btn-sm" onClick={() => setOpen(false)} disabled={saving}>
          Cancel
        </button>
        {saving && <Loading label="Saving goal" />}
      </div>
    </form>
  );
}
