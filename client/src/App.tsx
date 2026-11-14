import { useEffect, useState } from "react";
import { apiRequest } from "./api";
import type { User } from "./types";
import { Layout, type Page } from "./components/Layout";
import { EmptyState } from "./components/EmptyState";
import { Loading } from "./components/Loading";
import { SignInPage } from "./components/SignInPage";

// App shell. F-01 adds session handling; templates (F-02) and goals (F-03..F-05) replace the placeholders.
export function App() {
  // undefined = still asking the server; null = not signed in
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [page, setPage] = useState<Page>("templates");

  useEffect(() => {
    let active = true;
    apiRequest<{ user: User }>("/api/auth/me")
      .then(({ user }) => active && setUser(user))
      .catch(() => active && setUser(null));
    return () => {
      active = false;
    };
  }, []);

  async function signOut() {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } catch {
      // Even if the request fails, show Sign in; the server session expires on its own.
    }
    setUser(null);
  }

  if (user === undefined) {
    return (
      <main className="container py-4">
        <Loading label="Loading" />
      </main>
    );
  }

  if (user === null) {
    return (
      <main className="container py-5">
        <SignInPage
          onSignedIn={(signedIn) => {
            setUser(signedIn);
            setPage("templates");
          }}
        />
      </main>
    );
  }

  return (
    <Layout
      role={user.role}
      active={page}
      onNavigate={setPage}
      displayName={user.displayName}
      onSignOut={signOut}
    >
      <h1 className="h4">{page === "goals" ? "Goals" : "Templates"}</h1>
      <EmptyState message="This page is added in a later part." />
    </Layout>
  );
}
