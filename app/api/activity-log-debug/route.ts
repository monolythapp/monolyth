import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL is not set for Supabase admin client (activity-log-debug)",
  );
}

if (!serviceRoleKey) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY is not set for Supabase admin client (activity-log-debug)",
  );
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

type DebugBody = {
  tag?: string;
};

export async function POST(req: NextRequest) {
  let tag: string | undefined;

  try {
    const body = (await req.json()) as DebugBody;
    tag = body.tag;
  } catch {
    // ignore parse errors; tag stays undefined
  }

  const itemId = tag || "debug";

  try {
    const { data, error } = await supabaseAdmin
      .from("activity_log")
      .insert({
        type: "debug_test",
        unified_item_id: itemId,
        metadata: {
          source: "activity-log-debug",
          tag: itemId,
        },
      })
      .select("*")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          details: error,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        row: data,
      },
      { status: 200 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: (err as Error).message,
      },
      { status: 500 },
    );
  }
}

