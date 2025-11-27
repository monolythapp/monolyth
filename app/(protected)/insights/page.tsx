// Week 11 Day 4: Insights v1 page
//
// Server component that computes and displays Activity & Insights metrics
// for the last 7 days.

import { computeInsightsMetrics } from "@/lib/activity-insights";
import InsightsClientV1 from "./_components/insights-client-v1";

export default async function InsightsPage() {
  let insightsData;
  let error: string | null = null;

  try {
    insightsData = await computeInsightsMetrics();
  } catch (err: any) {
    console.error("[InsightsPage] Error computing metrics", err);
    error = err?.message || "Failed to load insights";
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Insights</h1>
        <p className="text-sm text-muted-foreground">
          Simple metrics that prove Monolyth is doing work for you (and that connectors are alive).
        </p>
      </div>

      <InsightsClientV1 data={insightsData} error={error} />
    </div>
  );
}
