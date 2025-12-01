// Week 16 Day 5: Decks Insights helper
//
// Derives simple Decks KPIs for /insights from activity_log and documents.
// Uses a 30-day window and relies on RLS for org scoping.

import type { SupabaseLikeClient } from "@/lib/activity-log";

export interface DecksRecentItem {
  id: string;
  title: string;
  updatedAt: string | null;
}

export interface DecksInsights {
  generated_30d: number;
  saved_to_vault_30d: number;
  exported_30d: number;
  recent_decks: DecksRecentItem[];
}

function getWindow(days: number): { from: string; to: string } {
  const toDate = new Date();
  const fromDate = new Date(toDate);
  fromDate.setDate(fromDate.getDate() - days);
  return {
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
  };
}

async function countByTypePattern(
  supabase: SupabaseLikeClient,
  pattern: string,
  from: string,
  to: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("activity_log")
    .select("id", { count: "exact", head: true })
    .ilike("type", pattern)
    .gte("created_at", from)
    .lte("created_at", to);

  if (error) {
    // eslint-disable-next-line no-console
    console.error("[decks-insights] countByTypePattern error", {
      pattern,
      error,
    });
    return 0;
  }

  return typeof count === "number" ? count : 0;
}

async function fetchRecentDecks(
  supabase: SupabaseLikeClient,
): Promise<DecksRecentItem[]> {
  // We keep this query defensive against schema drift:
  // - title is the standard field (no name column)
  // - updated_at may or may not exist
  const { data, error } = await supabase
    .from("document")
    .select("id, title, updated_at, kind")
    .eq("kind", "deck")
    .order("updated_at", { ascending: false })
    .limit(5);

  if (error) {
    // eslint-disable-next-line no-console
    console.error("[decks-insights] fetchRecentDecks error", error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  return (data as Array<Record<string, unknown>>).map((row) => {
    const id = typeof row.id === "string" ? row.id : "";
    const titleValue =
      typeof row.title === "string" && row.title.trim().length > 0
        ? row.title
        : "Untitled deck";

    const updatedAt =
      typeof row.updated_at === "string" && row.updated_at.length > 0
        ? row.updated_at
        : null;

    return {
      id,
      title: titleValue,
      updatedAt,
    };
  });
}

export async function getDecksInsightsForOrg(params: {
  supabase: SupabaseLikeClient;
  /**
   * Window size in days. Defaults to 30 to keep the metrics shape stable.
   */
  days?: number;
}): Promise<DecksInsights> {
  const { supabase, days = 30 } = params;
  const { from, to } = getWindow(days);

  const [generated, savedToVault, exported, recentDecks] = await Promise.all([
    // Decks generated via the Decks Builder
    countByTypePattern(supabase, "deck_generated%", from, to),
    // Decks saved to Vault
    countByTypePattern(supabase, "deck_saved_to_vault%", from, to),
    // Deck exports (e.g., HTML/PDF)
    countByTypePattern(supabase, "deck_exported%", from, to),
    // Last 5 deck documents
    fetchRecentDecks(supabase),
  ]);

  return {
    generated_30d: generated,
    saved_to_vault_30d: savedToVault,
    exported_30d: exported,
    recent_decks: recentDecks,
  };
}

