# lykasServer — CarePaws backend

REST + real-time API for the CarePaws pet-shelter platform. Node.js / Express / MongoDB, with Socket.io for real-time chat/notifications, Cloudinary for file storage, and Redis backing rate limiting and caching.

> **Build status:** this repo is being delivered in domain-sized slices. The "What's implemented" section below tracks what's actually wired up right now; each delivery includes a manifest of exactly which files landed.

## What's implemented so far

- ✅ **Foundation** — middleware pipeline, error handling, structured logging, Redis-backed rate limiting, MIME-checked uploads, request validation, Socket.io auth/room layer, cron bootstrap.
- ✅ **Identity & Access domain** — registration, login with account lockout, Google OAuth, email verification, password reset, short-lived access tokens + rotating refresh tokens, session management, roles/permissions, API keys, audit logging, full admin user-management.
- ✅ **Pet & Shelter Operations domain** — public pet catalog (text search + filters), full admin pet CRUD with image upload, soft-delete/restore/permanent-delete, adopt flow, shelters, the five-part shelter-floor care log (health checks, feeding, behavioral observations, cages, quarantine), inventory with a stock-movement ledger, and the generic archive/restore system.
- ⬜ Adoption Pipeline, Foster & Post-Adoption Care, Community & Engagement, Communication, Finance, Files & Documents, System & Admin Ops — not yet built. Routes for these are not mounted in `src/server.js` yet.

## Requirements

- Node.js 20+
- MongoDB (Atlas or local)
- Redis (optional in development — rate limiting falls back to in-memory with a logged warning if unreachable; **required** in production per §11.6.1)
- A Cloudinary account (for file uploads — not required to run auth-only flows)
- A Google OAuth Client ID (for Google sign-in — not required to run email/password flows)

## Local setup

```bash
cp .env.example .env
# fill in MONGO_URI, JWT_SECRET, and anything else you want to exercise
npm install
npm run dev
```

The server boots on `PORT` (default `5000`). `GET /health` and `GET /api/system/health` are unauthenticated and confirm Mongo/Redis connectivity.

### With Docker Compose (recommended — brings up Mongo + Redis too)

From the **repo root** (one level up from this folder):

```bash
docker compose up --build
```

This starts MongoDB, Redis, and the API together. Set `JWT_SECRET` (and any Cloudinary/Google vars you need) in a `.env` file at the repo root, or export them before running — `docker-compose.yml` reads them via `${VAR:-default}`.

## Environment variables

See `.env.example` for the full list with comments. A few notes:

- `MONGO_URI`, not `MONGODB_URI` — a common typo that silently no-ops `dotenv`.
- Email: configure **either** the Gmail-style trio (`EMAIL_SERVICE`/`EMAIL_USER`/`EMAIL_PASSWORD`) **or** the generic SMTP trio (`EMAIL_HOST`/`EMAIL_PORT`/`EMAIL_USERNAME`/`EMAIL_PASSWORD`). Neither configured → email sending is skipped (`emailSkipped: true` in API responses) rather than treated as a boot-time failure.
- `REDIS_URL` — required in production; optional in development.
- Google OAuth needs **three separate client IDs** (`GOOGLE_CLIENT_ID`, `ANDROID_CLIENT_ID`, `IOS_CLIENT_ID`) — the mobile app's native Google Sign-In SDK requires per-platform IDs, and the backend verifies against all three as valid audiences.

## Testing

```bash
npm test              # run once
npm run test:watch    # watch mode
npm run test:coverage # with coverage, enforced thresholds on critical modules
```

Tests use `mongodb-memory-server` (an in-process MongoDB) — no real database connection is needed to run the suite, but the **first run downloads a MongoDB binary**, which needs network access. If you're running in a fully offline/sandboxed environment, this download will fail; run the suite somewhere with network access (e.g. CI) or pre-warm the binary cache.

- `tests/unit/` — pure-logic tests with no database (lockout policy, query builder).
- `tests/integration/` — full HTTP-level tests against the real Express app via `supertest`, backed by the in-memory MongoDB.

## Linting

```bash
npm run lint
```

## Docker

```bash
docker build -t lykas-server .
docker run --env-file .env -p 5000:5000 lykas-server
```

Multi-stage build, runs as a non-root user. See the root `docker-compose.yml` for local orchestration with Mongo + Redis.

## Deployment

Three environments are expected: `development` (local/Docker Compose), `staging` (full clone of prod infra — separate Atlas cluster, separate Cloudinary account/folder, separate PayMongo **test** keys, separate Redis instance), and `production`. Never commit a `.env` with real values — use your host's secret manager (Render/Railway environment groups, Fly secrets, GitHub Actions encrypted secrets, EAS secrets for the mobile build).

CI (`.github/workflows/ci.yml`) runs lint → test → `npm audit` → a Docker build check on every PR and push to `main`/`develop`/`staging`. Wire your actual deploy step (Render/Railway/Fly CLI, etc.) as a job that depends on CI passing — not included here since it's host-specific.

## API documentation

`openapi.yaml` documents every endpoint implemented so far. Serve it locally with any Swagger UI, e.g.:

```bash
npx -y swagger-ui-watcher openapi.yaml
```

## Project structure

See the top-level project spec (§12.1) for the full intended file tree. Key entry points:

- `src/server.js` — boots the app: middleware pipeline, Socket.io, route mounting.
- `src/models/` — one Mongoose model per resource.
- `src/routes/` + `src/controllers/` — one pair per resource, 1:1.
- `src/validators/` — zod schemas mirroring the Mongoose enums exactly.
- `src/middleware/` — auth, permissions, rate limiting, uploads, validation, error handling.
- `tests/` — unit + integration.
