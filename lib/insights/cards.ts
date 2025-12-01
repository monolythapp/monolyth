// Week 16 Day 6: Insights cards helper
//
// Provides a unified "card" model for /insights and a simple range
// abstraction over Accounts, Contracts, and Decks insights.

import type { SupabaseLikeClient } from "@/lib/activity-log";
import { getAccountsInsightsForOrg } from "@/lib/insights/accounts";
import { getContractsInsightsForOrg } from "@/lib/insights/contracts";
import { getDecksInsightsForOrg } from "@/lib/insights/decks";

export type InsightsRange = "7d" | "30d" | "90d";

export interface InsightsCardCTA {
  label: string;
  href: string;
}

export type InsightsCardKind = "accounts" | "contracts" | "decks";

export interface InsightsCard {
  id: string;
  kind: InsightsCardKind;
  title: string;
  /**
   * Primary numeric value for the card. null means "not enough data yet".
   */
  value: number | null;
  /**
   * Human-readable period label (e.g. "Last 30 days", "Latest pack").
   */
  period: string;
  /**
   * Optional delta value for future use (e.g. vs previous period).
   */
  delta?: number | null;
  /**
   * Where the data ultimately comes from (activity_log, accounts_pack_runs, etc.).
   */
  source: string;
  /**
   * Optional CTA to drive the user to the relevant surface.
   */
  cta?: InsightsCardCTA;
}

function resolveRangeMeta(range: InsightsRange): {
  days: number;
  label: string;
} {
  if (range === "7d") {
    return { days: 7, label: "Last 7 days" };
  }
  if (range === "90d") {
    return { days: 90, label: "Last 90 days" };
  }
  return { days: 30, label: "Last 30 days" };
}

export async function getInsightsCardsForOrg(params: {
  supabase: SupabaseLikeClient;
  range: InsightsRange;
}): Promise<InsightsCard[]> {
  const { supabase, range } = params;
  const { days, label } = resolveRangeMeta(range);

  const [accounts, contracts, decks] = await Promise.all([
    getAccountsInsightsForOrg({ supabase }),
    getContractsInsightsForOrg({ supabase, days }),
    getDecksInsightsForOrg({ supabase, days }),
  ]);

  const cards: InsightsCard[] = [];

  // Accounts — Monthly SaaS total
  cards.push({
    id: "accounts-monthly-saas-total",
    kind: "accounts",
    title: "Monthly SaaS spend",
    value: accounts.monthly_saas.total,
    period: label,
    source: "accounts_pack_runs",
    cta: {
      label: "Open Accounts",
      href: "/accounts",
    },
  });

  // Accounts — Investor runway months
  cards.push({
    id: "accounts-investor-runway-months",
    kind: "accounts",
    title: "Runway (months)",
    value: accounts.investor_snapshot.runway_months,
    period: label,
    source: "accounts_pack_runs",
    cta: {
      label: "Investor snapshot",
      href: "/accounts",
    },
  });

  // Contracts — signed in window
  cards.push({
    id: "contracts-signed-30d",
    kind: "contracts",
    title: "Contracts signed",
    value: contracts.signed_30d,
    period: label,
    source: "activity_log",
    cta: {
      label: "Open Contracts",
      href: "/builder?tab=contracts",
    },
  });

  // Decks — exported in window
  cards.push({
    id: "decks-exported-30d",
    kind: "decks",
    title: "Decks exported",
    value: decks.exported_30d,
    period: label,
    source: "activity_log+documents",
    cta: {
      label: "Open Decks",
      href: "/builder?tab=decks",
    },
  });

  return cards;
}

