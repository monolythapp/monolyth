import { NextRequest, NextResponse } from "next/server";
import { getRouteAuthContext } from "@/lib/auth/route-auth";
import { logDocGenerated } from "@/lib/activity-log";

export async function POST(req: NextRequest) {
  try {
    const { isAuthenticated, userId, orgId } = await getRouteAuthContext(req);

    if (!isAuthenticated || !userId || !orgId) {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({} as any));
    const { templateId, contentLength } = body;

    // Log doc_generated event (best-effort)
    try {
      await logDocGenerated({
        orgId,
        userId,
        metadata: {
          source: "builder",
          templateId: templateId,
          contentLength: contentLength,
        },
      });
    } catch (logError) {
      console.error("[activity] failed to log doc_generated", logError);
      // Don't fail the request if logging fails
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[activity] log-doc-generated error", error);
    return NextResponse.json(
      { ok: false, error: "Failed to log event" },
      { status: 500 }
    );
  }
}

