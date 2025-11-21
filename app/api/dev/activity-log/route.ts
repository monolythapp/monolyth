import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { cookies } from "next/headers";

// Dev-only route to inspect activity_log entries
// Returns 403 in production

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  try {
    const supabase = createServerSupabaseClient();

    // Query activity_log (last 20 rows)
    // In dev, we show all rows without filtering to make debugging easier
    // The service-role client bypasses RLS, so we can see everything
    const { data, error } = await supabase
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("[dev_activity_log] Query error", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        count: data?.length ?? 0,
        rows: data ?? [],
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[dev_activity_log] Exception", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

