// Week 11 Day 4: Activity Insights v1 helper
//
// Computes metrics for the Insights page from activity_log.
// Uses direct SQL queries for efficiency.

import { createServerSupabaseClient } from "@/lib/supabase-server";

export interface InsightsMetrics {
  docsCreated7d: number;
  monoQuestions7d: number;
  connectorSyncs7d: number;
  connectorSyncsByProvider: Record<string, number>;
  signaturesCompleted7d: number;
  activeDocs7d: number; // Optional: unique doc_ids with activity
}

export interface DailyCount {
  day: string; // YYYY-MM-DD
  dayFormatted: string; // Formatted for display (e.g., "Nov 27")
  docsCreated: number;
  monoQuestions: number;
  connectorSyncs: number;
  signaturesCompleted: number;
}

export interface InsightsData {
  metrics: InsightsMetrics;
  dailyCounts: DailyCount[];
}

/**
 * Compute Insights v1 metrics for the last 7 days.
 * RLS policies ensure org scoping.
 */
export async function computeInsightsMetrics(): Promise<InsightsData> {
  const supabase = createServerSupabaseClient();
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const from = sevenDaysAgo.toISOString();
  const to = now.toISOString();

  // Helper to count events by type pattern
  async function countByTypePattern(pattern: string): Promise<number> {
    const { count, error } = await supabase
      .from("activity_log")
      .select("id", { count: "exact", head: true })
      .ilike("type", pattern)
      .gte("created_at", from)
      .lte("created_at", to);

    if (error) {
      console.error("[activity-insights] countByTypePattern error", error);
      return 0;
    }
    return typeof count === "number" ? count : 0;
  }

  // Helper to get unique count by field
  async function countUniqueByTypePattern(
    pattern: string,
    field: string
  ): Promise<number> {
    // For v1, we'll fetch the data and count unique values client-side
    // This is simpler than writing complex SQL
    const { data, error } = await supabase
      .from("activity_log")
      .select(field)
      .ilike("type", pattern)
      .gte("created_at", from)
      .lte("created_at", to);

    if (error) {
      console.error("[activity-insights] countUniqueByTypePattern error", error);
      return 0;
    }

    const unique = new Set(
      (data ?? []).map((row: any) => row[field]).filter(Boolean)
    );
    return unique.size;
  }

  // Helper to get connector syncs by provider
  // Note: provider might be in context/payload, not a direct column
  async function getConnectorSyncsByProvider(): Promise<Record<string, number>> {
    const { data, error } = await supabase
      .from("activity_log")
      .select("context, provider")
      .ilike("type", "connector_sync_completed%")
      .gte("created_at", from)
      .lte("created_at", to);

    if (error) {
      // If provider column doesn't exist, that's OK - return empty breakdown
      console.warn("[activity-insights] getConnectorSyncsByProvider warning", error);
      return {};
    }

    const counts: Record<string, number> = {};
    (data ?? []).forEach((row: any) => {
      // Try provider field first, then context.provider, then context
      let provider = row.provider;
      if (!provider && row.context) {
        const ctx = typeof row.context === "string" ? JSON.parse(row.context) : row.context;
        provider = ctx?.provider || ctx?.connector_provider || "unknown";
      }
      provider = provider || "unknown";
      counts[provider] = (counts[provider] || 0) + 1;
    });

    return counts;
  }

  // Helper to get daily counts
  async function getDailyCounts(): Promise<DailyCount[]> {
    // Fetch all relevant events for the last 7 days
    const { data, error } = await supabase
      .from("activity_log")
      .select("type, created_at")
      .gte("created_at", from)
      .lte("created_at", to)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[activity-insights] getDailyCounts error", error);
      return [];
    }

    // Group by day and count by type
    const dailyMap = new Map<string, DailyCount>();

    // Initialize all 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayStr = date.toISOString().split("T")[0];
      // Format date consistently on server side to avoid hydration mismatches
      const dayFormatted = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      dailyMap.set(dayStr, {
        day: dayStr,
        dayFormatted,
        docsCreated: 0,
        monoQuestions: 0,
        connectorSyncs: 0,
        signaturesCompleted: 0,
      });
    }

    // Count events by day and type
    (data ?? []).forEach((row: any) => {
      const eventType = row.type || "";
      const dayStr = new Date(row.created_at).toISOString().split("T")[0];
      const dayData = dailyMap.get(dayStr);

      if (!dayData) return;

      if (eventType.startsWith("doc_") || eventType.startsWith("share_")) {
        dayData.docsCreated++;
      } else if (eventType.startsWith("mono_")) {
        dayData.monoQuestions++;
      } else if (eventType.startsWith("connector_")) {
        dayData.connectorSyncs++;
      } else if (eventType.startsWith("signature_")) {
        dayData.signaturesCompleted++;
      }
    });

    return Array.from(dailyMap.values());
  }

  // Compute all metrics in parallel
  const [
    docsCreated,
    monoQuestions,
    connectorSyncs,
    connectorSyncsByProvider,
    signaturesCompleted,
    activeDocs,
    dailyCounts,
  ] = await Promise.all([
    // Docs created: count doc_generated, doc_created, doc_saved_to_vault (first occurrence per doc)
    countUniqueByTypePattern("doc_%", "document_id"),
    // Mono questions: count mono_* events
    countByTypePattern("mono_%"),
    // Connector syncs: count connector_sync_completed
    countByTypePattern("connector_sync_completed%"),
    // Connector syncs by provider
    getConnectorSyncsByProvider(),
    // Signatures completed: count signature_completed, signature_envelope_completed
    countByTypePattern("signature_%completed%"),
    // Active docs: unique document_ids with any doc/share/signature activity
    (async () => {
      // Fetch in separate queries and combine to avoid complex OR syntax issues
      const [docData, shareData, sigData] = await Promise.all([
        supabase
          .from("activity_log")
          .select("document_id")
          .ilike("type", "doc_%")
          .gte("created_at", from)
          .lte("created_at", to),
        supabase
          .from("activity_log")
          .select("document_id")
          .ilike("type", "share_%")
          .gte("created_at", from)
          .lte("created_at", to),
        supabase
          .from("activity_log")
          .select("document_id")
          .ilike("type", "signature_%")
          .gte("created_at", from)
          .lte("created_at", to),
      ]);

      const allIds = new Set<string>();
      
      [docData.data, shareData.data, sigData.data].forEach((dataSet) => {
        (dataSet ?? []).forEach((row: any) => {
          if (row.document_id) {
            allIds.add(row.document_id);
          }
        });
      });

      return allIds.size;
    })(),
    // Daily counts
    getDailyCounts(),
  ]);

  return {
    metrics: {
      docsCreated7d: docsCreated,
      monoQuestions7d: monoQuestions,
      connectorSyncs7d: connectorSyncs,
      connectorSyncsByProvider,
      signaturesCompleted7d: signaturesCompleted,
      activeDocs7d: activeDocs,
    },
    dailyCounts,
  };
}

