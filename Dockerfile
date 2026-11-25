# ##############################################################################
# HabitPulse — Unified production Dockerfile (multi-stage)
# ##############################################################################
# Builds ONE image containing the Express API and the built React SPA,
# serving both on port 3000. Cloud Run and CI build/run this same image.
#
# Stage 1 (client-builder): compiles the React + Vite SPA to /app/client/dist
# Stage 2 (server-builder): installs server deps (with prisma schema available
#                           for postinstall), generates Prisma client, builds TS
# Stage 3 (production)    : minimal runtime image running as non-root `node`
#                           with dist/, src/ (imported by prisma/seed.ts),
#                           prisma/, node_modules/ (includes tsx/prisma), and
#                           /app/client/dist.
# ##############################################################################

# ============================================================================
# Stage 1: Build Frontend (React + TypeScript + Vite)
# ============================================================================
FROM node:24-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
# Empty API URL => the SPA calls /api on the same origin (same container).
ENV VITE_API_URL=""
RUN npm run build

# ============================================================================
# Stage 2: Build Backend (Express + TypeScript + Prisma)
# ============================================================================
FROM node:24-alpine AS server-builder
WORKDIR /app/server
RUN apk add --no-cache openssl
COPY server/package*.json ./
# server/package.json runs `prisma generate` in postinstall, so prisma/ must
# be present before `npm ci`.
COPY server/prisma ./prisma
RUN npm ci
COPY server/ ./
RUN npx prisma generate && npm run build

# ============================================================================
# Stage 3: Unified Production Runtime (Serves API + Built React SPA on :3000)
# ============================================================================
FROM node:24-alpine AS production
WORKDIR /app/server
RUN apk add --no-cache openssl

COPY --from=server-builder /app/server/package*.json ./
COPY --from=server-builder /app/server/node_modules ./node_modules
COPY --from=server-builder /app/server/dist ./dist
# prisma/seed.ts imports ../src/lib/prisma.js and runs via tsx in the migrate job.
COPY --from=server-builder /app/server/src ./src
COPY --from=server-builder /app/server/prisma ./prisma
# Express serves the built SPA from /app/client/dist when NODE_ENV=production.
COPY --from=client-builder /app/client/dist /app/client/dist

ENV NODE_ENV=production
ENV TZ=Asia/Bangkok
ENV PORT=3000
EXPOSE 3000

USER node

CMD ["node", "dist/index.js"]
