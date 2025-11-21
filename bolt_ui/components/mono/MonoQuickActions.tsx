'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

interface MonoQuickActionsProps {
  context: string;
}

const contextActions: Record<string, { label: string; description: string }[]> = {
  dashboard: [
    { label: 'Summarize today', description: 'Get an overview of today\'s activity' },
    { label: 'What should I focus on?', description: 'AI-prioritized action items' },
    { label: 'Show blockers', description: 'Identify pending items' },
  ],
  workbench: [
    { label: 'Organize these docs', description: 'Smart categorization' },
    { label: 'Group by project', description: 'Auto-group by context' },
    { label: 'Identify blockers', description: 'Find stuck documents' },
    { label: 'Show outdated', description: 'Find stale documents' },
  ],
  builder: [
    { label: 'Draft this document', description: 'Generate from template' },
    { label: 'Review clauses', description: 'Legal compliance check' },
    { label: 'Tighten language', description: 'Improve clarity' },
    { label: 'Add missing sections', description: 'Complete the document' },
  ],
  vault: [
    { label: 'Find outdated docs', description: 'Show stale files' },
    { label: 'Suggest archive', description: 'Clean up old docs' },
    { label: 'Show signed docs', description: 'Filter by signature status' },
    { label: 'Dedupe similar files', description: 'Find duplicates' },
  ],
};

export function MonoQuickActions({ context }: MonoQuickActionsProps) {
  const actions = contextActions[context] || contextActions.dashboard;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-mono" />
        <h3 className="text-sm font-medium">Quick Actions</h3>
      </div>
      <div className="space-y-2">
        {actions.map((action, index) => (
          <Button
            key={index}
            variant="outline"
            className="w-full justify-start h-auto py-3 px-4"
          >
            <div className="flex flex-col items-start gap-1 text-left">
              <span className="text-sm font-medium">{action.label}</span>
              <span className="text-xs text-muted-foreground font-normal">
                {action.description}
              </span>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}
