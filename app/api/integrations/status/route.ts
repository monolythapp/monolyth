import { NextResponse } from "next/server";

type ConnectorStatus = "connected" | "needs_reauth" | "error" | "unknown";

function driveStatus(): ConnectorStatus {
    // Heuristic: if you later store real OAuth tokens, replace this.
    // For now, treat missing token as needs_reauth.
    const hasToken =
        !!process.env.GOOGLE_DRIVE_ACCESS_TOKEN ||
        !!process.env.GOOGLE_DRIVE_REFRESH_TOKEN ||
        !!process.env.GOOGLE_CREDENTIALS_JSON;
    return hasToken ? "connected" : "needs_reauth";
}

export async function GET() {
    // Extend with other connectors later (gmail, slack, notion, …)
    return NextResponse.json({
        googleDrive: driveStatus(),
        lastCheckedAt: new Date().toISOString(),
    });
}
