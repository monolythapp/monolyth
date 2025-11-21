"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

type ToastFn = (opts: {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}) => void;

export type HandleApiErrorResult = "auth" | "error";

/**
 * Centralized helper for API error and auth handling.
 * Returns:
 *  - "auth"  if a 401/403 was handled (session expired)
 *  - "error" for other handled errors
 */
export function handleApiError(params: {
  status: number;
  errorMessage?: string;
  toast: ToastFn;
  router?: AppRouterInstance;
  context?: string;
  redirectToLogin?: boolean;
}): HandleApiErrorResult {
  const { status, errorMessage, toast, router, context, redirectToLogin } = params;

  const label = context ? `[${context}]` : "[api]";

  if (status === 401 || status === 403) {
    toast({
      title: "Session expired",
      description: "Please sign in again to continue.",
      variant: "destructive",
    });

    console.error(`${label} auth error`, { status, errorMessage });

    if (redirectToLogin && router) {
      // Soft redirect to login if provided; do not throw if router is missing.
      router.push("/login");
    }

    return "auth";
  }

  toast({
    title: "Something went wrong",
    description:
      errorMessage ?? "We couldn't complete that action. Please try again.",
    variant: "destructive",
  });

  console.error(`${label} api error`, { status, errorMessage });

  return "error";
}

