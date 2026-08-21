# Baseline pré-migração

Coletado em **2026-08-21 17:32 (UTC-03)**, imediatamente após o snapshot `pg_dump`.

**Origem:** Neon Postgres — host `ep-solitary-frog-ah6zb25p-pooler.c-3.us-east-1.aws.neon.tech`
**Snapshot:** `.migration-backup/tv-prod-20260821-173158.dump` (74 KB, formato custom `-Fc`, restaurável — verificado com `pg_restore --list`)

## Contagens de origem

| Tabela | Linhas |
|---|---:|
| `Product` | 1 |
| `User` | 4 |
| `Article` | 8 |
| `ArticleTranslation` | 29 |
| `Lead` | 3 |

**Total de linhas de conteúdo: 45.**

## Como reproduzir

```bash
export PATH="/c/Program Files/PostgreSQL/17/bin:$PATH"
cd ~/Documents/GitHub/territoire-vibrant-site
set -a && . ./.env && set +a
psql "$DATABASE_URL" -c '
SELECT '"'"'Product'"'"' AS tabela, count(*) FROM "Product"
UNION ALL SELECT '"'"'User'"'"', count(*) FROM "User"
UNION ALL SELECT '"'"'Article'"'"', count(*) FROM "Article"
UNION ALL SELECT '"'"'ArticleTranslation'"'"', count(*) FROM "ArticleTranslation"
UNION ALL SELECT '"'"'Lead'"'"', count(*) FROM "Lead";'
```

## Observações que afetam a migração

- **`pg_dump`/`psql` não estão no PATH.** Os binários existem em `C:\Program Files\PostgreSQL\17\bin`
  (versão 17.5); todo comando da migração precisa exportar esse PATH primeiro.
- **29 traduções para 8 artigos** = média de 3,6 dos 4 locales por artigo. Nem todo artigo está
  traduzido nos quatro idiomas, então o fallback de locale em `selectTranslation` é exercitado
  de verdade em produção — não é caminho morto.
- **Apenas 1 produto.** A conversão `Decimal → priceCents` tem superfície mínima, mas a verificação
  continua valendo: um único preço errado é o preço da loja inteira.
- **4 usuários.** São contas Clerk do admin; o `tokenIdentifier` é reconstruído como
  `${CLERK_JWT_ISSUER_DOMAIN}|${clerkUserId}` no import.
- O dump contém `_prisma_migrations`, que **não** é migrado — o histórico de migrations morre com o Prisma.

## Volume final

45 linhas de conteúdo é volume trivial: o import roda em segundos e cabe folgadamente num único
lote. O risco desta migração **não é escala, é correção** — preços, fallback de locale e a
preservação dos UUIDs nas URLs públicas.
