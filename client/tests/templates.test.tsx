import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TemplatesPage } from "../src/components/TemplatesPage";
import type { ActivityTemplate } from "../src/types";

// TEST-UI-03, TEST-UI-04 — docs/sprints/sprint-1/F-02-templates.md §6
function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const draftTemplate: ActivityTemplate = {
  id: 1,
  name: "Daily Meditation",
  unit: "minutes",
  minValue: 5,
  maxValue: 60,
  status: "DRAFT",
  createdById: 10,
  createdAt: "2026-11-14T10:00:00Z",
};

const publishedTemplate: ActivityTemplate = {
  id: 2,
  name: "Daily Steps",
  unit: "steps",
  minValue: 1000,
  maxValue: 30000,
  status: "PUBLISHED",
  createdById: 10,
  createdAt: "2026-11-14T09:00:00Z",
};

describe("F-02 Activity Template UI", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  describe("TEST-UI-03: Program Manager view", () => {
    it("renders create form, loads templates, and submits a new draft template", async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse(200, { templates: [draftTemplate] }))
        .mockResolvedValueOnce(
          jsonResponse(201, {
            template: {
              id: 3,
              name: "Water Intake",
              unit: "ml",
              minValue: 500,
              maxValue: 4000,
              status: "DRAFT",
              createdById: 10,
              createdAt: "2026-11-14T11:00:00Z",
            },
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse(200, {
            templates: [
              draftTemplate,
              {
                id: 3,
                name: "Water Intake",
                unit: "ml",
                minValue: 500,
                maxValue: 4000,
                status: "DRAFT",
                createdById: 10,
                createdAt: "2026-11-14T11:00:00Z",
              },
            ],
          }),
        );

      render(<TemplatesPage role="PROGRAM_MANAGER" />);

      expect(await screen.findByText("Daily Meditation")).toBeInTheDocument();
      expect(screen.getByText("DRAFT")).toBeInTheDocument();

      await userEvent.type(screen.getByLabelText("Template name"), "Water Intake");
      await userEvent.type(screen.getByLabelText("Unit"), "ml");
      await userEvent.type(screen.getByLabelText("Minimum value"), "500");
      await userEvent.type(screen.getByLabelText("Maximum value"), "4000");

      await userEvent.click(screen.getByRole("button", { name: "Create template" }));

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/templates",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({
              name: "Water Intake",
              unit: "ml",
              minValue: 500,
              maxValue: 4000,
            }),
          }),
        );
      });
    });

    it("displays error message when minValue >= maxValue", async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse(200, { templates: [] }))
        .mockResolvedValueOnce(
          jsonResponse(422, {
            error: {
              code: "INVALID_RANGE",
              message: "minValue must be strictly less than maxValue.",
            },
          }),
        );

      render(<TemplatesPage role="PROGRAM_MANAGER" />);

      expect(await screen.findByText(/no templates/i)).toBeInTheDocument();

      await userEvent.type(screen.getByLabelText("Template name"), "Invalid Range");
      await userEvent.type(screen.getByLabelText("Unit"), "count");
      await userEvent.type(screen.getByLabelText("Minimum value"), "100");
      await userEvent.type(screen.getByLabelText("Maximum value"), "50");

      await userEvent.click(screen.getByRole("button", { name: "Create template" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("minValue must be strictly less than maxValue.");
    });
  });

  describe("TEST-UI-04: Publish action & Participant view", () => {
    it("manager can publish a draft template and see its status change to PUBLISHED", async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse(200, { templates: [draftTemplate] }))
        .mockResolvedValueOnce(
          jsonResponse(200, {
            template: { ...draftTemplate, status: "PUBLISHED" },
          }),
        );

      render(<TemplatesPage role="PROGRAM_MANAGER" />);

      expect(await screen.findByText("Daily Meditation")).toBeInTheDocument();
      const publishBtn = screen.getByRole("button", { name: "Publish" });
      expect(publishBtn).toBeInTheDocument();

      await userEvent.click(publishBtn);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/templates/1/publish",
          expect.objectContaining({ method: "POST" }),
        );
      });

      expect(await screen.findByText("PUBLISHED")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Publish" })).not.toBeInTheDocument();
    });

    it("participant view shows only published templates and no create form or publish button", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { templates: [publishedTemplate] }));

      render(<TemplatesPage role="PARTICIPANT" />);

      expect(await screen.findByText("Daily Steps")).toBeInTheDocument();
      expect(screen.queryByLabelText("Template name")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Create template" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Publish" })).not.toBeInTheDocument();
    });

    it("participant view displays empty state when no published templates exist", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { templates: [] }));

      render(<TemplatesPage role="PARTICIPANT" />);

      expect(await screen.findByText("No published activity templates available.")).toBeInTheDocument();
    });
  });
});
