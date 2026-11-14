// Stub: implemented after the failing tests are recorded.
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
}

export async function apiRequest<T = unknown>(_path: string, _options: RequestOptions = {}): Promise<T> {
  throw new Error("not implemented");
}
