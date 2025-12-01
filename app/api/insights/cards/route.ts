import { NextRequest, NextResponse } from "next/server";

import { getRouteAuthContext } from "@/lib/auth/route-auth";
import {
  getInsightsCardsForOrg,
  type InsightsRange,
} from "@/lib/insights/cards";

function resolveRangeFromSearchParams(
  searchParams: URLSearchParams,
): InsightsRange {
  const raw = searchParams.get("range");
  if (raw === "7d" || raw === "30d" || raw === "90d") {
    return raw;
  }
  return "30d";
}

export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const url = new URL(req.url);
    const range = resolveRangeFromSearchParams(url.searchParams);

    const auth = await getRouteAuthContext(req as unknown as Request);

    if (!auth.isAuthenticated || !auth.orgId || !auth.supabase) {
      return NextResponse.json(
        {
          ok: false,
          error: "Not authenticated",
          requestId,
        },
        { status: 401 },
      );
    }

    const cards = await getInsightsCardsForOrg({
      supabase: auth.supabase,
      range,
    });

    return NextResponse.json(
      {
        ok: true,
        range,
        cards,
        requestId,
      },
      { status: 200 },
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[/api/insights/cards] error", { requestId, error });

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to load insights cards",
        requestId,
      },
      { status: 500 },
    );
  }
}

