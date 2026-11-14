import type { ReactNode } from "react";

export type Role = "PARTICIPANT" | "PROGRAM_MANAGER";
export type Page = "signin" | "templates" | "goals";
export interface NavItem {
  page: Page;
  label: string;
}

// Stub: implemented after the failing tests are recorded.
export function navItemsFor(_role: Role | null): NavItem[] {
  return [];
}

export function Layout(_props: {
  role: Role | null;
  active: Page;
  onNavigate: (page: Page) => void;
  children: ReactNode;
}) {
  return null;
}
