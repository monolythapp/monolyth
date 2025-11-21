import { NextResponse } from "next/server";
import { getRouteAuthContext } from "@/lib/auth/route-auth";

export async function GET(req: Request) {
  try {
    const { isAuthenticated, userId, orgId, ownerId } = await getRouteAuthContext(req);
    return NextResponse.json({
      ok: true,
      isAuthenticated,
      userId,
      orgId,
      ownerId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

