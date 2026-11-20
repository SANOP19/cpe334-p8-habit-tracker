# Lab 5 · Deployment guide (HabitPulse, team YaWan, prefix `sf4618437`)

How the Habit Tracker is built, tested, deployed to Google Cloud Run and released. Nothing in this file is secret: secret **names** are listed, values live only in Secret Manager, in local `.env` files (ignored by Git) or in the team's password managers.

## 1. Stack and differences from the reference kit

| Item | Our app | Reference (TokTickIT Starter Kit) |
|---|---|---|
| Runtime | Node 24, Express API + React/Vite client in **one image** (`Dockerfile`, 3 stages: `client-builder`, `server-builder`, `production`). Express serves the built SPA and `/api/*` on port 3000; runs as user `node`. | Same single-image idea |
| Database | PostgreSQL (Cloud SQL `sf4618437-pg`) through Prisma 5 | Same |
| Auth | Session cookie (DB-backed sessions) | Bearer token |
| Cloud resources | Created by the **course portal** (shared project), not by our scripts | `deploy.sh` creates everything |

Decisions that differ from the kit (team plan IDs):
- **D-3 Smoke test login is skipped.** `deploy/smoke_test.py` checks `/api/health`, `/api/ready` (DB) and `/` (HTML). Its optional login check reads a bearer `token` from the login response, but our login sets a cookie, so `SMOKE_EMAIL` / `SMOKE_PASSWORD` are **not** set.
- **D-4 CI runs every automated test**, including the Playwright E2E journey (handout C-01: "all automated tests").
- **D-5 Compose has three services**: `db` (postgres:16-alpine), `migrate` (same image: `npx prisma migrate deploy && npm run seed`) and `app` (same image). No nginx or separate client container, so we test the same image that runs in the cloud.
- **D-12 `deploy/deploy.sh` uses `--update-env-vars`, `--update-secrets` and `--add-cloudsql-instances`**, never `--set-*` (portal rule).
- **D-15 Portal "Repository review"** reports that `deploy/deploy.sh` does not match the Starter Kit structure. This is expected: our copy is adapted (seed secrets `sf4618437-app-secret-1/2`, `npm run seed`, `--update-*`). We connected through "Connect this repository to Google Cloud" once and did **not** copy the portal's Starter Kit zip or its generated `deploy.yml` into the repo.

Kit files we do not use: `deploy/teardown.sh` (never run; ask a TA to pause or clean up), `deploy/tests/test_deploy_stub.sh` (tests the kit's resource-creating `deploy.sh`), the kit's `--demo` seed flag and the secrets `sf4618437-admin-password` / `sf4618437-demo-password` (the portal created them for the TokTickIT kit; our app does not read them).

## 2. Environment variables

| Name | Purpose | Secret? | Where the value comes from |
|---|---|---|---|
| `PORT` | Port Express listens on | No | `3000` (Dockerfile `ENV PORT=3000`; Cloud Run `--port 3000`) |
| `NODE_ENV` | `production` makes the cookie `Secure` and serves the built client | No | Cloud Run env (`deploy.sh`); unset locally |
| `TZ` | Day boundaries for daily entries | No | `Asia/Bangkok` (Cloud Run env, `server/.env`) |
| `DATABASE_URL` | Prisma connection string | **Yes** | Cloud: Secret Manager `sf4618437-database-url` (created by the portal). Local: `server/.env` |
| `DATABASE_URL_TEST` | Separate DB for automated tests | Local value only | `server/.env` and CI; never in the cloud |
| `SESSION_TTL_HOURS` | Session lifetime (default 24) | No | Default; `.env` / compose |
| `CLIENT_DIST_DIR` | Folder of the built client (optional) | No | Default `<repo>/client/dist` |
| `SEED_MANAGER_PASSWORD` | Password of `manager@example.test`, hashed by the seed | **Yes** | Cloud: `sf4618437-app-secret-1` (added with the portal kit's `kit.sh secrets add 1`). Local: `.env` |
| `SEED_PARTICIPANT_PASSWORD` | Password of `participant@example.test` and `participant2@example.test` | **Yes** | Cloud: `sf4618437-app-secret-2` (`kit.sh secrets add 2`). Local: `.env` |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`, `APP_PORT` | Local Docker Compose stack only | Local value only | Root `.env` (copy of `.env.example`) |
| `API_PROXY_TARGET` | Vite dev-server proxy target | No | `client/.env` (development only) |
| `RESTART_MARKER` | Changed only to force a new revision for the restart test | No | `gcloud run services update ... --update-env-vars` |
| `SMOKE_EMAIL` / `SMOKE_PASSWORD` | Optional smoke login | — | **Not set** (D-3) |
| `GCP_PROJECT_ID`, `GCP_REGION`, `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT` | Read by `.github/workflows/deploy.yml` | No (names and addresses only) | GitHub → Settings → Environments → `demo` → Variables, copied from the portal ("GitHub Actions variables") |

The migrate job gets `DATABASE_URL`, `SEED_MANAGER_PASSWORD` and `SEED_PARTICIPANT_PASSWORD`; the service gets only `DATABASE_URL`.

## 3. Build, test, run, migrate and seed

Local (Node 24 and a local PostgreSQL; copy `server/.env.example` to `server/.env`):
```
npm ci --prefix server && npm ci --prefix client && npm ci
npm run migrate && npm run migrate:test && npm run seed
npm test                       # server Vitest + client Vitest + Playwright E2E
npm run build                  # server tsc + client tsc/vite build
npm run dev:server             # API on :3000
npm run dev:client             # Vite on :5173 (proxies /api)
```

Docker Compose (copy `.env.example` to `.env`):
```
docker compose up --build -d   # db -> migrate (migrate + seed) -> app
docker compose ps              # migrate exited 0, app healthy
curl http://localhost:3000/api/health    # {"status":"ok"}
curl http://localhost:3000/api/ready     # {"status":"ready","db":"connected"}
docker compose down            # keeps the named volume postgres_data (data survives)
```

CI (`.github/workflows/ci-docker.yml`, job `test-and-docker`, required by the ruleset) on every pull request into `main` or `staging/**`: offline checks of the deploy scripts without GCP (`bash -n`, `DRY_RUN=1 bash deploy/deploy.sh`, `deploy/tests/test_release_stub.sh`, `deploy/tests/test_smoke.py`), create the test DB, server install/migrate/seed/Vitest, client install/Vitest/build, Playwright journey, production Docker build (not pushed).

## 4. Google Cloud resources (course portal)

| Item | Value |
|---|---|
| Project / region | `cpe-se-course-2026` / `asia-southeast1` |
| Public URL | https://sf4618437-4d7hbszvwq-as.a.run.app |
| Cloud Run service | `sf4618437` (port 3000, min 0 / max 1 instances, 512Mi, 1 CPU) |
| Migration job | `sf4618437-migrate` (`sh -c "npx prisma migrate deploy && npm run seed"`) |
| Artifact Registry image | `asia-southeast1-docker.pkg.dev/cpe-se-course-2026/sf4618437/sf4618437:<full commit SHA>` |
| Cloud SQL | `sf4618437-pg` (PostgreSQL, `db-f1-micro`), database and user `sf4618437`, connection `cpe-se-course-2026:asia-southeast1:sf4618437-pg` |
| Runtime service account | `sf4618437-runner@cpe-se-course-2026.iam.gserviceaccount.com` (service and job) |
| Deployer service account | `sf4618437-deployer@cpe-se-course-2026.iam.gserviceaccount.com` (GitHub Actions via Workload Identity Federation, no key file) |
| Workload Identity | pool `sf4618437-pool`, provider `sf4618437-provider` |
| Secrets used | `sf4618437-database-url`, `sf4618437-app-secret-1`, `sf4618437-app-secret-2` |
| Logs | Team log view `projects/cpe-se-course-2026/locations/global/buckets/_Default/views/sf4618437` (add `--bucket=_Default --location=global --view=sf4618437` to `gcloud logging read` if the plain command is denied) |
| GitHub environment | `demo`, deployments allowed from `main` only, 4 variables, no secrets |

## 5. Release process

1. **Change:** Issue → branch from `staging/lab-5` → PR into `staging/lab-5` (`test-and-docker` must pass, teammate reviews and merges with **Create a merge commit**).
2. **Release:** PR `staging/lab-5` → `main`. After the merge, **Deploy demo** (`.github/workflows/deploy.yml`) runs: `test` (reuses `ci-docker.yml`) → Validate settings → Google Cloud login without a key (WIF) → build and push the image tagged with the commit SHA → `deploy/release.sh` (pin the image by digest, update and run the migration job with `--wait`, update the service, send 100% traffic to the latest revision) → smoke test → run summary.
3. **Sync:** PR `main` → `staging/lab-5` so staging stays up to date (the ruleset requires up-to-date branches and blocks direct pushes).
4. **First deploy or emergency only** (from Cloud Shell, on `main`): `DRY_RUN=1 bash deploy/deploy.sh`, read the printed commands, then `DRY_RUN=0 bash deploy/deploy.sh`. It refuses to run off `main` or with a tag that is not `HEAD`.
5. **Rollback / roll forward:** Actions → Deploy demo → Run workflow on `main` with `image_tag` = the full 40-character SHA of an image already in Artifact Registry. Tests, build and migration are skipped; the service is pointed at that image and smoke-tested. Data stays in Cloud SQL.

Never merge into `main` while `main` is broken or while the partner team is running UAT on the URL.

## 6. Which commit is running

1. The Deploy demo run summary shows `Commit image tag` (the SHA) and `Digest` (`...@sha256:...`).
2. Compare with the live service:
   ```
   gcloud run services describe sf4618437 --region=asia-southeast1 --project=cpe-se-course-2026 --format="yaml(status.latestReadyRevisionName,status.traffic,spec.template.spec.containers[0].image)"
   gcloud artifacts docker images describe asia-southeast1-docker.pkg.dev/cpe-se-course-2026/sf4618437/sf4618437:<SHA> --format="value(image_summary.digest)"
   ```
   The service image digest, the summary digest and the tag's digest must be equal, and the latest revision must have 100% traffic.

Note: a workflow run that builds a SHA which was already pushed (for example a re-run) pushes a new image with the same tag, so the tag then points to the newer digest.

## 7. Restart without a new image

```
gcloud run services update sf4618437 --region=asia-southeast1 --project=cpe-se-course-2026 --update-env-vars=RESTART_MARKER=<time>
```
This creates a new revision with the same image. Data created before must still be there afterwards (R-04).

## 8. Rules

- Never use `--set-env-vars` or `--set-secrets` (use `--update-*`).
- Never run `deploy/teardown.sh`; ask a TA to pause or clean up.
- Only touch resources whose names start with `sf4618437`; never another team's.
- Never put a password, connection string or key in Git, an Issue, a screenshot, a log or an AI chat.
- Never change IAM, billing or the database by hand; read every `gcloud` command before it runs.
- Never merge while the system is broken or while the partner team is testing.
