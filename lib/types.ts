// Week 4 core entity types matching supabase/schema/week4_core.sql
// These types represent the database schema and should be kept in sync with the SQL schema.

import { ActivityType } from './activity-log';

// ----------------------------------------------------------------------
// document – canonical docs in Vault / Builder
// ----------------------------------------------------------------------
export interface Document {
  id: string;
  org_id: string;
  owner_id: string;
  title: string;
  kind: 'contract' | 'deck' | 'statement' | 'other' | string;
  status: 'draft' | 'active' | 'archived' | string;
  current_version_id?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// ----------------------------------------------------------------------
// version – versioned content for a document
// ----------------------------------------------------------------------
export interface Version {
  id: string;
  org_id: string;
  document_id: string;
  number: number;
  title?: string | null;
  content?: string | null;
  storage_path?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ----------------------------------------------------------------------
// share_link – DocSend-style share URLs
// ----------------------------------------------------------------------
export interface ShareLink {
  id: string;
  org_id: string;
  document_id: string;
  version_id?: string | null;
  token: string;
  label?: string | null;
  expires_at?: string | null;
  max_views?: number | null;
  view_count: number;
  require_email: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  revoked_at?: string | null;
}

// ----------------------------------------------------------------------
// envelope – e-sign envelopes (Documenso, later Track-3)
// ----------------------------------------------------------------------
// NOTE: This type must match the public.envelope table in Supabase (see supabase/schema/week4_core.sql)
export interface Envelope {
  id: string;
  org_id: string;
  document_id: string;
  version_id?: string | null;
  provider: string; // e.g. 'documenso'
  provider_envelope_id: string; // external id from provider
  status: 'draft' | 'sent' | 'completed' | 'cancelled' | 'failed' | string;
  created_by: string;
  sent_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  updated_at: string;
}

// ----------------------------------------------------------------------
// activity_log – key events for audit / telemetry
// ----------------------------------------------------------------------
export interface ActivityLog {
  id: string;
  org_id: string;
  user_id?: string | null;
  type: ActivityType | string;
  document_id?: string | null;
  version_id?: string | null;
  unified_item_id?: string | null;
  share_link_id?: string | null;
  envelope_id?: string | null;
  context?: Record<string, unknown> | null;
  created_at: string;
}

