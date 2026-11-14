import { useEffect, useState } from "react";
import { apiRequest, ApiError } from "../api";
import type { Goal } from "../types";
import { EmptyState } from "./EmptyState";
import { ErrorMessage } from "./ErrorMessage";
import { Loading } from "./Loading";

// F-03: the participant's own goals — docs/sprints/sprint-1/F-03-goals.md §4
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
              <div className="card h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h5 className="card-title mb-0">{g.template.name}</h5>
                    <span className="badge text-bg-primary">{g.status}</span>
                  </div>
                  <p className="card-text mb-0">
                    Daily target: {g.dailyTarget} {g.template.unit}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
