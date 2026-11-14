# Feature Contract — F-01 Authentication and Session

| Version | Date | Author | Reviewer | Change |
|---|---|---|---|---|
| 1.0 | 2026-11-14 | Nitithorn Ketkaew | Nara Kosiyaporn | Contract written before implementation (PR2, Issue #17) |

**Requirements:** FR-01, FR-02, FR-03 · NFR-01, NFR-02, NFR-03 · decisions D-02, D-10, D-11
**Acceptance criteria:** AC-01..AC-06, AC-33
**Depends on:** server foundation (P1, PR #12: `users` and `sessions` tables, error handler, test harness), client foundation (P2, PR #9: `Layout`, `apiRequest`, shared states)
**Used by:** F-02..F-05 use `requireAuth` and `requireRole` from this feature.

---

## 1. Feature design (feature-level SDS)

### 1.1 Behaviour and workflow
1. **Sign in.** The user submits email and password. The server finds the user by email and checks the password with bcrypt. On success it creates a session and returns the user; on failure it returns one generic message.
2. **Current user.** On every page load the client calls `GET /api/auth/me`. With a valid session the server returns the user; otherwise 401 and the client shows Sign in.
3. **Sign out.** The client calls `POST /api/auth/logout`. The server deletes the session row and clears the cookie. The old cookie no longer works.
4. **Every later protected endpoint** passes through `requireAuth` (step 1 of the order of checks, SDS §5.3) and, where needed, `requireRole` (step 2).

### 1.2 Session lifecycle (D-11, SDS §3)
- Token: 32 random bytes from `crypto.randomBytes`, hex-encoded, sent only in the cookie.
- Stored: `sessions.tokenHash = SHA-256(token)` (hex), `userId`, `expiresAt = now + SESSION_TTL_HOURS` (default 24). The plain token is never stored or logged.
- Cookie: name `session`; `HttpOnly`; `SameSite=Lax`; `Secure` when `NODE_ENV=production`; `Path=/`; `Max-Age = SESSION_TTL_HOURS × 3600`.
- Lookup: hash the cookie value, find the session, require `expiresAt > now`. An expired session is deleted and the cookie is cleared in the 401 response.
- Logout deletes the session row and sends the cookie with `Max-Age=0`.
- Fixed expiry: activity does not extend a session.

### 1.3 Business rules and validation
| Rule | Behaviour |
|---|---|
| Login body | `email` and `password` must be non-empty strings → otherwise 422 `VALIDATION_ERROR` with `details` per field. Email is compared case-insensitively (trimmed, lower-cased). |
| Wrong password or unknown email | 401 `INVALID_CREDENTIALS`, message "Email or password is incorrect." for both cases; no session created; no cookie set. When the email is unknown the server still runs one bcrypt comparison so the response time does not reveal whether the account exists. |
| No / invalid / expired / signed-out session | 401 `UNAUTHENTICATED`, message "Please sign in." |
| Wrong role (`requireRole`) | 403 `FORBIDDEN`, message "You do not have permission to do this." |
| Response bodies | Never contain `passwordHash`, the token or the token hash. |
| Password hashing | bcrypt, cost 10. In Sprint 1 passwords are only created by the seed (no registration), so `BCRYPT_ROUNDS` is not introduced; SDS §3.1/§4.1 are updated in this PR. |

### 1.4 Permissions
| Endpoint | Not signed in | Participant | Program Manager |
|---|---|---|---|
| `POST /api/auth/login` | allowed | allowed | allowed |
| `POST /api/auth/logout` | 401 | own session | own session |
| `GET /api/auth/me` | 401 | self | self |

### 1.5 Failure and boundary cases
- Cookie present but not in the database (forged or already logged out) → 401.
- Session exactly at or after `expiresAt` → 401 (expired means `expiresAt <= now`).
- Logout twice with the same cookie → second call 401 (session no longer exists).
- Two sessions for the same user (two browsers) are independent; logging out one does not end the other.

---

## 2. API specification

### `POST /api/auth/login`
Request: `{ "email": "participant@example.test", "password": "<password>" }`
| Status | Body | Notes |
|---|---|---|
| 200 | `{ "user": { "id": 2, "email": "participant@example.test", "displayName": "Alex Student", "role": "PARTICIPANT" } }` | `Set-Cookie: session=<token>; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400` |
| 401 | `{ "error": { "code": "INVALID_CREDENTIALS", "message": "Email or password is incorrect." } }` | no cookie |
| 422 | `{ "error": { "code": "VALIDATION_ERROR", "message": "Email and password are required.", "details": [{ "field": "email", "message": "Required" }] } }` | |

### `GET /api/auth/me`
| Status | Body |
|---|---|
| 200 | `{ "user": { "id", "email", "displayName", "role" } }` |
| 401 | `{ "error": { "code": "UNAUTHENTICATED", "message": "Please sign in." } }` |

### `POST /api/auth/logout`
| Status | Body |
|---|---|
| 204 | empty; `Set-Cookie: session=; Max-Age=0` |
| 401 | `UNAUTHENTICATED` |

### Server modules (for later features)
- `requireAuth` — sets `req.user = { id, email, displayName, role }` or responds 401.
- `requireRole(...roles)` — after `requireAuth`; responds 403 when `req.user.role` is not listed.

---

## 3. Data
No schema change. Uses `users` and `sessions` from the P1 migration (`tokenHash` unique, `userId` → `users` with cascade delete, `expiresAt`).

## 4. UI specification
| Screen / element | Behaviour |
|---|---|
| Sign in page | Email and password fields (both required), "Sign in" button. While waiting: button disabled and `Loading` shown. On 401/422: `ErrorMessage` with the server message; typed email is kept, password cleared. On success: go to Templates. |
| App start | Calls `/api/auth/me`; shows `Loading` until it answers; 401 → Sign in page. |
| Header | When signed in: display name, role label ("Participant" / "Program Manager"), "Sign out" button. Navigation from `navItemsFor(role)`. |
| Sign out | Calls logout, then shows Sign in. If the call fails, the user is still shown Sign in (the server session will expire). |

---

## 5. Acceptance criteria
| AC | Given / When / Then |
|---|---|
| **AC-01** | Given a seeded user, when they sign in with the correct email and password, then the response is 200 with their id, email, displayName and role (no password hash), an HttpOnly `session` cookie is set, and one session row exists whose `tokenHash` is the SHA-256 of the cookie value. |
| **AC-02** | When signing in with a wrong password, or with an email that does not exist, then both responses are 401 `INVALID_CREDENTIALS` with the same message, no cookie is set and no session row is created. Missing email or password → 422 `VALIDATION_ERROR`. |
| **AC-03** | Given two signed-in users, when each calls `GET /api/auth/me` with their own cookie, then each receives their own identity. |
| **AC-04** | When any protected endpoint is called without a cookie or with an unknown cookie, then the response is 401 `UNAUTHENTICATED` and the body contains only the error. *(In this PR: `/api/auth/me`, `/api/auth/logout`. Each later feature PR adds its endpoints to the same test list.)* |
| **AC-05** | Given a signed-in user, when they sign out, then the response is 204, the cookie is cleared, the session row is deleted, and `GET /api/auth/me` with the old cookie returns 401. |
| **AC-06** | Given the seed has run with passwords from the environment, then each stored `passwordHash` is a bcrypt hash that is not equal to the password, and signing in with that password succeeds. |
| **AC-33** | Given a session whose `expiresAt` is in the past, when `GET /api/auth/me` is called with its cookie, then the response is 401 and the session row is removed. |
| (role check) | `requireRole("PROGRAM_MANAGER")` rejects a participant with 403 `FORBIDDEN` and lets a program manager through. Verified here as a unit test; used by AC-09, AC-16, AC-26, AC-32. |

## 6. Software Test Specification
| Test | AC | Level | Precondition / input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-01 | AC-01 | API + DB | Participant in DB with known password | `POST /api/auth/login` with correct credentials | 200; `user` has id/email/displayName/role and no `passwordHash`; `Set-Cookie` has `session`, `HttpOnly`, `SameSite=Lax`; one `sessions` row with `tokenHash = sha256(cookie)` and `expiresAt` ≈ now + 24 h |
| TEST-02a | AC-02 | API + DB | Same user | Login with wrong password | 401 `INVALID_CREDENTIALS`; no cookie; 0 session rows |
| TEST-02b | AC-02 | API + DB | — | Login with unknown email | 401, same code and message as TEST-02a; no cookie; 0 session rows |
| TEST-02c | AC-02 | API | — | Login with missing email, then missing password | 422 `VALIDATION_ERROR` with `details` |
| TEST-03 | AC-03 | API + DB | Participant and manager both signed in | `GET /api/auth/me` with each cookie | Each response returns its own user and role |
| TEST-04 | AC-04 | API | No cookie; then cookie `session=not-a-real-token` | Call every protected endpoint in the list | 401 `UNAUTHENTICATED`; body has only `error` |
| TEST-05 | AC-05 | API + DB | Signed-in participant | `POST /api/auth/logout`, then `GET /api/auth/me` with the old cookie, then logout again | 204 with cleared cookie; 0 session rows; `/me` 401; second logout 401 |
| TEST-06 | AC-06 | Integration | Seed run with `SEED_*_PASSWORD` set | Read `users.passwordHash`; then login with the seed password | Hash matches bcrypt format and ≠ password; login 200 |
| TEST-33 | AC-33 | API + DB | Signed-in user; set `expiresAt` to one second in the past | `GET /api/auth/me` | 401 `UNAUTHENTICATED`; session row deleted |
| TEST-R1 | role check | Unit | Fake request with participant / manager user | Call `requireRole("PROGRAM_MANAGER")` | Participant → next(error 403 `FORBIDDEN`); manager → next() |
| TEST-UI-01 | AC-01, AC-02 (UI) | Component | `fetch` mocked | Submit sign-in form: success, then 401 | Success calls `onSignedIn` with the user; 401 shows "Email or password is incorrect." and keeps the email |
| TEST-UI-02 | AC-03, AC-05 (UI) | Component | `fetch` mocked | Render App with `/me` 401, then 200; click Sign out | 401 → Sign in page; 200 → header shows name and role; Sign out → Sign in page |

**TDD:** all tests above are committed and run **before** the implementation; the failing run is saved in `docs/evidence/F-01/red-run-*.txt` and the passing run in `docs/evidence/F-01/green-run-*.txt`.

## 7. Feature Definition of Done
- All tests in §6 pass on the PR's last commit; server and client builds pass; earlier tests (P1, P2) still pass.
- Commits in order: contract → failing tests → implementation.
- No password, token or connection string appears in responses, logs, test output or the repository.
- `docs/traceability.md` rows for FR-01..03, NFR-01..03 updated with test files and results.
- SDS §3.1 and §4.1 updated (no `BCRYPT_ROUNDS`).
- Reviewed by Nara, who signs in and out in the browser and checks the cookie flags in the browser dev tools.
