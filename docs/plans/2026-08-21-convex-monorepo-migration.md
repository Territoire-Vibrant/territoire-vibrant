# Territoire Vibrant — Migração Prisma/tRPC → Convex + Monorepo (Web + Expo)

> **Para o Hermes:** execute com a skill `subagent-driven-development`, tarefa por tarefa.

**Goal:** Mover o Territoire Vibrant de um app Next.js único (Prisma/Postgres + tRPC) para um monorepo Bun com backend Convex compartilhado, um app web Next.js 16 (landing/site/admin) e um app Expo, migrando 100% dos dados de produção.

**Architecture:** Monorepo no estilo 22AI. `apps/backend` é o único backend (Convex); `apps/web` e `apps/mobile` são clientes que só o alcançam pela API Convex gerada, exposta por `packages/backend-client`. Contratos neutros de plataforma (Zod, validators, formatação) vivem em `packages/domain`. tRPC e Prisma são removidos por completo. Clerk continua sendo o único provider de auth, agora ligado ao Convex via JWT template.

**Tech Stack:** Bun workspaces · Convex 1.44 · **Effect 4.0.0-beta.107** · Next.js 16 (App Router) · Expo SDK 55 + expo-router · Clerk (`@clerk/nextjs` + `@clerk/expo`) · Zod 4 · Biome · Vitest + `convex-test` + `@effect/vitest`

---

## Decisões já fechadas com o Pedro

| # | Decisão | Escolha |
|---|---|---|
| 1 | Escopo do app Expo v1 | Estrutura mínima navegável consumindo artigos do Convex |
| 2 | Dados de produção | **Existem e precisam migrar** |
| 3 | tRPC | **Removido**. RSC usa `fetchQuery`, cliente usa `useQuery`/`useMutation` |
| 4 | Layout do repo | **Novo repo** `territoire-vibrant`, estilo 22AI |
| 5 | Auth | Clerk nos dois clientes, integração Clerk↔Convex como no rawanimalapp |

## Decisões que eu tomei (com justificativa) — revise antes do Task 1

| # | Decisão | Justificativa | Como reverter |
|---|---|---|---|
| A | **Effect no backend, padrão 22AI** | Pedido explícito do Pedro. Domínios em `apps/backend/src/{content,catalog,leads}/`, sem pasta `effect/` — Effect é a ferramenta com que o domínio é escrito, não um diretório. Um `ManagedRuntime` por host em `convex/lib/effect-runtime.ts`. Falhas esperadas são `Schema.TaggedErrorClass` traduzidas para `ConvexError` na borda. | — |
| B | **Sem Tamagui no mobile v1** | O rawanimalapp está com extração estática desabilitada por um crash de tema em TestFlight. Um scaffold mínimo não paga esse custo. RN primitives + StyleSheet. | Tamagui entra como camada de UI depois; nenhuma decisão de dados depende dele |
| C | **`priceCents: number`** em vez de Decimal | Convex não tem tipo decimal. Float para dinheiro é bug garantido. Inteiro em centavos + helper de formatação em `packages/domain`. | — |
| D | **`legacyId` indexado** em articles/products | As URLs públicas hoje carregam o UUID do Postgres (`/content/[articleId]`). Sem isso, todo link indexado/compartilhado quebra no cutover. | Remover o campo e o fallback depois de um período de graça + redirects |
| E | **`searchText` denormalizado** | O search index do Convex indexa **um** campo. Hoje o `article.search` faz `contains` em `title` E `bodyMd`. Concatenar os dois num campo mantém o comportamento com um índice só. | — |
| F | **R2 upload continua no Next** (`/api/upload`) | Só o admin web faz upload; o mobile v1 não. Mover para Convex action agora é escopo especulativo. | Vira `action` em `apps/backend/convex/uploads.ts` quando o mobile precisar |
| G | **Lead capture e contact viram Convex actions** | O lead é escrita de banco e o mobile vai precisar dele. O contact vai junto porque o tRPC que o hospedava está sendo removido. | — |
| H | **`isAdmin` na linha do usuário** é a fonte de verdade | Igual ao rawanimalapp: `requireAdmin` lê server-side, nunca confia em claim vinda do cliente. O claim do Clerk é usado só para o gate de rota no `proxy.ts`. | — |

**Bloqueador aberto:** a moeda dos produtos. Hoje `price` é `Decimal` sem moeda; o domínio é `.ca`. O plano assume **CAD**. Se for outra, altere `DEFAULT_CURRENCY` na Task 2.3 antes de rodar a migração.

---

## Mapa do que existe hoje (inventário verificado)

**Schema Prisma** — `prisma/schema.prisma`, 5 models:

| Model | Campos-chave | Observação para a migração |
|---|---|---|
| `Product` | `id uuid`, `price Decimal(10,2)`, `type ProductType`, `isActive`, `partnerStoreUrl` (mapeado de `amazonUrl`) | Decimal → centavos |
| `User` | `id` = Clerk user ID, `email @unique` | Vira `tokenIdentifier` + `clerkUserId` |
| `Article` | `id uuid`, `status PublishStatus`, `translations[]` | |
| `ArticleTranslation` | `@@unique([articleId, locale])`, `onDelete: Cascade` | Cascade vira mutation explícita |
| `Lead` | `name`, `email`, `phone` | Não guarda `locale` hoje (é descartado no router) |

Enums: `ProductType` (PHYSICAL/DIGITAL), `PublishStatus` (DRAFT/PUBLISHED/ARCHIVED), `Locale` (en/es/fr/pt).

**Routers tRPC** — `src/server/api/routers/`:

| Router | Procedures | Destino |
|---|---|---|
| `article.ts` | `search`, `getAll`, `getArticleById`, `getArticleForEdit`, `createArticle`, `updateArticle` | `convex/articles.ts` |
| `product.ts` | `list`, `getById`, `create`, `update` (todos `adminProcedure`) | `convex/products.ts` |
| `lead.ts` | `capture` | `convex/leads.ts` + action de e-mail |
| `contact.ts` | `send` | `convex/contact.ts` (action) |

**Acesso direto ao `db` fora dos routers** (4 arquivos, fáceis de perder):

- `src/app/[locale]/layout.tsx:73` — upsert do usuário Clerk **em todo render de layout**
- `src/app/[locale]/shop/page.tsx:21` — `product.findMany({ isActive: true })`
- `src/app/[locale]/shop/[productId]/page.tsx:32,61` — produto + relacionados
- `src/app/[locale]/content/[articleId]/page.tsx:57` — artigo + traduções

**Consumidores no client/RSC:** `content/page.tsx:114`, `search/page.tsx:153`, `admin/content/page.tsx:61`, `admin/shop/page.tsx:17`, `ArticleForm.tsx`, `ProductForm.tsx`, `ContactSection.tsx`, `EbookLeadForm.tsx`.

**Fora de escopo, preservar como está:** `src/proxy.ts` (os dois workarounds load-bearing), `src/i18n/*`, `src/messages/*.json`, `src/components/ui/*`, `src/server/r2.ts`, `src/server/email/mailersend.ts`.

---

## Layout final do monorepo

```
territoire-vibrant/
├── apps/
│   ├── backend/                    @tv/backend — o único backend
│   │   ├── src/                    domínios, um diretório cada (padrão 22AI)
│   │   │   ├── content/            artigos e traduções
│   │   │   │   ├── errors.ts
│   │   │   │   ├── policy.ts       regras puras (fallback de locale, searchText)
│   │   │   │   └── policy.test.ts
│   │   │   ├── catalog/            produtos e preço
│   │   │   ├── leads/              captura + entrega de e-mail
│   │   │   │   └── EmailService.ts port de e-mail (Context.Service)
│   │   │   ├── identity/           bootstrap de usuário e autorização
│   │   │   ├── shared/errors.ts    AppError + tradução p/ ConvexError
│   │   │   ├── layers.ts           BackendLive
│   │   │   └── runtime.ts          makeAppRuntime
│   │   ├── convex/                 o host: schema, queries, mutations, actions
│   │   │   ├── schema.ts
│   │   │   ├── auth.config.ts
│   │   │   ├── articles.ts
│   │   │   ├── products.ts
│   │   │   ├── leads.ts
│   │   │   ├── contact.ts
│   │   │   ├── users.ts
│   │   │   ├── migrations.ts        # removido após o cutover
│   │   │   ├── helpers/auth.ts
│   │   │   └── lib/effect-runtime.ts
│   │   ├── scripts/migrate-from-postgres.ts
│   │   ├── scripts/verify-migration.ts
│   │   └── AGENTS.md
│   ├── web/                        Next.js 16 — site público + admin
│   └── mobile/                     Expo SDK 55
├── packages/
│   ├── domain/                     @tv/domain — Zod, validators, formatação
│   └── backend-client/             @tv/backend-client — API tipada via anyApi
├── biome.jsonc
├── package.json                    workspaces: apps/*, packages/*
└── AGENTS.md
```

---

## Fase 0 — Preparação e rede de segurança

### Task 0.1: Snapshot do Postgres de produção

**Objective:** Ter um backup restaurável antes de qualquer leitura da produção.

**Files:** nenhum no repo.

**Step 1: Fazer o dump**

```bash
cd ~/Documents/GitHub/territoire-vibrant-site
mkdir -p .migration-backup
pg_dump "$LEGACY_DATABASE_URL" --no-owner --no-acl -Fc \
  -f ".migration-backup/tv-prod-$(date +%Y%m%d-%H%M%S).dump"
```

**Step 2: Verificar que o dump não está vazio**

```bash
ls -lh .migration-backup/
```
Expected: um arquivo `.dump` com tamanho > 0.

**Step 3: Confirmar que é restaurável**

```bash
pg_restore --list .migration-backup/tv-prod-*.dump | head -20
```
Expected: lista de tabelas incluindo `Product`, `Article`, `ArticleTranslation`, `Lead`, `User`.

> ⚠️ `.migration-backup/` nunca entra no git. Confirme que está no `.gitignore` antes de qualquer commit.

---

### Task 0.2: Contar as linhas de origem

**Objective:** Fixar os números que a verificação pós-migração vai conferir.

**Files:**
- Create: `docs/plans/migration-baseline.md`

**Step 1: Contar**

```bash
psql "$LEGACY_DATABASE_URL" -c '
SELECT '"'"'Product'"'"' AS tabela, count(*) FROM "Product"
UNION ALL SELECT '"'"'User'"'"', count(*) FROM "User"
UNION ALL SELECT '"'"'Article'"'"', count(*) FROM "Article"
UNION ALL SELECT '"'"'ArticleTranslation'"'"', count(*) FROM "ArticleTranslation"
UNION ALL SELECT '"'"'Lead'"'"', count(*) FROM "Lead";'
```

**Step 2: Registrar o resultado**

Grave a saída em `docs/plans/migration-baseline.md` com a data e o host do banco (sem credenciais).

**Step 3: Commit**

```bash
git add docs/plans/migration-baseline.md
git commit -m "docs: record pre-migration row counts"
```

---

### Task 0.3: Criar o JWT template do Clerk

**Objective:** Permitir que o Convex valide sessões Clerk.

**Files:** nenhum (console do Clerk).

**Passos (manuais, no dashboard do Clerk):**

1. **JWT Templates** → **New template** → escolher **Convex**.
2. Nome do template: exatamente `convex`.
3. Em **Claims**, garantir que o payload inclua:
   ```json
   {
     "aud": "convex",
     "email": "{{user.primary_email_address}}",
     "name": "{{user.full_name}}",
     "picture": "{{user.image_url}}",
     "metadata": "{{user.public_metadata}}"
   }
   ```
4. Copiar a **Issuer URL** (`https://<algo>.clerk.accounts.dev` ou o domínio de produção).

**Verificação:** a Issuer URL está copiada e será usada como `CLERK_JWT_ISSUER_DOMAIN` na Task 3.2.

> O claim `email` é obrigatório. Sem ele, `ctx.auth.getUserIdentity().email` volta `undefined` e o bootstrap de usuário falha silenciosamente — é exatamente a armadilha documentada em `convex/helpers/auth.ts` do rawanimalapp.

---

## Fase 1 — Scaffold do monorepo

### Task 1.1: Criar o repositório e a raiz do workspace

**Objective:** Repo novo com workspaces Bun funcionando.

**Files:**
- Create: `~/Documents/GitHub/territoire-vibrant/package.json`
- Create: `~/Documents/GitHub/territoire-vibrant/.gitignore`

**Step 1: Criar a estrutura**

```bash
mkdir -p ~/Documents/GitHub/territoire-vibrant/{apps,packages}
cd ~/Documents/GitHub/territoire-vibrant
git init
```

**Step 2: Escrever `package.json`**

```json
{
  "name": "territoire-vibrant",
  "private": true,
  "type": "module",
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev:web": "bun --filter web dev",
    "dev:mobile": "bun --filter mobile dev",
    "dev:backend": "bun --filter @tv/backend convex:dev",
    "build:web": "bun --filter web build",
    "check": "biome check .",
    "check:unsafe": "biome check --write --unsafe .",
    "check:write": "biome check --write .",
    "typecheck": "bun --filter @tv/domain typecheck && bun --filter @tv/backend typecheck && bun --filter @tv/backend-client typecheck && bun --filter web typecheck && bun --filter mobile typecheck",
    "test": "bun --filter @tv/backend test"
  },
  "devDependencies": {
    "@biomejs/biome": "2.5.8",
    "typescript": "5.9.3"
  }
}
```

**Step 3: Escrever `.gitignore`**

```gitignore
node_modules/
.env
.env.*
!.env.example
.next/
dist/
build/
.expo/
*.tsbuildinfo
.migration-backup/
.migration-artifacts/
```

**Step 4: Verificar**

```bash
bun install
```
Expected: instala sem erro, cria `bun.lock`.

**Step 5: Commit**

```bash
git add package.json .gitignore
git commit -m "chore: scaffold bun monorepo root"
```

---

### Task 1.2: Copiar a configuração do Biome

**Objective:** Manter as mesmas regras de lint do repo atual, incluindo as regras load-bearing de import.

**Files:**
- Create: `biome.jsonc`

**Step 1: Copiar do repo atual**

```bash
cp ~/Documents/GitHub/territoire-vibrant-site/biome.jsonc \
   ~/Documents/GitHub/territoire-vibrant/biome.jsonc
```

**Step 2: Ajustar o escopo dos overrides**

Os overrides que hoje apontam para `src/**` precisam virar `apps/web/src/**`. Em particular as duas regras que o `AGENTS.md` atual marca como erro:

- proibir `next/navigation` em favor de `~/i18n/navigation`
- proibir `@phosphor-icons/react` em favor de `@phosphor-icons/react/dist/ssr`

Ambas devem continuar valendo **só para `apps/web`** — o mobile não tem nem uma nem outra.

**Step 3: Verificar**

```bash
bunx biome check . 2>&1 | tail -5
```
Expected: nenhum erro de configuração (pode não haver arquivos ainda).

**Step 4: Commit**

```bash
git add biome.jsonc
git commit -m "chore: port biome config to monorepo"
```

---

### Task 1.3: Criar `packages/domain`

**Objective:** Pacote neutro de plataforma com os contratos compartilhados.

**Files:**
- Create: `packages/domain/package.json`
- Create: `packages/domain/tsconfig.json`

**Step 1: `packages/domain/package.json`**

```json
{
  "name": "@tv/domain",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    "./locale": "./src/locale.ts",
    "./article": "./src/article.ts",
    "./product": "./src/product.ts",
    "./lead": "./src/lead.ts",
    "./contact": "./src/contact.ts",
    "./money": "./src/money.ts",
    "./validators": "./src/validators.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "check": "biome check ."
  },
  "dependencies": {
    "convex": "1.44.0",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "typescript": "5.9.3"
  }
}
```

**Step 2: `packages/domain/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "Preserve",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "noEmit": true,
    "verbatimModuleSyntax": true
  },
  "include": ["src/**/*.ts"]
}
```

**Step 3: Verificar**

```bash
cd ~/Documents/GitHub/territoire-vibrant && bun install
```
Expected: `@tv/domain` aparece como workspace.

**Step 4: Commit**

```bash
git add packages/domain
git commit -m "chore: scaffold @tv/domain package"
```

---

## Fase 2 — Contratos compartilhados

### Task 2.1: Locale compartilhado

**Objective:** Uma única definição de locale para web, mobile e backend.

**Files:**
- Create: `packages/domain/src/locale.ts`

**Step 1: Escrever o arquivo**

```ts
import { z } from 'zod'

export const LOCALES = ['fr', 'es', 'en', 'pt'] as const

export const DEFAULT_LOCALE = 'fr' satisfies (typeof LOCALES)[number]

export const LocaleSchema = z.enum(LOCALES)

export type Locale = z.infer<typeof LocaleSchema>

/** Narrows an unknown route segment to a supported locale, falling back to the default. */
export const resolveLocale = (value: unknown): Locale => {
  const parsed = LocaleSchema.safeParse(value)
  return parsed.success ? parsed.data : DEFAULT_LOCALE
}
```

**Step 2: Verificar**

```bash
bun --filter @tv/domain typecheck
```
Expected: sem erros.

**Step 3: Commit**

```bash
git add packages/domain/src/locale.ts
git commit -m "feat(domain): add shared locale contract"
```

---

### Task 2.2: Validators do Convex derivados do domínio

**Objective:** Enums do Prisma viram validators do Convex, definidos uma vez só.

**Files:**
- Create: `packages/domain/src/validators.ts`

**Step 1: Escrever o arquivo**

```ts
import { v } from 'convex/values'

import { LOCALES } from './locale'

/**
 * Convex has no enum type, so each Prisma enum becomes a union of literals.
 * These live here rather than in the schema so the clients can reuse the exact
 * same set without importing a server module.
 */

export const PUBLISH_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const
export type PublishStatus = (typeof PUBLISH_STATUSES)[number]

export const PRODUCT_TYPES = ['PHYSICAL', 'DIGITAL'] as const
export type ProductType = (typeof PRODUCT_TYPES)[number]

export const LEAD_DELIVERY_STATUSES = ['sent', 'email_failed'] as const
export type LeadDeliveryStatus = (typeof LEAD_DELIVERY_STATUSES)[number]

export const LocaleValidator = v.union(...LOCALES.map((locale) => v.literal(locale)))
export const PublishStatusValidator = v.union(...PUBLISH_STATUSES.map((status) => v.literal(status)))
export const ProductTypeValidator = v.union(...PRODUCT_TYPES.map((type) => v.literal(type)))
export const LeadDeliveryStatusValidator = v.union(
  ...LEAD_DELIVERY_STATUSES.map((status) => v.literal(status))
)
```

**Step 2: Verificar**

```bash
bun --filter @tv/domain typecheck
```
Expected: sem erros.

**Step 3: Commit**

```bash
git add packages/domain/src/validators.ts
git commit -m "feat(domain): add convex validators for prisma enums"
```

---

### Task 2.3: Dinheiro em centavos

**Objective:** Eliminar float de preço e centralizar a formatação por locale.

**Files:**
- Create: `packages/domain/src/money.ts`

**Step 1: Escrever o arquivo**

```ts
import type { Locale } from './locale'

/** Territoire Vibrant sells in Canadian dollars. Change here if that ever moves. */
export const DEFAULT_CURRENCY = 'CAD'

/**
 * Prices are stored as integer cents. Postgres held them as Decimal(10,2);
 * Convex has no decimal type, and a float price is a rounding bug waiting to
 * be reported by a customer.
 */
export const toCents = (amount: number): number => Math.round(amount * 100)

export const fromCents = (cents: number): number => cents / 100

const LOCALE_TAGS: Record<Locale, string> = {
  en: 'en-CA',
  es: 'es-ES',
  fr: 'fr-CA',
  pt: 'pt-BR',
}

export const formatPrice = (cents: number, locale: Locale, currency = DEFAULT_CURRENCY): string =>
  new Intl.NumberFormat(LOCALE_TAGS[locale], { style: 'currency', currency }).format(fromCents(cents))
```

**Step 2: Verificar**

```bash
bun --filter @tv/domain typecheck
```

**Step 3: Commit**

```bash
git add packages/domain/src/money.ts
git commit -m "feat(domain): store prices as integer cents"
```

---

### Task 2.4: Portar os schemas Zod existentes

**Objective:** Mover os contratos de formulário do app atual para o pacote compartilhado, sem mudar comportamento.

**Files:**
- Create: `packages/domain/src/lead.ts`
- Create: `packages/domain/src/contact.ts`
- Create: `packages/domain/src/product.ts`
- Create: `packages/domain/src/article.ts`

**Step 1: `lead.ts` — cópia fiel de `src/schemas/lead.ts`**

```ts
import { z } from 'zod'

import { LocaleSchema } from './locale'

export const LeadCaptureSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.email('Email inválido'),
  phone: z
    .string()
    .min(7, 'Telefone deve ter pelo menos 7 caracteres')
    .regex(/^[\d\s+\-()]+$/, 'Telefone inválido'),
  locale: LocaleSchema,
})

export type LeadCaptureDTO = z.infer<typeof LeadCaptureSchema>
```

**Step 2: `contact.ts` — cópia fiel de `src/schemas/contact.ts`**

```ts
import { z } from 'zod'

export const ContactSubjectSchema = z.enum(['partnership', 'quote', 'invitation', 'other'])
export type ContactSubject = z.infer<typeof ContactSubjectSchema>

export const ContactFormSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.email('Email inválido'),
  subject: ContactSubjectSchema,
  message: z.string().min(10, 'Mensagem deve ter pelo menos 10 caracteres'),
})

export type ContactFormDTO = z.infer<typeof ContactFormSchema>

export const SUBJECT_OPTIONS = [
  { value: 'partnership', labelKey: 'Contact.subjects.partnership' },
  { value: 'quote', labelKey: 'Contact.subjects.quote' },
  { value: 'invitation', labelKey: 'Contact.subjects.invitation' },
  { value: 'other', labelKey: 'Contact.subjects.other' },
] as const
```

**Step 3: `product.ts` — porta de `src/lib/product-admin-schema.ts`, com preço em centavos**

```ts
import { z } from 'zod'

import { PRODUCT_TYPES } from './validators'

export const ProductTypeSchema = z.enum(PRODUCT_TYPES)

const optionalUrl = (field: string) =>
  z
    .string()
    .max(2048)
    .optional()
    .superRefine((raw, ctx) => {
      const trimmed = raw?.trim() ?? ''
      if (!trimmed) return
      if (!z.url().safeParse(trimmed).success) {
        ctx.addIssue({ code: 'custom', message: `Invalid URL in ${field}` })
      }
    })

/**
 * `price` stays a decimal number at the form boundary because that is what an
 * admin types. It is converted to integer cents at the Convex boundary.
 */
export const ProductUpsertSchema = z.object({
  name: z.string().min(1).max(500),
  description: z.string().max(20_000).optional(),
  price: z.number().finite().positive().max(99_999_999),
  type: ProductTypeSchema,
  imageUrl: optionalUrl('imageUrl'),
  isActive: z.boolean(),
  partnerStoreUrl: optionalUrl('partnerStoreUrl'),
})

export type ProductUpsertInput = z.infer<typeof ProductUpsertSchema>

/** Empty strings become `undefined` so Convex optional fields stay absent. */
export const normalizeProductInput = (input: ProductUpsertInput) => ({
  name: input.name,
  description: input.description?.trim() || undefined,
  type: input.type,
  imageUrl: input.imageUrl?.trim() || undefined,
  isActive: input.isActive,
  partnerStoreUrl: input.partnerStoreUrl?.trim() || undefined,
})
```

**Step 4: `article.ts`**

```ts
import { z } from 'zod'

import { LocaleSchema } from './locale'
import { PUBLISH_STATUSES } from './validators'

export const PublishStatusSchema = z.enum(PUBLISH_STATUSES)

export const ArticleTranslationInputSchema = z.object({
  locale: LocaleSchema,
  title: z.string().min(1),
  bodyMd: z.string().min(1),
  published: z.boolean().optional(),
})

export const ArticleUpsertSchema = z.object({
  status: PublishStatusSchema,
  translations: z.array(ArticleTranslationInputSchema).min(1),
})

export type ArticleTranslationInput = z.infer<typeof ArticleTranslationInputSchema>
export type ArticleUpsertInput = z.infer<typeof ArticleUpsertSchema>

/**
 * The Convex search index can only index one field, but the Prisma query it
 * replaces matched on title OR bodyMd. Concatenating both into one indexed
 * field preserves that behavior with a single index.
 */
export const buildSearchText = (title: string, bodyMd: string): string => `${title}\n${bodyMd}`
```

**Step 5: Verificar**

```bash
bun --filter @tv/domain typecheck
```
Expected: sem erros.

**Step 6: Commit**

```bash
git add packages/domain/src
git commit -m "feat(domain): port zod contracts from the single-app repo"
```

---

## Fase 3 — Backend Convex

### Task 3.1: Scaffold do `apps/backend`

**Objective:** Workspace do backend com Convex instalado.

**Files:**
- Create: `apps/backend/package.json`
- Create: `apps/backend/tsconfig.json`
- Create: `apps/backend/convex.json`

**Step 1: `apps/backend/package.json`**

```json
{
  "name": "@tv/backend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    "./api": "./convex/_generated/api.js",
    "./dataModel": "./convex/_generated/dataModel.d.ts",
    "./server": "./convex/_generated/server.js"
  },
  "scripts": {
    "convex:dev": "bunx convex dev",
    "convex:dev:once": "bunx convex dev --once",
    "convex:deploy:prod": "bunx convex deploy",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "check": "biome check .",
    "migrate:dry-run": "bun run scripts/migrate-from-postgres.ts --dry-run",
    "migrate:run": "bun run scripts/migrate-from-postgres.ts",
    "migrate:verify": "bun run scripts/verify-migration.ts"
  },
  "dependencies": {
    "@tv/domain": "*",
    "convex": "1.44.0",
    "convex-helpers": "^0.1.123",
    "effect": "4.0.0-beta.107",
    "mailersend": "^3.1.0"
  },
  "devDependencies": {
    "@edge-runtime/vm": "^5.0.0",
    "@effect/vitest": "4.0.0-beta.107",
    "convex-test": "^0.0.55",
    "pg": "^8.13.1",
    "@types/pg": "^8.11.10",
    "typescript": "5.9.3",
    "vitest": "^3.0.0"
  }
}
```

**Step 2: `apps/backend/convex.json`**

```json
{
  "functions": "convex/"
}
```

**Step 3: `apps/backend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["ES2022", "DOM"],
    "module": "Preserve",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "isolatedModules": true,
    "jsx": "react-jsx"
  },
  "include": ["convex/**/*.ts", "scripts/**/*.ts"],
  "exclude": ["convex/_generated"]
}
```

**Step 4: Instalar**

```bash
cd ~/Documents/GitHub/territoire-vibrant && bun install
```

**Step 5: Commit**

```bash
git add apps/backend
git commit -m "chore: scaffold @tv/backend workspace"
```

---

### Task 3.1b: Falhas tipadas do domínio

**Objective:** Um vocabulário único de falhas esperadas, traduzido para `ConvexError` só na borda.

**Files:**
- Create: `apps/backend/src/shared/errors.ts`

**Step 1: Escrever o arquivo**

```ts
import { Schema } from 'effect'

/**
 * The wire contract every client sees. Convex serializes `ConvexError.data`,
 * so this is the shape the web and Expo apps pattern-match on. `messageKey` is
 * an i18n key, never user-facing text — the copy and the locale belong to the
 * client, not the backend.
 */
export const APP_ERROR_CODES = [
  'AUTHENTICATION_REQUIRED',
  'AUTHORIZATION_FAILED',
  'RESOURCE_NOT_FOUND',
  'VALIDATION_FAILED',
  'CONFLICT',
  'EXTERNAL_SERVICE_UNAVAILABLE',
  'CONFIGURATION_ERROR',
  'INTERNAL_ERROR',
] as const

export type AppErrorCode = (typeof APP_ERROR_CODES)[number]
export type AppErrorDetail = string | number | boolean

export type AppErrorData = {
  code: AppErrorCode
  messageKey: string
  details?: Record<string, AppErrorDetail>
}

const ErrorFields = {
  messageKey: Schema.String,
  details: Schema.optional(Schema.Unknown),
}

export class AuthenticationRequired extends Schema.TaggedErrorClass<AuthenticationRequired>()(
  'AuthenticationRequired',
  ErrorFields
) {}

export class AuthorizationFailure extends Schema.TaggedErrorClass<AuthorizationFailure>()(
  'AuthorizationFailure',
  ErrorFields
) {}

export class ResourceNotFound extends Schema.TaggedErrorClass<ResourceNotFound>()(
  'ResourceNotFound',
  ErrorFields
) {}

export class ValidationFailure extends Schema.TaggedErrorClass<ValidationFailure>()(
  'ValidationFailure',
  ErrorFields
) {}

export class ConflictFailure extends Schema.TaggedErrorClass<ConflictFailure>()(
  'ConflictFailure',
  ErrorFields
) {}

export class ExternalServiceUnavailable extends Schema.TaggedErrorClass<ExternalServiceUnavailable>()(
  'ExternalServiceUnavailable',
  { ...ErrorFields, service: Schema.String, retryable: Schema.Boolean }
) {}

export class ConfigurationFailure extends Schema.TaggedErrorClass<ConfigurationFailure>()(
  'ConfigurationFailure',
  ErrorFields
) {}

export type AppError =
  | AuthenticationRequired
  | AuthorizationFailure
  | ResourceNotFound
  | ValidationFailure
  | ConflictFailure
  | ExternalServiceUnavailable
  | ConfigurationFailure

const errorCodeByTag: Record<AppError['_tag'], AppErrorCode> = {
  AuthenticationRequired: 'AUTHENTICATION_REQUIRED',
  AuthorizationFailure: 'AUTHORIZATION_FAILED',
  ResourceNotFound: 'RESOURCE_NOT_FOUND',
  ValidationFailure: 'VALIDATION_FAILED',
  ConflictFailure: 'CONFLICT',
  ExternalServiceUnavailable: 'EXTERNAL_SERVICE_UNAVAILABLE',
  ConfigurationFailure: 'CONFIGURATION_ERROR',
}

const isDetail = (value: unknown): value is AppErrorDetail =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'

/** Drops anything that is not a primitive so an error can never leak an object. */
const sanitizeDetails = (details: unknown): Record<string, AppErrorDetail> | undefined => {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return undefined
  const entries = Object.entries(details).filter((entry): entry is [string, AppErrorDetail] =>
    isDetail(entry[1])
  )
  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

export const toAppErrorData = (error: AppError): AppErrorData => {
  const details = sanitizeDetails(error.details)
  return {
    code: errorCodeByTag[error._tag],
    messageKey: error.messageKey,
    ...(details ? { details } : {}),
  }
}

/** Defects never reach the client as themselves — they collapse to this. */
export const internalAppErrorData = (): AppErrorData => ({
  code: 'INTERNAL_ERROR',
  messageKey: 'errors.internal',
})
```

**Step 2: Verificar**

```bash
bun --filter @tv/backend typecheck
```

**Step 3: Commit**

```bash
git add apps/backend/src/shared/errors.ts
git commit -m "feat(backend): add typed domain failures"
```

---

### Task 3.1c: Runtime e layers

**Objective:** Um `ManagedRuntime` por isolate, com a tradução de falhas na borda do Convex.

**Files:**
- Create: `apps/backend/src/runtime.ts`
- Create: `apps/backend/src/layers.ts`
- Create: `apps/backend/convex/lib/effect-runtime.ts`

**Step 1: `src/runtime.ts`**

```ts
import { Layer, ManagedRuntime } from 'effect'

/**
 * Shared memo map so layers are built once per isolate rather than once per
 * runtime construction.
 */
const appMemoMap = Layer.makeMemoMapUnsafe()

export const makeAppRuntime = <R>(layer: Layer.Layer<R>) =>
  ManagedRuntime.make(layer, { memoMap: appMemoMap })
```

**Step 2: `src/layers.ts`**

```ts
import { Layer } from 'effect'

import { EmailService } from './leads/EmailService'

export type BackendServices = EmailService

/** Services available in the Convex V8 isolate. */
export const BackendLive = Layer.mergeAll(EmailService.layer)

/**
 * Services that need Node. MailerSend's SDK does, so the email port is only
 * live in `'use node'` actions; the isolate gets a stub that fails loudly.
 */
export const BackendNodeLive = Layer.mergeAll(EmailService.nodeLayer)
```

**Step 3: `convex/lib/effect-runtime.ts`**

```ts
import { ConvexError } from 'convex/values'
import { Cause, type Effect } from 'effect'

import { BackendLive, BackendNodeLive, type BackendServices } from '../../src/layers'
import { makeAppRuntime } from '../../src/runtime'
import {
  type AppError,
  type AppErrorData,
  internalAppErrorData,
  toAppErrorData,
} from '../../src/shared/errors'

const isolateRuntime = makeAppRuntime(BackendLive)
const nodeRuntime = makeAppRuntime(BackendNodeLive)

/**
 * The single place a domain program becomes a Convex response. Expected
 * failures cross the wire as structured `ConvexError` data the clients can
 * match on; defects are logged and collapsed so an internal message never
 * reaches a user.
 *
 * Convex exposes no isolate shutdown hook, so the runtime is never disposed —
 * do not register resources that need explicit teardown.
 */
const runWith =
  (runtime: ReturnType<typeof makeAppRuntime>) =>
  async <A>(program: Effect.Effect<A, AppError, BackendServices>): Promise<A> => {
    const exit = await runtime.runPromiseExit(program)
    if (exit._tag === 'Success') return exit.value

    const failure = exit.cause.reasons.find(Cause.isFailReason)
    if (failure) {
      throw new ConvexError<AppErrorData>(toAppErrorData(failure.error))
    }

    console.error('Unexpected Effect defect', Cause.pretty(exit.cause))
    throw new ConvexError<AppErrorData>(internalAppErrorData())
  }

export const runEffect = runWith(isolateRuntime)
export const runNodeEffect = runWith(nodeRuntime)
```

**Step 4: Verificar**

```bash
bun --filter @tv/backend typecheck
```
Expected: falha apontando para `./leads/EmailService`, que ainda não existe — é o próximo passo. Se falhar por outro motivo, pare.

**Step 5: Commit**

```bash
git add apps/backend/src/runtime.ts apps/backend/src/layers.ts apps/backend/convex/lib/effect-runtime.ts
git commit -m "feat(backend): add effect runtime and convex failure boundary"
```

---

### Task 3.1d: Domínios `content` e `catalog` (regras puras)

**Objective:** As decisões de negócio saem dos handlers e viram funções puras testáveis sem Convex.

**Files:**
- Create: `apps/backend/src/content/policy.ts`
- Create: `apps/backend/src/content/policy.test.ts`
- Create: `apps/backend/src/catalog/policy.ts`

**Step 1: `src/content/policy.ts`**

```ts
import type { Locale } from '@tv/domain/locale'

/**
 * Pure content rules. No Effect wrapper: these are deterministic decisions,
 * and wrapping a decision in `Effect.succeed` to match its neighbours is the
 * cerimony the AGENTS.md forbids. Effect shows up where coordination does.
 */

export type TranslationLike = {
  locale: Locale
  title: string
  bodyMd: string
  published: boolean
}

/**
 * The locale fallback the article page implements inline today: prefer the
 * requested locale, fall back to any published translation. Extracted so the
 * web and Expo clients cannot drift apart on it.
 */
export const selectTranslation = <T extends TranslationLike>(
  translations: readonly T[],
  locale: Locale
): T | undefined =>
  translations.find((candidate) => candidate.locale === locale && candidate.published) ??
  translations.find((candidate) => candidate.published) ??
  translations[0]

/** The Convex search index takes one field; Prisma matched title OR bodyMd. */
export const buildSearchText = (title: string, bodyMd: string): string => `${title}\n${bodyMd}`

export const isVisible = (status: string): boolean => status === 'PUBLISHED'
```

**Step 2: `src/content/policy.test.ts`**

```ts
import { describe, expect, it } from 'vitest'

import { buildSearchText, selectTranslation } from './policy'

const translation = (locale: 'fr' | 'en', published: boolean) => ({
  locale,
  title: `${locale} title`,
  bodyMd: 'body',
  published,
})

describe('selectTranslation', () => {
  it('prefers the requested locale when it is published', () => {
    const result = selectTranslation([translation('fr', true), translation('en', true)], 'en')
    expect(result?.locale).toBe('en')
  })

  it('falls back to any published translation', () => {
    const result = selectTranslation([translation('fr', true), translation('en', false)], 'en')
    expect(result?.locale).toBe('fr')
  })

  it('returns the first translation when none are published', () => {
    const result = selectTranslation([translation('fr', false)], 'en')
    expect(result?.locale).toBe('fr')
  })

  it('returns undefined for an article with no translations', () => {
    expect(selectTranslation([], 'fr')).toBeUndefined()
  })
})

describe('buildSearchText', () => {
  it('indexes the title and the body together', () => {
    expect(buildSearchText('Territoire', 'cartographie')).toBe('Territoire\ncartographie')
  })
})
```

**Step 3: `src/catalog/policy.ts`**

```ts
import { DEFAULT_CURRENCY, toCents } from '@tv/domain/money'

import { ValidationFailure } from '../shared/errors'
import type { ProductType } from '@tv/domain/validators'

export type ProductWrite = {
  name: string
  description?: string
  priceCents: number
  currency: string
  imageUrl?: string
  type: ProductType
  isActive: boolean
  partnerStoreUrl?: string
}

/**
 * Prices arrive as decimals from an admin form and are stored as integer
 * cents. Rejecting a non-finite or negative price here means no handler has to
 * remember to.
 */
export const toProductWrite = (input: {
  name: string
  description?: string
  price: number
  type: ProductType
  imageUrl?: string
  isActive: boolean
  partnerStoreUrl?: string
}): ProductWrite | ValidationFailure => {
  if (!Number.isFinite(input.price) || input.price <= 0) {
    return new ValidationFailure({
      messageKey: 'errors.product.invalidPrice',
      details: { price: input.price },
    })
  }

  return {
    name: input.name,
    description: input.description?.trim() || undefined,
    priceCents: toCents(input.price),
    currency: DEFAULT_CURRENCY,
    imageUrl: input.imageUrl?.trim() || undefined,
    type: input.type,
    isActive: input.isActive,
    partnerStoreUrl: input.partnerStoreUrl?.trim() || undefined,
  }
}

/** Related products: same type, active, excluding the current one. */
export const selectRelated = <T extends { _id: string; type: ProductType }>(
  candidates: readonly T[],
  current: T,
  limit = 4
): T[] =>
  candidates
    .filter((candidate) => candidate._id !== current._id && candidate.type === current.type)
    .slice(0, limit)
```

**Step 4: Rodar os testes**

```bash
bun --filter @tv/backend test -- src/content/policy.test.ts
```
Expected: 5 passed.

**Step 5: Commit**

```bash
git add apps/backend/src/content apps/backend/src/catalog
git commit -m "feat(backend): extract content and catalog policy as pure rules"
```

---

### Task 3.1e: `EmailService` como port Effect

**Objective:** A integração com MailerSend vira uma capability injetada, com falha tipada e retry limitado.

**Files:**
- Create: `apps/backend/src/leads/EmailService.ts`

**Step 1: Escrever o arquivo**

```ts
import { Context, Effect, Layer, Schedule } from 'effect'

import type { Locale } from '@tv/domain/locale'
import { ConfigurationFailure, ExternalServiceUnavailable } from '../shared/errors'

export type EbookEmail = { email: string; name: string; locale: Locale }
export type ContactEmail = { email: string; name: string; subject: string; message: string }

/**
 * The email port. A capability, not a vendor: the domain asks for "send the
 * ebook", and which SDK does it is a Layer decision. That is what makes the
 * lead workflow testable without a network.
 */
export class EmailService extends Context.Service<EmailService>()('EmailService', {
  effect: Effect.gen(function* () {
    return {
      sendEbook: (_input: EbookEmail) =>
        Effect.fail(
          new ConfigurationFailure({ messageKey: 'errors.email.unavailableInIsolate' })
        ),
      sendContact: (_input: ContactEmail) =>
        Effect.fail(
          new ConfigurationFailure({ messageKey: 'errors.email.unavailableInIsolate' })
        ),
    }
  }),
}) {
  /**
   * The V8 isolate cannot run the MailerSend SDK, so the default layer fails
   * loudly rather than silently doing nothing. Anything that actually sends
   * mail runs in a `'use node'` action against `nodeLayer`.
   */
  static readonly layer = Layer.effect(EmailService)(EmailService.make)

  static readonly nodeLayer = Layer.effect(EmailService)(
    Effect.gen(function* () {
      const apiKey = process.env.MAILERSEND_API_KEY
      if (!apiKey) {
        return yield* Effect.fail(
          new ConfigurationFailure({ messageKey: 'errors.email.missingApiKey' })
        )
      }

      const { MailerSend, EmailParams, Recipient, Sender } = yield* Effect.promise(
        () => import('mailersend')
      )

      const mailer = new MailerSend({ apiKey })
      const from = new Sender(
        process.env.MAILERSEND_FROM_EMAIL ?? 'macneves@territoirevibrant.ca',
        'Territoire Vibrant'
      )

      /** Transient transport failures only — never a rejected payload. */
      const retryPolicy = Schedule.exponential('200 millis').pipe(Schedule.compose(Schedule.recurs(2)))

      const send = (params: InstanceType<typeof EmailParams>, operation: string) =>
        Effect.tryPromise({
          try: () => mailer.email.send(params),
          catch: (cause) =>
            new ExternalServiceUnavailable({
              messageKey: 'errors.email.sendFailed',
              service: 'mailersend',
              retryable: true,
              details: { operation },
            }),
        }).pipe(Effect.retry(retryPolicy))

      return {
        sendEbook: (input: EbookEmail) =>
          send(
            new EmailParams()
              .setFrom(from)
              .setTo([new Recipient(input.email, input.name)])
              .setSubject('Territoire Vibrant')
              .setHtml(`<p>Bonjour ${input.name}</p>`),
            'sendEbook'
          ),

        sendContact: (input: ContactEmail) =>
          send(
            new EmailParams()
              .setFrom(from)
              .setTo([
                new Recipient(process.env.CONTACT_EMAIL ?? 'macneves@territoirevibrant.ca'),
              ])
              .setReplyTo(new Recipient(input.email, input.name))
              .setSubject(`[${input.subject}] ${input.name}`)
              .setText(input.message),
            'sendContact'
          ),
      }
    })
  )
}
```

> ⚠️ O corpo dos e-mails acima é esqueleto. Antes do cutover, porte os templates reais de `src/server/email/mailersend.ts`, preservando os textos por locale exatamente como estão hoje.

**Step 2: Verificar**

```bash
bun --filter @tv/backend typecheck
```
Expected: agora limpo — `src/layers.ts` encontra o `EmailService`.

**Step 3: Commit**

```bash
git add apps/backend/src/leads/EmailService.ts
git commit -m "feat(backend): add email capability as an effect port"
```

---

### Task 3.2: Configurar auth do Convex com Clerk

**Objective:** Convex aceita e valida tokens Clerk.

**Files:**
- Create: `apps/backend/convex/auth.config.ts`

**Step 1: Escrever o arquivo (idêntico ao rawanimalapp)**

```ts
import type { AuthConfig } from 'convex/server'

export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: 'convex',
    },
  ],
} satisfies AuthConfig
```

**Step 2: Criar o deployment de dev e setar a variável**

```bash
cd apps/backend
bunx convex dev --once
```
Expected: cria o projeto/deployment e escreve `CONVEX_DEPLOYMENT` + `NEXT_PUBLIC_CONVEX_URL` num `.env.local`.

```bash
bunx convex env set CLERK_JWT_ISSUER_DOMAIN "<a Issuer URL da Task 0.3>"
```

**Step 3: Verificar**

```bash
bunx convex env list
```
Expected: `CLERK_JWT_ISSUER_DOMAIN` aparece na lista.

**Step 4: Commit**

```bash
git add apps/backend/convex/auth.config.ts
git commit -m "feat(backend): wire clerk jwt validation into convex"
```

---

### Task 3.3: Schema do Convex

**Objective:** As 5 tabelas com os índices que as queries exigem.

**Files:**
- Create: `apps/backend/convex/schema.ts`

**Step 1: Escrever o schema**

```ts
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

import {
  LeadDeliveryStatusValidator,
  LocaleValidator,
  ProductTypeValidator,
  PublishStatusValidator,
} from '@tv/domain/validators'

/**
 * `legacyId` carries the Postgres UUID of every migrated row. Public article
 * and product URLs contain that UUID today, so dropping it would break every
 * indexed and shared link at cutover. It is optional because rows created
 * after the migration have no legacy identity.
 *
 * `createdAt`/`updatedAt` are explicit rather than relying on `_creationTime`,
 * which Convex sets at insert time and cannot be backdated during an import.
 */
export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    clerkUserId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    isAdmin: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_token', ['tokenIdentifier'])
    .index('by_clerkUserId', ['clerkUserId'])
    .index('by_email', ['email']),

  articles: defineTable({
    legacyId: v.optional(v.string()),
    status: PublishStatusValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_legacyId', ['legacyId'])
    .index('by_createdAt', ['createdAt'])
    .index('by_status_createdAt', ['status', 'createdAt']),

  articleTranslations: defineTable({
    legacyId: v.optional(v.string()),
    articleId: v.id('articles'),
    locale: LocaleValidator,
    title: v.string(),
    bodyMd: v.string(),
    published: v.boolean(),
    searchText: v.string(),
  })
    .index('by_legacyId', ['legacyId'])
    .index('by_article', ['articleId'])
    .index('by_article_locale', ['articleId', 'locale'])
    .index('by_locale_published', ['locale', 'published'])
    .searchIndex('search_content', {
      searchField: 'searchText',
      filterFields: ['locale', 'published'],
    }),

  products: defineTable({
    legacyId: v.optional(v.string()),
    name: v.string(),
    description: v.optional(v.string()),
    priceCents: v.number(),
    currency: v.string(),
    imageUrl: v.optional(v.string()),
    type: ProductTypeValidator,
    isActive: v.boolean(),
    partnerStoreUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_legacyId', ['legacyId'])
    .index('by_updatedAt', ['updatedAt'])
    .index('by_isActive_createdAt', ['isActive', 'createdAt']),

  leads: defineTable({
    legacyId: v.optional(v.string()),
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    locale: v.optional(LocaleValidator),
    deliveryStatus: v.optional(LeadDeliveryStatusValidator),
    createdAt: v.number(),
  })
    .index('by_legacyId', ['legacyId'])
    .index('by_email', ['email'])
    .index('by_createdAt', ['createdAt']),
})
```

**Step 2: Empurrar o schema**

```bash
cd apps/backend && bunx convex dev --once
```
Expected: `Convex functions ready` sem erro de schema.

**Step 3: Verificar os índices no dashboard**

```bash
bunx convex dashboard
```
Confirme que as 5 tabelas existem e que `articleTranslations` tem o search index `search_content`.

**Step 4: Commit**

```bash
git add apps/backend/convex/schema.ts
git commit -m "feat(backend): define convex schema mirroring the prisma models"
```

---

### Task 3.4: Helpers de autenticação

**Objective:** `requireAuth` e `requireAdmin` server-side, sem confiar em nada vindo do cliente.

**Files:**
- Create: `apps/backend/convex/helpers/auth.ts`

**Step 1: Escrever o arquivo**

```ts
import { ConvexError } from 'convex/values'

import type { ActionCtx, MutationCtx, QueryCtx } from '../_generated/server'

export const requireAuth = async (ctx: QueryCtx | MutationCtx | ActionCtx) => {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new ConvexError({ code: 'UNAUTHENTICATED' })
  }
  return identity
}

/**
 * `isAdmin` lives on the user's own row and is set by hand in the Convex
 * dashboard. Reading it server-side on every call means a forged or stale
 * client claim can never reach an admin mutation. The Clerk session claim is
 * still used in the web proxy, but only to decide what to render.
 */
export const requireAdmin = async (ctx: QueryCtx | MutationCtx) => {
  const identity = await requireAuth(ctx)

  const user = await ctx.db
    .query('users')
    .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier))
    .unique()

  if (!user?.isAdmin) {
    throw new ConvexError({ code: 'FORBIDDEN' })
  }

  return { identity, user }
}
```

**Step 2: Verificar**

```bash
bun --filter @tv/backend typecheck
```

**Step 3: Commit**

```bash
git add apps/backend/convex/helpers/auth.ts
git commit -m "feat(backend): add server-side auth and admin guards"
```

---

### Task 3.5: Teste falhando para `users.store`

**Objective:** TDD do bootstrap de usuário.

**Files:**
- Create: `apps/backend/vitest.config.ts`
- Create: `apps/backend/convex/users.test.ts`

**Step 1: `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'edge-runtime',
    server: { deps: { inline: ['convex-test'] } },
  },
})
```

**Step 2: Escrever o teste**

```ts
// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'

import { api } from './_generated/api'
import schema from './schema'

const identity = {
  tokenIdentifier: 'https://clerk.test|user_abc',
  subject: 'user_abc',
  issuer: 'https://clerk.test',
  email: 'someone@example.com',
  name: 'Someone',
}

describe('users.store', () => {
  it('creates the user row on first call', async () => {
    const t = convexTest(schema)
    const asUser = t.withIdentity(identity)

    await asUser.mutation(api.users.store, {})
    const user = await asUser.query(api.users.getCurrent, {})

    expect(user?.clerkUserId).toBe('user_abc')
    expect(user?.email).toBe('someone@example.com')
    expect(user?.isAdmin).toBeFalsy()
  })

  it('is idempotent across repeated calls', async () => {
    const t = convexTest(schema)
    const asUser = t.withIdentity(identity)

    await asUser.mutation(api.users.store, {})
    await asUser.mutation(api.users.store, {})

    const rows = await t.run(async (ctx) => ctx.db.query('users').collect())
    expect(rows).toHaveLength(1)
  })

  it('rejects an unauthenticated caller', async () => {
    const t = convexTest(schema)
    await expect(t.mutation(api.users.store, {})).rejects.toThrow()
  })
})
```

**Step 3: Rodar e confirmar que falha**

```bash
bun --filter @tv/backend test -- convex/users.test.ts
```
Expected: FAIL — `api.users` não existe.

**Step 4: Commit**

```bash
git add apps/backend/vitest.config.ts apps/backend/convex/users.test.ts
git commit -m "test(backend): add failing spec for user bootstrap"
```

---

### Task 3.6: Implementar `users.ts`

**Objective:** Fazer a Task 3.5 passar.

**Files:**
- Create: `apps/backend/convex/users.ts`

**Step 1: Escrever o arquivo**

```ts
import { mutation, query } from './_generated/server'
import { requireAuth } from './helpers/auth'

/**
 * Replaces the Prisma upsert that ran inside the tRPC context and again in the
 * locale layout on every render. Called once from a client bootstrap component
 * after authentication settles, so it no longer sits on the render path.
 */
export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireAuth(ctx)
    const now = Date.now()

    const existing = await ctx.db
      .query('users')
      .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .unique()

    if (existing) {
      const patch = {
        email: identity.email ?? existing.email,
        name: identity.name ?? existing.name,
        imageUrl: identity.pictureUrl ?? existing.imageUrl,
        updatedAt: now,
      }
      await ctx.db.patch(existing._id, patch)
      return existing._id
    }

    return ctx.db.insert('users', {
      tokenIdentifier: identity.tokenIdentifier,
      clerkUserId: identity.subject,
      email: identity.email,
      name: identity.name,
      imageUrl: identity.pictureUrl,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    return ctx.db
      .query('users')
      .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .unique()
  },
})
```

**Step 2: Rodar o teste**

```bash
bun --filter @tv/backend test -- convex/users.test.ts
```
Expected: 3 passed.

**Step 3: Commit**

```bash
git add apps/backend/convex/users.ts
git commit -m "feat(backend): add convex user bootstrap"
```

---

### Task 3.7: Teste falhando para as queries de artigo

**Objective:** Fixar o comportamento das 6 procedures do `articleRouter` antes de escrevê-las.

**Files:**
- Create: `apps/backend/convex/articles.test.ts`

**Step 1: Escrever o teste**

```ts
// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'

import { api } from './_generated/api'
import schema from './schema'

const adminIdentity = {
  tokenIdentifier: 'https://clerk.test|admin_1',
  subject: 'admin_1',
  issuer: 'https://clerk.test',
  email: 'admin@example.com',
}

const seedAdmin = async (t: ReturnType<typeof convexTest>) => {
  await t.run(async (ctx) => {
    await ctx.db.insert('users', {
      tokenIdentifier: adminIdentity.tokenIdentifier,
      clerkUserId: adminIdentity.subject,
      email: adminIdentity.email,
      isAdmin: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  })
}

describe('articles', () => {
  it('creates an article with its translations', async () => {
    const t = convexTest(schema)
    await seedAdmin(t)
    const asAdmin = t.withIdentity(adminIdentity)

    const articleId = await asAdmin.mutation(api.articles.create, {
      status: 'PUBLISHED',
      translations: [
        { locale: 'fr', title: 'Bonjour', bodyMd: 'Corps français', published: true },
        { locale: 'en', title: 'Hello', bodyMd: 'English body', published: true },
      ],
    })

    const article = await t.query(api.articles.getById, { articleId })
    expect(article?.status).toBe('PUBLISHED')
    expect(article?.translations).toHaveLength(2)
  })

  it('rejects a non-admin creating an article', async () => {
    const t = convexTest(schema)
    await expect(
      t.mutation(api.articles.create, {
        status: 'DRAFT',
        translations: [{ locale: 'fr', title: 'x', bodyMd: 'y' }],
      })
    ).rejects.toThrow()
  })

  it('upserts translations on update instead of duplicating them', async () => {
    const t = convexTest(schema)
    await seedAdmin(t)
    const asAdmin = t.withIdentity(adminIdentity)

    const articleId = await asAdmin.mutation(api.articles.create, {
      status: 'DRAFT',
      translations: [{ locale: 'fr', title: 'v1', bodyMd: 'corps', published: false }],
    })

    await asAdmin.mutation(api.articles.update, {
      articleId,
      status: 'PUBLISHED',
      translations: [{ locale: 'fr', title: 'v2', bodyMd: 'corps', published: true }],
    })

    const article = await t.query(api.articles.getById, { articleId })
    expect(article?.translations).toHaveLength(1)
    expect(article?.translations[0]?.title).toBe('v2')
    expect(article?.status).toBe('PUBLISHED')
  })

  it('lists only published articles for the public feed', async () => {
    const t = convexTest(schema)
    await seedAdmin(t)
    const asAdmin = t.withIdentity(adminIdentity)

    await asAdmin.mutation(api.articles.create, {
      status: 'PUBLISHED',
      translations: [{ locale: 'fr', title: 'visible', bodyMd: 'a', published: true }],
    })
    await asAdmin.mutation(api.articles.create, {
      status: 'DRAFT',
      translations: [{ locale: 'fr', title: 'hidden', bodyMd: 'b', published: false }],
    })

    const published = await t.query(api.articles.listPublished, {})
    expect(published).toHaveLength(1)
    expect(published[0]?.translations[0]?.title).toBe('visible')
  })

  it('finds an article by its legacy postgres id', async () => {
    const t = convexTest(schema)
    const legacyId = '11111111-2222-3333-4444-555555555555'

    await t.run(async (ctx) => {
      const articleId = await ctx.db.insert('articles', {
        legacyId,
        status: 'PUBLISHED',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      await ctx.db.insert('articleTranslations', {
        articleId,
        locale: 'fr',
        title: 'Legacy',
        bodyMd: 'corps',
        published: true,
        searchText: 'Legacy\ncorps',
      })
    })

    const article = await t.query(api.articles.getByAnyId, { id: legacyId })
    expect(article?.translations[0]?.title).toBe('Legacy')
  })

  it('searches across title and body', async () => {
    const t = convexTest(schema)
    await seedAdmin(t)
    const asAdmin = t.withIdentity(adminIdentity)

    await asAdmin.mutation(api.articles.create, {
      status: 'PUBLISHED',
      translations: [
        { locale: 'fr', title: 'Territoire', bodyMd: 'parle de cartographie', published: true },
      ],
    })

    const byTitle = await t.query(api.articles.search, { query: 'Territoire' })
    const byBody = await t.query(api.articles.search, { query: 'cartographie' })

    expect(byTitle).toHaveLength(1)
    expect(byBody).toHaveLength(1)
  })
})
```

**Step 2: Confirmar a falha**

```bash
bun --filter @tv/backend test -- convex/articles.test.ts
```
Expected: FAIL — `api.articles` não existe.

**Step 3: Commit**

```bash
git add apps/backend/convex/articles.test.ts
git commit -m "test(backend): specify article query and mutation behavior"
```

---

### Task 3.8: Implementar `articles.ts`

**Objective:** Substituir o `articleRouter` inteiro.

**Files:**
- Create: `apps/backend/convex/articles.ts`

**Step 1: Escrever o arquivo**

```ts
import { buildSearchText } from '@tv/domain/article'
import { LocaleValidator, PublishStatusValidator } from '@tv/domain/validators'
import { v } from 'convex/values'

import type { Doc, Id } from './_generated/dataModel'
import { mutation, type QueryCtx, query } from './_generated/server'
import { requireAdmin } from './helpers/auth'

const translationInput = v.object({
  locale: LocaleValidator,
  title: v.string(),
  bodyMd: v.string(),
  published: v.optional(v.boolean()),
})

const withTranslations = async (ctx: QueryCtx, article: Doc<'articles'>) => ({
  ...article,
  translations: await ctx.db
    .query('articleTranslations')
    .withIndex('by_article', (q) => q.eq('articleId', article._id))
    .collect(),
})

/** Public feed. Replaces `article.getAll` filtered down to what visitors may see. */
export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    const articles = await ctx.db
      .query('articles')
      .withIndex('by_status_createdAt', (q) => q.eq('status', 'PUBLISHED'))
      .order('desc')
      .collect()

    const hydrated = await Promise.all(articles.map((article) => withTranslations(ctx, article)))
    return hydrated.map((article) => ({
      ...article,
      translations: article.translations.filter((translation) => translation.published),
    }))
  },
})

/** Admin listing. Every article regardless of status, newest first. */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)
    const articles = await ctx.db.query('articles').withIndex('by_createdAt').order('desc').collect()
    return Promise.all(articles.map((article) => withTranslations(ctx, article)))
  },
})

export const getById = query({
  args: { articleId: v.id('articles') },
  handler: async (ctx, args) => {
    const article = await ctx.db.get(args.articleId)
    return article ? withTranslations(ctx, article) : null
  },
})

/**
 * Resolves an article by its Convex id or by the Postgres UUID it carried
 * before the migration, so links published before cutover keep working.
 */
export const getByAnyId = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const byLegacy = await ctx.db
      .query('articles')
      .withIndex('by_legacyId', (q) => q.eq('legacyId', args.id))
      .unique()

    if (byLegacy) return withTranslations(ctx, byLegacy)

    const article = await ctx.db.get(args.id as Id<'articles'>).catch(() => null)
    return article ? withTranslations(ctx, article) : null
  },
})

/**
 * Replaces the Prisma `contains` query that scanned title and bodyMd. Convex
 * search indexes one field, so both live in the denormalized `searchText`.
 */
export const search = query({
  args: { query: v.string(), locale: v.optional(LocaleValidator) },
  handler: async (ctx, args) => {
    const trimmed = args.query.trim()
    if (!trimmed) return []

    const matches = await ctx.db
      .query('articleTranslations')
      .withSearchIndex('search_content', (q) => {
        const base = q.search('searchText', trimmed).eq('published', true)
        return args.locale ? base.eq('locale', args.locale) : base
      })
      .take(50)

    const byArticle = new Map<Id<'articles'>, Doc<'articleTranslations'>[]>()
    for (const match of matches) {
      const list = byArticle.get(match.articleId) ?? []
      list.push(match)
      byArticle.set(match.articleId, list)
    }

    const results = await Promise.all(
      [...byArticle.entries()].map(async ([articleId, translations]) => {
        const article = await ctx.db.get(articleId)
        if (!article || article.status !== 'PUBLISHED') return null
        return { ...article, translations }
      })
    )

    return results
      .filter((result): result is NonNullable<typeof result> => result !== null)
      .sort((a, b) => b.createdAt - a.createdAt)
  },
})

export const create = mutation({
  args: { status: PublishStatusValidator, translations: v.array(translationInput) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const now = Date.now()

    const articleId = await ctx.db.insert('articles', {
      status: args.status,
      createdAt: now,
      updatedAt: now,
    })

    for (const translation of args.translations) {
      await ctx.db.insert('articleTranslations', {
        articleId,
        locale: translation.locale,
        title: translation.title,
        bodyMd: translation.bodyMd,
        published: translation.published ?? false,
        searchText: buildSearchText(translation.title, translation.bodyMd),
      })
    }

    return articleId
  },
})

export const update = mutation({
  args: {
    articleId: v.id('articles'),
    status: PublishStatusValidator,
    translations: v.array(translationInput),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    await ctx.db.patch(args.articleId, { status: args.status, updatedAt: Date.now() })

    for (const translation of args.translations) {
      const existing = await ctx.db
        .query('articleTranslations')
        .withIndex('by_article_locale', (q) =>
          q.eq('articleId', args.articleId).eq('locale', translation.locale)
        )
        .unique()

      const fields = {
        title: translation.title,
        bodyMd: translation.bodyMd,
        published: translation.published ?? false,
        searchText: buildSearchText(translation.title, translation.bodyMd),
      }

      if (existing) {
        await ctx.db.patch(existing._id, fields)
      } else {
        await ctx.db.insert('articleTranslations', {
          articleId: args.articleId,
          locale: translation.locale,
          ...fields,
        })
      }
    }

    return args.articleId
  },
})

/** Prisma had `onDelete: Cascade`; Convex has no foreign keys, so it is explicit. */
export const remove = mutation({
  args: { articleId: v.id('articles') },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const translations = await ctx.db
      .query('articleTranslations')
      .withIndex('by_article', (q) => q.eq('articleId', args.articleId))
      .collect()

    for (const translation of translations) {
      await ctx.db.delete(translation._id)
    }

    await ctx.db.delete(args.articleId)
  },
})
```

**Step 2: Rodar os testes**

```bash
bun --filter @tv/backend test -- convex/articles.test.ts
```
Expected: 6 passed.

**Step 3: Commit**

```bash
git add apps/backend/convex/articles.ts
git commit -m "feat(backend): replace the article trpc router with convex functions"
```

---

### Task 3.9: Teste falhando para produtos

**Objective:** Fixar o comportamento do `productRouter`, incluindo o gate de admin.

**Files:**
- Create: `apps/backend/convex/products.test.ts`

**Step 1: Escrever o teste**

```ts
// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'

import { api } from './_generated/api'
import schema from './schema'

const adminIdentity = {
  tokenIdentifier: 'https://clerk.test|admin_1',
  subject: 'admin_1',
  issuer: 'https://clerk.test',
  email: 'admin@example.com',
}

const seedAdmin = (t: ReturnType<typeof convexTest>) =>
  t.run(async (ctx) => {
    await ctx.db.insert('users', {
      tokenIdentifier: adminIdentity.tokenIdentifier,
      clerkUserId: adminIdentity.subject,
      email: adminIdentity.email,
      isAdmin: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  })

describe('products', () => {
  it('stores the price as integer cents', async () => {
    const t = convexTest(schema)
    await seedAdmin(t)
    const asAdmin = t.withIdentity(adminIdentity)

    const productId = await asAdmin.mutation(api.products.create, {
      name: 'Livro',
      price: 89.9,
      type: 'PHYSICAL',
      isActive: true,
    })

    const product = await asAdmin.query(api.products.getById, { productId })
    expect(product?.priceCents).toBe(8990)
    expect(product?.currency).toBe('CAD')
  })

  it('hides inactive products from the public listing', async () => {
    const t = convexTest(schema)
    await seedAdmin(t)
    const asAdmin = t.withIdentity(adminIdentity)

    await asAdmin.mutation(api.products.create, {
      name: 'Ativo',
      price: 10,
      type: 'DIGITAL',
      isActive: true,
    })
    await asAdmin.mutation(api.products.create, {
      name: 'Inativo',
      price: 10,
      type: 'DIGITAL',
      isActive: false,
    })

    const listed = await t.query(api.products.listActive, {})
    expect(listed).toHaveLength(1)
    expect(listed[0]?.name).toBe('Ativo')
  })

  it('rejects a non-admin listing every product', async () => {
    const t = convexTest(schema)
    await expect(t.query(api.products.listAll, {})).rejects.toThrow()
  })
})
```

**Step 2: Confirmar a falha**

```bash
bun --filter @tv/backend test -- convex/products.test.ts
```
Expected: FAIL.

**Step 3: Commit**

```bash
git add apps/backend/convex/products.test.ts
git commit -m "test(backend): specify product pricing and visibility rules"
```

---

### Task 3.10: Implementar `products.ts`

**Files:**
- Create: `apps/backend/convex/products.ts`

**Step 1: Escrever o arquivo**

```ts
import { DEFAULT_CURRENCY, toCents } from '@tv/domain/money'
import { ProductTypeValidator } from '@tv/domain/validators'
import { v } from 'convex/values'

import type { Id } from './_generated/dataModel'
import { mutation, query } from './_generated/server'
import { requireAdmin } from './helpers/auth'

const productFields = {
  name: v.string(),
  description: v.optional(v.string()),
  price: v.number(),
  type: ProductTypeValidator,
  imageUrl: v.optional(v.string()),
  isActive: v.boolean(),
  partnerStoreUrl: v.optional(v.string()),
}

/** Public shop listing. Replaces the direct `db.product.findMany` in shop/page.tsx. */
export const listActive = query({
  args: {},
  handler: (ctx) =>
    ctx.db
      .query('products')
      .withIndex('by_isActive_createdAt', (q) => q.eq('isActive', true))
      .order('desc')
      .collect(),
})

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)
    return ctx.db.query('products').withIndex('by_updatedAt').order('desc').collect()
  },
})

export const getById = query({
  args: { productId: v.id('products') },
  handler: (ctx, args) => ctx.db.get(args.productId),
})

export const getByAnyId = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const byLegacy = await ctx.db
      .query('products')
      .withIndex('by_legacyId', (q) => q.eq('legacyId', args.id))
      .unique()

    if (byLegacy) return byLegacy
    return ctx.db.get(args.id as Id<'products'>).catch(() => null)
  },
})

/** Related products for the detail page: same type, active, excluding the current one. */
export const listRelated = query({
  args: { productId: v.id('products'), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const current = await ctx.db.get(args.productId)
    if (!current) return []

    const candidates = await ctx.db
      .query('products')
      .withIndex('by_isActive_createdAt', (q) => q.eq('isActive', true))
      .order('desc')
      .collect()

    return candidates
      .filter((product) => product._id !== args.productId && product.type === current.type)
      .slice(0, args.limit ?? 4)
  },
})

export const create = mutation({
  args: productFields,
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const now = Date.now()
    const { price, ...rest } = args

    return ctx.db.insert('products', {
      ...rest,
      priceCents: toCents(price),
      currency: DEFAULT_CURRENCY,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const update = mutation({
  args: { productId: v.id('products'), ...productFields },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const { productId, price, ...rest } = args

    await ctx.db.patch(productId, {
      ...rest,
      priceCents: toCents(price),
      updatedAt: Date.now(),
    })

    return productId
  },
})
```

**Step 2: Rodar os testes**

```bash
bun --filter @tv/backend test -- convex/products.test.ts
```
Expected: 3 passed.

**Step 3: Commit**

```bash
git add apps/backend/convex/products.ts
git commit -m "feat(backend): replace the product trpc router with convex functions"
```

---

### Task 3.11: Leads e contato

**Objective:** Capturar lead no Convex e disparar o e-mail sem bloquear a resposta.

**Files:**
- Create: `apps/backend/convex/lib/email.ts`
- Create: `apps/backend/convex/leads.ts`
- Create: `apps/backend/convex/contact.ts`

**Step 1: `convex/lib/email.ts`**

Porte `src/server/email/mailersend.ts` do repo atual sem alterar a lógica de envio; só troque a leitura de env para `process.env` (dentro do Convex não existe `~/env`).

```ts
'use node'

import { EmailParams, MailerSend, Recipient, Sender } from 'mailersend'

const requireEnv = (name: string): string => {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

export const createMailer = () => new MailerSend({ apiKey: requireEnv('MAILERSEND_API_KEY') })

export const sender = () =>
  new Sender(process.env.MAILERSEND_FROM_EMAIL ?? 'macneves@territoirevibrant.ca', 'Territoire Vibrant')

export { EmailParams, Recipient }
```

**Step 2: `convex/leads.ts`**

```ts
import { LocaleValidator } from '@tv/domain/validators'
import { v } from 'convex/values'

import { internal } from './_generated/api'
import { internalMutation, mutation, query } from './_generated/server'
import { requireAdmin } from './helpers/auth'

/**
 * Mirrors the old tRPC contract: the lead is persisted first, then the ebook
 * email is attempted. Delivery is scheduled rather than awaited, so a
 * MailerSend outage can never lose a captured lead.
 */
export const capture = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    locale: LocaleValidator,
  },
  handler: async (ctx, args) => {
    const leadId = await ctx.db.insert('leads', {
      name: args.name,
      email: args.email,
      phone: args.phone,
      locale: args.locale,
      createdAt: Date.now(),
    })

    await ctx.scheduler.runAfter(0, internal.contact.sendEbook, {
      leadId,
      email: args.email,
      name: args.name,
      locale: args.locale,
    })

    return { leadId, success: true as const }
  },
})

export const markDelivery = internalMutation({
  args: {
    leadId: v.id('leads'),
    status: v.union(v.literal('sent'), v.literal('email_failed')),
  },
  handler: (ctx, args) => ctx.db.patch(args.leadId, { deliveryStatus: args.status }),
})

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)
    return ctx.db.query('leads').withIndex('by_createdAt').order('desc').collect()
  },
})
```

**Step 3: `convex/contact.ts`**

```ts
'use node'

import { ContactFormSchema } from '@tv/domain/contact'
import { LocaleValidator } from '@tv/domain/validators'
import { v } from 'convex/values'

import { internal } from './_generated/api'
import { action, internalAction } from './_generated/server'
import { createMailer, EmailParams, Recipient, sender } from './lib/email'

export const sendEbook = internalAction({
  args: {
    leadId: v.id('leads'),
    email: v.string(),
    name: v.string(),
    locale: LocaleValidator,
  },
  handler: async (ctx, args) => {
    try {
      const mailer = createMailer()
      const params = new EmailParams()
        .setFrom(sender())
        .setTo([new Recipient(args.email, args.name)])
        .setSubject('Territoire Vibrant')
        .setHtml(`<p>Bonjour ${args.name}</p>`)

      await mailer.email.send(params)
      await ctx.runMutation(internal.leads.markDelivery, { leadId: args.leadId, status: 'sent' })
    } catch {
      await ctx.runMutation(internal.leads.markDelivery, {
        leadId: args.leadId,
        status: 'email_failed',
      })
    }
  },
})

/** Replaces `contact.send`. Pure email, no database write. */
export const send = action({
  args: {
    name: v.string(),
    email: v.string(),
    subject: v.string(),
    message: v.string(),
  },
  handler: async (_ctx, args) => {
    const parsed = ContactFormSchema.parse(args)
    const mailer = createMailer()

    const params = new EmailParams()
      .setFrom(sender())
      .setTo([new Recipient(process.env.CONTACT_EMAIL ?? 'macneves@territoirevibrant.ca')])
      .setReplyTo(new Recipient(parsed.email, parsed.name))
      .setSubject(`[${parsed.subject}] ${parsed.name}`)
      .setText(parsed.message)

    await mailer.email.send(params)
    return { success: true as const }
  },
})
```

> O corpo dos e-mails acima é um esqueleto. Copie os templates reais de `src/server/email/mailersend.ts` antes de rodar em produção — mantenha os textos por locale exatamente como estão hoje.

**Step 4: Setar as variáveis de ambiente**

```bash
cd apps/backend
bunx convex env set MAILERSEND_API_KEY "<valor>"
bunx convex env set MAILERSEND_FROM_EMAIL "macneves@territoirevibrant.ca"
bunx convex env set CONTACT_EMAIL "macneves@territoirevibrant.ca"
```

**Step 5: Verificar**

```bash
bun --filter @tv/backend typecheck && cd apps/backend && bunx convex dev --once
```
Expected: deploy sem erro.

**Step 6: Commit**

```bash
git add apps/backend/convex/leads.ts apps/backend/convex/contact.ts apps/backend/convex/lib/email.ts
git commit -m "feat(backend): move lead capture and contact email into convex"
```

---

### Task 3.12: `packages/backend-client`

**Objective:** Clientes acessam a API tipada sem que Metro ou Turbopack atravessem um módulo de servidor.

**Files:**
- Create: `packages/backend-client/package.json`
- Create: `packages/backend-client/src/api.ts`
- Create: `packages/backend-client/tsconfig.json`

**Step 1: `package.json`**

```json
{
  "name": "@tv/backend-client",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/api.ts" },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "check": "biome check ."
  },
  "dependencies": {
    "@tv/backend": "*",
    "convex": "1.44.0"
  },
  "devDependencies": { "typescript": "5.9.3" }
}
```

**Step 2: `src/api.ts`** (mesmo padrão do 22AI)

```ts
import { anyApi, type FunctionReference, type FunctionReturnType, type OptionalRestArgs } from 'convex/server'

import type { api as generatedApi } from '@tv/backend/api'

type AnyBackendFunction = FunctionReference<any, any, any, any>

/**
 * Client-safe access to the Convex API. The type comes from the backend's
 * generated API, so a renamed function fails to compile in every client
 * instead of failing at runtime. `import type` is erased at build time and
 * `anyApi` resolves references by name, so no bundler ever walks into a
 * server module to satisfy this import.
 */
export const api = anyApi as unknown as typeof generatedApi

export type BackendApi = typeof generatedApi
export type BackendResult<T extends AnyBackendFunction> = FunctionReturnType<T>
export type BackendArgs<T extends AnyBackendFunction> = OptionalRestArgs<T>[0]

type ArrayElement<T> = T extends readonly (infer E)[] ? E : never

export type BackendArticle = ArrayElement<BackendResult<BackendApi['articles']['listPublished']>>
export type BackendProduct = ArrayElement<BackendResult<BackendApi['products']['listActive']>>
export type BackendUser = NonNullable<BackendResult<BackendApi['users']['getCurrent']>>
```

**Step 3: Verificar**

```bash
bun install && bun --filter @tv/backend-client typecheck
```

**Step 4: Commit**

```bash
git add packages/backend-client
git commit -m "feat: expose the convex api to clients through @tv/backend-client"
```

---

## Fase 4 — Migração dos dados

> Esta é a fase de maior risco. Ela roda **duas vezes**: primeiro contra o deployment de dev, para validar; só depois contra produção.

### Task 4.1: Mutation de importação temporária

**Objective:** Um ponto de entrada idempotente para o script, protegido por segredo e removido no fim.

**Files:**
- Create: `apps/backend/convex/migrations.ts`

**Step 1: Escrever o arquivo**

```ts
import { buildSearchText } from '@tv/domain/article'
import {
  LocaleValidator,
  ProductTypeValidator,
  PublishStatusValidator,
} from '@tv/domain/validators'
import { ConvexError, v } from 'convex/values'

import { mutation } from './_generated/server'

/**
 * TEMPORARY. Exists only to carry the Postgres data into Convex and is deleted
 * in Task 7.3 once the migration is verified.
 *
 * Guarded by MIGRATION_SECRET rather than by user auth because the importer is
 * a script, not a signed-in admin. Every import is idempotent on `legacyId`,
 * so a partial run can simply be re-run.
 */
const assertSecret = (secret: string) => {
  const expected = process.env.MIGRATION_SECRET
  if (!expected || secret !== expected) {
    throw new ConvexError({ code: 'FORBIDDEN' })
  }
}

export const importProducts = mutation({
  args: {
    secret: v.string(),
    rows: v.array(
      v.object({
        legacyId: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        priceCents: v.number(),
        currency: v.string(),
        imageUrl: v.optional(v.string()),
        type: ProductTypeValidator,
        isActive: v.boolean(),
        partnerStoreUrl: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    assertSecret(args.secret)
    let inserted = 0
    let skipped = 0

    for (const row of args.rows) {
      const existing = await ctx.db
        .query('products')
        .withIndex('by_legacyId', (q) => q.eq('legacyId', row.legacyId))
        .unique()

      if (existing) {
        skipped += 1
        continue
      }

      await ctx.db.insert('products', row)
      inserted += 1
    }

    return { inserted, skipped }
  },
})

export const importUsers = mutation({
  args: {
    secret: v.string(),
    rows: v.array(
      v.object({
        clerkUserId: v.string(),
        tokenIdentifier: v.string(),
        email: v.optional(v.string()),
        name: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
        isAdmin: v.optional(v.boolean()),
        createdAt: v.number(),
        updatedAt: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    assertSecret(args.secret)
    let inserted = 0
    let skipped = 0

    for (const row of args.rows) {
      const existing = await ctx.db
        .query('users')
        .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', row.clerkUserId))
        .unique()

      if (existing) {
        skipped += 1
        continue
      }

      await ctx.db.insert('users', row)
      inserted += 1
    }

    return { inserted, skipped }
  },
})

export const importLeads = mutation({
  args: {
    secret: v.string(),
    rows: v.array(
      v.object({
        legacyId: v.string(),
        name: v.string(),
        email: v.string(),
        phone: v.string(),
        createdAt: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    assertSecret(args.secret)
    let inserted = 0
    let skipped = 0

    for (const row of args.rows) {
      const existing = await ctx.db
        .query('leads')
        .withIndex('by_legacyId', (q) => q.eq('legacyId', row.legacyId))
        .unique()

      if (existing) {
        skipped += 1
        continue
      }

      await ctx.db.insert('leads', row)
      inserted += 1
    }

    return { inserted, skipped }
  },
})

/**
 * Articles and their translations land in one call so the foreign key is
 * resolved inside the transaction. Prisma's UUID becomes `legacyId`; Convex
 * assigns the real id.
 */
export const importArticles = mutation({
  args: {
    secret: v.string(),
    rows: v.array(
      v.object({
        legacyId: v.string(),
        status: PublishStatusValidator,
        createdAt: v.number(),
        updatedAt: v.number(),
        translations: v.array(
          v.object({
            legacyId: v.string(),
            locale: LocaleValidator,
            title: v.string(),
            bodyMd: v.string(),
            published: v.boolean(),
          })
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    assertSecret(args.secret)
    let inserted = 0
    let skipped = 0
    let translationsInserted = 0

    for (const row of args.rows) {
      const existing = await ctx.db
        .query('articles')
        .withIndex('by_legacyId', (q) => q.eq('legacyId', row.legacyId))
        .unique()

      if (existing) {
        skipped += 1
        continue
      }

      const articleId = await ctx.db.insert('articles', {
        legacyId: row.legacyId,
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })

      for (const translation of row.translations) {
        await ctx.db.insert('articleTranslations', {
          legacyId: translation.legacyId,
          articleId,
          locale: translation.locale,
          title: translation.title,
          bodyMd: translation.bodyMd,
          published: translation.published,
          searchText: buildSearchText(translation.title, translation.bodyMd),
        })
        translationsInserted += 1
      }

      inserted += 1
    }

    return { inserted, skipped, translationsInserted }
  },
})
```

**Step 2: Setar o segredo**

```bash
cd apps/backend
bunx convex env set MIGRATION_SECRET "$(openssl rand -hex 32)"
bunx convex env get MIGRATION_SECRET
```
Guarde o valor; o script vai precisar dele.

**Step 3: Verificar**

```bash
bun --filter @tv/backend typecheck && cd apps/backend && bunx convex dev --once
```

**Step 4: Commit**

```bash
git add apps/backend/convex/migrations.ts
git commit -m "feat(backend): add temporary guarded import mutations"
```

---

### Task 4.2: Script de migração

**Objective:** Ler o Postgres, transformar, gravar artefato auditável e importar em lotes.

**Files:**
- Create: `apps/backend/scripts/migrate-from-postgres.ts`

**Step 1: Escrever o script**

```ts
/**
 * Reads the legacy Postgres database and imports it into Convex.
 *
 *   bun run scripts/migrate-from-postgres.ts --dry-run
 *   bun run scripts/migrate-from-postgres.ts
 *
 * Required env:
 *   LEGACY_DATABASE_URL  postgres connection string (read-only user is enough)
 *   CONVEX_URL           target deployment url
 *   MIGRATION_SECRET     must match the value set with `convex env set`
 *
 * Every import is idempotent on legacyId, so re-running after a failure is
 * safe and resumes rather than duplicating.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { ConvexHttpClient } from 'convex/browser'
import { Client } from 'pg'

import { api } from '../convex/_generated/api'

const DRY_RUN = process.argv.includes('--dry-run')
const BATCH_SIZE = 25
const ARTIFACT_DIR = join(import.meta.dir, '..', '.migration-artifacts')

const requireEnv = (name: string): string => {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

const DEFAULT_CURRENCY = 'CAD'
const toCents = (value: string | number): number => Math.round(Number(value) * 100)
const toMillis = (value: Date): number => value.getTime()
const optional = (value: string | null): string | undefined => value?.trim() || undefined

const chunk = <T>(items: T[], size: number): T[][] => {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

const writeArtifact = (name: string, rows: unknown[]) => {
  mkdirSync(ARTIFACT_DIR, { recursive: true })
  const path = join(ARTIFACT_DIR, `${name}.json`)
  writeFileSync(path, JSON.stringify(rows, null, 2))
  console.log(`  artifact → ${path} (${rows.length} rows)`)
}

const main = async () => {
  const pg = new Client({ connectionString: requireEnv('LEGACY_DATABASE_URL') })
  await pg.connect()

  const convex = DRY_RUN ? null : new ConvexHttpClient(requireEnv('CONVEX_URL'))
  const secret = DRY_RUN ? '' : requireEnv('MIGRATION_SECRET')

  console.log(DRY_RUN ? '── DRY RUN — nothing will be written ──' : '── LIVE IMPORT ──')

  // ---- Users -------------------------------------------------------------
  const users = await pg.query<{
    id: string
    email: string | null
    name: string | null
    imageUrl: string | null
    createdAt: Date
    updatedAt: Date
  }>('SELECT id, email, name, "imageUrl", "createdAt", "updatedAt" FROM "User"')

  const issuer = requireEnv('CLERK_JWT_ISSUER_DOMAIN')
  const userRows = users.rows.map((row) => ({
    clerkUserId: row.id,
    // Convex composes tokenIdentifier as `${issuer}|${subject}`.
    tokenIdentifier: `${issuer}|${row.id}`,
    email: optional(row.email),
    name: optional(row.name),
    imageUrl: optional(row.imageUrl),
    createdAt: toMillis(row.createdAt),
    updatedAt: toMillis(row.updatedAt),
  }))
  writeArtifact('users', userRows)

  // ---- Products ----------------------------------------------------------
  const products = await pg.query<{
    id: string
    name: string
    description: string | null
    price: string
    imageUrl: string | null
    type: 'PHYSICAL' | 'DIGITAL'
    isActive: boolean
    partnerStoreUrl: string | null
    createdAt: Date
    updatedAt: Date
  }>(
    'SELECT id, name, description, price, "imageUrl", type, "isActive", "amazonUrl" AS "partnerStoreUrl", "createdAt", "updatedAt" FROM "Product"'
  )

  const productRows = products.rows.map((row) => ({
    legacyId: row.id,
    name: row.name,
    description: optional(row.description),
    priceCents: toCents(row.price),
    currency: DEFAULT_CURRENCY,
    imageUrl: optional(row.imageUrl),
    type: row.type,
    isActive: row.isActive,
    partnerStoreUrl: optional(row.partnerStoreUrl),
    createdAt: toMillis(row.createdAt),
    updatedAt: toMillis(row.updatedAt),
  }))
  writeArtifact('products', productRows)

  // ---- Articles + translations ------------------------------------------
  const articles = await pg.query<{
    id: string
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
    createdAt: Date
    updatedAt: Date
  }>('SELECT id, status, "createdAt", "updatedAt" FROM "Article"')

  const translations = await pg.query<{
    id: string
    articleId: string
    locale: 'en' | 'es' | 'fr' | 'pt'
    title: string
    bodyMd: string
    published: boolean
  }>('SELECT id, "articleId", locale, title, "bodyMd", published FROM "ArticleTranslation"')

  const byArticle = new Map<string, typeof translations.rows>()
  for (const row of translations.rows) {
    const list = byArticle.get(row.articleId) ?? []
    list.push(row)
    byArticle.set(row.articleId, list)
  }

  const orphans = [...byArticle.keys()].filter(
    (articleId) => !articles.rows.some((article) => article.id === articleId)
  )
  if (orphans.length > 0) {
    throw new Error(`Orphan translations reference missing articles: ${orphans.join(', ')}`)
  }

  const articleRows = articles.rows.map((row) => ({
    legacyId: row.id,
    status: row.status,
    createdAt: toMillis(row.createdAt),
    updatedAt: toMillis(row.updatedAt),
    translations: (byArticle.get(row.id) ?? []).map((translation) => ({
      legacyId: translation.id,
      locale: translation.locale,
      title: translation.title,
      bodyMd: translation.bodyMd,
      published: translation.published,
    })),
  }))
  writeArtifact('articles', articleRows)

  // ---- Leads -------------------------------------------------------------
  const leads = await pg.query<{
    id: string
    name: string
    email: string
    phone: string
    createdAt: Date
  }>('SELECT id, name, email, phone, "createdAt" FROM "Lead"')

  const leadRows = leads.rows.map((row) => ({
    legacyId: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    createdAt: toMillis(row.createdAt),
  }))
  writeArtifact('leads', leadRows)

  await pg.end()

  console.log('\nSource counts:')
  console.log(`  users        ${userRows.length}`)
  console.log(`  products     ${productRows.length}`)
  console.log(`  articles     ${articleRows.length}`)
  console.log(`  translations ${translations.rows.length}`)
  console.log(`  leads        ${leadRows.length}`)

  if (DRY_RUN || !convex) {
    console.log('\nDry run complete. Inspect .migration-artifacts/ before importing.')
    return
  }

  const runBatches = async <T>(
    label: string,
    rows: T[],
    fn: (batch: T[]) => Promise<{ inserted: number; skipped: number }>
  ) => {
    let inserted = 0
    let skipped = 0
    for (const [index, batch] of chunk(rows, BATCH_SIZE).entries()) {
      const result = await fn(batch)
      inserted += result.inserted
      skipped += result.skipped
      console.log(`  ${label} batch ${index + 1}: +${result.inserted} (${result.skipped} existing)`)
    }
    console.log(`${label}: ${inserted} inserted, ${skipped} already present`)
  }

  console.log('\nImporting…')
  await runBatches('users', userRows, (rows) =>
    convex.mutation(api.migrations.importUsers, { secret, rows })
  )
  await runBatches('products', productRows, (rows) =>
    convex.mutation(api.migrations.importProducts, { secret, rows })
  )
  await runBatches('articles', articleRows, (rows) =>
    convex.mutation(api.migrations.importArticles, { secret, rows })
  )
  await runBatches('leads', leadRows, (rows) =>
    convex.mutation(api.migrations.importLeads, { secret, rows })
  )

  console.log('\nImport finished. Run `bun run migrate:verify` next.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
```

**Step 2: Rodar o dry run contra produção (só leitura)**

```bash
cd apps/backend
LEGACY_DATABASE_URL="<url de produção>" \
CLERK_JWT_ISSUER_DOMAIN="<issuer>" \
bun run migrate:dry-run
```
Expected: contagens iguais às da Task 0.2, e `.migration-artifacts/*.json` gerados.

**Step 3: Inspecionar os artefatos**

```bash
head -40 .migration-artifacts/products.json
```
Confirme, item por item: `priceCents` é inteiro e bate com o preço real ×100; `partnerStoreUrl` veio da coluna `amazonUrl`; datas são epoch em ms plausíveis.

**Step 4: Commit**

```bash
git add apps/backend/scripts/migrate-from-postgres.ts
git commit -m "feat(backend): add postgres to convex migration script"
```

---

### Task 4.3: Script de verificação

**Objective:** Provar que a migração está completa e correta — não confiar no log do importador.

**Files:**
- Create: `apps/backend/scripts/verify-migration.ts`

**Step 1: Escrever o script**

```ts
/**
 * Compares the Convex deployment against the legacy Postgres database and
 * exits non-zero on any mismatch. Run after every import, dev and prod.
 */
import { ConvexHttpClient } from 'convex/browser'
import { Client } from 'pg'

import { api } from '../convex/_generated/api'

const requireEnv = (name: string): string => {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

const main = async () => {
  const pg = new Client({ connectionString: requireEnv('LEGACY_DATABASE_URL') })
  await pg.connect()
  const convex = new ConvexHttpClient(requireEnv('CONVEX_URL'))

  const count = async (table: string): Promise<number> => {
    const result = await pg.query<{ count: string }>(`SELECT count(*) FROM "${table}"`)
    return Number(result.rows[0]?.count ?? 0)
  }

  const [pgArticles, pgTranslations, pgProducts, pgLeads] = await Promise.all([
    count('Article'),
    count('ArticleTranslation'),
    count('Product'),
    count('Lead'),
  ])

  const [convexArticles, convexProducts] = await Promise.all([
    convex.query(api.migrations.countAll, {}),
    convex.query(api.products.listActive, {}),
  ])

  const failures: string[] = []

  const compare = (label: string, expected: number, actual: number) => {
    const ok = expected === actual
    console.log(`${ok ? '✓' : '✗'} ${label}: postgres=${expected} convex=${actual}`)
    if (!ok) failures.push(label)
  }

  compare('articles', pgArticles, convexArticles.articles)
  compare('articleTranslations', pgTranslations, convexArticles.articleTranslations)
  compare('products', pgProducts, convexArticles.products)
  compare('leads', pgLeads, convexArticles.leads)

  // Spot check: every published product price survived the cents conversion.
  const pgPrices = await pg.query<{ id: string; price: string }>(
    'SELECT id, price FROM "Product" WHERE "isActive" = true'
  )
  for (const row of pgPrices.rows) {
    const migrated = convexProducts.find((product) => product.legacyId === row.id)
    if (!migrated) {
      failures.push(`missing product ${row.id}`)
      console.log(`✗ product ${row.id} absent from convex`)
      continue
    }
    const expectedCents = Math.round(Number(row.price) * 100)
    if (migrated.priceCents !== expectedCents) {
      failures.push(`price mismatch ${row.id}`)
      console.log(`✗ product ${row.id}: expected ${expectedCents} got ${migrated.priceCents}`)
    }
  }

  await pg.end()

  if (failures.length > 0) {
    console.error(`\n${failures.length} check(s) failed: ${failures.join(', ')}`)
    process.exit(1)
  }
  console.log('\nAll checks passed.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
```

**Step 2: Adicionar a query de contagem em `convex/migrations.ts`**

```ts
export const countAll = query({
  args: {},
  handler: async (ctx) => ({
    users: (await ctx.db.query('users').collect()).length,
    articles: (await ctx.db.query('articles').collect()).length,
    articleTranslations: (await ctx.db.query('articleTranslations').collect()).length,
    products: (await ctx.db.query('products').collect()).length,
    leads: (await ctx.db.query('leads').collect()).length,
  }),
})
```
Adicione `query` ao import de `./_generated/server` no topo do arquivo.

**Step 3: Commit**

```bash
git add apps/backend/scripts/verify-migration.ts apps/backend/convex/migrations.ts
git commit -m "feat(backend): add migration verification script"
```

---

### Task 4.4: Ensaio completo contra o deployment de dev

**Objective:** Rodar a migração inteira num ambiente descartável antes de tocar produção.

**Step 1: Importar para o dev**

```bash
cd apps/backend
LEGACY_DATABASE_URL="<url de produção, usuário read-only>" \
CLERK_JWT_ISSUER_DOMAIN="<issuer>" \
CONVEX_URL="<url do deployment de DEV>" \
MIGRATION_SECRET="<segredo da Task 4.1>" \
bun run migrate:run
```
Expected: contagens de inserção iguais às da Task 0.2.

**Step 2: Verificar**

```bash
LEGACY_DATABASE_URL="<url>" CONVEX_URL="<dev url>" bun run migrate:verify
```
Expected: `All checks passed.`

**Step 3: Testar a idempotência**

```bash
LEGACY_DATABASE_URL="<url>" CLERK_JWT_ISSUER_DOMAIN="<issuer>" \
CONVEX_URL="<dev url>" MIGRATION_SECRET="<segredo>" bun run migrate:run
```
Expected: `0 inserted`, todo o resto como `already present`. Se inserir de novo, o `legacyId` não está funcionando — **pare e corrija antes de seguir**.

**Step 4: Inspecionar o conteúdo à mão**

```bash
bunx convex dashboard
```
Abra um artigo migrado: as 4 traduções estão lá, o `bodyMd` está íntegro (acentos, markdown, quebras de linha), `searchText` está preenchido.

**Step 5: Promover um admin**

No dashboard, encontre sua linha em `users` e defina `isAdmin: true`. Sem isso, nenhuma mutation de admin funciona.

---

## Fase 5 — App web

### Task 5.1: Mover o Next para `apps/web`

**Objective:** Todo o código atual dentro do monorepo, ainda sem alterar a camada de dados.

**Step 1: Copiar**

```bash
cd ~/Documents/GitHub
mkdir -p territoire-vibrant/apps/web
cp -R territoire-vibrant-site/src territoire-vibrant/apps/web/src
cp -R territoire-vibrant-site/public territoire-vibrant/apps/web/public
cp territoire-vibrant-site/next.config.ts territoire-vibrant/apps/web/
cp territoire-vibrant-site/tsconfig.json territoire-vibrant/apps/web/
cp territoire-vibrant-site/postcss.config.* territoire-vibrant/apps/web/ 2>/dev/null || true
cp territoire-vibrant-site/components.json territoire-vibrant/apps/web/ 2>/dev/null || true
```

**Step 2: Apagar o que morreu com o tRPC e o Prisma**

```bash
cd territoire-vibrant/apps/web
rm -rf src/trpc src/server/api src/server/db.ts
rm -rf src/app/api/trpc
rm -f src/schemas/lead.ts src/schemas/contact.ts src/lib/product-admin-schema.ts
```

**Step 3: `apps/web/package.json`**

Copie o `dependencies` atual e **remova**: `@prisma/adapter-pg`, `@prisma/client`, `prisma`, `@trpc/client`, `@trpc/react-query`, `@trpc/server`, `superjson`. **Adicione**: `convex`, `@tv/domain`, `@tv/backend-client`.

```json
{
  "name": "web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev --turbo",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "check": "biome check .",
    "react-doctor": "bunx -y react-doctor@0.8.3 --verbose ."
  }
}
```
(as dependências vão no bloco `dependencies`, seguindo a lista acima)

**Step 4: Verificar que ainda não compila — é esperado**

```bash
cd ~/Documents/GitHub/territoire-vibrant && bun install
bun --filter web typecheck 2>&1 | head -30
```
Expected: erros apontando para `~/trpc/server`, `~/server/db`, `~/schemas/lead`. Esses são o roteiro exato das Tasks 5.3–5.6.

**Step 5: Commit**

```bash
git add apps/web
git commit -m "chore(web): move the next app into the monorepo and drop trpc/prisma"
```

---

### Task 5.2: Provider e helpers do Convex

**Objective:** RSC e Client Components conseguem falar com o Convex autenticados.

**Files:**
- Create: `apps/web/src/server/convex.ts`
- Create: `apps/web/src/components/convex-client-provider.tsx`
- Modify: `apps/web/src/env.ts`
- Modify: `apps/web/src/app/[locale]/layout.tsx`

**Step 1: `src/server/convex.ts`**

```ts
import 'server-only'

import { auth } from '@clerk/nextjs/server'
import { fetchAction, fetchMutation, fetchQuery } from 'convex/nextjs'

/**
 * RSCs authenticate to Convex with the Clerk `convex` JWT template. Without a
 * token the call still succeeds but arrives unauthenticated, which silently
 * turns every admin query into a FORBIDDEN — pass this to anything that needs
 * an identity.
 */
export const convexToken = async (): Promise<string | undefined> => {
  const { getToken } = await auth()
  return (await getToken({ template: 'convex' })) ?? undefined
}

export const authedQuery: typeof fetchQuery = async (reference, args, options) =>
  fetchQuery(reference, args, { ...options, token: await convexToken() })

export const authedMutation: typeof fetchMutation = async (reference, args, options) =>
  fetchMutation(reference, args, { ...options, token: await convexToken() })

export const authedAction: typeof fetchAction = async (reference, args, options) =>
  fetchAction(reference, args, { ...options, token: await convexToken() })

export { fetchQuery as publicQuery }
```

**Step 2: `src/components/convex-client-provider.tsx`**

```tsx
'use client'

import { useAuth } from '@clerk/nextjs'
import { ConvexReactClient } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import type { ReactNode } from 'react'

import { env } from '~/env'

const convex = new ConvexReactClient(env.NEXT_PUBLIC_CONVEX_URL)

// Module-level so React Compiler never sees a hook referenced as a value in render.
const convexClerkAuth = useAuth

export const ConvexClientProvider = ({ children }: { children: ReactNode }) => (
  <ConvexProviderWithClerk client={convex} useAuth={convexClerkAuth}>
    {children}
  </ConvexProviderWithClerk>
)
```

**Step 3: Ajustar `src/env.ts`**

Remova `DATABASE_URL` do bloco `server` e do `runtimeEnv`. Adicione ao bloco `client`:

```ts
NEXT_PUBLIC_CONVEX_URL: z.url(),
```
e ao `runtimeEnv`:
```ts
NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
```

**Step 4: Substituir o upsert no layout**

Em `src/app/[locale]/layout.tsx`, **apague** todo o bloco `try { const { userId } = await auth() … db.user.upsert … }` (linhas ~63–90) e o import de `~/server/db`. Envolva os filhos com o provider e adicione o bootstrap:

```tsx
<ConvexClientProvider>
  <UserBootstrap />
  {children}
</ConvexClientProvider>
```

**Step 5: `src/components/user-bootstrap.tsx`**

```tsx
'use client'

import { api } from '@tv/backend-client'
import { useConvexAuth, useMutation } from 'convex/react'
import { useEffect } from 'react'

/**
 * Replaces the Prisma upsert that ran on every layout render. Fires once after
 * authentication settles instead of sitting on the server render path.
 */
export const UserBootstrap = () => {
  const { isAuthenticated } = useConvexAuth()
  const store = useMutation(api.users.store)

  useEffect(() => {
    if (!isAuthenticated) return
    void store({}).catch((error: unknown) => {
      console.error('[user-bootstrap] failed', error)
    })
  }, [isAuthenticated, store])

  return null
}
```

**Step 6: Verificar**

```bash
bun --filter web typecheck 2>&1 | head -20
```
Expected: os erros de `~/trpc` e `~/server/db` no layout somem; sobram os das páginas.

**Step 7: Commit**

```bash
git add apps/web/src/server/convex.ts apps/web/src/components apps/web/src/env.ts apps/web/src/app/\[locale\]/layout.tsx
git commit -m "feat(web): wire convex client and server helpers"
```

---

### Task 5.3: Migrar as páginas públicas de conteúdo

**Objective:** `content/page.tsx`, `content/[articleId]/page.tsx` e `search/page.tsx` lendo do Convex.

**Files:**
- Modify: `apps/web/src/app/[locale]/content/page.tsx`
- Modify: `apps/web/src/app/[locale]/content/[articleId]/page.tsx`
- Modify: `apps/web/src/app/[locale]/search/page.tsx`

**Step 1: `content/page.tsx` linha ~114**

```diff
-import { api } from '~/trpc/server'
+import { api } from '@tv/backend-client'
+import { publicQuery } from '~/server/convex'
@@
-    activeCategory === 'publications' ? api.article.getAll() : Promise.resolve([]),
+    activeCategory === 'publications' ? publicQuery(api.articles.listPublished, {}) : Promise.resolve([]),
```

> `getAll` retornava rascunhos também; `listPublished` já filtra. Se alguma parte da página dependia de contar rascunhos, isso mudou de propósito — confirme visualmente.

**Step 2: `content/[articleId]/page.tsx` linha ~57**

```diff
-import { db } from '~/server/db'
+import { api } from '@tv/backend-client'
+import { publicQuery } from '~/server/convex'
@@
-    db.article.findUnique({
-      where: { id: articleId },
-      include: { translations: true },
-    }),
+    publicQuery(api.articles.getByAnyId, { id: articleId }),
```

O resto do arquivo (`article?.status !== 'PUBLISHED'`, o `find` por locale e o fallback) continua funcionando sem alteração — o shape retornado é o mesmo.

**Step 3: `search/page.tsx` linha ~153**

```diff
-    trimmedQuery ? api.article.search({ query: trimmedQuery, locale: activeLocale }) : Promise.resolve([]),
+    trimmedQuery
+      ? publicQuery(api.articles.search, { query: trimmedQuery, locale: activeLocale })
+      : Promise.resolve([]),
```

**Step 4: Verificar**

```bash
bun --filter web typecheck 2>&1 | head -20
```

**Step 5: Teste manual** (após a Task 5.7, quando o app subir)

Abrir `/fr/content`, clicar num artigo, buscar um termo que existe no corpo (não só no título) e confirmar que aparece.

**Step 6: Commit**

```bash
git commit -am "feat(web): read articles from convex on public pages"
```

---

### Task 5.4: Migrar as páginas de loja

**Files:**
- Modify: `apps/web/src/app/[locale]/shop/page.tsx`
- Modify: `apps/web/src/app/[locale]/shop/[productId]/page.tsx`

**Step 1: `shop/page.tsx` linha ~21**

```diff
-import { db } from '~/server/db'
+import { api } from '@tv/backend-client'
+import { publicQuery } from '~/server/convex'
@@
-  const products = await db.product.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' } })
+  const products = await publicQuery(api.products.listActive, {})
```

**Step 2: `shop/[productId]/page.tsx` linhas ~32 e ~61**

```diff
-  const product = await db.product.findFirst({ … })
+  const product = await publicQuery(api.products.getByAnyId, { id: productId })
@@
-    db.product.findFirst({ … })   // relacionados
+    product ? publicQuery(api.products.listRelated, { productId: product._id }) : Promise.resolve([]),
```

**Step 3: Corrigir a exibição de preço**

Todo lugar que renderiza `product.price` passa a usar o helper:

```diff
-import { formatPrice } from '~/lib/utils'
+import { formatPrice } from '@tv/domain/money'
@@
-{formatPrice(product.price)}
+{formatPrice(product.priceCents, activeLocale)}
```

Encontre todas as ocorrências:

```bash
cd apps/web && grep -rn "\.price" src --include="*.tsx"
```
Expected após a correção: nenhuma referência a `.price` sobrando; todas viraram `.priceCents`.

**Step 4: Verificar**

```bash
bun --filter web typecheck 2>&1 | head -20
```

**Step 5: Commit**

```bash
git commit -am "feat(web): read products from convex and format prices from cents"
```

---

### Task 5.5: Migrar o admin

**Files:**
- Modify: `apps/web/src/app/[locale]/admin/content/page.tsx`
- Modify: `apps/web/src/app/[locale]/admin/content/[articleId]/page.tsx`
- Modify: `apps/web/src/app/[locale]/admin/content/components/ArticleForm.tsx`
- Modify: `apps/web/src/app/[locale]/admin/shop/page.tsx`
- Modify: `apps/web/src/app/[locale]/admin/shop/components/ProductForm.tsx`

**Step 1: Listagens (RSC) — usam `authedQuery`, não `publicQuery`**

```diff
// admin/content/page.tsx:61
-  const [t, articles] = await Promise.all([getTranslations(), api.article.getAll()])
+  const [t, articles] = await Promise.all([getTranslations(), authedQuery(api.articles.listAll, {})])
```

```diff
// admin/shop/page.tsx:17
-  const [t, products] = await Promise.all([getTranslations(), api.product.list()])
+  const [t, products] = await Promise.all([getTranslations(), authedQuery(api.products.listAll, {})])
```

**Step 2: `ArticleForm.tsx` — mutations no cliente**

```diff
-import { api } from '~/trpc/api'
+import { api } from '@tv/backend-client'
+import { useMutation } from 'convex/react'
@@
-  const createArticle = api.article.createArticle.useMutation({ onSuccess: … })
-  const updateArticle = api.article.updateArticle.useMutation({ onSuccess: … })
+  const createArticle = useMutation(api.articles.create)
+  const updateArticle = useMutation(api.articles.update)
```

O tratamento de sucesso/erro muda de callbacks do tRPC para `try/catch` no submit:

```tsx
const onSubmit = async (values: ArticleUpsertInput) => {
  try {
    if (articleId) {
      await updateArticle({ articleId, ...values })
    } else {
      await createArticle(values)
    }
    toast.success(t('admin_saved'))
    router.push('/admin/content')
  } catch {
    toast.error(t('admin_save_failed'))
  }
}
```

**Step 3: `ProductForm.tsx`** — mesma troca, com `api.products.create` / `api.products.update`. O schema Zod agora vem de `@tv/domain/product`:

```diff
-import { productAdminUpsertSchema } from '~/lib/product-admin-schema'
+import { ProductUpsertSchema } from '@tv/domain/product'
```

Ao carregar um produto para edição, converta centavos de volta para o campo do formulário:

```tsx
defaultValues: { ...product, price: fromCents(product.priceCents) }
```

**Step 4: Verificar**

```bash
bun --filter web typecheck && bun --filter web react-doctor
```
Expected: typecheck limpo, react-doctor `100/100`.

**Step 5: Commit**

```bash
git commit -am "feat(web): migrate admin content and shop to convex mutations"
```

---

### Task 5.6: Migrar os formulários públicos

**Files:**
- Modify: `apps/web/src/app/[locale]/ebook/components/EbookLeadForm.tsx`
- Modify: `apps/web/src/app/[locale]/(home)/components/ContactSection.tsx`

**Step 1: `EbookLeadForm.tsx`**

```diff
-import { api } from '~/trpc/api'
-import { LeadCaptureSchema } from '~/schemas/lead'
+import { api } from '@tv/backend-client'
+import { LeadCaptureSchema } from '@tv/domain/lead'
+import { useMutation } from 'convex/react'
@@
-  const capture = api.lead.capture.useMutation({ onSuccess: … })
+  const capture = useMutation(api.leads.capture)
```

**Step 2: `ContactSection.tsx`** — `contact.send` virou uma Convex **action**, então usa `useAction`:

```diff
-import { api } from '~/trpc/api'
-import { ContactFormSchema } from '~/schemas/contact'
+import { api } from '@tv/backend-client'
+import { ContactFormSchema } from '@tv/domain/contact'
+import { useAction } from 'convex/react'
@@
-  const send = api.contact.send.useMutation({ onSuccess: … })
+  const send = useAction(api.contact.send)
```

**Step 3: Verificar**

```bash
bun --filter web typecheck && bun --filter web react-doctor
```

**Step 4: Commit**

```bash
git commit -am "feat(web): move lead capture and contact form onto convex"
```

---

### Task 5.7: Build limpo do web

**Objective:** Provar que não sobrou nenhuma referência a Prisma ou tRPC.

**Step 1: Varredura**

```bash
cd apps/web
grep -rn "trpc\|@prisma\|server/db\|prisma" src --include="*.ts" --include="*.tsx"
```
Expected: **nenhum resultado**. Se aparecer algo, é uma referência esquecida.

**Step 2: Build**

```bash
cd ~/Documents/GitHub/territoire-vibrant
NEXT_PUBLIC_CONVEX_URL="<dev url>" bun --filter web build
```
Expected: build completo. Erros de Server Component só aparecem aqui, não no typecheck.

**Step 3: Rodar o app contra os dados migrados de dev**

```bash
bun --filter web dev
```
Percorra à mão: home, `/fr/content`, um artigo, `/fr/shop`, um produto, `/fr/search?q=<termo do corpo>`, `/fr/admin/content`, `/fr/admin/shop`, criar e editar um artigo, criar e editar um produto, enviar o formulário de contato, capturar um lead.

**Step 4: Commit**

```bash
git commit -am "chore(web): verify convex-only build"
```

---

## Fase 6 — App Expo

### Task 6.1: Scaffold do `apps/mobile`

**Objective:** Expo SDK 55 com expo-router, Clerk e Convex ligados.

**Files:**
- Create: `apps/mobile/package.json`, `app.json`, `tsconfig.json`, `babel.config.js`, `metro.config.js`

**Step 1: `package.json`**

```json
{
  "name": "mobile",
  "version": "0.1.0",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "dev": "bunx expo start",
    "android": "bunx expo start --android",
    "ios": "bunx expo start --ios",
    "typecheck": "tsc --noEmit",
    "check": "biome check .",
    "react-doctor": "bunx -y react-doctor@0.8.3 --verbose ."
  },
  "dependencies": {
    "@clerk/expo": "^3.2.14",
    "@tv/backend-client": "*",
    "@tv/domain": "*",
    "convex": "1.44.0",
    "expo": "~55.0.29",
    "expo-constants": "~55.0.17",
    "expo-linking": "~55.0.17",
    "expo-router": "~55.0.18",
    "expo-secure-store": "~55.0.17",
    "expo-status-bar": "~55.0.17",
    "react": "19.2.0",
    "react-native": "0.83.0",
    "react-native-safe-area-context": "^5.0.0",
    "react-native-screens": "^4.0.0"
  },
  "devDependencies": {
    "@types/react": "~19.2.17",
    "typescript": "5.9.3"
  }
}
```

**Step 2: `metro.config.js`** — crítico num monorepo, senão o Metro não resolve os workspaces:

```js
const { getDefaultConfig } = require('expo/metro-config')
const path = require('node:path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// Watch the whole monorepo so changes in packages/* trigger a reload.
config.watchFolders = [workspaceRoot]

// Resolve from the app first, then the workspace root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

// Without this, a hoisted duplicate of react can produce two React instances.
config.resolver.disableHierarchicalLookup = true

module.exports = config
```

**Step 3: `app.json`**

```json
{
  "expo": {
    "name": "Territoire Vibrant",
    "slug": "territoire-vibrant",
    "version": "0.1.0",
    "scheme": "territoirevibrant",
    "orientation": "portrait",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "plugins": ["expo-router", "expo-secure-store"],
    "experiments": { "typedRoutes": true }
  }
}
```

**Step 4: Verificar**

```bash
cd ~/Documents/GitHub/territoire-vibrant && bun install
bun --filter mobile typecheck
```

**Step 5: Commit**

```bash
git add apps/mobile
git commit -m "chore(mobile): scaffold expo app in the monorepo"
```

---

### Task 6.2: Providers do mobile

**Files:**
- Create: `apps/mobile/src/providers/app-providers.tsx`
- Create: `apps/mobile/app/_layout.tsx`

**Step 1: `app-providers.tsx`** (padrão do 22AI/rawanimalapp)

```tsx
import { api } from '@tv/backend-client'
import { ClerkProvider, useAuth } from '@clerk/expo'
import { tokenCache } from '@clerk/expo/token-cache'
import { ConvexReactClient, useConvexAuth, useMutation } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import Constants from 'expo-constants'
import { useEffect, type PropsWithChildren } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'

const convexUrl = Constants.expoConfig?.extra?.convexUrl ?? process.env.EXPO_PUBLIC_CONVEX_URL

if (!convexUrl) {
  throw new Error('EXPO_PUBLIC_CONVEX_URL is required')
}

const convex = new ConvexReactClient(convexUrl, { unsavedChangesWarning: false })

const convexClerkAuth = useAuth

const UserBootstrap = () => {
  const { isAuthenticated } = useConvexAuth()
  const store = useMutation(api.users.store)

  useEffect(() => {
    if (!isAuthenticated) return
    void store({}).catch(() => {})
  }, [isAuthenticated, store])

  return null
}

export const AppProviders = ({ children }: PropsWithChildren) => (
  <ClerkProvider
    publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
    tokenCache={tokenCache}
  >
    <ConvexProviderWithClerk client={convex} useAuth={convexClerkAuth}>
      <SafeAreaProvider>
        <UserBootstrap />
        {children}
      </SafeAreaProvider>
    </ConvexProviderWithClerk>
  </ClerkProvider>
)
```

**Step 2: `app/_layout.tsx`**

```tsx
import { Stack } from 'expo-router'

import { AppProviders } from '../src/providers/app-providers'

export default function RootLayout() {
  return (
    <AppProviders>
      <Stack screenOptions={{ headerTitle: 'Territoire Vibrant' }} />
    </AppProviders>
  )
}
```

**Step 3: `.env.example`**

```bash
EXPO_PUBLIC_CONVEX_URL=
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=
```

**Step 4: Verificar**

```bash
bun --filter mobile typecheck
```

**Step 5: Commit**

```bash
git add apps/mobile
git commit -m "feat(mobile): wire clerk and convex providers"
```

---

### Task 6.3: Telas de artigo

**Objective:** Provar a ponta a ponta — o mobile lê os dados reais migrados.

**Files:**
- Create: `apps/mobile/app/index.tsx`
- Create: `apps/mobile/app/article/[id].tsx`

**Step 1: `app/index.tsx`**

```tsx
import { api } from '@tv/backend-client'
import { DEFAULT_LOCALE } from '@tv/domain/locale'
import { useQuery } from 'convex/react'
import { Link } from 'expo-router'
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native'

export default function ArticlesScreen() {
  const articles = useQuery(api.articles.listPublished, {})

  if (articles === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    )
  }

  if (articles.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Aucun article.</Text>
      </View>
    )
  }

  return (
    <FlatList
      data={articles}
      keyExtractor={(article) => article._id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        const translation =
          item.translations.find((candidate) => candidate.locale === DEFAULT_LOCALE) ??
          item.translations[0]

        return (
          <Link href={{ pathname: '/article/[id]', params: { id: item._id } }} style={styles.row}>
            <Text style={styles.title}>{translation?.title ?? 'Sans titre'}</Text>
          </Link>
        )
      }}
    />
  )
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  empty: { opacity: 0.6 },
  list: { padding: 16 },
  row: { borderBottomColor: '#e5e5e5', borderBottomWidth: 1, paddingVertical: 16 },
  title: { fontSize: 17, fontWeight: '600' },
})
```

**Step 2: `app/article/[id].tsx`**

```tsx
import { api } from '@tv/backend-client'
import { DEFAULT_LOCALE } from '@tv/domain/locale'
import { useQuery } from 'convex/react'
import { useLocalSearchParams } from 'expo-router'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'

export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const article = useQuery(api.articles.getByAnyId, id ? { id } : 'skip')

  if (article === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    )
  }

  if (article === null) {
    return (
      <View style={styles.center}>
        <Text>Article introuvable.</Text>
      </View>
    )
  }

  const translation =
    article.translations.find((candidate) => candidate.locale === DEFAULT_LOCALE) ??
    article.translations[0]

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>{translation?.title}</Text>
      <Text style={styles.body}>{translation?.bodyMd}</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  body: { fontSize: 15, lineHeight: 22 },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  content: { gap: 16, padding: 16 },
  title: { fontSize: 24, fontWeight: '700' },
})
```

> O `bodyMd` é markdown cru. Renderizar markdown de verdade no RN é escopo da v2; por ora o texto puro prova que o dado chegou.

**Step 3: Verificar**

```bash
bun --filter mobile typecheck && bun --filter mobile react-doctor
```

**Step 4: Rodar no device**

```bash
cd apps/mobile
EXPO_PUBLIC_CONVEX_URL="<dev url>" \
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY="<pk>" \
bunx expo start
```
Expected: a lista mostra os artigos migrados de produção; tocar abre o detalhe.

**Step 5: Commit**

```bash
git add apps/mobile/app
git commit -m "feat(mobile): render migrated articles from convex"
```

---

## Fase 7 — Cutover

### Task 7.1: Migração de produção

**Objective:** Levar os dados reais para o deployment de produção do Convex.

**Step 1: Deploy do backend**

```bash
cd apps/backend
bunx convex deploy
```

**Step 2: Setar as variáveis de produção**

```bash
bunx convex env set --prod CLERK_JWT_ISSUER_DOMAIN "<issuer de produção>"
bunx convex env set --prod MAILERSEND_API_KEY "<valor>"
bunx convex env set --prod MAILERSEND_FROM_EMAIL "macneves@territoirevibrant.ca"
bunx convex env set --prod CONTACT_EMAIL "macneves@territoirevibrant.ca"
bunx convex env set --prod MIGRATION_SECRET "$(openssl rand -hex 32)"
```

**Step 3: Congelar as escritas no site atual**

Coloque o site atual em modo de leitura (ou avise o Mac que o admin não deve ser usado) durante a janela de migração. Qualquer artigo criado no Postgres depois do dump se perde.

**Step 4: Refazer o dump — imediatamente antes de importar**

```bash
pg_dump "$LEGACY_DATABASE_URL" --no-owner --no-acl -Fc \
  -f ".migration-backup/tv-prod-cutover-$(date +%Y%m%d-%H%M%S).dump"
```

**Step 5: Dry run contra produção**

```bash
cd apps/backend
LEGACY_DATABASE_URL="<url>" CLERK_JWT_ISSUER_DOMAIN="<issuer prod>" bun run migrate:dry-run
```
Confira as contagens contra a Task 0.2 mais o que foi criado desde então.

**Step 6: Importar**

```bash
LEGACY_DATABASE_URL="<url>" \
CLERK_JWT_ISSUER_DOMAIN="<issuer prod>" \
CONVEX_URL="<url de PRODUÇÃO>" \
MIGRATION_SECRET="<segredo de prod>" \
bun run migrate:run
```

**Step 7: Verificar**

```bash
LEGACY_DATABASE_URL="<url>" CONVEX_URL="<url de produção>" bun run migrate:verify
```
Expected: `All checks passed.` **Se falhar, pare o cutover** — o site antigo continua no ar e nada foi perdido.

**Step 8: Promover o admin em produção**

No dashboard de produção, marque `isAdmin: true` na linha do Mac e na sua.

---

### Task 7.2: Deploy do web

**Objective:** O site novo no ar.

**Step 1: Configurar o projeto na Vercel**

- Root Directory: `apps/web`
- Install Command: `bun install`
- Build Command: `bun run build`

**Step 2: Variáveis de ambiente**

Copiar todas as atuais **menos** `DATABASE_URL`, **mais**:
- `NEXT_PUBLIC_CONVEX_URL` = URL de produção do Convex
- `CONVEX_DEPLOY_KEY` (se for deployar o Convex a partir da Vercel)

**Step 3: Deploy de preview e validação**

Percorra a mesma checklist da Task 5.7, agora com os dados de produção. Verifique **especialmente** que uma URL antiga de artigo (`/fr/content/<uuid antigo>`) ainda abre — é o que o `legacyId` existe para garantir.

**Step 4: Promover para produção e apontar o domínio**

---

### Task 7.3: Remover o andaime de migração

**Objective:** Não deixar uma mutation de importação protegida por segredo viva em produção.

**Step 1: Apagar**

```bash
cd apps/backend
rm convex/migrations.ts
rm scripts/migrate-from-postgres.ts scripts/verify-migration.ts
```

**Step 2: Tirar os scripts do `package.json`**

Remova `migrate:dry-run`, `migrate:run`, `migrate:verify` e as devDependencies `pg` / `@types/pg`.

**Step 3: Limpar o segredo**

```bash
bunx convex env remove --prod MIGRATION_SECRET
bunx convex env remove MIGRATION_SECRET
```

**Step 4: Deploy**

```bash
bunx convex deploy
```

**Step 5: Verificar que sumiu**

```bash
bunx convex run migrations:countAll '{}' --prod
```
Expected: erro de função não encontrada.

**Step 6: Commit**

```bash
git commit -am "chore(backend): remove migration scaffolding after cutover"
```

> Guarde os artefatos de `.migration-artifacts/` e o dump final fora do repo por pelo menos 90 dias.

---

### Task 7.4: AGENTS.md do monorepo

**Objective:** As regras que hoje moram no `AGENTS.md` do repo único precisam existir na nova topologia — senão o próximo agente reintroduz tRPC.

**Files:**
- Create: `AGENTS.md`, `apps/backend/AGENTS.md`, `apps/web/AGENTS.md`, `apps/mobile/AGENTS.md`

**Conteúdo mínimo do raiz:**

- Escopo e mapa dos workspaces (copiar a estrutura da seção "Layout final")
- Bun é o gerenciador; `bun --filter <workspace> <script>`
- Completion: `check:unsafe` + typecheck do workspace afetado + `react-doctor` 100/100 em mudanças React
- **Commands Not To Run:** `convex:deploy:prod`, qualquer push para a Vercel, e — enquanto existirem — os scripts `migrate:*`
- Regra explícita: **não há tRPC nem Prisma neste repo.** Toda leitura e escrita passa pela API Convex.

**Conteúdo do `apps/web/AGENTS.md`:** portar as seções "Routing, Auth, And i18n", "UI And Forms" e "Coding Style" do `AGENTS.md` atual **sem alterar** — os workarounds do `proxy.ts` e as regras de import continuam load-bearing. Substituir só a seção de dados:

- RSC lê com `publicQuery` / `authedQuery` de `~/server/convex`
- Client Components usam `useQuery` / `useMutation` / `useAction` de `convex/react`, com `api` de `@tv/backend-client`
- Preços são inteiros em centavos; formatar sempre com `formatPrice` de `@tv/domain/money`

**Conteúdo do `apps/backend/AGENTS.md`:** adaptar do `apps/backend/AGENTS.md` do 22AI e do `convex/AGENTS.md` do rawanimalapp:

- Handlers finos: validar, autenticar, ler/escrever, retornar
- Autorização sempre por `ctx.auth.getUserIdentity()` + `isAdmin` na linha do usuário; nunca por argumento vindo do cliente
- Toda query limitada por índice; nada de `.filter()` em coleção que cresce
- Nomes de função Convex são contrato público consumido por dois clientes: renomear é breaking change e os dois clientes mudam no mesmo commit
- Testes começam com `// @vitest-environment edge-runtime`

**Step: Commit**

```bash
git add AGENTS.md apps/*/AGENTS.md
git commit -m "docs: add agent instructions for the monorepo topology"
```

---

### Task 7.5: Arquivar o repo antigo

**Step 1: Um último commit no repo antigo**

```bash
cd ~/Documents/GitHub/territoire-vibrant-site
```

Adicione ao topo do `README.md`:

```markdown
> **Arquivado.** Este projeto foi migrado para o monorepo `territoire-vibrant`
> (Convex + Next.js + Expo) em 2026-08-XX. Nenhuma alteração aqui vai para produção.
```

```bash
git commit -am "docs: mark repository as superseded by the territoire-vibrant monorepo"
```

**Step 2: Arquivar no GitHub** — Settings → Archive this repository.

**Step 3: Manter o Postgres vivo por 30 dias** em modo somente leitura, como rede de segurança. Só então desprovisionar.

---

## Riscos e como cada um está coberto

| Risco | Impacto | Cobertura |
|---|---|---|
| URLs de artigo/produto quebram no cutover | Perda de SEO e links compartilhados | `legacyId` indexado + `getByAnyId` (Tasks 3.3, 3.8, 3.10); validado na Task 7.2 Step 3 |
| Preço corrompido na conversão Decimal→cents | Erro comercial direto | Inteiro em centavos + `verify-migration.ts` compara cada preço ativo (Task 4.3) |
| Busca perde resultados que casavam no corpo | Regressão silenciosa de feature | `searchText` denormalizado + teste dedicado (Task 3.7, caso "searches across title and body") |
| Import parcial deixa dados duplicados | Banco sujo, difícil de reverter | Idempotência por `legacyId` + teste explícito de re-execução (Task 4.4 Step 3) |
| Escritas no Postgres durante a janela se perdem | Perda de conteúdo | Congelamento de escrita + re-dump imediatamente antes do import (Task 7.1 Steps 3–4) |
| Claim `email` ausente no JWT do Clerk | Bootstrap de usuário falha em silêncio | Verificado na Task 0.3; é a armadilha documentada no rawanimalapp |
| Cascade delete some com o Prisma | Traduções órfãs | `articles.remove` apaga as traduções explicitamente (Task 3.8) |
| Metro não resolve os workspaces | App mobile não builda | `metro.config.js` com `watchFolders` + `disableHierarchicalLookup` (Task 6.1) |
| `migrations.ts` fica em produção | Superfície de escrita protegida só por segredo | Removido na Task 7.3, com verificação |

---

## Estimativa

| Fase | Tarefas | Esforço |
|---|---|---|
| 0 — Preparação | 3 | 1h |
| 1 — Scaffold | 3 | 1h |
| 2 — Domínio | 4 | 1h30 |
| 3 — Backend Convex | 12 | 5h |
| 4 — Migração de dados | 4 | 3h |
| 5 — App web | 7 | 5h |
| 6 — App Expo | 3 | 2h30 |
| 7 — Cutover | 5 | 2h30 |
| **Total** | **41** | **~21h** |

Realisticamente: **3 a 4 sessões de trabalho.** A Fase 4 é a que mais escorrega, porque o ensaio contra dev sempre revela algo no dado real.

---

## Ordem de execução

Fases 0→3 são pré-requisito de tudo. A partir daí:

- **Fase 4** só depois que a Fase 3 estiver com os testes verdes
- **Fase 5** pode correr em paralelo com a Fase 6 (clientes independentes)
- **Fase 7** exige 4, 5 e 6 concluídas

Não comece a Fase 7 sem `migrate:verify` passando contra dev **e** a checklist manual da Task 5.7 percorrida inteira.
