import { apiRequest, ApiError } from "../src/api";

// The server returns every error as { error: { code, message } } (project brief §8, NFR-05).
function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("apiRequest", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the parsed JSON body on success", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { status: "ok" }));
    await expect(apiRequest("/api/health")).resolves.toEqual({ status: "ok" });
  });

  it("sends the session cookie and a JSON body", async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { id: 1 }));
    await apiRequest("/api/goals", { method: "POST", body: { templateId: 1, dailyTarget: 5 } });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/goals");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ templateId: 1, dailyTarget: 5 });
  });

  it("turns a 4xx error body into an ApiError with status, code and message", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(422, { error: { code: "VALUE_OUT_OF_RANGE", message: "Value must be between 0 and 20" } }),
    );

    const error = await apiRequest("/api/goals/1/entries", { method: "POST", body: {} }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(422);
    expect(error.code).toBe("VALUE_OUT_OF_RANGE");
    expect(error.message).toBe("Value must be between 0 and 20");
  });

  it("uses a generic error when the body is not the expected shape", async () => {
    fetchMock.mockResolvedValue(new Response("Internal Server Error", { status: 500 }));

    const error = await apiRequest("/api/health").catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(500);
    expect(error.code).toBe("UNKNOWN_ERROR");
    expect(error.message).toBe("Something went wrong. Please try again.");
  });

  it("reports a network failure as an ApiError", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    const error = await apiRequest("/api/health").catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
    expect(error.code).toBe("NETWORK_ERROR");
  });

  it("returns undefined for 204 No Content", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(apiRequest("/api/auth/logout", { method: "POST" })).resolves.toBeUndefined();
  });
});
