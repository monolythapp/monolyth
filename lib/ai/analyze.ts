"use client";

import { AnalyzeResultSchema, type AnalyzeResult } from "./schemas";

export interface AnalyzeRequestPayload {
  itemId: string;
  title: string;
  snippet: string;
  metadata?: Record<string, unknown>;
}

export async function analyzeItem(
  payload: AnalyzeRequestPayload,
): Promise<AnalyzeResult> {
  const res = await fetch("/api/ai/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Analyze request failed with status ${res.status}: ${text || res.statusText}`,
    );
  }

  const json = await res.json();
  return AnalyzeResultSchema.parse(json);
}

