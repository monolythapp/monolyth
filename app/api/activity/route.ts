import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import {
  buildActivityLogQuery,
  type ActivityEventGroup,
} from "@/lib/activity-queries";

function parseLimit(raw: string | null): number {
  if (!raw) return 50;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 50;
  return Math.min(Math.max(Math.floor(n), 1), 100);
}

function parseGroups(searchParams: URLSearchParams): ActivityEventGroup[] | undefined {
  const allowed = new Set<ActivityEventGroup>([
    "docs",
    "mono",
    "connectors",
    "signatures",
    "system",
  ]);

  // Support both:
  // - /api/activity?groups=docs,mono
  // - /api/activity?group=docs&group=mono
  const fromPlural = searchParams.get("groups");
  const fromRepeated = searchParams.getAll("group");

  const combined: string[] = [];
  if (fromPlural) {
    combined.push(
      ...fromPlural
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean),
    );
  }

  if (fromRepeated.length > 0) {
    combined.push(
      ...fromRepeated
        .map((g) => g.trim())
        .filter(Boolean),
    );
  }

  const unique = Array.from(new Set(combined));
  const result: ActivityEventGroup[] = [];

  for (const g of unique) {
    if (allowed.has(g as ActivityEventGroup)) {
      result.push(g as ActivityEventGroup);
    }
  }

  return result.length > 0 ? result : undefined;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const searchParams = url.searchParams;

    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    const provider = searchParams.get("provider") || undefined;
    const search = searchParams.get("search") || undefined;
    const cursor = searchParams.get("cursor") || undefined;
    const limit = parseLimit(searchParams.get("limit"));
    const groups = parseGroups(searchParams);

    const supabase = createServerSupabaseClient();

    const query = buildActivityLogQuery(supabase, {
      from,
      to,
      groups,
      provider,
      search,
      limit,
      cursor,
    });

    const { data, error } = await query;

    if (error) {
      console.error("[api/activity] Supabase error", error);
      return NextResponse.json(
        { error: error.message ?? "Failed to fetch activity" },
        { status: 500 },
      );
    }

    const rows = (data ?? []) as Array<{ created_at?: string | null }>;

    let nextCursor: string | null = null;
    if (rows.length === limit) {
      const last = rows[rows.length - 1];
      if (last && last.created_at) {
        nextCursor = last.created_at;
      }
    }

    return NextResponse.json(
      {
        data: rows,
        nextCursor,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("[api/activity] Unexpected error", err);
    return NextResponse.json(
      { error: "Unexpected error fetching activity" },
      { status: 500 },
    );
  }
}
