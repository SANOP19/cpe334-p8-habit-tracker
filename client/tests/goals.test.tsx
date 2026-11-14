import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TemplatesPage } from "../src/components/TemplatesPage";
import { GoalsPage } from "../src/components/GoalsPage";

// F-03 Goal setting UI — docs/sprints/sprint-1/F-03-goals.md §4
function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const reading = {
  id: 3,
  name: "Reading",
  unit: "pages",
  minValue: 1,
  maxValue: 200,
  status: "PUBLISHED",
  createdById: 1,
  createdAt: "2026-11-14T00:00:00.000Z",
};

const goal = {
  id: 7,
  templateId: 3,
  dailyTarget: 20,
  status: "ACTIVE",
  createdAt: "2026-11-14T01:00:00.000Z",
  template: { id: 3, name: "Reading", unit: "pages", minValue: 1, maxValue: 200 },
};

describe("F-03 Goal setting UI", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("TEST-UI-05: participant sets a goal from a published template", async () => {
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "/api/templates") return jsonResponse(200, { templates: [reading] });
      if (url === "/api/goals" && init?.method === "POST") return jsonResponse(201, { goal });
      throw new Error(`unexpected ${url}`);
    });
    render(<TemplatesPage role="PARTICIPANT" />);

    await userEvent.click(await screen.findByRole("button", { name: "Set goal" }));
    const input = screen.getByLabelText("Daily target (pages)");
    expect(input).toHaveAttribute("min", "1");
    expect(input).toHaveAttribute("max", "200");
    await userEvent.type(input, "20");
    await userEvent.click(screen.getByRole("button", { name: "Save goal" }));

    expect(await screen.findByText("Goal saved.")).toBeInTheDocument();
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST")!;
    expect(JSON.parse(post[1].body)).toEqual({ templateId: 3, dailyTarget: 20 });
  });

  it("TEST-UI-05: a rejected goal shows the server message and keeps the typed value", async () => {
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "/api/templates") return jsonResponse(200, { templates: [reading] });
      if (url === "/api/goals" && init?.method === "POST") {
        return jsonResponse(409, {
          error: { code: "DUPLICATE_ACTIVE_GOAL", message: "You already have an active goal for this activity." },
        });
      }
      throw new Error(`unexpected ${url}`);
    });
    render(<TemplatesPage role="PARTICIPANT" />);

    await userEvent.click(await screen.findByRole("button", { name: "Set goal" }));
    await userEvent.type(screen.getByLabelText("Daily target (pages)"), "20");
    await userEvent.click(screen.getByRole("button", { name: "Save goal" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("You already have an active goal for this activity.");
    expect(screen.getByLabelText("Daily target (pages)")).toHaveValue(20);
  });

  it("TEST-UI-05: program managers do not see Set goal", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { templates: [reading] }));
    render(<TemplatesPage role="PROGRAM_MANAGER" />);

    await screen.findByText("Reading");
    expect(screen.queryByRole("button", { name: "Set goal" })).not.toBeInTheDocument();
  });

  it("TEST-UI-06: Goals page shows the empty state when there are no goals", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { goals: [] }));
    render(<GoalsPage />);

    expect(
      await screen.findByText("No goals yet. Choose a template on the Templates page to set one."),
    ).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/goals");
  });

  it("TEST-UI-06: Goals page lists the participant's goals", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { goals: [goal] }));
    render(<GoalsPage />);

    expect(await screen.findByText("Reading")).toBeInTheDocument();
    expect(screen.getByText("Daily target: 20 pages")).toBeInTheDocument();
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
  });

  it("TEST-UI-06: Goals page shows an error when loading fails", async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } }));
    render(<GoalsPage />);

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong. Please try again."));
  });
});
