# Pre-migration baseline

Collected on **2026-08-21 17:32 (UTC-03)**, immediately after the `pg_dump` snapshot.

**Source:** Neon Postgres — host `ep-solitary-frog-ah6zb25p-pooler.c-3.us-east-1.aws.neon.tech`
**Snapshot:** `.migration-backup/tv-prod-20260821-173158.dump` (74 KB, custom `-Fc` format, restorable — verified with `pg_restore --list`)

## Source counts

| Table | Rows |
|---|---:|
| `Product` | 1 |
| `User` | 4 |
| `Article` | 8 |
| `ArticleTranslation` | 29 |
| `Lead` | 3 |

**Total content rows: 45.**

## How to reproduce

```bash
export PATH="/c/Program Files/PostgreSQL/17/bin:$PATH"
cd ~/Documents/GitHub/territoire-vibrant
set -a && . ./.env && set +a
psql "$DATABASE_URL" -c '
SELECT '"'"'Product'"'"' AS table_name, count(*) FROM "Product"
UNION ALL SELECT '"'"'User'"'"', count(*) FROM "User"
UNION ALL SELECT '"'"'Article'"'"', count(*) FROM "Article"
UNION ALL SELECT '"'"'ArticleTranslation'"'"', count(*) FROM "ArticleTranslation"
UNION ALL SELECT '"'"'Lead'"'"', count(*) FROM "Lead";'
```

## Observations that shaped the migration

- **`pg_dump`/`psql` are not on PATH.** The binaries live in `C:\Program Files\PostgreSQL\17\bin`
  (version 17.5); every migration command has to export that PATH first.
- **29 translations across 8 articles** — an average of 3.6 of the 4 locales per article. Not every
  article is translated into all four languages, so the locale fallback in `selectTranslation` is
  genuinely exercised in production; it is not dead code.
- **Only 1 product.** The `Decimal → priceCents` conversion has a tiny surface, but verification still
  matters: a single wrong price is the price of the entire shop.
- **4 users.** These are Clerk accounts; `tokenIdentifier` is rebuilt as
  `${CLERK_JWT_ISSUER_DOMAIN}|${clerkUserId}` during the import.
- The dump contains `_prisma_migrations`, which is **not** migrated — that history dies with Prisma.

## Final volume

45 content rows is a trivial volume: the import runs in seconds and fits comfortably in a single batch.
The risk in this migration **is not scale, it is correctness** — prices, locale fallback, and preserving
the UUIDs that public URLs are built from.

---

## Postscript — outcome (2026-08-25)

The migration completed and was verified in production. This document stands as a record of the state
**before** the cutover; the numbers above no longer describe the live database.

What changed after the import:

- **Users: 4 → 2.** Two of the four rows were Clerk accounts that no longer existed on the production
  instance and came across with everything else. They were removed after the cutover; the two that remain
  (`pedrocontact22@gmail.com` and `macneves@territoirevibrant.ca`) are the real ones, both admin.
- **Content: unchanged.** 1 product, 8 articles, 29 translations and 3 leads all landed in Convex intact,
  verified row by row by `scripts/verify-migration.ts`.
- **`MIGRATION_SECRET` was removed** from the production deployment. The `assertSecret` guard fails closed
  on a missing variable, so the import mutations in `convex/migrations.ts` now reject every call — the
  code stays in version control but is inert.

Convex snapshot taken just before the user cleanup:
`.migration-backup/prod-snapshot-before-user-cleanup.zip`.
