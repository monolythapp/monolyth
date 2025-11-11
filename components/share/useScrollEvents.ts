"use client";

import { useEffect, useRef } from "react";

type Options = {
  /** Scroll thresholds to emit events at (0–1) */
  thresholds?: number[];
  /** Optional share id when using object form */
  shareId?: string;
};

/**
 * Logs "share_open" once on mount, then "share_scroll" at given thresholds.
 * Call as:
 *   useScrollEvents("share_123")            // string form
 *   useScrollEvents({ shareId: "share_123" }) // object form
 */
export default function useScrollEvents(arg?: string | Options) {
  const shareId = typeof arg === "string" ? arg : arg?.shareId;
  const thresholds = (typeof arg === "object" && arg?.thresholds) || [0.33, 0.66, 0.95];

  const sent = useRef<Record<number, boolean>>({});

  // Without id, do nothing
  useEffect(() => {
    if (!shareId) return;
    void fetch("/api/events/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "share_open", shareId }),
    });
  }, [shareId]);

  useEffect(() => {
    if (!shareId) return;

    const onScroll = () => {
      const el = document.documentElement;
      const total = el.scrollHeight - el.clientHeight;
      const ratio = total <= 0 ? 1 : el.scrollTop / total;

      thresholds.forEach((t) => {
        if (ratio >= t && !sent.current[t]) {
          sent.current[t] = true;
          void fetch("/api/events/log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "share_scroll", shareId, at: t }),
          });
        }
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [shareId, thresholds]);
}
