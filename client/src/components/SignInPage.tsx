import { useState, type FormEvent } from "react";
import { apiRequest, ApiError } from "../api";
import type { User } from "../types";
import { ErrorMessage } from "./ErrorMessage";
import { Loading } from "./Loading";

// F-01 sign-in page — docs/sprints/sprint-1/F-01-auth.md §4
export function SignInPage({ onSignedIn }: { onSignedIn: (user: User) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { user } = await apiRequest<{ user: User }>("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });
      onSignedIn(user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setPassword("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto" style={{ maxWidth: 400 }}>
      <h1 className="h4 mb-3">Sign in</h1>
      <ErrorMessage message={error} />
      <form onSubmit={handleSubmit} noValidate={false}>
        <div className="mb-3">
          <label htmlFor="signin-email" className="form-label">
            Email
          </label>
          <input
            id="signin-email"
            type="email"
            className="form-control"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="mb-3">
          <label htmlFor="signin-password" className="form-label">
            Password
          </label>
          <input
            id="signin-password"
            type="password"
            className="form-control"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary w-100" disabled={busy}>
          Sign in
        </button>
        {busy && <Loading label="Signing in" />}
      </form>
    </div>
  );
}
