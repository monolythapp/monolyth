// Dev-only self-test endpoint for Save-to-Vault backend.
// Manual test: POST to /api/dev/vault-save-selftest. Expect ok: true and a new document in Vault.

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { ok: false, error: "Dev only" },
      { status: 403 }
    );
  }

  try {
    // Call the canonical Save-to-Vault endpoint
    const testContent = `# Test Document — Self-Test

This is a test document created by the dev self-test endpoint.

## Purpose

This endpoint tests the canonical Save-to-Vault backend independently of the UI.

Generated at: ${new Date().toISOString()}
`;

    const response = await fetch(
      `${req.nextUrl.origin}/api/documents/versions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: `Test Document — ${new Date().toISOString().slice(0, 10)}`,
          content: testContent,
        }),
      }
    );

    const rawResponse = await response.text();
    let data: {
      ok?: boolean;
      documentId?: string;
      versionId?: string;
      error?: string;
      details?: unknown;
    };

    try {
      data = JSON.parse(rawResponse);
    } catch (parseError) {
      console.error("[dev/vault-save-selftest] Failed to parse response", {
        status: response.status,
        rawResponse: rawResponse.substring(0, 200),
      });
      return NextResponse.json(
        {
          ok: false,
          error: "Failed to parse Save-to-Vault response",
          status: response.status,
          rawResponse: rawResponse.substring(0, 200),
        },
        { status: 500 }
      );
    }

    if (!response.ok || !data.ok || data.error) {
      console.error("[dev/vault-save-selftest] Save-to-Vault failed", {
        status: response.status,
        error: data.error,
        details: data.details,
      });
      return NextResponse.json(
        {
          ok: false,
          error: "Save-to-Vault backend returned error",
          backendError: data.error,
          backendDetails: data.details,
          status: response.status,
        },
        { status: response.status }
      );
    }

    // Verify the document was actually created in Supabase
    const supabase = createServerSupabaseClient();
    const { data: document, error: docError } = await supabase
      .from("document")
      .select("id, title, current_version_id")
      .eq("id", data.documentId)
      .maybeSingle();

    if (docError || !document) {
      console.error("[dev/vault-save-selftest] Document verification failed", {
        documentId: data.documentId,
        error: docError,
      });
      return NextResponse.json(
        {
          ok: false,
          error: "Document was not found in Supabase after save",
          documentId: data.documentId,
          verificationError: docError?.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Save-to-Vault self-test passed",
        documentId: data.documentId,
        versionId: data.versionId,
        verified: {
          documentExists: true,
          documentTitle: document.title,
          hasCurrentVersion: !!document.current_version_id,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[dev/vault-save-selftest] Exception", err);
    return NextResponse.json(
      {
        ok: false,
        error: (err as Error).message,
      },
      { status: 500 }
    );
  }
}

