import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

interface StatusRequest {
  unifiedItemIds: string[];
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as StatusRequest;

    if (!body.unifiedItemIds || !Array.isArray(body.unifiedItemIds)) {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid unifiedItemIds array" },
        { status: 400 }
      );
    }

    if (body.unifiedItemIds.length === 0) {
      return NextResponse.json({ ok: true, statuses: {} }, { status: 200 });
    }

    const supabase = createServerSupabaseClient();

    // Find envelopes linked to these unified items via document_id
    // First, get document_ids from unified_items
    const { data: unifiedItems, error: itemsError } = await supabase
      .from("unified_item")
      .select("id, document_id")
      .in("id", body.unifiedItemIds);

    if (itemsError) {
      console.error("[envelopes/status] Error fetching unified_items", itemsError);
      return NextResponse.json(
        { ok: false, error: "Failed to fetch unified items" },
        { status: 500 }
      );
    }

    const documentIds = (unifiedItems ?? [])
      .map((item) => item.document_id)
      .filter((id): id is string => id !== null);

    if (documentIds.length === 0) {
      return NextResponse.json({ ok: true, statuses: {} }, { status: 200 });
    }

    // Get latest envelope for each document
    const { data: envelopes, error: envelopesError } = await supabase
      .from("envelope")
      .select("id, document_id, status, updated_at")
      .in("document_id", documentIds)
      .order("updated_at", { ascending: false });

    if (envelopesError) {
      console.error("[envelopes/status] Error fetching envelopes", envelopesError);
      return NextResponse.json(
        { ok: false, error: "Failed to fetch envelopes" },
        { status: 500 }
      );
    }

    // Build a map: unifiedItemId -> latest envelope status
    const statusMap: Record<string, { status: string | null }> = {};

    // Initialize all requested IDs with null
    for (const unifiedItemId of body.unifiedItemIds) {
      statusMap[unifiedItemId] = { status: null };
    }

    // Map document_id -> unified_item_id
    const docToUnified = new Map<string, string>();
    for (const item of unifiedItems ?? []) {
      if (item.document_id) {
        docToUnified.set(item.document_id, item.id);
      }
    }

    // For each document, get the latest envelope
    const docToLatestEnvelope = new Map<string, { status: string; updated_at: string }>();
    for (const envelope of envelopes ?? []) {
      if (!envelope.document_id) continue;
      const existing = docToLatestEnvelope.get(envelope.document_id);
      if (
        !existing ||
        new Date(envelope.updated_at) > new Date(existing.updated_at)
      ) {
        docToLatestEnvelope.set(envelope.document_id, {
          status: envelope.status,
          updated_at: envelope.updated_at,
        });
      }
    }

    // Map back to unified_item_id
    for (const [documentId, envelope] of docToLatestEnvelope.entries()) {
      const unifiedItemId = docToUnified.get(documentId);
      if (unifiedItemId) {
        statusMap[unifiedItemId] = { status: envelope.status };
      }
    }

    return NextResponse.json(
      {
        ok: true,
        statuses: statusMap,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[envelopes/status] Exception", err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}

