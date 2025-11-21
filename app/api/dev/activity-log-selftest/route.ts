import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { logActivity } from "@/lib/activity-log";

// Dev-only self-test endpoint for activity logging
// Returns 403 in production

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 403 },
    );
  }

  try {
    const supabase = createServerSupabaseClient();

    // Try to get or create a demo org for the self-test
    let orgId: string | null = null;

    // First, try to find an existing demo org
    const { data: demoOrgs } = await supabase
      .from("org")
      .select("id")
      .eq("name", "Demo Workspace")
      .limit(1);

    if (demoOrgs && demoOrgs.length > 0) {
      orgId = demoOrgs[0].id;
    } else {
      // Create a demo org if none exists
      const { data: newOrg, error: orgError } = await supabase
        .from("org")
        .insert({
          name: "Demo Workspace",
          plan: "free",
        })
        .select("id")
        .single();

      if (orgError || !newOrg) {
        return NextResponse.json(
          {
            ok: false,
            error: `Failed to get or create demo org: ${orgError?.message ?? "unknown"}`,
          },
          { status: 500 },
        );
      }

      orgId = newOrg.id;
    }

    if (!orgId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Could not determine org_id for self-test",
        },
        { status: 500 },
      );
    }

    // Call logActivity with test data
    // Note: unified_item_id should be a UUID or null, but for self-test we'll use null
    // since we don't have a real unified_item
    try {
      await logActivity({
        orgId,
        userId: null, // Allow null for self-test
        type: "selftest",
        unifiedItemId: null, // Use null since we don't have a real unified_item for self-test
        context: {
          source: "selftest",
          note: "manual self-test from dev endpoint",
          timestamp: new Date().toISOString(),
        },
      });

      return NextResponse.json(
        {
          ok: true,
          message: "Self-test activity log inserted successfully",
          orgId,
        },
        { status: 200 },
      );
    } catch (logError) {
      const errorMessage = (logError as Error).message ?? "Unknown error";
      console.error("[activity_log_selftest] logActivity failed", logError);
      return NextResponse.json(
        {
          ok: false,
          error: `logActivity failed: ${errorMessage}`,
          details: logError,
        },
        { status: 500 },
      );
    }
  } catch (err) {
    console.error("[activity_log_selftest] Exception", err);
    return NextResponse.json(
      {
        ok: false,
        error: (err as Error).message,
      },
      { status: 500 },
    );
  }
}

