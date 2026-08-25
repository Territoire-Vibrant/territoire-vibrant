# Territoire Vibrant

Bun monorepo for the Territoire Vibrant site and app.

The backend is a single Convex deployment that every client talks to. Prisma, tRPC and NextAuth were
removed during the migration to Convex + Effect — if you find a doc or comment that still refers to them,
it is stale.

## Stack

| Layer | Technology |
| --- | --- |
| Web | Next.js 16 (App Router), next-intl (`fr`/`es`/`en`/`pt`), Clerk, Tailwind v4, shadcn/ui |
| Backend | Convex 1.44, Effect 4 (beta.107), Clerk via JWT template |
| Mobile | Expo SDK 55, expo-router, `@clerk/expo` |
| Shared | `@tv/domain` (Zod contracts, validators, money), `@tv/backend-client` (typed Convex API) |

## Layout

```
apps/
  web/        Public site + admin area (Next.js)   → workspace "web"
  backend/    Convex functions and Effect domains  → workspace "@tv/backend"
  mobile/     Expo app                             → workspace "mobile"
packages/
  domain/          Platform-neutral contracts      → "@tv/domain"
  backend-client/  Typed Convex API for clients    → "@tv/backend-client"
```

Backend domains live in `apps/backend/src/{content,catalog,leads,identity}`. Effect is the tool those
modules are written with, not a directory: there is no `effect/` folder, and `convex/` imports from
`src/`, never the other way around.

## Requirements

- [Bun](https://bun.sh) ≥ 1.3 — it is the package manager (`bun add`, `bun run`, `bunx`)
- Accounts on Convex, Clerk, Cloudflare R2 and MailerSend to run everything end to end

## Setup

```bash
bun install
```

### Environment variables

**`apps/web/.env`** — `src/env.ts` validates these with Zod and fails the build if one is missing:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment (`https://<slug>.convex.cloud`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk (client) |
| `CLERK_SECRET_KEY` | Clerk (server) |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` | Cloudflare R2, used by `/api/upload` |
| `NEXT_PUBLIC_APP_URL` | Public site URL (defaults to `http://localhost:3000`) |

**`apps/mobile/.env`**:

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_CONVEX_URL` | Same Convex deployment |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk (client) |

**Backend** — no `.env` file. Its variables live in the deployment and are set through the CLI:

```bash
cd apps/backend
bunx convex env set CLERK_JWT_ISSUER_DOMAIN "https://clerk.territoirevibrant.ca"
bunx convex env set MAILERSEND_API_KEY "..."
bunx convex env set MAILERSEND_FROM_EMAIL "macneves@territoirevibrant.ca"
bunx convex env set CONTACT_EMAIL "macneves@territoirevibrant.ca"
```

Add `--prod` to target production. Without `CLERK_JWT_ISSUER_DOMAIN` the deploy fails immediately, because
`convex/auth.config.ts` reads it.

Contact and ebook email now runs in the backend rather than in Next, which is why `MAILERSEND_*` and
`CONTACT_EMAIL` no longer appear in the web `.env`.

### Clerk

Convex validates sessions through a JWT template named exactly `convex` (Configure → Sessions → JWT
templates). The template must emit the `email` claim; without it user bootstrap writes rows with no email
and fails silently.

## Development

`bun dev` starts all three apps at once, each line prefixed with the workspace it came from:

```bash
bun dev           # web + backend + mobile together
```

To start one at a time:

```bash
bun dev:backend   # Convex dev: pushes functions and keeps watching
bun dev:web       # Next.js on localhost:3000
bun dev:mobile    # Expo
```

When running them separately, start `dev:backend` before `dev:web`: without functions pushed to the
deployment the `.env` points at, every site query fails. `bun dev` avoids that by starting both together.

## Verification

```bash
bun run typecheck   # all five workspaces
bun run test        # backend suite (convex-test + vitest)
bun run check       # biome
bun run build:web   # production build of the site
```

For React changes also run `bun --filter web react-doctor` (or `--filter mobile`).

## Deploy

- **Web** — Vercel with **Root Directory `apps/web`**, install `bun install`, build `bun run build`.
  Without the root directory the build fails: Vercel looks for `src/` at the repository root.
- **Backend** — `cd apps/backend && bunx convex deploy`.
- **Mobile** — EAS is not configured yet.

## Environments

There are two Convex deployments and two Clerk instances, paired:

| | Convex | Clerk |
| --- | --- | --- |
| Production | `impressive-tortoise-955` | `clerk.territoirevibrant.ca` (real users) |
| Development | `dapper-deer-614` | `hardy-hamster-60.clerk.accounts.dev` |

Each deployment's `CLERK_JWT_ISSUER_DOMAIN` points at its matching instance. Crossing them stops tokens
from validating, and it surfaces as `AUTHORIZATION_FAILED` with no further explanation.

## Conventions

`AGENTS.md` (mirrored in `CLAUDE.md`) carries the architecture rules. It is worth reading first: several
things are deliberate — the web `proxy.ts`, the split between the isolate runtime and the Node runtime in
the backend, and the `legacyId` field that keeps pre-migration URLs alive.

The reference counts taken at cutover, and what changed after it, are in
`docs/plans/migration-baseline.md`.
