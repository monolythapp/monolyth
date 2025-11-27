// Week 8: Activity page wired to ActivityClient
//
// Server component:
// - Renders ActivityClient without requiring a workspace.
// - In this v1, Activity telemetry is aggregated across all visible data
//   for the current user/project.

import { Suspense } from "react";
import ActivityClient from "./_components/activity-client";

export default async function ActivityPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">Activity</h1>
          <p className="text-sm text-muted-foreground">
            A single place to answer &quot;what just happened?&quot; across docs, Mono, connectors, and signatures.
          </p>
        </div>
        <a
          href="/insights"
          className="inline-flex items-center rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition whitespace-nowrap"
        >
          View insights
        </a>
      </div>

      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading activity...</div>}>
        <ActivityClient />
      </Suspense>
    </div>
  );
}
