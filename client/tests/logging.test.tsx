import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GoalsPage } from "../src/components/GoalsPage";

// F-04 Daily activity logging UI — docs/sprints/sprint-1/F-04-logging.md §4
function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const sampleGoal = {
  id: 7,
  templateId: 3,
  dailyTarget: 20,
  status: "ACTIVE",
  createdAt: "2026-11-14T01:00:00.000Z",
  template: { id: 3, name: "Reading", unit: "pages", minValue: 1, maxValue: 200 },
};

const sampleEntry = {
  id: 101,
  goalId: 7,
  entryDate: "2026-11-14",
  value: 25.5,
  note: "Good progress today",
  createdAt: "2026-11-14T10:00:00.000Z",
};

describe("F-04 Daily activity logging UI", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("TEST-UI-07: participant logs an activity entry and sees it added to the history", async () => {
    let entries = [sampleEntry];

    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "/api/goals") return jsonResponse(200, { goals: [sampleGoal] });
      if (url === "/api/goals/7/entries" && (!init || init.method === "GET")) {
        return jsonResponse(200, { entries });
      }
      if (url === "/api/goals/7/entries" && init?.method === "POST") {
        const body = JSON.parse(init.body as string);
        const newEntry = {
          id: 102,
          goalId: 7,
          entryDate: body.entryDate,
          value: body.value,
          note: body.note || null,
          createdAt: new Date().toISOString(),
        };
        entries = [newEntry, ...entries];
        return jsonResponse(201, { entry: newEntry });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    render(<GoalsPage />);

    // Check goal and initial entry rendered
    expect(await screen.findByText("Reading")).toBeInTheDocument();
    expect(await screen.findByText("25.5 pages")).toBeInTheDocument();
    expect(screen.getByText("Good progress today")).toBeInTheDocument();

    // Fill form to log new entry
    const valueInput = screen.getByLabelText(/amount/i);
    await userEvent.clear(valueInput);
    await userEvent.type(valueInput, "30");

    const noteInput = screen.getByLabelText(/note/i);
    await userEvent.type(noteInput, "Evening session");

    await userEvent.click(screen.getByRole("button", { name: /save entry/i }));

    expect(await screen.findByText("Entry saved.")).toBeInTheDocument();
    expect(await screen.findByText("30 pages")).toBeInTheDocument();
    expect(screen.getByText("Evening session")).toBeInTheDocument();

    const postCall = fetchMock.mock.calls.find(([, init]) => init?.method === "POST")!;
    expect(postCall).toBeDefined();
    const sentBody = JSON.parse(postCall[1].body);
    expect(sentBody.value).toBe(30);
    expect(sentBody.note).toBe("Evening session");
  });

  it("TEST-UI-07: displays server error when logging fails and keeps input values", async () => {
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "/api/goals") return jsonResponse(200, { goals: [sampleGoal] });
      if (url === "/api/goals/7/entries" && (!init || init.method === "GET")) {
        return jsonResponse(200, { entries: [] });
      }
      if (url === "/api/goals/7/entries" && init?.method === "POST") {
        return jsonResponse(422, {
          error: { code: "VALUE_OUT_OF_RANGE", message: "Value must be between 1 and 200 pages." },
        });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    render(<GoalsPage />);

    expect(await screen.findByText("Reading")).toBeInTheDocument();
    const valueInput = screen.getByLabelText(/amount/i);
    await userEvent.type(valueInput, "999");

    await userEvent.click(screen.getByRole("button", { name: /save entry/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Value must be between 1 and 200 pages.");
    expect(screen.getByLabelText(/amount/i)).toHaveValue(999);
  });
});
