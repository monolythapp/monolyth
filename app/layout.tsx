// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AnalyticsInit from "./analytics"; // PostHog init (client-safe)
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Monolyth - All your docs. One brain.",
  description: "Document-first business OS with AI assistance",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          {/* Initializes PostHog if NEXT_PUBLIC_POSTHOG_KEY is set; no-ops otherwise */}
          <AnalyticsInit />
        </ThemeProvider>
      </body>
    </html>
  );
}
