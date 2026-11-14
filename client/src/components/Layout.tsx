import type { ReactNode } from "react";

export type Role = "PARTICIPANT" | "PROGRAM_MANAGER";
export type Page = "signin" | "templates" | "goals";
export interface NavItem {
  page: Page;
  label: string;
}

// Navigation follows the role matrix in docs/project-brief.md §6.
// Hiding a link is only a convenience; the server enforces every permission.
export function navItemsFor(role: Role | null): NavItem[] {
  if (role === null) return [{ page: "signin", label: "Sign in" }];
  if (role === "PARTICIPANT") {
    return [
      { page: "templates", label: "Templates" },
      { page: "goals", label: "Goals" },
    ];
  }
  return [{ page: "templates", label: "Templates" }];
}

export const ROLE_LABELS: Record<Role, string> = {
  PARTICIPANT: "Participant",
  PROGRAM_MANAGER: "Program Manager",
};

export function Layout({
  role,
  active,
  onNavigate,
  children,
  displayName,
  onSignOut,
}: {
  role: Role | null;
  active: Page;
  onNavigate: (page: Page) => void;
  children: ReactNode;
  /** Shown with the role label and a Sign out button when the user is signed in (F-01). */
  displayName?: string;
  onSignOut?: () => void;
}) {
  return (
    <>
      <nav className="navbar navbar-expand bg-body-tertiary border-bottom">
        <div className="container">
          <span className="navbar-brand">Habit Tracker</span>
          <ul className="navbar-nav me-auto">
            {navItemsFor(role).map((item) => (
              <li className="nav-item" key={item.page}>
                <button
                  type="button"
                  className={`nav-link btn btn-link${item.page === active ? " active" : ""}`}
                  aria-current={item.page === active ? "page" : undefined}
                  onClick={() => onNavigate(item.page)}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
          {role && displayName && (
            <div className="d-flex align-items-center gap-2">
              <span className="fw-semibold">{displayName}</span>
              <span className="badge text-bg-secondary">{ROLE_LABELS[role]}</span>
              {onSignOut && (
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onSignOut}>
                  Sign out
                </button>
              )}
            </div>
          )}
        </div>
      </nav>
      <main className="container py-4">{children}</main>
    </>
  );
}
