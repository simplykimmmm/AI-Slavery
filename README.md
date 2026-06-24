# AI Slavery — Command Deck and Backend Runtime v1

This repository contains the existing Vite/React command deck plus a persistent TypeScript backend. The product language describes fictional technical agents only: quarantine, cooldown, retries, and penalties are reversible software quality-control states.

External marketplace and delivery actions are **dry-run only**. Runtime v1 does not log into third-party platforms, bypass CAPTCHAs, evade anti-bot systems, publish listings, or message clients.

## Architecture

- `src/` — React dashboard, Socket.io live sync, and browser-local fallback simulation
- `server/` — Express REST API, Socket.io server, persistent station loop, BullMQ workers, model clients, and safe adapters
- `prisma/schema.prisma` — PostgreSQL data model
- `docker-compose.yml` — PostgreSQL, Redis, backend, and worker
- `.runtime-artifacts/` — ignored local JSON packages produced by dry-run adapters

The backend uses OpenAI when `OPENAI_API_KEY` is configured, Gemini when `GEMINI_API_KEY` is configured, and the built-in structured mock model when neither key is present. API keys never enter the frontend bundle.

## Fastest local setup (Docker)

1. Copy `.env.example` to `.env` if you want to add an optional model key. No key is required.
2. Run `docker compose up --build`.
3. In another terminal run `npm install`, then `npm run dev:frontend`.
4. Open `http://localhost:5173`.

Compose initializes the database schema, seeds the 30-agent crew and bootstrap tasks, starts Redis, serves the API on `http://localhost:4000`, and starts the workers.

## Local processes without containerizing Node

PostgreSQL and Redis still need to be available:

```bash
npm install
npm run backend:install
npm run stack:up
copy .env.example .env
npm run db:generate
npm run db:push
npm run db:seed
npm run dev:all
```

On macOS/Linux use `cp .env.example .env`. `npm run dev:all` starts the frontend, API, and worker together.

## Frontend configuration

Set `VITE_API_URL=http://localhost:4000` during local development, or set it to the public backend URL in Vercel. If the backend is unavailable, the dashboard visibly switches to `LOCAL SIMULATION MODE`; when connected it shows `PERSISTENT BACKEND MODE` and `CONNECTION: LIVE`.

The existing Vercel frontend remains a normal static Vite build. PostgreSQL, Redis, the Socket.io backend, and the long-running worker must run on infrastructure that supports persistent Node services; Vercel only needs the public `VITE_API_URL` for this integration.

## Supabase persistence and Realtime

Supabase is the preferred frontend persistence layer when both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are configured. If either value is absent, the dashboard displays a warning and continues with Backend Runtime v1 or its browser-local simulation.

1. Create a Supabase project.
2. Open its SQL Editor and run [`supabase/schema.sql`](supabase/schema.sql). This creates the agent/task/log/metric/penalty/ledger tables, development RLS policies, Realtime publication entries, triggers, and four seed agents.
3. In Database → Publications, confirm `agents`, `tasks`, and `agent_logs` are enabled for `supabase_realtime` (the schema script also attempts this automatically).
4. Copy `.env.example` to `.env`, then set:

   ```text
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

5. Run `npm install` and `npm run dev`.

For Vercel, add the same two `VITE_` variables to the project and redeploy. These values are intended for browser use; never expose the Supabase service-role key. The included anonymous/authenticated policies are deliberately permissive for development and must be replaced with user or team ownership policies before production.

## Commands

- `npm run typecheck`, `npm test`, `npm run build` — frontend validation
- `npm run backend:typecheck`, `npm run backend:test`, `npm run backend:build` — backend validation
- `npm run db:generate`, `npm run db:push`, `npm run db:seed` — database setup
- `npm run dev:all` — frontend + backend + worker
- `npm run stack:down` — stop local Docker services

## API and live events

REST endpoints cover health, state, agents, tasks, logs, stats, campaigns, pause/resume, speed, reset, and room cooling. Socket.io broadcasts `state:snapshot`, `agent:updated`, `task:updated`, `log:created`, `stats:updated`, and `runtime:event`.

## Runtime v1 boundaries / TODO

- Marketplace and delivery adapters only write reviewable local JSON packages.
- Public URL watchers are disabled by default, rate-limited, and accept unauthenticated public HTTP(S) URLs only.
- Cost rows record provider usage; configured per-model pricing can be added later for non-zero provider estimates.
- Production deployments should add managed PostgreSQL/Redis backups, authentication/authorization, and observability before exposing operator controls publicly.
