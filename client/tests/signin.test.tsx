import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignInPage } from "../src/components/SignInPage";

// TEST-UI-01 (AC-01, AC-02 in the UI) — docs/sprints/sprint-1/F-01-auth.md §4
function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const alex = { id: 1, email: "alex@example.test", displayName: "Alex", role: "PARTICIPANT" };

describe("TEST-UI-01 SignInPage", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("posts the credentials and reports the signed-in user", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { user: alex }));
    const onSignedIn = vi.fn();
    render(<SignInPage onSignedIn={onSignedIn} />);

    await userEvent.type(screen.getByLabelText("Email"), "alex@example.test");
    await userEvent.type(screen.getByLabelText("Password"), "secret-pass");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(onSignedIn).toHaveBeenCalledWith(alex));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/auth/login");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ email: "alex@example.test", password: "secret-pass" });
  });

  it("shows the server message on 401, keeps the email and clears the password", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(401, { error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." } }),
    );
    const onSignedIn = vi.fn();
    render(<SignInPage onSignedIn={onSignedIn} />);

    await userEvent.type(screen.getByLabelText("Email"), "alex@example.test");
    await userEvent.type(screen.getByLabelText("Password"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Email or password is incorrect.");
    expect(screen.getByLabelText("Email")).toHaveValue("alex@example.test");
    expect(screen.getByLabelText("Password")).toHaveValue("");
    expect(onSignedIn).not.toHaveBeenCalled();
  });

  it("disables the button while the request is in progress", async () => {
    let resolve!: (r: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>((r) => (resolve = r)));
    render(<SignInPage onSignedIn={() => {}} />);

    await userEvent.type(screen.getByLabelText("Email"), "alex@example.test");
    await userEvent.type(screen.getByLabelText("Password"), "secret-pass");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
    expect(screen.getByRole("status")).toBeInTheDocument();
    resolve(jsonResponse(200, { user: alex }));
  });
});
