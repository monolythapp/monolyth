"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Upload,
  Download,
  Share2,
  FileSignature,
  Edit,
  Trash2,
  Eye,
  Sparkles,
  Save,
  Brain,
  Activity,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";
import { useToast } from "@/hooks/use-toast";
import { handleApiError } from "@/lib/handle-api-error";
import Link from "next/link";

type ActivityLogRow = {
  id: string;
  org_id: string | null;
  user_id: string | null;
  type: string;
  unified_item_id: string | null;
  document_id: string | null;
  version_id: string | null;
  context: Record<string, unknown> | null;
  created_at: string;
};

type ActivityFeedItem = {
  id: string;
  type: string;
  user: string;
  action: string;
  target: string;
  time: string;
  icon: typeof FileText;
  color: string;
};

// Map activity log types to user-friendly actions and icons
function mapActivityTypeToFeed(
  row: ActivityLogRow,
  userMap: Map<string, string>
): ActivityFeedItem | null {
  const userName = row.user_id ? userMap.get(row.user_id) || "Unknown User" : "System";
  const timeAgo = getTimeAgo(new Date(row.created_at));
  
  // Extract document name from context if available
  const context = row.context as Record<string, unknown> | null;
  const docName = (context?.documentName as string) || (context?.title as string) || 
    (row.document_id ? `Document ${row.document_id.slice(0, 8)}...` : 
     row.unified_item_id ? `Item ${row.unified_item_id.slice(0, 8)}...` : "Unknown Document");

  const typeMap: Record<string, { action: string; icon: typeof FileText; color: string }> = {
    analyze_completed: { action: "analyzed", icon: Brain, color: "text-purple-600" },
    doc_generated: { action: "generated", icon: FileText, color: "text-blue-600" },
    doc_saved_to_vault: { action: "saved to vault", icon: Save, color: "text-green-600" },
    document_created: { action: "created", icon: FileText, color: "text-blue-600" },
    document_updated: { action: "edited", icon: Edit, color: "text-orange-600" },
    document_viewed: { action: "viewed", icon: Eye, color: "text-gray-600" },
    document_deleted: { action: "deleted", icon: Trash2, color: "text-red-600" },
    document_shared: { action: "shared", icon: Share2, color: "text-purple-600" },
    document_downloaded: { action: "downloaded", icon: Download, color: "text-teal-600" },
    document_uploaded: { action: "uploaded", icon: Upload, color: "text-blue-600" },
    signature_sent: { action: "sent for signature", icon: FileSignature, color: "text-blue-600" },
    signature_completed: { action: "signed", icon: FileSignature, color: "text-green-600" },
    version_saved: { action: "saved version", icon: Save, color: "text-green-600" },
  };

  const mapped = typeMap[row.type] || {
    action: row.type.replace(/_/g, " "),
    icon: FileText,
    color: "text-gray-600",
  };

  return {
    id: row.id,
    type: row.type,
    user: userName,
    action: mapped.action,
    target: docName as string,
    time: timeAgo,
    icon: mapped.icon,
    color: mapped.color,
  };
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ActivityPage() {
  const { toast } = useToast();
  const sb = useMemo(() => getBrowserSupabaseClient(), []);
  const [rows, setRows] = useState<ActivityLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("7d");

  // Get current user and org
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await sb.auth.getUser();
        if (cancelled) return;
        if (user) {
          setUserId(user.id);
          // Get user's org
          const { data: memberships, error: membershipsError } = await sb
            .from("member")
            .select("org_id")
            .eq("user_id", user.id)
            .limit(1);
          
          if (membershipsError) {
            const errorMessage = membershipsError.message;
            const status = errorMessage.includes("401") || membershipsError.code === "PGRST301" || membershipsError.code === "42501" ? 401 : 500;
            handleApiError({
              status,
              errorMessage,
              toast,
              context: "activity",
            });
          } else if (memberships && memberships.length > 0) {
            setOrgId(memberships[0].org_id);
          }
        }
      } catch (err) {
        if (cancelled) return;
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        const status = errorMessage.includes("401") ? 401 : errorMessage.includes("403") ? 403 : 500;
        handleApiError({
          status,
          errorMessage,
          toast,
          context: "activity",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sb, toast]);

  // Fetch activity logs
  useEffect(() => {
    if (!userId || !orgId) return;

    let cancelled = false;

    async function fetchLogs() {
      setLoading(true);
      setError(null);

      try {
        // Calculate date range
        const now = new Date();
        const startDate = new Date();
        if (dateFilter === "24h") {
          startDate.setHours(now.getHours() - 24);
        } else if (dateFilter === "7d") {
          startDate.setDate(now.getDate() - 7);
        } else if (dateFilter === "30d") {
          startDate.setDate(now.getDate() - 30);
        }

        let query = sb
          .from("activity_log")
          .select("*")
          .eq("org_id", orgId)
          .gte("created_at", startDate.toISOString())
          .order("created_at", { ascending: false })
          .limit(100);

        if (typeFilter !== "all") {
          query = query.eq("type", typeFilter);
        }

        const { data, error: queryError } = await query;

        if (cancelled) return;

        if (queryError) {
          const errorMessage = queryError.message;
          const status = errorMessage.includes("401") || queryError.code === "PGRST301" || queryError.code === "42501" ? 401 : 500;
          handleApiError({
            status,
            errorMessage,
            toast,
            context: "activity",
          });
          throw new Error(errorMessage);
        }

        setRows(data || []);
      } catch (err) {
        if (!cancelled) {
          const errorMessage = err instanceof Error ? err.message : "Unknown error";
          setError(errorMessage);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchLogs();

    return () => {
      cancelled = true;
    };
  }, [sb, userId, orgId, typeFilter, dateFilter, toast]);

  // Transform activity log rows to feed format
  const activityFeed = useMemo(() => {
    if (!rows.length) return [];

    // Create a simple user map (in a real app, you'd fetch user names from the database)
    const userMap = new Map<string, string>();
    rows.forEach((row) => {
      if (row.user_id && !userMap.has(row.user_id)) {
        // Use "You" if it's the current user, otherwise a placeholder
        const displayName = row.user_id === userId ? "You" : `User ${row.user_id.slice(0, 8)}`;
        userMap.set(row.user_id, displayName);
      }
    });

    return rows
      .map((row) => mapActivityTypeToFeed(row, userMap))
      .filter((item): item is ActivityFeedItem => item !== null);
  }, [rows, userId]);

  // Calculate summary stats
  const todayCount = useMemo(() => {
    if (!rows.length) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return rows.filter(
      (row) => new Date(row.created_at) >= today
    ).length;
  }, [rows]);

  const uniqueUsers = useMemo(() => {
    if (!rows.length) return 0;
    const userIds = new Set(rows.map((row) => row.user_id).filter(Boolean));
    return userIds.size;
  }, [rows]);

  const documentsTouched = useMemo(() => {
    if (!rows.length) return 0;
    const docIds = new Set(
      rows
        .map((row) => row.document_id || row.unified_item_id)
        .filter(Boolean)
    );
    return docIds.size;
  }, [rows]);

  if (loading) {
    return (
      <div className="p-8 max-w-[1200px] mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activity</h1>
          <p className="text-muted-foreground mt-1">Loading activity...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-[1200px] mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activity</h1>
          <p className="text-muted-foreground mt-1">Track all document and workflow activities</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-destructive mb-2">Unable to load activity right now.</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activity</h1>
          <p className="text-muted-foreground mt-1">
            Track all document and workflow activities
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-mono" />
          <span>Ask Mono about activity</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 pb-2">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            <SelectItem value="analyze_completed">Analyze Completed</SelectItem>
            <SelectItem value="doc_generated">Document Generated</SelectItem>
            <SelectItem value="doc_saved_to_vault">Saved to Vault</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24 hours</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Today's Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {rows.length ? `of ${rows.length} total entries` : "No activity yet"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">In last 24 hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Documents Touched</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documentsTouched}</div>
            <p className="text-xs text-muted-foreground mt-1">This week</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            All document and user activity across your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activityFeed.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Activity className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No activity yet</h3>
              <p className="text-muted-foreground mb-2">
                Analyze a doc, generate a contract, or save to Vault to see activity here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activityFeed.map((activity) => {
                const Icon = activity.icon;
                const initials = getInitials(activity.user);

                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 pb-4 border-b last:border-0"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{activity.user}</span>
                        <span className="text-sm text-muted-foreground">{activity.action}</span>
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        {(() => {
                          const row = rows.find((r) => r.id === activity.id);
                          const targetText = (
                            <span className="text-sm font-medium truncate">{activity.target}</span>
                          );
                          if (row?.document_id) {
                            return (
                              <Link
                                href={`/vault?documentId=${row.document_id}`}
                                className="text-sm font-medium text-primary hover:underline truncate"
                              >
                                {activity.target}
                              </Link>
                            );
                          }
                          if (row?.unified_item_id) {
                            return (
                              <Link
                                href={`/workbench?unifiedItemId=${row.unified_item_id}`}
                                className="text-sm font-medium text-primary hover:underline truncate"
                              >
                                {activity.target}
                              </Link>
                            );
                          }
                          return targetText;
                        })()}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Icon className={`h-3 w-3 ${activity.color} flex-shrink-0`} />
                        <span>{activity.time}</span>
                      </div>
                    </div>

                    <Badge variant="outline" className="text-xs">
                      {activity.type.replace(/_/g, " ")}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

