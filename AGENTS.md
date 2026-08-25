# Repository Instructions

## Scope

Territoire Vibrant is a Bun monorepo: a localized Next.js 16 site with an admin area (`apps/web`), a
Convex backend written with Effect (`apps/backend`), an Expo app (`apps/mobile`), and two shared packages
(`packages/domain`, `packages/backend-client`).

Prisma, tRPC and NextAuth were removed in the Convex migration. If a comment, branch or old doc still
refers to them, it is stale — the backend is Convex and the only auth provider is Clerk.

## Commands

- Bun is the package manager: `bun add <package>`, `bun run <script>`, `bunx <package>`.
- Root scripts fan out with `--filter`:
  - `bun dev` starts web, backend and mobile together; `bun dev:web` / `dev:backend` / `dev:mobile` start
    one on its own.
  - `bun run typecheck` covers all five workspaces. `bun run test` runs the backend suite.
  - `bun run check` is Biome. Prefer it over `check:unsafe`, whose fixes rewrite files — if you do run the
    unsafe variant, read the diff and revert anything that changes behavior.
  - `bun run build:web` is the strongest local signal: it catches Server Component and serialization
    errors that typecheck alone misses.
- Run `bun --filter web react-doctor` (or `--filter mobile`) for React changes.

## Commands Not To Run

- `bunx convex deploy` from `apps/backend` publishes to **production**. Never run it unasked.
- `apps/backend/scripts/migrate-*.ts` read the legacy Postgres database and write into Convex. The
  migration is finished; these remain only as a record and must not be re-run.
- `bun dev` is long-running. Do not use it as a verification step — start it only when asked, in the
  background.

## Architecture

- **Backend.** Functions in `apps/backend/convex/` are a thin transport layer; decisions live in
  `apps/backend/src/{content,catalog,leads}` with cross-cutting types in `src/shared`. Effect is how those
  modules are written, not a directory: there is no `effect/` folder, and `convex/` imports from `src/`,
  never the other way around.
- **Two runtimes.** The Convex V8 isolate cannot load Node-only modules, and esbuild resolves imports
  statically when bundling for it — one Node import anywhere in an isolate-reachable file fails the whole
  push. Anything needing Node lives in a `*.node.ts` module behind `'use node'`, reachable only from a
  `'use node'` action. `src/leads/EmailService.ts` and `EmailService.node.ts` are the worked example, with
  matching runtimes in `convex/lib/effectRuntime.ts` and `effectRuntimeNode.ts`.
- **Convex module names cannot contain hyphens.** `effect-runtime.ts` is rejected at push time; that is
  why those files are camelCase while the rest of the repo is not.
- **Auth.** Clerk issues a JWT from a template named exactly `convex`; `convex/auth.config.ts` validates
  it against `CLERK_JWT_ISSUER_DOMAIN`. `requireAuth` and `requireAdmin` in `convex/helpers/auth.ts` are
  the only entry points — `isAdmin` is read from the user's own row server-side, so no client claim can
  grant it. Never re-implement either check inline.
- **Clients.** Both apps reach Convex through `@tv/backend-client`, which re-exports the generated API. In
  `apps/web`, Server Components use `publicQuery` / `authedQuery` from `~/server/convex`; Client
  Components use `useQuery` / `useMutation` / `useAction` from `convex/react`.
- **Shared contracts.** `@tv/domain` holds Zod schemas, Convex validators, and locale and money helpers.
  Anything the clients and the backend must agree on belongs there, free of platform imports.
- **Environment variables.** `apps/web` validates them through `~/env` (`@t3-oss/env-nextjs`); never read
  `process.env` directly in app code. The backend has no `.env` file — its variables live in the
  deployment and are set with `bunx convex env set`.
- Object storage is Cloudflare R2 through `~/server/r2`, still served by the Next route `/api/upload`.
  Email is MailerSend and now runs in the backend, not in the web app.

## Data And Ids

Every migrated table carries `legacyId`, the Postgres UUID it had before the cutover, so URLs published
earlier keep working. Detail pages resolve through `getByAnyId`, which tries `legacyId` first and falls
back to the Convex id. When building a link, prefer `legacyId ?? _id`.

Convex timestamps are epoch milliseconds, not `Date`. Wrap them (`new Date(article.createdAt)`) before
formatting.

Money is stored as integer `priceCents` plus a `currency` string. Format through `@tv/domain/money`;
never do float arithmetic on prices.

## Routing, Auth, And i18n

- `apps/web/src/proxy.ts` is the middleware. Next.js 16 renamed `middleware.ts` to `proxy.ts`; do not
  recreate a `middleware.ts`. It chains Clerk with next-intl and gates `/admin`.
- `/admin` is redirected to `/admin/content` inside the proxy rather than with an RSC `redirect()`, which
  throws `NEXT_REDIRECT` and flashes the dev error overlay. That workaround is load-bearing.
- Locales are `fr` (default), `es`, `en`, `pt`, with `localePrefix: 'always'`. Add every new or changed
  key to all four files in `apps/web/src/messages/`; a missing entry is a bug.
- Import navigation from `~/i18n/navigation`, not `next/navigation` — Biome enforces this as an error. The
  same rule requires `@phosphor-icons/react/dist/ssr` rather than `@phosphor-icons/react`.
- Message files cover UI strings only. Article content is translated per row in `articleTranslations`,
  unique on `articleId` plus `locale`. Not every article has all four locales, so the fallback in
  `selectTranslation` is a real path, not dead code.

## UI And Forms

- shadcn/ui in the `new-york` style lives in `apps/web/src/components/ui/`. Compose those primitives
  rather than hand-rolling equivalents, and build class names with `cn` from `~/lib/utils`.
- Tailwind v4 with no config file. Theme tokens are CSS variables in `apps/web/src/app/globals.css`.
- **Never pass a function as a prop from a Server Component to a Client Component.** It cannot be
  serialized, and the render crashes at runtime while typecheck stays green. `next/image` is the usual
  trap: use `unoptimized` rather than a custom `loader`.
- `MarkdownPreview` sanitizes with a schema extended to allow `mark`, which is what search highlighting
  renders. If you touch that pipeline, keep `rehypeRaw` before `rehypeSanitize` and re-check that `mark`
  survives while `script` still does not.
- Zod owns form contracts, and they come from `@tv/domain`. Use React Hook Form with `@hookform/resolvers`
  for complex forms and `useActionState` for simple ones.
- This codebase has no Server Actions. Do not introduce `'use server'` when a Convex function covers the
  work.
- For animated state changes, prefer React's `<ViewTransition>` over calling `document.startViewTransition`.

## Coding Style

Prefer arrow functions, including for components. Use `function` declarations only where Next.js requires
a default export, such as pages and layouts.

## Repository Rules

- Preserve established local patterns and match the file you are editing. Change only what the task
  requires; do not refactor or restyle adjacent code the change does not force you to touch.
- Never edit `apps/backend/convex/_generated/` by hand. It is committed because `@tv/backend-client`
  imports from it and a fresh clone would not typecheck otherwise, but it is regenerated on every deploy.
- Keep server-only modules out of Client Components. `~/server/*` reaches R2 and mints Convex tokens.
