# Insights v2 — Accounts & Packs

Week 16 delivers Insights v2 surfaces for Accounts packs (Monthly SaaS and Investor Snapshot) plus a unified cards API.

This document explains:

- The underlying schema (`accounts_pack_runs`)

- Metrics shape written into `metrics` jsonb

- How Insights and Highlights consume those metrics

- Current limitations and assumptions

---

## Schema: `accounts_pack_runs`

Source: `supabase/migrations/202512020900_accounts_pack_runs_v1.sql`

- **Table**: `public.accounts_pack_runs`

- **Enums**

  - `accounts_pack_type`: `saas_monthly_expenses`, `investor_accounts_snapshot`

  - `accounts_pack_status`: `success`, `failure`, `partial`

- **Columns**

  - `id uuid pk default gen_random_uuid()`

  - `org_id uuid not null` (FK → `organizations.id`, `on delete cascade`)

  - `type accounts_pack_type not null`

  - `period_start date`

  - `period_end date`

  - `status accounts_pack_status not null default 'success'`

  - `metrics jsonb`

  - `created_at timestamptz not null default timezone('utc', now())`

- **Index**

  - `(org_id, type, created_at desc)` for "latest pack per type" queries

- **RLS**

  - SELECT / INSERT restricted to members of the owning org

`/api/accounts/packs` writes one row per pack run:

- On success: `status = 'success'`, `metrics` contains a narrow summary of the pack payload

- On failure: `status = 'failure'`, `metrics` contains an error payload

Pack generation itself is still driven by `lib/accounts/packs.ts`.

---

## Metrics: expected `metrics` shapes

### Monthly SaaS Expenses (`saas_monthly_expenses`)

For Insights v2 we rely on a small, stable subset of the full pack payload:

- `metrics.totalAmount`: number — total SaaS spend in the primary period

- `metrics.vendorCount`: number — count of vendors contributing to spend

The full pack still includes richer fields (`categoryCount`, `averagePerVendor`, vendor breakdowns, etc.), but Insights only needs the headline numbers.

### Investor Accounts Snapshot (`investor_accounts_snapshot`)

We use a defensive schema to tolerate iteration:

- `metrics.estimatedRunwayMonths` **or** `metrics.runwayMonths`: number

- `metrics.cashBalance` **or** `metrics.cash`: number

- `metrics.totalMonthlyBurn` **or** `metrics.monthlySaaSBurn` **or** `metrics.burn`: number

If multiple fields are present, the more specific one wins (e.g. `estimatedRunwayMonths` over `runwayMonths`).

---

## Insights consumption

### `lib/insights/accounts.ts`

`getAccountsInsightsForOrg({ supabase })`:

- Reads the latest **successful** run per pack type from `accounts_pack_runs`

- Builds:

```ts
{
  monthly_saas: {
    total: number | null;
    top_vendors_count: number | null;
    last_run_at: string | null;
  };
  investor_snapshot: {
    runway_months: number | null;
    cash: number | null;
    burn: number | null;
    last_run_at: string | null;
  };
}
```

The `/insights` page renders an **Accounts** row from this structure and the **Highlights** cards use the same data via `lib/insights/cards.ts`.

---

## Limitations & notes

- If no successful runs exist for a type, Insights shows a friendly empty state and the corresponding values are `null`.

- Failure runs are recorded for debugging but ignored for user-facing metrics.

- Metrics currently assume a single primary currency per org; multi-currency handling is a future enhancement.

