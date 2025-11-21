"use client";

import { useState } from "react";
import type { AnalyzeResult } from "@/lib/ai/schemas";
import { analyzeItem } from "@/lib/ai/analyze";

type BasicUnifiedItem = {
  id: string;
  title: string;
  snippet?: string | null;
  source?: string | null;
  kind?: string | null;
  orgId?: string | null;
  documentId?: string | null;
};

interface AnalyzeDrawerProps {
  item: BasicUnifiedItem | null;
  open: boolean;
  onClose: () => void;
}

export function AnalyzeDrawer({ item, open, onClose }: AnalyzeDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);

  if (!item) return null;
  if (!open) return null;

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        itemId: item.id,
        title: item.title,
        snippet:
          item.snippet ??
          "No snippet available; summarize based on available metadata only.",
        metadata: {
          source: item.source,
          kind: item.kind,
          orgId: item.orgId,
          documentId: item.documentId,
        },
      };
      const res = await analyzeItem(payload);
      setResult(res);

      // ActivityLog is now handled server-side in /api/ai/analyze
    } catch (err) {
      setError((err as Error).message ?? "Analyze failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-end bg-black/20">
      <div className="h-full w-full max-w-md bg-background shadow-xl border-l flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex flex-col">
            <span className="text-sm font-medium">Analyze item</span>
            <span className="text-xs text-muted-foreground truncate max-w-xs">
              {item.title}
            </span>
          </div>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 text-sm space-y-3">
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">
              Snippet
            </div>
            <div className="rounded-md border bg-muted/40 p-2 max-h-32 overflow-y-auto">
              <p className="whitespace-pre-wrap text-xs">
                {item.snippet ?? "No snippet available."}
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">
              Summary
            </div>
            <div className="rounded-md border bg-muted/40 p-2 min-h-[60px]">
              <p className="whitespace-pre-wrap text-xs">
                {result?.summary ?? "No analysis yet."}
              </p>
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">
              Entities
            </div>
            <div className="rounded-md border bg-muted/40 p-2 min-h-[60px] space-y-1">
              {result?.entities?.length
                ? result.entities.map((e, idx) => (
                    <div key={idx} className="flex justify-between gap-2 text-xs">
                      <span className="font-medium">{e.label}</span>
                      <span className="text-muted-foreground truncate max-w-[180px]">
                        {e.value}
                      </span>
                    </div>
                  ))
                : (
                  <p className="text-xs text-muted-foreground">
                    No entities extracted yet.
                  </p>
                  )}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">
              Dates
            </div>
            <div className="rounded-md border bg-muted/40 p-2 min-h-[40px]">
              {result?.dates?.length
                ? (
                  <ul className="list-disc list-inside text-xs">
                    {result.dates.map((d, idx) => (
                      <li key={idx}>{d}</li>
                    ))}
                  </ul>
                  )
                : (
                  <p className="text-xs text-muted-foreground">
                    No dates extracted yet.
                  </p>
                  )}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">
              Next action
            </div>
            <div className="rounded-md border bg-muted/40 p-2 min-h-[40px]">
              <p className="text-xs whitespace-pre-wrap">
                {result?.nextAction ?? "No recommended next action yet."}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t px-4 py-3 flex items-center justify-between gap-2">
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleAnalyze}
            className="inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </div>
      </div>
    </div>
  );
}

