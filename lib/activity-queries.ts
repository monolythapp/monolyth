// Helper for building activity_log queries for Activity & Insights v1.
// This is intentionally light on types to avoid coupling too hard to Supabase client generics.

export type ActivityEventGroup = "docs" | "mono" | "connectors" | "signatures" | "system";

export interface BuildActivityLogQueryParams {
  from?: string; // ISO timestamp (inclusive)
  to?: string; // ISO timestamp (inclusive)
  groups?: ActivityEventGroup[];
  provider?: string;
  search?: string;
  limit?: number;
  cursor?: string; // created_at cursor (exclusive)
}

export function buildActivityLogQuery(supabase: any, params: BuildActivityLogQueryParams) {
  const {
    from,
    to,
    groups,
    provider,
    search,
    limit = 50,
    cursor,
  } = params;

  const safeLimit = Math.min(Math.max(limit || 50, 1), 100);

  let query = supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  // Time range
  if (from) {
    query = query.gte("created_at", from);
  }

  if (to) {
    query = query.lte("created_at", to);
  }

  // Cursor pagination (older than the last seen created_at)
  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  // Event groups → type prefixes
  const groupSet = new Set<ActivityEventGroup>(groups ?? []);
  const orParts: string[] = [];

  if (groupSet.size > 0) {
    if (groupSet.has("docs")) {
      // Document-related + share events
      orParts.push("type.ilike.doc_%", "type.ilike.share_%");
    }

    if (groupSet.has("mono")) {
      orParts.push("type.ilike.mono_%");
    }

    if (groupSet.has("connectors")) {
      orParts.push("type.ilike.connector_%");
    }

    if (groupSet.has("signatures")) {
      orParts.push("type.ilike.signature_%");
    }

    if (groupSet.has("system")) {
      orParts.push("type.ilike.system_%", "type.ilike.playbook_%");
    }
  }

  if (orParts.length > 0) {
    // Supabase "or" syntax: column.operator.value segments joined by commas.
    query = query.or(orParts.join(","));
  }

  // Connector provider filter (Drive, Gmail, etc.)
  if (provider) {
    query = query.eq("provider", provider);
  }

  // Simple search: keep it safe and minimal.
  // We don't assume a particular text column beyond `type` for now.
  if (search) {
    const trimmed = search.trim();
    if (trimmed.length > 0) {
      const like = `%${trimmed}%`;
      query = query.ilike("type", like);
    }
  }

  // NOTE: We intentionally do NOT force an org_id filter here.
  // RLS policies should ensure org scoping. If we later have a clear way to inject org_id,
  // we can extend this helper to accept it.

  return query;
}

