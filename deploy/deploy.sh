#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# HabitPulse — Google Cloud Run First-Deployment & Update Script (Team sf4618437)
# ==============================================================================
# Usage:
#   DRY_RUN=1 bash deploy/deploy.sh   # preview all commands (default)
#   DRY_RUN=0 bash deploy/deploy.sh   # build, push, migrate+seed, update service
#
# Environment Variables (Optional):
#   PROJECT_ID   GCP Project ID (defaults to cpe-se-course-2026)
#   REGION       GCP Region (defaults to asia-southeast1)
#   DRY_RUN      Set DRY_RUN=1 to print commands without executing (default: 1)
#
# WHAT THIS SCRIPT DOES
#   Updates the pre-provisioned portal resources for team sf4618437 and runs
#   the first manual deployment from `main`:
#     - Verifies pre-provisioned Cloud Run service and migrate job exist
#     - Builds and pushes the unified container image tagged with the HEAD SHA
#     - Updates and executes the Cloud Run migration + seed job (`--wait`)
#     - Updates the Cloud Run service and routes 100% traffic to latest
#   Infrastructure (Cloud SQL, Artifact Registry, Secret Manager, service
#   accounts, public access IAM) is pre-provisioned by the course portal/TA.
#   After this first setup, routine releases run via `.github/workflows/deploy.yml`
#   and `deploy/release.sh`.
#
# IMPORTANT
#   - Never uses `--set-env-vars` or `--set-secrets` (uses `--update-*` instead).
#   - Secrets live only in Secret Manager (`sf4618437-*`); never printed or stored.
#   - Run from the REPO ROOT on `main` (builds the root Dockerfile).
#   - Offline release stub test: deploy/tests/test_release_stub.sh
# ==============================================================================

# ------------------------------------------------------------------------------
# Settings & argument parsing
# ------------------------------------------------------------------------------
DRY_RUN="${DRY_RUN:-1}"
REGION="${REGION:-asia-southeast1}"

if [ "$#" -gt 0 ]; then
  echo "Unknown argument: $1" >&2
  echo "Usage: $0" >&2
  exit 1
fi

# Helper: prints the command (DRY_RUN=1) or prints then executes it.
# --password=... is redacted in logs if ever passed.
run_cmd() {
  local arg
  if [ "$DRY_RUN" = "1" ]; then
    printf '[DRY_RUN] '
  else
    printf '+ '
  fi
  for arg in "$@"; do
    case "$arg" in
      --password=*) printf '%s ' '--password=<REDACTED>' ;;
      *) printf '%q ' "$arg" ;;
    esac
  done
  printf '\n'
  if [ "$DRY_RUN" != "1" ]; then
    "$@"
  fi
}

# Shared course project & team sf4618437 resource names (locked).
PROJECT_ID="${PROJECT_ID:-cpe-se-course-2026}"
[[ "$PROJECT_ID" == "cpe-se-course-2026" ]] || { echo 'Wrong course project' >&2; exit 1; }
REGION="${REGION:-asia-southeast1}"
[[ "$REGION" == "asia-southeast1" ]] || { echo 'Wrong assigned region' >&2; exit 1; }
REPO_NAME="sf4618437"
SQL_INSTANCE="sf4618437-pg"
SERVICE_NAME="sf4618437"
MIGRATE_JOB_NAME="sf4618437-migrate"
SA_NAME="sf4618437-runner"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
SQL_CONN_NAME="${PROJECT_ID}:${REGION}:${SQL_INSTANCE}"

if [ "$DRY_RUN" = "1" ]; then
  IMAGE_TAG="${IMAGE_TAG:-0000000000000000000000000000000000000000}"
else
  IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse HEAD)}"
  [[ "$(git branch --show-current)" == "main" ]] || { echo 'Deploy reviewed main only' >&2; exit 1; }
  [[ "$IMAGE_TAG" == "$(git rev-parse HEAD)" ]] || { echo 'IMAGE_TAG must match HEAD' >&2; exit 1; }
fi
[[ "$IMAGE_TAG" =~ ^[0-9a-f]{40}$ ]] || { echo 'Use full commit SHA' >&2; exit 1; }
IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:${IMAGE_TAG}"

# Secret Manager secret names (values are stored in Secret Manager, never in Git).
SECRET_DB_URL="sf4618437-database-url"
SECRET_MANAGER_PASSWORD="sf4618437-app-secret-1"
SECRET_PARTICIPANT_PASSWORD="sf4618437-app-secret-2"

echo "=================================================================="
echo "HabitPulse Cloud Run Deployment"
echo "Project : ${PROJECT_ID}"
echo "Region  : ${REGION}"
echo "Dry Run : ${DRY_RUN}"
echo "=================================================================="

# ==============================================================================
# Portal/TA pre-provisions infrastructure and public service IAM.
# These resources must exist; never create or modify project-level IAM here.
# ==============================================================================
JOB_SECRETS="DATABASE_URL=${SECRET_DB_URL}:latest,SEED_MANAGER_PASSWORD=${SECRET_MANAGER_PASSWORD}:latest,SEED_PARTICIPANT_PASSWORD=${SECRET_PARTICIPANT_PASSWORD}:latest"

if [ "$DRY_RUN" != "1" ]; then
  gcloud run services describe "$SERVICE_NAME" --project "$PROJECT_ID" --region "$REGION" >/dev/null
  gcloud run jobs describe "$MIGRATE_JOB_NAME" --project "$PROJECT_ID" --region "$REGION" >/dev/null
fi

# ==============================================================================
# 1. Build & Push Unified Container Image (tagged with commit SHA)
#    Builds the root Dockerfile (run this script from the repo root).
# ==============================================================================
run_cmd gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet
run_cmd docker build --platform linux/amd64 --tag "$IMAGE_URI" .
run_cmd docker push "$IMAGE_URI"
if [ "$DRY_RUN" != "1" ]; then
  IMAGE_URI="$(gcloud artifacts docker images describe "$IMAGE_URI" --project "$PROJECT_ID" --format='value(image_summary.fully_qualified_digest)')"
  [[ "$IMAGE_URI" == "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}@sha256:"* ]] || { echo 'Missing image digest' >&2; exit 1; }
fi

# ==============================================================================
# 2. Update & Execute Cloud Run Job for Migration + Idempotent Seed
#    If this job fails, the script stops BEFORE updating the service.
# ==============================================================================
run_cmd gcloud run jobs update "$MIGRATE_JOB_NAME" \
  --image "$IMAGE_URI" \
  --region "$REGION" \
  --service-account "$SA_EMAIL" \
  --add-cloudsql-instances "$SQL_CONN_NAME" \
  --update-secrets "$JOB_SECRETS" \
  --update-env-vars "NODE_ENV=production,TZ=Asia/Bangkok" \
  --command "sh" \
  --args "-c,npx prisma migrate deploy && npm run seed" \
  --max-retries 1 \
  --task-timeout 300s \
  --project "$PROJECT_ID"

if ! run_cmd gcloud run jobs execute "$MIGRATE_JOB_NAME" \
  --region "$REGION" \
  --wait \
  --project "$PROJECT_ID"; then
  printf '%s\n' "ERROR: Cloud Run migration job '${MIGRATE_JOB_NAME}' failed. Aborting service deployment." >&2
  printf '%s\n' "View job logs with:" >&2
  printf '%s\n' "  gcloud logging read \"resource.type=cloud_run_job AND resource.labels.job_name=${MIGRATE_JOB_NAME}\" --project \"${PROJECT_ID}\" --limit 50 --format=\"value(textPayload)\"" >&2
  exit 1
fi

# ==============================================================================
# 3. Update Cloud Run Service & Route Traffic
# ==============================================================================
run_cmd gcloud run services update "$SERVICE_NAME" \
  --image "$IMAGE_URI" \
  --region "$REGION" \
  --service-account "$SA_EMAIL" \
  --add-cloudsql-instances "$SQL_CONN_NAME" \
  --update-secrets "DATABASE_URL=${SECRET_DB_URL}:latest" \
  --update-env-vars "NODE_ENV=production,TZ=Asia/Bangkok" \
  --min-instances 0 \
  --max-instances 1 \
  --memory 512Mi \
  --cpu 1 \
  --port 3000 \
  --project "$PROJECT_ID"

run_cmd gcloud run services update-traffic "$SERVICE_NAME" --to-latest --project "$PROJECT_ID" --region "$REGION" --quiet
if [ "$DRY_RUN" = "1" ]; then
  SERVICE_URL="https://${SERVICE_NAME}-<hash>-as.a.run.app"
else
  SERVICE_URL="$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --project "$PROJECT_ID" --format='value(status.url)')"
fi

# ------------------------------------------------------------------------------
# Summary output (URLs; passwords stay in Secret Manager and are not printed)
# ------------------------------------------------------------------------------
printf '\n'
printf '%s\n' "=================================================================="
printf '%s\n' "Deployment Completed!"
printf '%s\n' "Service URL    : ${SERVICE_URL}"
printf '%s\n' "Health Check   : ${SERVICE_URL}/api/health"
printf '%s\n' "Readiness Check: ${SERVICE_URL}/api/ready"
printf '%s\n' "Seed accounts  : see README §5.3 (passwords in Secret Manager app-secret-1/2)"
printf '%s\n' "=================================================================="
