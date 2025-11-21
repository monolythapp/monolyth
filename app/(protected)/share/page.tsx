// TODO(monolyth-share): Replace MOCK_SHARE_LINKS with Supabase-backed query + actions (create/revoke) in Week 7–9.

"use client";

import { isFeatureEnabled } from "@/lib/feature-flags";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Link2, Eye, Copy, Send, Trash2, BarChart3, Lock, Sparkles } from 'lucide-react';

type SharePermission = "view" | "comment" | "edit";

type ShareProtection = {
  passcodeEnabled: boolean;
  watermarkEnabled: boolean;
  expiresAt: string | null;  // ISO
};

type ShareStats = {
  views: number;
  downloads: number;
  lastViewedAt: string | null; // ISO
};

type ShareLinkSummary = {
  id: string;
  docTitle: string;
  createdAt: string;  // ISO
  createdBy: string;  // simple string for now (e.g. "You")
  permission: SharePermission;
  protection: ShareProtection;
  stats: ShareStats;
};

const MOCK_SHARE_LINKS: ShareLinkSummary[] = [
  {
    id: "share-001",
    docTitle: "Partnership Agreement - Acme Corp",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    createdBy: "You",
    permission: "view",
    protection: {
      passcodeEnabled: true,
      watermarkEnabled: true,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    },
    stats: {
      views: 12,
      downloads: 3,
      lastViewedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    },
  },
  {
    id: "share-002",
    docTitle: "Q4 Financial Report - Draft",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
    createdBy: "You",
    permission: "edit",
    protection: {
      passcodeEnabled: false,
      watermarkEnabled: false,
      expiresAt: null,
    },
    stats: {
      views: 8,
      downloads: 1,
      lastViewedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    },
  },
  {
    id: "share-003",
    docTitle: "Product Roadmap 2024",
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks ago
    createdBy: "You",
    permission: "comment",
    protection: {
      passcodeEnabled: false,
      watermarkEnabled: true,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    },
    stats: {
      views: 45,
      downloads: 12,
      lastViewedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    },
  },
  {
    id: "share-004",
    docTitle: "NDA - Mutual Confidentiality",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    createdBy: "You",
    permission: "view",
    protection: {
      passcodeEnabled: true,
      watermarkEnabled: false,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days from now
    },
    stats: {
      views: 3,
      downloads: 0,
      lastViewedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
    },
  },
];

function formatTimeAgo(isoString: string | null): string {
  if (!isoString) return "Never";
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
}

function formatExpiresAt(isoString: string | null): string {
  if (!isoString) return "Never";
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays < 0) return "Expired";
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays < 7) return `In ${diffDays} days`;
  return date.toLocaleDateString();
}

function getPermissionLabel(permission: SharePermission): string {
  switch (permission) {
    case "view":
      return "View Only";
    case "comment":
      return "View & Comment";
    case "edit":
      return "Edit";
  }
}

function getProtectionLabel(protection: ShareProtection): string {
  const parts: string[] = [];
  if (protection.passcodeEnabled) parts.push("Password");
  if (protection.watermarkEnabled) parts.push("Watermark");
  return parts.length > 0 ? parts.join(", ") : "None";
}

export default function SharePage() {
  const shareActionsEnabled = isFeatureEnabled("FEATURE_SHARE_ACTIONS");
  const totalViews = MOCK_SHARE_LINKS.reduce((sum, link) => sum + link.stats.views, 0);
  const protectedCount = MOCK_SHARE_LINKS.filter(
    (link) => link.protection.passcodeEnabled || link.protection.watermarkEnabled
  ).length;

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Share Center</h1>
          <p className="text-muted-foreground mt-1">
            Manage document sharing and track viewer activity
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-mono" />
            <span>Ask Mono about sharing</span>
          </div>
          <Button>
            <Link2 className="h-4 w-4 mr-2" />
            Create Share Link
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{MOCK_SHARE_LINKS.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalViews}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all links</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Protected Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{protectedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Password or watermark</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Guest Signups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground mt-1">From shared links</p>
          </CardContent>
        </Card>
      </div>

        <Card>
          <CardHeader>
            <CardTitle>Active Share Links</CardTitle>
            <CardDescription>
              Manage and monitor your shared document links
            </CardDescription>
            {!shareActionsEnabled && (
              <p className="text-xs text-muted-foreground mt-1">
                Advanced share workflows are coming soon.
              </p>
            )}
          </CardHeader>
        <CardContent>
          {MOCK_SHARE_LINKS.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Link2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No share links yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Create a secure link to share documents with passcodes, watermarks, and expiry.
              </p>
              <Button>
                <Link2 className="h-4 w-4 mr-2" />
                Create a share link
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Permission</TableHead>
                  <TableHead>Protection</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Last Viewed</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_SHARE_LINKS.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell className="font-medium max-w-xs">
                      <div className="truncate">{link.docTitle}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getPermissionLabel(link.permission)}</Badge>
                    </TableCell>
                    <TableCell>
                      {getProtectionLabel(link.protection) !== "None" ? (
                        <Badge variant="secondary" className="gap-1">
                          <Lock className="h-3 w-3" />
                          {getProtectionLabel(link.protection)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3 text-muted-foreground" />
                        {link.stats.views}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatTimeAgo(link.stats.lastViewedAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatExpiresAt(link.protection.expiresAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Open link">
                          <Link2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Copy link">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Revoke">
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

