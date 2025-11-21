import { createServerSupabaseClient } from './supabase-server';
import { logServerEvent, logServerError } from './telemetry-server';

export type ActivityType =
  | 'vault_save'
  | 'share_created'
  | 'analyze_completed'
  | 'builder_generate'
  | 'doc_generated'
  | 'doc_saved_to_vault'
  | 'version_saved'
  | 'version_restore'
  | 'send_for_signature'
  | 'envelope_status_changed'
  | 'mono_query'
  | 'selftest';

export interface LogActivityParams {
  orgId: string;
  userId?: string | null;
  type: ActivityType;
  documentId?: string | null;
  versionId?: string | null;
  unifiedItemId?: string | null;
  shareLinkId?: string | null;
  envelopeId?: string | null;
  context?: Record<string, unknown>;
  source?: string | null; // e.g. "workbench", "builder", "vault", "mono", "activity"
  triggerRoute?: string | null; // e.g. "/api/mono"
  durationMs?: number | null;
}

/**
 * Logs an activity to the activity_log table using the service-role Supabase client.
 * This function throws on error so callers can handle failures explicitly.
 *
 * @param params - Activity log parameters
 * @throws Error if the insert fails
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  const supabase = createServerSupabaseClient();

  const {
    orgId,
    userId,
    type,
    documentId,
    versionId,
    unifiedItemId,
    shareLinkId,
    envelopeId,
    context,
    source,
    triggerRoute,
    durationMs,
  } = params;

  // Defensive: verify unified_item exists; if not, log with unified_item_id = null to avoid FK errors.
  let unifiedItemIdToInsert: string | null = null;

  if (unifiedItemId) {
    try {
      const { data: unifiedItem, error: lookupError } = await supabase
        .from('unified_item')
        .select('id')
        .eq('id', unifiedItemId)
        .maybeSingle();

      if (lookupError) {
        console.warn('[logActivity] Error looking up unified_item', {
          unifiedItemId,
          error: lookupError,
        });
        unifiedItemIdToInsert = null;
      } else if (!unifiedItem) {
        console.warn('[logActivity] unified_item not found for id', unifiedItemId);
        unifiedItemIdToInsert = null;
      } else {
        unifiedItemIdToInsert = unifiedItemId;
      }
    } catch (lookupErr) {
      console.warn('[logActivity] Exception during unified_item lookup', {
        unifiedItemId,
        error: lookupErr,
      });
      unifiedItemIdToInsert = null;
    }
  }

  // Build enriched context with metadata
  const enrichedContext: Record<string, unknown> = {
    ...(context ?? {}),
    ...(triggerRoute ? { trigger_route: triggerRoute } : {}),
    ...(durationMs !== null && durationMs !== undefined ? { duration_ms: durationMs } : {}),
    ...(source ? { source } : {}),
  };

  // Supabase handles jsonb automatically, so we can pass the object directly
  // Note: We use snake_case for database columns, matching the schema
  const { error, data } = await supabase.from('activity_log').insert({
    org_id: orgId,
    user_id: userId ?? null,
    type,
    document_id: documentId ?? null,
    version_id: versionId ?? null,
    unified_item_id: unifiedItemIdToInsert,
    share_link_id: shareLinkId ?? null,
    envelope_id: envelopeId ?? null,
    context: Object.keys(enrichedContext).length > 0 ? enrichedContext : null,
  }).select('id').single();

  if (error) {
    const errorMessage = `logActivity failed: ${error.message} (code: ${error.code}, details: ${error.details || 'none'})`;
    console.error('[logActivity]', errorMessage, {
      orgId,
      userId,
      type,
      error,
    });
    
    logServerError({
      event: "activity_log_write",
      userId,
      orgId,
      docId: unifiedItemIdToInsert ?? documentId ?? null,
      source: source ?? null,
      route: triggerRoute ?? null,
      properties: {
        action: type,
      },
      error,
    });
    
    throw new Error(errorMessage);
  }

  if (!data) {
    const errorMessage = 'logActivity: insert succeeded but no data returned';
    console.error('[logActivity]', errorMessage);
    
    logServerError({
      event: "activity_log_write",
      userId,
      orgId,
      docId: unifiedItemIdToInsert ?? documentId ?? null,
      source: source ?? null,
      route: triggerRoute ?? null,
      properties: {
        action: type,
      },
      error: new Error(errorMessage),
    });
    
    throw new Error(errorMessage);
  }

  console.log('[logActivity] Successfully inserted activity_log row', {
    id: data.id,
    type,
    orgId,
  });

  // Log telemetry event after successful insert
  logServerEvent({
    event: "activity_log_write",
    userId,
    orgId,
    docId: unifiedItemIdToInsert ?? documentId ?? null,
    source: source ?? null,
    route: triggerRoute ?? null,
    properties: {
      action: type,
    },
  });
}

/**
 * Helper to log analyze_completed events
 */
export async function logAnalyzeCompleted(params: {
  orgId: string;
  userId?: string | null;
  unifiedItemId?: string | null;
  documentId?: string | null;
  metadata?: Record<string, unknown>;
  source?: string | null;
  triggerRoute?: string | null;
  durationMs?: number | null;
}): Promise<void> {
  await logActivity({
    orgId: params.orgId,
    userId: params.userId,
    type: 'analyze_completed',
    unifiedItemId: params.unifiedItemId,
    documentId: params.documentId,
    context: params.metadata,
    source: params.source,
    triggerRoute: params.triggerRoute,
    durationMs: params.durationMs,
  });
}

/**
 * Helper to log doc_generated events (from Builder)
 */
export async function logDocGenerated(params: {
  orgId: string;
  userId?: string | null;
  unifiedItemId?: string | null;
  documentId?: string | null;
  metadata?: Record<string, unknown>;
  source?: string | null;
  triggerRoute?: string | null;
  durationMs?: number | null;
}): Promise<void> {
  await logActivity({
    orgId: params.orgId,
    userId: params.userId,
    type: 'doc_generated',
    unifiedItemId: params.unifiedItemId,
    documentId: params.documentId,
    context: params.metadata,
    source: params.source,
    triggerRoute: params.triggerRoute,
    durationMs: params.durationMs,
  });
}

/**
 * Helper to log doc_saved_to_vault events
 */
export async function logDocSavedToVault(params: {
  orgId: string;
  userId?: string | null;
  unifiedItemId?: string | null;
  documentId?: string | null;
  metadata?: Record<string, unknown>;
  source?: string | null;
  triggerRoute?: string | null;
  durationMs?: number | null;
}): Promise<void> {
  await logActivity({
    orgId: params.orgId,
    userId: params.userId,
    type: 'doc_saved_to_vault',
    unifiedItemId: params.unifiedItemId,
    documentId: params.documentId,
    context: params.metadata,
    source: params.source,
    triggerRoute: params.triggerRoute,
    durationMs: params.durationMs,
  });
}

/**
 * Helper to log mono_query events
 */
export async function logMonoQuery(params: {
  orgId: string;
  userId?: string | null;
  ownerId?: string | null;
  message: string;
  context: Record<string, unknown>;
  source?: string | null;
  triggerRoute?: string | null;
  durationMs?: number | null;
}): Promise<void> {
  await logActivity({
    orgId: params.orgId,
    userId: params.userId,
    type: 'mono_query',
    context: {
      message: params.message,
      ...params.context,
    },
    source: params.source,
    triggerRoute: params.triggerRoute,
    durationMs: params.durationMs,
  });
}

