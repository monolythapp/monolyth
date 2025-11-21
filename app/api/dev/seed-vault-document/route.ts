// Dev-only endpoint to seed a test Vault-backed document for testing the Beta flow.
// Manual test: POST to /api/dev/seed-vault-document. Expect a new document in Vault with a linked unified_item.

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { logActivity } from "@/lib/activity-log";

const DEMO_OWNER_ID =
  process.env.NEXT_PUBLIC_DEMO_OWNER_ID ?? "00000000-0000-0000-0000-000000000000";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { ok: false, error: "Dev only" },
      { status: 403 }
    );
  }

  try {
    const supabase = createServerSupabaseClient();

    // Get or create demo org
    let orgId: string | null = null;
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
        .insert({
          name: "Demo Workspace",
          plan: "free",
        })
        .select("id")
        .single();

      if (demoOrg) {
        orgId = demoOrg.id;
      }
    }

    if (!orgId) {
      return NextResponse.json(
        { ok: false, error: "Failed to get or create org" },
        { status: 500 }
      );
    }

    // Create a test unified_item first
    const testTitle = `Test Document — ${new Date().toISOString().slice(0, 10)}`;
    const { data: unifiedItem, error: itemError } = await supabase
      .from("unified_item")
      .insert({
        org_id: orgId,
        title: testTitle,
        source: "workbench",
        kind: "text/plain",
        preview: "This is a test document created by the dev seed endpoint. It can be used to test the Beta flow: Import → Save to Vault → Analyze → Send for Signature → Status.",
      })
      .select("id")
      .single();

    if (itemError || !unifiedItem) {
      console.error("[dev/seed-vault-document] Failed to create unified_item", itemError);
      return NextResponse.json(
        { ok: false, error: "Failed to create unified_item", details: itemError?.message },
        { status: 500 }
      );
    }

    // Create document
    const testContent = `# ${testTitle}

This is a test document created by the dev seed endpoint.

## Purpose

This document can be used to test the Beta flow:
1. Import → (already done, unified_item created)
2. Save to Vault → (this endpoint creates the document)
3. Analyze → (can be tested from Workbench)
4. Send for Signature → (can be tested from Workbench)
5. Status → (webhook will update status)

## Content

This is sample content that can be analyzed and sent for signature.

Generated at: ${new Date().toISOString()}
`;

    const { data: document, error: docError } = await supabase
      .from("document")
      .insert({
        org_id: orgId,
        owner_id: DEMO_OWNER_ID,
        title: testTitle,
        kind: "contract",
        status: "draft",
      })
      .select("id")
      .single();

    if (docError || !document) {
      console.error("[dev/seed-vault-document] Failed to create document", docError);
      return NextResponse.json(
        { ok: false, error: "Failed to create document", details: docError?.message },
        { status: 500 }
      );
    }

    // Create version
    const { data: version, error: versionError } = await supabase
      .from("version")
      .insert({
        org_id: orgId,
        document_id: document.id,
        number: 1,
        title: testTitle,
        content: testContent,
        created_by: DEMO_OWNER_ID,
      })
      .select("id, number")
      .single();

    if (versionError || !version) {
      console.error("[dev/seed-vault-document] Failed to create version", versionError);
      return NextResponse.json(
        { ok: false, error: "Failed to create version", details: versionError?.message },
        { status: 500 }
      );
    }

    // Update document with current_version_id
    await supabase
      .from("document")
      .update({ current_version_id: version.id })
      .eq("id", document.id);

    // Link unified_item to document
    const { error: linkError } = await supabase
      .from("unified_item")
      .update({ document_id: document.id })
      .eq("id", unifiedItem.id);

    if (linkError) {
      console.warn("[dev/seed-vault-document] Failed to link unified_item", linkError);
      // Don't fail if linking fails
    }

    // Log activity
    try {
      await logActivity({
        orgId,
        userId: DEMO_OWNER_ID,
        type: "vault_save",
        documentId: document.id,
        versionId: version.id,
        unifiedItemId: unifiedItem.id,
        context: { source: "dev_seed" },
      });
    } catch (logError) {
      console.warn("[dev/seed-vault-document] Failed to log activity", logError);
      // Don't fail if logging fails
    }

    return NextResponse.json(
      {
        ok: true,
        unifiedItemId: unifiedItem.id,
        documentId: document.id,
        versionId: version.id,
        versionNumber: version.number,
        message: "Test document created and saved to Vault",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[dev/seed-vault-document] Exception", err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}

