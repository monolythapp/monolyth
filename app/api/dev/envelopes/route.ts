import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

// Dev-only route to inspect recent envelopes
// Returns 403 in production

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { ok: false, error: "Dev only" },
      { status: 403 }
    );
  }

  try {
    const supabase = createServerSupabaseClient();

    // Query envelopes (last 20 rows)
    const { data, error } = await supabase
      .from("envelope")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("[dev_envelopes] Query error", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        count: data?.length ?? 0,
        envelopes: data ?? [],
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[dev_envelopes] Exception", err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}

