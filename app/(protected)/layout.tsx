'use client';

import type React from "react";
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "sonner";
import type { MonoContext } from "@/components/mono/mono-pane";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Construct MonoContext from pathname
  const monoContext: MonoContext = {
    route: pathname || '/dashboard',
    // selectedDocumentId and selectedUnifiedItemId will be set by individual pages if needed
    filters: {},
  };

  return (
    <AppShell monoContext={monoContext}>
      {children}
      <Toaster />
    </AppShell>
  );
}
