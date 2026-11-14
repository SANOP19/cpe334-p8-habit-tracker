import type { Role } from "./components/Layout";

// Current user as returned by the API (never contains a password hash or token).
export interface User {
  id: number;
  email: string;
  displayName: string;
  role: Role;
}
