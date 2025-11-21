import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { logActivity } from "@/lib/activity-log";
import { getAppUrl } from "@/lib/env";
import type { ShareLink } from "@/lib/types";

interface ShareCreateBody {
  documentId: string;
  versionId?: string | null;
  label?: string | null;
  expiresAt?: string | null;
  maxViews?: number | null;
  requireEmail?: boolean;
}

const DEMO_OWNER_ID =
  process.env.NEXT_PUBLIC_DEMO_OWNER_ID ?? "00000000-0000-0000-0000-000000000000";

async function getUserAndOrg(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  req: NextRequest
) {
  let userId: string | null = DEMO_OWNER_ID;
  let orgId: string | null = null;

  // Try to get user from auth session via cookies
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

  // Get user's first org membership, or create a default org
  if (userId && userId !== DEMO_OWNER_ID) {
    const { data: memberships } = await supabase
      .from("member")
      .select("org_id")
      .eq("user_id", userId)
      .limit(1);

    if (memberships && memberships.length > 0) {
      orgId = memberships[0].org_id;
    } else {
      // Create a default org for the user if none exists
      const { data: defaultOrg, error: orgError } = await supabase
        .from("org")
        .insert({
          name: "My Workspace",
          plan: "free",
        })
        .select("id")
        .single();

      if (!orgError && defaultOrg) {
        orgId = defaultOrg.id;
        await supabase.from("member").insert({
          org_id: orgId,
          user_id: userId,
          role: "owner",
        });
      }
    }
  }

  // For demo user, try to get or create a demo org
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
  }

  return { userId, orgId };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ShareCreateBody;

    if (!body.documentId) {
      return NextResponse.json({ error: "Missing documentId" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { userId, orgId } = await getUserAndOrg(supabase, req);

    if (!orgId) {
      return NextResponse.json({ error: "Organization not found." }, { status: 400 });
    }

    const appUrl = getAppUrl();
    const token = randomUUID().replace(/-/g, "");

    const { data: share, error: shareError } = await supabase
      .from("share_link")
      .insert({
        org_id: orgId,
        document_id: body.documentId,
        version_id: body.versionId ?? null,
        token,
        label: body.label ?? null,
        expires_at: body.expiresAt ? new Date(body.expiresAt).toISOString() : null,
        max_views: body.maxViews ?? null,
        require_email: body.requireEmail ?? false,
        created_by: userId,
      })
      .select("id, token")
      .single()
      .returns<Pick<ShareLink, "id" | "token">>();

    if (shareError || !share) {
      return NextResponse.json({ error: "Failed to create share link" }, { status: 500 });
    }

    const url = `${appUrl}/share/${share.token}`;

    await logActivity({
      orgId,
      userId,
      type: "share_created",
      documentId: body.documentId,
      versionId: body.versionId ?? null,
      shareLinkId: share.id,
      context: { url },
    });

    return NextResponse.json({ id: share.id, url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create share";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
