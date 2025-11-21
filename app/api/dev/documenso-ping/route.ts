import { NextRequest, NextResponse } from "next/server";
import { getDocumensoClient } from "@/lib/documenso-client";

// Manual test: set DOCUMENSO_API_TOKEN in .env.local, run npm run dev, then hit /api/dev/documenso-ping in the browser.
// Expect ok: true if API key is valid.

// Dev-only endpoint to test Documenso API connectivity
// Returns 403 in production

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { ok: false, error: "Not available in production" },
      { status: 403 },
    );
  }

  const endpoint = "/api/v1/documents?page=1&perPage=1";

  try {
    const client = getDocumensoClient();

    try {
      const data = await client.request<{
        documents?: unknown[];
        totalPages?: number;
        [key: string]: unknown;
      }>(endpoint);

      // Return minimal subset of response
      const minimalData = {
        documentCount: Array.isArray(data.documents)
          ? data.documents.length
          : 0,
        totalPages: data.totalPages ?? null,
        hasDocuments: Array.isArray(data.documents) && data.documents.length > 0,
      };

      return NextResponse.json(
        {
          ok: true,
          source: "documenso",
          endpoint,
          data: minimalData,
        },
        { status: 200 },
      );
    } catch (apiError) {
      // Handle Documenso API errors
      const status =
        apiError &&
        typeof apiError === "object" &&
        "status" in apiError &&
        typeof (apiError as { status: unknown }).status === "number"
          ? (apiError as { status: number }).status
          : 500;

      const errorMessage =
        apiError instanceof Error ? apiError.message : String(apiError);

      const bodySnippet =
        apiError &&
        typeof apiError === "object" &&
        "details" in apiError &&
        typeof (apiError as { details: unknown }).details === "object"
          ? JSON.stringify((apiError as { details: unknown }).details).substring(
              0,
              200,
            )
          : errorMessage.substring(0, 200);

      console.error("[documenso_ping] API error", {
        endpoint,
        status,
        error: errorMessage,
        details: apiError,
      });

      return NextResponse.json(
        {
          ok: false,
          source: "documenso",
          endpoint,
          error: {
            status,
            bodySnippet,
          },
        },
        { status: 500 },
      );
    }
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";
    console.error("[documenso_ping] Client creation or request error", err);

    return NextResponse.json(
      {
        ok: false,
        source: "documenso",
        endpoint,
        error: {
          status: 0,
          bodySnippet: errorMessage,
        },
      },
      { status: 500 },
    );
  }
}

