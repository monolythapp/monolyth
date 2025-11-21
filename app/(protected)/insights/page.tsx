"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  TrendingDown,
  FileText,
  Users,
  Clock,
  Zap,
  Target,
  AlertCircle,
  RefreshCw,
  Download,
} from "lucide-react";

/**
 * Event row shape (extend as needed)
 */
type InsightEvent = {
  id: number;
  event_type: "view" | "download" | "share_created" | "envelope";
  created_at: string;
  doc_id: string | null;
  meta_json: Record<string, unknown>;
};

export default function InsightsPage() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [rows, setRows] = useState<InsightEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  /**
   * Load events (memoized)
   */
  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);

    const { data, error } = await sb
      .from("events")
      .select("id, event_type, created_at, doc_id, meta_json")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      setErr(error.message);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows(data || []);
    setLoading(false);
  }, [sb]);

  /**
   * Initial load + lightweight polling while testing.
   */
  useEffect(() => {
    let cancelled = false;

    const kickOff = () => {
      if (!cancelled) void load();
    };

    const t0 = setTimeout(kickOff, 0);
    const interval = setInterval(kickOff, 3000);

    return () => {
      cancelled = true;
      clearTimeout(t0);
      clearInterval(interval);
    };
  }, [load]);

  /** Render a short, safe preview of meta_json */
  function safePreview(obj: Record<string, unknown> | null | undefined): string {
    try {
      if (!obj) return "—";
      const s = JSON.stringify(obj);
      return s.length > 120 ? s.slice(0, 117) + "…" : s;
    } catch {
      return "—";
    }
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Insights</h1>
          <p className="text-muted-foreground mt-1">
            Analytics and intelligence about your document workflow
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" asChild>
            <a href="/api/dev/insights/export" download>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Total Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rows.length}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-600" />
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(rows.map((r) => r.doc_id).filter(Boolean)).size}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Unique documents</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rows.filter((r) => {
                const eventDate = new Date(r.created_at);
                const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                return eventDate > dayAgo;
              }).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-600" />
              Event Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(rows.map((r) => r.event_type)).size}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Unique types</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event Log</CardTitle>
          <CardDescription>
            Detailed event history from your document workflow
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="text-center py-8 text-muted-foreground">Loading…</div>
          )}
          {!loading && err && (
            <div className="text-center py-8 text-destructive">Error: {err}</div>
          )}
          {!loading && !err && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Doc</TableHead>
                  <TableHead>Meta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No events yet
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{r.event_type}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {r.doc_id ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-[420px] truncate">
                        {safePreview(r.meta_json)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
