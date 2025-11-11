import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
    const hasToken =
        !!process.env.GOOGLE_DRIVE_ACCESS_TOKEN ||
        !!process.env.GOOGLE_DRIVE_REFRESH_TOKEN ||
        !!process.env.GOOGLE_CREDENTIALS_JSON;

    if (!hasToken) {
        return NextResponse.json({
            files: [],
            hint: "No Drive token. Connect in /integrations to enable Recent (RO).",
        });
    }

    // TODO: replace with real Google Drive files.list
    return NextResponse.json({
        files: [
            { id: "mock-1", name: "Proposal_v3.docx", modifiedTime: "2025-11-10T12:41:00Z" },
            { id: "mock-2", name: "Invoice_2025-11.pdf", modifiedTime: "2025-11-09T09:12:00Z" },
        ],
    });
}

