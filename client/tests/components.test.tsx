import { render, screen } from "@testing-library/react";
import { Loading } from "../src/components/Loading";
import { EmptyState } from "../src/components/EmptyState";
import { ErrorMessage } from "../src/components/ErrorMessage";

// NFR-07: main screens must be able to show loading, empty and error states.
describe("shared UI states (NFR-07)", () => {
  it("Loading shows an accessible status with its label", () => {
    render(<Loading label="Loading goals" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading goals");
  });

  it("EmptyState shows the message it is given", () => {
    render(<EmptyState message="No goals yet" />);
    expect(screen.getByText("No goals yet")).toBeInTheDocument();
  });

  it("ErrorMessage shows the server message in an alert", () => {
    render(<ErrorMessage message="Value must be between 0 and 20" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Value must be between 0 and 20");
  });

  it("ErrorMessage renders nothing when there is no message", () => {
    const { container } = render(<ErrorMessage message={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
