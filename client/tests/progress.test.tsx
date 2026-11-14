import { render, screen, within } from "@testing-library/react";
import { GoalsPage } from "../src/components/GoalsPage";

// F-05 progress UI (TEST-UI-08) — docs/sprints/sprint-1/F-05-progress-privacy.md §4
function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const goal = {
  id: 7,
  templateId: 3,
  dailyTarget: 20,
  status: "ACTIVE",
  createdAt: "2026-11-14T01:00:00.000Z",
  template: { id: 3, name: "Reading", unit: "pages", minValue: 1, maxValue: 200 },
};

const entries = [
  { id: 2, goalId: 7, entryDate: "2026-11-14", value: 25, note: null, createdAt: "2026-11-14T10:00:00.000Z" },
  { id: 1, goalId: 7, entryDate: "2026-11-13", value: 10, note: null, createdAt: "2026-11-13T10:00:00.000Z" },
];

const progress = {
  goalId: 7,
  dailyTarget: 20,
  unit: "pages",
  entriesCount: 2,
  achievedCount: 1,
  days: [
    { entryDate: "2026-11-14", value: 25, percent: 125, achieved: true },
    { entryDate: "2026-11-13", value: 10, percent: 50, achieved: false },
  ],
};

describe("TEST-UI-08 progress on the Goals page", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("shows the achieved summary, each entry's percentage and an Achieved badge only when the target was met", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url === "/api/goals") return jsonResponse(200, { goals: [goal] });
      if (url === "/api/goals/7/entries") return jsonResponse(200, { entries });
      if (url === "/api/goals/7/progress") return jsonResponse(200, { progress });
      throw new Error(`unexpected ${url}`);
    });
    render(<GoalsPage />);

    expect(await screen.findByText("Achieved 1 of 2 logged days")).toBeInTheDocument();

    const first = (await screen.findByText("2026-11-14")).closest("li")!;
    expect(within(first).getByText("125%")).toBeInTheDocument();
    expect(within(first).getByText("Achieved")).toBeInTheDocument();

    const second = screen.getByText("2026-11-13").closest("li")!;
    expect(within(second).getByText("50%")).toBeInTheDocument();
    expect(within(second).queryByText("Achieved")).not.toBeInTheDocument();
  });

  it("keeps the card usable and shows a quiet note when progress cannot be loaded", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url === "/api/goals") return jsonResponse(200, { goals: [goal] });
      if (url === "/api/goals/7/entries") return jsonResponse(200, { entries });
      if (url === "/api/goals/7/progress") {
        return jsonResponse(500, { error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } });
      }
      throw new Error(`unexpected ${url}`);
    });
    render(<GoalsPage />);

    expect(await screen.findByText("Progress is not available right now.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save entry" })).toBeInTheDocument();
  });
});
