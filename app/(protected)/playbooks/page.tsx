// TODO(monolyth-playbooks): Replace MOCK_PLAYBOOKS with Supabase-backed query in Week 7–9.

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
import { Play, Clock, Zap, CheckCircle2, ArrowRight, Sparkles, Eye, Pause } from 'lucide-react';

type PlaybookStatus = "active" | "draft" | "paused";

type PlaybookSummary = {
  id: string;
  name: string;
  type: "inbound_nda" | "proposal" | "hiring_packet" | "custom";
  runs: number;
  lastRunAt: string | null;   // ISO string
  status: PlaybookStatus;
  description?: string;
};

const MOCK_PLAYBOOKS: PlaybookSummary[] = [
  {
    id: "pb-001",
    name: "Inbound NDA Processor",
    type: "inbound_nda",
    runs: 42,
    lastRunAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    status: "active",
    description: "Automatically save, analyze, send for signature, and share NDAs",
  },
  {
    id: "pb-002",
    name: "Proposal Workflow",
    type: "proposal",
    runs: 17,
    lastRunAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    status: "active",
    description: "Route proposals through review and approval chain",
  },
  {
    id: "pb-003",
    name: "Hiring Packet Generator",
    type: "hiring_packet",
    runs: 3,
    lastRunAt: null,
    status: "draft",
    description: "Generate complete hiring documentation package",
  },
  {
    id: "pb-004",
    name: "Contract Expiry Monitor",
    type: "custom",
    runs: 28,
    lastRunAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    status: "paused",
    description: "Alert team 30 days before document expiration",
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

function getStatusBadge(status: PlaybookStatus) {
  switch (status) {
    case "active":
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Active</Badge>;
    case "draft":
      return <Badge variant="secondary">Draft</Badge>;
    case "paused":
      return <Badge variant="outline">Paused</Badge>;
  }
}

function getTypeLabel(type: PlaybookSummary["type"]): string {
  switch (type) {
    case "inbound_nda":
      return "Inbound NDA";
    case "proposal":
      return "Proposal";
    case "hiring_packet":
      return "Hiring Packet";
    case "custom":
      return "Custom";
  }
}

export default function PlaybooksPage() {
  const playbooksEnabled = isFeatureEnabled("FEATURE_PLAYBOOKS_ENGINE");

  if (!playbooksEnabled) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-2">Playbooks</h1>
        <p className="text-sm text-muted-foreground">
          The Playbooks automation engine is not enabled in this Beta build.
        </p>
      </div>
    );
  }

  const totalRuns = MOCK_PLAYBOOKS.reduce((sum, p) => sum + p.runs, 0);
  const activeCount = MOCK_PLAYBOOKS.filter((p) => p.status === "active").length;

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Playbooks</h1>
          <p className="text-muted-foreground mt-1">
            Automate repetitive document workflows with AI
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-mono" />
            <span>Ask Mono about automation</span>
          </div>
          <Button>
            <Play className="h-4 w-4 mr-2" />
            Create Playbook
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRuns}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all playbooks</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Playbooks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently running</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Time Saved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12.4h</div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Playbooks</CardTitle>
          <CardDescription>Your automation workflows</CardDescription>
        </CardHeader>
        <CardContent>
          {MOCK_PLAYBOOKS.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Play className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Playbooks yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Playbooks automate document workflows like inbound NDAs and proposals.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button>
                  <Play className="h-4 w-4 mr-2" />
                  Create your first playbook
                </Button>
                <Button variant="outline">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Ask Mono to suggest one
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Runs</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_PLAYBOOKS.map((playbook) => (
                  <TableRow key={playbook.id}>
                    <TableCell>
                      <div className="max-w-md">
                        <div className="font-medium truncate">{playbook.name}</div>
                        {playbook.description && (
                          <div className="text-sm text-muted-foreground truncate">{playbook.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getTypeLabel(playbook.type)}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Play className="h-3 w-3 text-muted-foreground" />
                        {playbook.runs}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatTimeAgo(playbook.lastRunAt)}
                    </TableCell>
                    <TableCell>{getStatusBadge(playbook.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {playbook.status === "active" ? (
                          <Button variant="ghost" size="sm">
                            <Pause className="h-4 w-4 mr-1" />
                            Pause
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm">
                            <Play className="h-4 w-4 mr-1" />
                            Run
                          </Button>
                        )}
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

