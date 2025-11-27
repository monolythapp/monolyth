"use client";

// Week 11 Day 4: Insights v1 client component
//
// Renders metric tiles and daily trends table.

import type { InsightsData } from "@/lib/activity-insights";
import { phCapture } from "@/lib/posthog-client";
import { useEffect, useRef } from "react";

interface Props {
  data?: InsightsData;
  error?: string | null;
}

export default function InsightsClientV1({ data, error }: Props) {
  const hasTrackedPageView = useRef(false);

  // Track page view on mount
  useEffect(() => {
    if (!hasTrackedPageView.current && data) {
      phCapture("insights_page_view", {
        hasMetrics: Boolean(data.metrics),
        docsCreated: data.metrics?.docsCreated7d ?? 0,
        monoQuestions: data.metrics?.monoQuestions7d ?? 0,
        connectorSyncs: data.metrics?.connectorSyncs7d ?? 0,
      });
      hasTrackedPageView.current = true;
    }
  }, [data]);
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        <p className="font-medium">Error loading insights</p>
        <p className="mt-1 text-xs">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-border/60 bg-background/60 p-4 text-sm text-muted-foreground">
        Loading insights...
      </div>
    );
  }

  const { metrics, dailyCounts } = data;
  const hasAnyActivity =
    metrics.docsCreated7d > 0 ||
    metrics.monoQuestions7d > 0 ||
    metrics.connectorSyncs7d > 0 ||
    metrics.signaturesCompleted7d > 0 ||
    metrics.activeDocs7d > 0;

  if (!hasAnyActivity) {
    return (
      <div className="rounded-lg border border-border/60 bg-background/60 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Not enough activity yet – plug in a connector or create a doc.
        </p>
      </div>
    );
  }

  // Format provider breakdown for connector syncs
  const providerBreakdown = Object.entries(metrics.connectorSyncsByProvider)
    .map(([provider, count]) => {
      const label = provider === "google_drive" ? "Drive" : provider === "gmail" ? "Gmail" : provider;
      return `${label}: ${count}`;
    })
    .join(", ");

  return (
    <div className="flex flex-col gap-6">
      {/* Metric Tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Docs Created */}
        <div
          className="rounded-lg border border-border/60 bg-background/60 p-4 cursor-pointer hover:bg-background/80 transition flex flex-col min-h-[100px]"
          onClick={() => {
            phCapture("insights_tile_clicked", { tile: "docs_created", value: metrics.docsCreated7d });
            window.location.href = "/activity?groups=docs";
          }}
        >
          <div className="text-2xl font-semibold">{metrics.docsCreated7d}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Docs created (7d)
          </div>
        </div>

        {/* Mono Questions */}
        <div
          className="rounded-lg border border-border/60 bg-background/60 p-4 cursor-pointer hover:bg-background/80 transition flex flex-col min-h-[100px]"
          onClick={() => {
            phCapture("insights_tile_clicked", { tile: "mono_questions", value: metrics.monoQuestions7d });
            window.location.href = "/activity?groups=mono";
          }}
        >
          <div className="text-2xl font-semibold">{metrics.monoQuestions7d}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Mono questions (7d)
          </div>
        </div>

        {/* Connector Syncs */}
        <div
          className="rounded-lg border border-border/60 bg-background/60 p-4 cursor-pointer hover:bg-background/80 transition flex flex-col min-h-[100px]"
          onClick={() => {
            phCapture("insights_tile_clicked", { tile: "connector_syncs", value: metrics.connectorSyncs7d });
            window.location.href = "/activity?groups=connectors";
          }}
        >
          <div className="text-2xl font-semibold">{metrics.connectorSyncs7d}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Connector syncs (7d)
          </div>
          {providerBreakdown && (
            <div className="mt-1 text-[10px] text-muted-foreground line-clamp-2">
              {providerBreakdown}
            </div>
          )}
        </div>

        {/* Signatures Completed */}
        <div
          className="rounded-lg border border-border/60 bg-background/60 p-4 cursor-pointer hover:bg-background/80 transition flex flex-col min-h-[100px]"
          onClick={() => {
            phCapture("insights_tile_clicked", { tile: "signatures_completed", value: metrics.signaturesCompleted7d });
            window.location.href = "/activity?groups=signatures";
          }}
        >
          <div className="text-2xl font-semibold">{metrics.signaturesCompleted7d}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Signatures completed (7d)
          </div>
        </div>

        {/* Active Docs (optional) */}
        {metrics.activeDocs7d > 0 && (
          <div
            className="rounded-lg border border-border/60 bg-background/60 p-4 sm:col-span-2 lg:col-span-1 cursor-pointer hover:bg-background/80 transition flex flex-col min-h-[100px]"
            onClick={() => {
              phCapture("insights_tile_clicked", { tile: "active_docs", value: metrics.activeDocs7d });
              window.location.href = "/activity?groups=docs";
            }}
          >
            <div className="text-2xl font-semibold">{metrics.activeDocs7d}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Active docs (7d)
            </div>
          </div>
        )}
      </div>

      {/* Recent Trends Table */}
      <div className="rounded-lg border border-border/60 bg-background/60">
        <div className="border-b px-4 py-2 text-xs font-medium text-muted-foreground">
          Recent trends (last 7 days)
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-muted">
              <tr>
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Day</th>
                <th className="px-3 py-2 text-right font-medium whitespace-nowrap">Docs</th>
                <th className="px-3 py-2 text-right font-medium whitespace-nowrap">Mono</th>
                <th className="px-3 py-2 text-right font-medium whitespace-nowrap">Syncs</th>
                <th className="px-3 py-2 text-right font-medium whitespace-nowrap">Signatures</th>
              </tr>
            </thead>
            <tbody>
              {dailyCounts.map((day) => (
                <tr key={day.day} className="border-t hover:bg-muted/50 transition-colors">
                  <td className="px-3 py-2 whitespace-nowrap">{day.dayFormatted}</td>
                  <td className="px-3 py-2 text-right">{day.docsCreated}</td>
                  <td className="px-3 py-2 text-right">{day.monoQuestions}</td>
                  <td className="px-3 py-2 text-right">{day.connectorSyncs}</td>
                  <td className="px-3 py-2 text-right">{day.signaturesCompleted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

