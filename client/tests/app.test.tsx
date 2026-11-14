import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../src/App";

// TEST-UI-02 (AC-03, AC-05 in the UI) — docs/sprints/sprint-1/F-01-auth.md §4
function jsonResponse(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const morgan = { id: 2, email: "morgan@example.test", displayName: "Morgan", role: "PROGRAM_MANAGER" };

describe("TEST-UI-02 App session handling", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("shows the Sign in page when /api/auth/me returns 401", async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { error: { code: "UNAUTHENTICATED", message: "Please sign in." } }));
    render(<App />);

    expect(await screen.findByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/auth/me");
  });

  it("shows the user's name and role from /api/auth/me, and returns to Sign in after signing out", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url === "/api/auth/me") return jsonResponse(200, { user: morgan });
      if (url === "/api/templates") return jsonResponse(200, { templates: [] });
      if (url === "/api/auth/logout") return new Response(null, { status: 204 });
      return jsonResponse(404, { error: { code: "NOT_FOUND", message: "Not found" } });
    });
    render(<App />);

    expect(await screen.findByText("Morgan")).toBeInTheDocument();
    expect(screen.getByText("Program Manager")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Goals" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("button", { name: "Sign in" })).toBeInTheDocument();
    const logoutCall = fetchMock.mock.calls.find(([url]) => url === "/api/auth/logout");
    expect(logoutCall).toBeDefined();
    expect(logoutCall![1].method).toBe("POST");
    expect(screen.queryByText("Morgan")).not.toBeInTheDocument();
  });
});
