import { useEffect, useState } from "react";
import { apiRequest, ApiError } from "../api";
import type { Goal, ActivityEntry, GoalProgress } from "../types";
import { EmptyState } from "./EmptyState";
import { ErrorMessage } from "./ErrorMessage";
import { Loading } from "./Loading";

// F-03 Goal setting & F-04 Daily activity logging — docs/sprints/sprint-1/F-04-logging.md
function getTodayString(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function getPastDateString(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

interface GoalCardProps {
  goal: Goal;
}

function GoalCard({ goal }: GoalCardProps) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [entryDate, setEntryDate] = useState(getTodayString());
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  // F-05: progress from the server (authoritative calculation); undefined = loading, null = unavailable
  const [progress, setProgress] = useState<GoalProgress | null | undefined>(undefined);
  const [progressVersion, setProgressVersion] = useState(0);

  useEffect(() => {
    let active = true;
    apiRequest<{ progress?: GoalProgress }>(`/api/goals/${goal.id}/progress`)
      .then((data) => {
        if (active) setProgress(data?.progress && Array.isArray(data.progress.days) ? data.progress : null);
      })
      .catch(() => {
        if (active) setProgress(null);
      });
    return () => {
      active = false;
    };
  }, [goal.id, progressVersion]);

  useEffect(() => {
    let active = true;
    apiRequest<{ entries: ActivityEntry[] }>(`/api/goals/${goal.id}/entries`)
      .then((data) => {
        if (active && Array.isArray(data?.entries)) {
          setEntries(data.entries);
        }
      })
      .catch(() => {
        // Non-blocking error: goal details are still visible
      })
      .finally(() => {
        if (active) setLoadingEntries(false);
      });
    return () => {
      active = false;
    };
  }, [goal.id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);

    const numValue = Number(value);
    if (!value || isNaN(numValue)) {
      setSaveError("Please enter a valid amount.");
      return;
    }

    setSaving(true);
    try {
      const res = await apiRequest<{ entry: ActivityEntry }>(`/api/goals/${goal.id}/entries`, {
        method: "POST",
        body: {
          entryDate,
          value: numValue,
          note: note.trim() || undefined,
        },
      });

      setSaveSuccess(true);
      setValue("");
      setNote("");
      setEntries((prev) => [res.entry, ...prev.filter((item) => item.entryDate !== res.entry.entryDate)]);
      setProgressVersion((v) => v + 1);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Failed to record activity.");
    } finally {
      setSaving(false);
    }
  }

  const progressByDate = new Map((progress?.days ?? []).map((d) => [d.entryDate, d]));
  const todayStr = getTodayString();
  const minDateStr = getPastDateString(6);

  return (
    <div className="card h-100">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h5 className="card-title mb-0">{goal.template.name}</h5>
          <span className="badge text-bg-primary">{goal.status}</span>
        </div>
        <p className="card-text mb-3">
          Daily target: {goal.dailyTarget} {goal.template.unit}
        </p>

        <div className="border-top pt-3 mt-3">
          <h6 className="h6 mb-2">Log activity</h6>
          {saveError && <ErrorMessage message={saveError} />}
          {saveSuccess && <div className="alert alert-success py-1 px-2 mb-2">Entry saved.</div>}

          <form onSubmit={handleSave} className="mb-3">
            <div className="row g-2">
              <div className="col-sm-4">
                <label htmlFor={`date-${goal.id}`} className="form-label small mb-1">
                  Date
                </label>
                <input
                  id={`date-${goal.id}`}
                  type="date"
                  className="form-control form-control-sm"
                  aria-label="Date"
                  value={entryDate}
                  min={minDateStr}
                  max={todayStr}
                  onChange={(e) => setEntryDate(e.target.value)}
                  disabled={saving}
                  required
                />
              </div>
              <div className="col-sm-4">
                <label htmlFor={`amount-${goal.id}`} className="form-label small mb-1">
                  Amount ({goal.template.unit})
                </label>
                <input
                  id={`amount-${goal.id}`}
                  type="number"
                  step="any"
                  className="form-control form-control-sm"
                  aria-label={`Amount (${goal.template.unit})`}
                  placeholder={`${goal.template.minValue} - ${goal.template.maxValue}`}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  disabled={saving}
                  required
                />
              </div>
              <div className="col-sm-4">
                <label htmlFor={`note-${goal.id}`} className="form-label small mb-1">
                  Note (optional)
                </label>
                <input
                  id={`note-${goal.id}`}
                  type="text"
                  className="form-control form-control-sm"
                  aria-label="Note (optional)"
                  placeholder="Optional note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={saving}
                  maxLength={500}
                />
              </div>
            </div>
            <div className="mt-2 text-end">
              <button type="submit" className="btn btn-sm btn-primary" disabled={saving}>
                {saving ? "Saving..." : "Save entry"}
              </button>
            </div>
          </form>

          <h6 className="h6 mb-2">Logged entries</h6>
          {progress && (
            <p className="small mb-2">
              Achieved {progress.achievedCount} of {progress.entriesCount} logged days
            </p>
          )}
          {progress === null && <p className="small text-muted mb-2">Progress is not available right now.</p>}
          {loadingEntries ? (
            <div className="text-muted small">Loading entries...</div>
          ) : entries.length === 0 ? (
            <div className="text-muted small">No entries logged yet.</div>
          ) : (
            <ul className="list-group list-group-flush small">
              {entries.map((entry) => (
                <li key={entry.id} className="list-group-item px-0 py-1 d-flex justify-content-between align-items-center">
                  <div>
                    <span className="fw-semibold me-2">{entry.entryDate}</span>
                    <span>{`${entry.value} ${goal.template.unit}`}</span>
                    {entry.note && <span className="text-muted ms-2">{entry.note}</span>}
                  </div>
                  {progressByDate.has(entry.entryDate) && (
                    <div className="d-flex align-items-center gap-2">
                      <span>{progressByDate.get(entry.entryDate)!.percent}%</span>
                      {progressByDate.get(entry.entryDate)!.achieved && (
                        <span className="badge text-bg-success">Achieved</span>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export function GoalsPage() {
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiRequest<{ goals: Goal[] }>("/api/goals")
      .then(({ goals }) => active && setGoals(goals))
      .catch((err) => active && setError(err instanceof ApiError ? err.message : "Failed to load goals."));
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <div>
        <h1 className="h4 mb-4">My Goals</h1>
        <ErrorMessage message={error} />
      </div>
    );
  }

  if (goals === null) return <Loading label="Loading goals" />;

  return (
    <div>
      <h1 className="h4 mb-4">My Goals</h1>
      {goals.length === 0 ? (
        <EmptyState message="No goals yet. Choose a template on the Templates page to set one." />
      ) : (
        <div className="row g-3">
          {goals.map((g) => (
            <div className="col-md-6" key={g.id}>
              <GoalCard goal={g} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
