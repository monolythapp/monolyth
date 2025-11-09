"use client";

import { useEffect, useRef } from "react";

type Options = { shareId: string; thresholds?: number[] };

async function postEvent(type: string, shareId: string, meta?: Record<string, any>) {
  try {
    await fetch("/api/events/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, shareId, meta }),
      keepalive: true,
    });
  } catch {}
}

export function useScrollEvents({ shareId, thresholds = [33, 66, 95] }: Options) {
  const sent = useRef<Record<number, boolean>>({});

  useEffect(() => {
    postEvent("share_open", shareId, { ts: Date.now() }).catch(() => {});

    function onScroll() {
      const doc = document.documentElement;
      const total = doc.scrollHeight - doc.clientHeight;
      if (total <= 0) return;
      const pct = Math.min(100, Math.round((doc.scrollTop / total) * 100));
      for (const t of thresholds) {
        if (!sent.current[t] && pct >= t) {
          sent.current[t] = true;
          postEvent("scroll", shareId, { pct: t }).catch(() => {});
        }
      }
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [shareId, thresholds]);
}
