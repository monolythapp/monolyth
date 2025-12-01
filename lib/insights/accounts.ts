// Week 16 Day 3: Accounts Insights helper
//
// Derives simple Accounts insights for /insights from accounts_pack_runs.
// Relies on RLS to scope org_id; no explicit org filter required.

import type { SupabaseLikeClient } from "@/lib/activity-log";
import type { AccountsPackType } from "@/lib/accounts/packs";

export interface AccountsMonthlySaasInsights {
  total: number | null;
  top_vendors_count: number | null;
  last_run_at: string | null;
}

export interface AccountsInvestorSnapshotInsights {
  runway_months: number | null;
  cash: number | null;
  burn: number | null;
  last_run_at: string | null;
}

export interface AccountsInsights {
  monthly_saas: AccountsMonthlySaasInsights;
  investor_snapshot: AccountsInvestorSnapshotInsights;
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

async function getLatestSuccessRunForType(params: {
  supabase: SupabaseLikeClient;
  type: AccountsPackType;
  orgId?: string | null;
}): Promise<{ metrics: Record<string, unknown> | null; createdAt: string } | null> {
  const { supabase, type, orgId } = params;

  let query = supabase
    .from("accounts_pack_runs")
    .select("metrics, created_at, status")
    .eq("type", type)
    .eq("status", "success")
    .order("created_at", { ascending: false })
    .limit(1);

  // Explicitly filter by org_id if provided (more reliable than RLS alone)
  if (orgId) {
    query = query.eq("org_id", orgId);
  }

  const { data, error } = await query;

  if (error) {
    // eslint-disable-next-line no-console
    console.error("[accounts-insights] failed to fetch latest run", {
      type,
      error,
    });
    return null;
  }

  if (!data || data.length === 0) {
    // Debug: check if there are any runs at all (regardless of status)
    const { data: allRuns } = await supabase
      .from("accounts_pack_runs")
      .select("status, created_at")
      .eq("type", type)
      .order("created_at", { ascending: false })
      .limit(5);
    
    // eslint-disable-next-line no-console
    console.log("[accounts-insights] no successful runs found", {
      type,
      totalRunsFound: allRuns?.length ?? 0,
      runStatuses: allRuns?.map((r: { status: string; created_at: string }) => ({ status: r.status, created_at: r.created_at })) ?? [],
    });
    return null;
  }

  const row = data[0] as {
    metrics: Record<string, unknown> | null;
    created_at: string;
  };

  return {
    metrics: row.metrics ?? null,
    createdAt: row.created_at,
  };
}

export async function getAccountsInsightsForOrg(params: {
  supabase: SupabaseLikeClient;
  orgId?: string | null;
}): Promise<AccountsInsights> {
  const { supabase, orgId } = params;

  const [saasRun, investorRun] = await Promise.all([
    getLatestSuccessRunForType({
      supabase,
      type: "saas_monthly_expenses",
      orgId,
    }),
    getLatestSuccessRunForType({
      supabase,
      type: "investor_accounts_snapshot",
      orgId,
    }),
  ]);

  // eslint-disable-next-line no-console
  console.log("[accounts-insights] fetched runs", {
    saasRun: saasRun ? { hasMetrics: !!saasRun.metrics, createdAt: saasRun.createdAt } : null,
    investorRun: investorRun ? { hasMetrics: !!investorRun.metrics, createdAt: investorRun.createdAt } : null,
  });

  const saasMetrics = (saasRun?.metrics ?? {}) as Record<string, unknown>;
  const investorMetrics = (investorRun?.metrics ?? {}) as Record<string, unknown>;

  const monthly_saas: AccountsMonthlySaasInsights = {
    total: toNumberOrNull(saasMetrics.totalAmount),
    top_vendors_count: toNumberOrNull(saasMetrics.vendorCount),
    last_run_at: saasRun?.createdAt ?? null,
  };

  const runwayMonths = toNumberOrNull(
    investorMetrics.estimatedRunwayMonths ?? investorMetrics.runwayMonths,
  );

  const cash = toNumberOrNull(
    investorMetrics.cashBalance ?? investorMetrics.cash,
  );

  const burn = toNumberOrNull(
    investorMetrics.totalMonthlyBurn ??
      investorMetrics.monthlySaaSBurn ??
      investorMetrics.burn,
  );

  const investor_snapshot: AccountsInvestorSnapshotInsights = {
    runway_months: runwayMonths,
    cash,
    burn,
    last_run_at: investorRun?.createdAt ?? null,
  };

  return {
    monthly_saas,
    investor_snapshot,
  };
}

