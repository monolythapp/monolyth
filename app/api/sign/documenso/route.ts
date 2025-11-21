// Manual test: from Workbench, pick a Vault-backed doc, click "Send for signature", fill recipient.
// Expect 200 with ok: true, envelope row in DB, send_for_signature activity, and Documenso shows the envelope.

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getDocumensoClient } from "@/lib/documenso-client";
import { logActivity } from "@/lib/activity-log";

const DEMO_OWNER_ID =
  process.env.NEXT_PUBLIC_DEMO_OWNER_ID ?? "00000000-0000-0000-0000-000000000000";

interface SignRequestBody {
  unifiedItemId: string;
  recipient: {
    email: string;
    name: string;
  };
}

async function getUserAndOrg(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  req: NextRequest
) {
  let userId: string | null = DEMO_OWNER_ID;
  let orgId: string | null = null;

  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const projectRef = supabaseUrl?.match(/https?:\/\/([^.]+)\./)?.[1] || "default";
  const authCookieName = `sb-${projectRef}-auth-token`;

  const authCookie = cookieStore.get(authCookieName);
  if (authCookie?.value) {
    try {
      const session = JSON.parse(authCookie.value);
      if (session?.user?.id) {
        userId = session.user.id;
      }
    } catch {
      // Ignore parse errors, fall back to demo user
    }
  }

  if (userId && userId !== DEMO_OWNER_ID) {
    const { data: memberships } = await supabase
      .from("member")
      .select("org_id")
      .eq("user_id", userId)
      .limit(1);

    if (memberships && memberships.length > 0) {
      orgId = memberships[0].org_id;
    } else {
      const { data: defaultOrg, error: orgError } = await supabase
        .from("org")
        .insert({ name: "My Workspace", plan: "free" })
        .select("id")
        .single();

      if (!orgError && defaultOrg) {
        orgId = defaultOrg.id;
        await supabase.from("member").insert({ org_id: orgId, user_id: userId, role: "owner" });
      }
    }
  }

  if (!orgId) {
    const { data: demoOrgs } = await supabase
      .from("org")
      .select("id")
      .eq("name", "Demo Workspace")
      .limit(1);

    if (demoOrgs && demoOrgs.length > 0) {
      orgId = demoOrgs[0].id;
    } else {
      const { data: demoOrg } = await supabase
        .from("org")
        .insert({ name: "Demo Workspace", plan: "free" })
        .select("id")
        .single();

      if (demoOrg) {
        orgId = demoOrg.id;
      }
    }
  }

  return { userId, orgId };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SignRequestBody;

    // Validate request body - expects unifiedItemId (unified_item.id from database)
    if (!body.unifiedItemId || !body.recipient?.email || !body.recipient?.name) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields: unifiedItemId, recipient.email, recipient.name" },
        { status: 400 }
      );
    }

    if (!body.unifiedItemId.trim()) {
      return NextResponse.json(
        { ok: false, error: "Missing unifiedItemId" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { userId, orgId } = await getUserAndOrg(supabase, req);

    if (!orgId) {
      return NextResponse.json(
        { ok: false, error: "Could not determine organization" },
        { status: 500 }
      );
    }

    // Fetch the unified item to get document info
    // Expects unified_item.id that exists in the database
    const { data: unifiedItem, error: itemError } = await supabase
      .from("unified_item")
      .select("id, title, document_id, source")
      .eq("id", body.unifiedItemId)
      .eq("org_id", orgId)
      .single();

    if (itemError || !unifiedItem) {
      console.error("[sign/documenso] Failed to fetch unified_item", {
        unifiedItemId: body.unifiedItemId,
        orgId,
        error: itemError,
        reason: itemError?.code === "PGRST116" ? "no unified_item row found" : "query error",
      });
      return NextResponse.json(
        { ok: false, error: "Unified item not found" },
        { status: 404 }
      );
    }

    // Get document and latest version
    let documentId = unifiedItem.document_id;
    let versionId: string | null = null;
    let documentTitle = unifiedItem.title;
    let documentContent = "";
    let hasStoredFile = false;

    if (documentId) {
      const { data: document, error: docError } = await supabase
        .from("document")
        .select("id, title, current_version_id")
        .eq("id", documentId)
        .eq("org_id", orgId)
        .single();

      if (docError || !document) {
        console.error("[sign/documenso] Document lookup failed", {
          documentId,
          orgId,
          error: docError,
          reason: "no document row found",
        });
        return NextResponse.json(
          { ok: false, error: "No file available for signature. Save this document to Vault first." },
          { status: 400 }
        );
      }

      documentTitle = document.title;
      versionId = document.current_version_id ?? null;

      if (versionId) {
        const { data: version, error: versionError } = await supabase
          .from("version")
          .select("id, content, storage_path")
          .eq("id", versionId)
          .single();

        if (versionError || !version) {
          console.error("[sign/documenso] Version lookup failed", {
            versionId,
            error: versionError,
            reason: "no version row found",
          });
          return NextResponse.json(
            { ok: false, error: "No file available for signature. Save this document to Vault first." },
            { status: 400 }
          );
        }

        // Check if we have content or storage path
        if (version.content) {
          documentContent = version.content;
          hasStoredFile = true;
        } else if (version.storage_path) {
          // If we have storage_path but no content, we could fetch it, but for now return error
          console.error("[sign/documenso] Version has storage_path but no content", {
            versionId,
            storage_path: version.storage_path,
            reason: "content not available in version row",
          });
          return NextResponse.json(
            { ok: false, error: "No file available for signature. Save this document to Vault first." },
            { status: 400 }
          );
        }
      }
    }

    // If unified_item has no document_id, it's not saved to Vault yet
    if (!documentId) {
      console.error("[sign/documenso] Unified item has no document_id", {
        unifiedItemId: body.unifiedItemId,
        reason: "unified_item.document_id is null - item not saved to Vault",
      });
      return NextResponse.json(
        { ok: false, error: "No file available for signature. Save this document to Vault first." },
        { status: 400 }
      );
    }

    // If no document content found, return error
    if (!hasStoredFile) {
      console.error("[sign/documenso] No document content available", {
        documentId,
        versionId,
        reason: "no content in version row",
      });
      return NextResponse.json(
        { ok: false, error: "No file available for signature. Save this document to Vault first." },
        { status: 400 }
      );
    }

    // Call Documenso API to create envelope
    const documensoClient = getDocumensoClient();

    // Documenso API: POST /api/v1/envelopes
    // Based on Documenso API docs, we need to send:
    // - title/name
    // - recipients array
    // - documents array with content
    const documensoPayload = {
      title: documentTitle,
      recipients: [
        {
          email: body.recipient.email,
          name: body.recipient.name,
          role: "signer",
        },
      ],
      documents: [
        {
          title: documentTitle,
          content: documentContent,
          format: "markdown", // or "html" if we detect HTML
        },
      ],
    };

    let providerEnvelopeId: string;
    let documensoResponse: unknown;

    try {
      documensoResponse = await documensoClient.request<{
        id: string;
        share_url?: string;
        status?: string;
        [key: string]: unknown;
      }>("/api/v1/envelopes", {
        method: "POST",
        body: documensoPayload,
      });

      providerEnvelopeId = (documensoResponse as { id: string }).id;
    } catch (apiError) {
      const errorMessage =
        apiError instanceof Error ? apiError.message : String(apiError);
      const statusCode =
        apiError &&
        typeof apiError === "object" &&
        "status" in apiError &&
        typeof (apiError as { status: number }).status === "number"
          ? (apiError as { status: number }).status
          : 500;
      
      console.error("[sign/documenso] Documenso API error", {
        error: apiError,
        status: statusCode,
        message: errorMessage,
      });
      
      return NextResponse.json(
        {
          ok: false,
          error: "Documenso API error",
          details: errorMessage,
        },
        { status: statusCode >= 400 && statusCode < 600 ? statusCode : 502 }
      );
    }

    // Create or get document if needed
    if (!documentId) {
      const { data: newDoc, error: docError } = await supabase
        .from("document")
        .insert({
          org_id: orgId,
          owner_id: userId ?? DEMO_OWNER_ID,
          title: documentTitle,
          kind: "contract",
          status: "draft",
        })
        .select("id")
        .single();

      if (docError || !newDoc) {
        console.error("[sign/documenso] Failed to create document", docError);
        return NextResponse.json(
          { ok: false, error: "Failed to create document" },
          { status: 500 }
        );
      }

      documentId = newDoc.id;
    }

    // Insert envelope row
    const { data: envelope, error: envelopeError } = await supabase
      .from("envelope")
      .insert({
        org_id: orgId,
        document_id: documentId,
        version_id: versionId,
        provider: "documenso",
        provider_envelope_id: providerEnvelopeId,
        status: "sent",
        created_by: userId ?? DEMO_OWNER_ID,
        sent_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (envelopeError || !envelope) {
      console.error("[sign/documenso] Failed to create envelope", envelopeError);
      return NextResponse.json(
        { ok: false, error: "Failed to create envelope record" },
        { status: 500 }
      );
    }

    // Log activity
    try {
      await logActivity({
        orgId,
        userId: userId !== DEMO_OWNER_ID ? userId : null,
        type: "send_for_signature",
        documentId,
        versionId: versionId ?? null,
        unifiedItemId: body.unifiedItemId,
        envelopeId: envelope.id,
        context: {
          provider: "documenso",
          envelope_id: envelope.id,
          provider_envelope_id: providerEnvelopeId,
          recipient_email: body.recipient.email,
          recipient_name: body.recipient.name,
          documenso_response: documensoResponse,
        },
      });
    } catch (logError) {
      // Don't fail the request if logging fails, but log it
      console.error("[sign/documenso] Failed to log activity", logError);
    }

    return NextResponse.json(
      {
        ok: true,
        envelopeId: envelope.id,
        providerEnvelopeId,
      },
      { status: 200 }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[sign/documenso] Unexpected error", err);
    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status: 500 }
    );
  }
}

