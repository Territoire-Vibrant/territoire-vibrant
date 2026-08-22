# Territoire Vibrant

Monorepo Bun do site e do app do Territoire Vibrant.

O backend é um único deployment Convex que todos os clientes consomem. Prisma, tRPC e NextAuth foram
removidos na migração para Convex + Effect — se você encontrar referências a eles em alguma doc antiga,
estão desatualizadas.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Web | Next.js 16 (App Router), next-intl (`fr`/`es`/`en`/`pt`), Clerk, Tailwind v4, shadcn/ui |
| Backend | Convex 1.44, Effect 4 (beta.107), Clerk via JWT template |
| Mobile | Expo SDK 55, expo-router, `@clerk/expo` |
| Compartilhado | `@tv/domain` (contratos Zod, validators, dinheiro), `@tv/backend-client` (API Convex tipada) |

## Estrutura

```
apps/
  web/        Site público + área admin (Next.js)   → workspace "web"
  backend/    Funções Convex e domínios Effect      → workspace "@tv/backend"
  mobile/     App Expo                              → workspace "mobile"
packages/
  domain/          Contratos neutros de plataforma  → "@tv/domain"
  backend-client/  API Convex tipada p/ os clientes → "@tv/backend-client"
```

Os domínios do backend ficam em `apps/backend/src/{content,catalog,leads,identity}`. Effect é a ferramenta
com que eles são escritos, não um diretório: não existe `effect/`, e `convex/` importa de `src/`, nunca o
contrário.

## Requisitos

- [Bun](https://bun.sh) ≥ 1.3 (é o gerenciador de pacotes: `bun add`, `bun run`, `bunx`)
- Conta no Convex, Clerk, Cloudflare R2 e MailerSend para rodar tudo de ponta a ponta

## Setup

```bash
bun install
```

### Variáveis de ambiente

**`apps/web/.env`** — o `src/env.ts` valida com Zod e falha o build se faltar alguma:

| Variável | Para quê |
| --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | Deployment Convex (`https://<slug>.convex.cloud`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk (cliente) |
| `CLERK_SECRET_KEY` | Clerk (servidor) |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` | Cloudflare R2, usado por `/api/upload` |
| `NEXT_PUBLIC_APP_URL` | URL pública do site (default `http://localhost:3000`) |

**`apps/mobile/.env`**:

| Variável | Para quê |
| --- | --- |
| `EXPO_PUBLIC_CONVEX_URL` | Mesmo deployment Convex |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk (cliente) |

**Backend** — não usa arquivo `.env`. As variáveis vivem no deployment e são setadas pela CLI:

```bash
cd apps/backend
bunx convex env set CLERK_JWT_ISSUER_DOMAIN "https://clerk.territoirevibrant.ca"
bunx convex env set MAILERSEND_API_KEY "..."
bunx convex env set MAILERSEND_FROM_EMAIL "macneves@territoirevibrant.ca"
bunx convex env set CONTACT_EMAIL "macneves@territoirevibrant.ca"
```

Acrescente `--prod` para mirar produção. Sem `CLERK_JWT_ISSUER_DOMAIN` o deploy falha de imediato, porque
`convex/auth.config.ts` lê essa variável.

O envio de e-mail (contato e ebook) roda no backend, não no Next — por isso `MAILERSEND_*` e `CONTACT_EMAIL`
não aparecem mais no `.env` do web.

### Clerk

O Convex valida sessões por um JWT template chamado exatamente `convex` (Configure → Sessions → JWT
templates). O template precisa emitir o claim `email`; sem ele o bootstrap de usuário grava linhas sem
e-mail e falha em silêncio.

## Desenvolvimento

Não existe script `dev` na raiz — cada app sobe separado.

```bash
bun dev:backend   # Convex dev: publica as funções e fica observando
bun dev:web       # Next.js em localhost:3000
bun dev:mobile    # Expo
```

Suba o `dev:backend` antes do `dev:web`: sem as funções publicadas no deployment que o `.env` aponta, toda
query do site falha.

## Verificação

```bash
bun run typecheck   # os cinco workspaces
bun run test        # testes do backend (convex-test + vitest)
bun run check       # biome
bun run build:web   # build de produção do site
```

Para mudanças em React, rode também `bun --filter web react-doctor` (ou `--filter mobile`).

## Deploy

- **Web** — Vercel com **Root Directory `apps/web`**, install `bun install`, build `bun run build`. Sem o
  root directory a build falha: a Vercel procura `src/` na raiz do repositório.
- **Backend** — `cd apps/backend && bunx convex deploy`.
- **Mobile** — EAS ainda não configurado.

## Convenções

`AGENTS.md` (espelhado em `CLAUDE.md`) carrega as regras de arquitetura, e há arquivos aninhados por
workspace. Vale a pena ler antes de mexer: alguns pontos são carregados de intenção — o `proxy.ts` do web,
a separação entre runtime do isolate e runtime Node no backend, e o campo `legacyId`, que mantém vivas as
URLs publicadas antes da migração.

O plano da migração para Convex está em `docs/plans/2026-08-21-convex-monorepo-migration.md`.
