'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MonoAssistant } from './mono/MonoAssistant';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: React.ReactNode;
  monoContext?: string;
}

export function AppShell({ children, monoContext = 'dashboard' }: AppShellProps) {
  const [monoOpen, setMonoOpen] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onMonoToggle={() => setMonoOpen(!monoOpen)} monoOpen={monoOpen} />

        <main
          className={cn(
            'flex-1 overflow-auto transition-all duration-300',
            monoOpen && 'mr-[400px]'
          )}
        >
          {children}
        </main>
      </div>

      <MonoAssistant
        isOpen={monoOpen}
        onClose={() => setMonoOpen(false)}
        context={monoContext}
      />
    </div>
  );
}
