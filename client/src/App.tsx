import { useState } from "react";
import { Layout, type Page, type Role } from "./components/Layout";
import { EmptyState } from "./components/EmptyState";

// Placeholder shell. Sign-in (F-01), templates (F-02) and goals (F-03..F-05)
// replace these pages in their own parts.
export function App() {
  const [role] = useState<Role | null>(null);
  const [page, setPage] = useState<Page>("signin");

  return (
    <Layout role={role} active={page} onNavigate={setPage}>
      <h1 className="h4">{page === "signin" ? "Sign in" : page === "templates" ? "Templates" : "Goals"}</h1>
      <EmptyState message="This page is added in a later part." />
    </Layout>
  );
}
