// Thin wrapper around fetch for the project API.
// Every server error has the shape { error: { code, message } } (docs/project-brief.md §8).
// The client never sends a user ID or role; the server identifies the user from the session cookie.

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
}

const GENERIC_MESSAGE = "Something went wrong. Please try again.";

export async function apiRequest<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const init: RequestInit & { headers: Record<string, string> } = {
    method: options.method ?? "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  };
  if (options.body !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Cannot reach the server. Check your connection and try again.");
  }

  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => undefined);

  if (!response.ok) {
    const error = (data as { error?: { code?: unknown; message?: unknown } } | undefined)?.error;
    if (error && typeof error.code === "string" && typeof error.message === "string") {
      throw new ApiError(response.status, error.code, error.message);
    }
    throw new ApiError(response.status, "UNKNOWN_ERROR", GENERIC_MESSAGE);
  }

  return data as T;
}
