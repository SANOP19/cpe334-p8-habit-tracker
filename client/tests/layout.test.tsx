import { render, screen } from "@testing-library/react";
import { Layout, navItemsFor } from "../src/components/Layout";

// Navigation follows the role matrix (project brief §6). Hiding a link is only convenience:
// the server still enforces every permission.
describe("navigation by role", () => {
  it("shows only Sign in when nobody is signed in", () => {
    expect(navItemsFor(null).map((i) => i.label)).toEqual(["Sign in"]);
  });

  it("shows Templates and Goals to a participant", () => {
    expect(navItemsFor("PARTICIPANT").map((i) => i.label)).toEqual(["Templates", "Goals"]);
  });

  it("shows Templates but not Goals to a program manager", () => {
    expect(navItemsFor("PROGRAM_MANAGER").map((i) => i.label)).toEqual(["Templates"]);
  });

  it("renders the links for the current role and marks the active one", () => {
    render(
      <Layout role="PARTICIPANT" active="goals" onNavigate={() => {}}>
        <p>page body</p>
      </Layout>,
    );
    expect(screen.getByRole("button", { name: "Templates" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Goals" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("button", { name: "Sign in" })).not.toBeInTheDocument();
    expect(screen.getByText("page body")).toBeInTheDocument();
  });
});
