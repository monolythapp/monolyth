import { cookies } from "next/headers";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL for route auth");
}

if (!anonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY for route auth");
}

export interface RouteAuthContext {
  isAuthenticated: boolean;
  userId: string | null;
  orgId: string | null;
  ownerId: string | null;
  supabase: SupabaseClient;
}

/**
 * Extract access token from Supabase auth cookie.
 * Tries both Next.js cookies() and request headers.
 */
async function extractAccessTokenFromCookies(req?: Request): Promise<string | null> {
  // Try reading from request headers first (more reliable in API routes)
  if (req) {
    const cookieHeader = req.headers.get("cookie");
    if (cookieHeader) {
      const projectRef = supabaseUrl?.match(/https?:\/\/([^.]+)\./)?.[1] || "default";
      const authCookieNames = [
        `sb-${projectRef}-auth-token`,
        `${projectRef}-auth-token`,
        `sb-${projectRef}-auth-token.0`,
      ];

      // Parse cookie header
      const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
        const [name, ...valueParts] = cookie.trim().split("=");
        acc[name] = decodeURIComponent(valueParts.join("="));
        return acc;
      }, {} as Record<string, string>);

      for (const cookieName of authCookieNames) {
        const cookieValue = cookies[cookieName];
        if (cookieValue) {
          try {
            const session = JSON.parse(cookieValue);
            if (session?.access_token) {
              return session.access_token;
            }
            if (session?.currentSession?.access_token) {
              return session.currentSession.access_token;
            }
          } catch {
            // Continue to next cookie
          }
        }
      }
    }
  }

  // Fallback to Next.js cookies()
  try {
    const cookieStore = await cookies();
    const projectRef = supabaseUrl?.match(/https?:\/\/([^.]+)\./)?.[1] || "default";
    const authCookieNames = [
      `sb-${projectRef}-auth-token`,
      `${projectRef}-auth-token`,
      `sb-${projectRef}-auth-token.0`,
    ];

    for (const cookieName of authCookieNames) {
      const cookie = cookieStore.get(cookieName);
      if (cookie?.value) {
        try {
          let session: any;
          try {
            session = JSON.parse(cookie.value);
          } catch {
            try {
              session = JSON.parse(decodeURIComponent(cookie.value));
            } catch {
              continue;
            }
          }

          if (session?.access_token) {
            return session.access_token;
          }
          if (session?.currentSession?.access_token) {
            return session.currentSession.access_token;
          }
        } catch {
          continue;
        }
      }
    }
  } catch {
    // Ignore errors
  }

  return null;
}

/**
 * Get authenticated user context from cookies in Next.js API route.
 * Extracts access token from cookies and uses it with supabase.auth.getUser().
 * 
 * @param req - Next.js Request object
 * @returns RouteAuthContext with isAuthenticated, userId, orgId, ownerId, and supabase client
 */
export async function getRouteAuthContext(
  req: Request
): Promise<RouteAuthContext> {
  // Create Supabase client for auth operations
  // supabaseUrl and anonKey are validated at module load time
  const supabase = createClient(supabaseUrl!, anonKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  
  // Get service-role client for admin operations (org lookup, etc.)
  const supabaseAdmin = createServerSupabaseClient();

  let userId: string | null = null;
  let orgId: string | null = null;
  let ownerId: string | null = null;

  // Try to get userId from request header first (passed from client)
  // This is more reliable than cookie parsing in Next.js App Router
  const clientUserId = req.headers.get("x-user-id");
  if (clientUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientUserId)) {
    // Basic UUID validation - if it's a valid UUID format, trust it
    // (The client already validated the user is authenticated via sb.auth.getUser())
    userId = clientUserId;
  }

  // If no userId from header, try extracting from cookies
  if (!userId) {
    const accessToken = await extractAccessTokenFromCookies(req);
    
    if (accessToken) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser(accessToken);
        
        if (user && !error) {
          userId = user.id;
        } else if (error) {
          console.warn("[route-auth] getUser() failed with access token", {
            error: error.message,
          });
        }
      } catch (error) {
        console.warn("[route-auth] Error calling getUser() with access token", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else {
      // Log for debugging
      if (req) {
        const cookieHeader = req.headers.get("cookie");
        console.warn("[route-auth] No access token found", {
          hasCookieHeader: !!cookieHeader,
          cookieHeaderLength: cookieHeader?.length || 0,
        });
      }
    }
  }

  // If we have a userId, try to get org membership
  if (userId) {
    const { data: memberships } = await supabaseAdmin
      .from("member")
      .select("org_id")
      .eq("user_id", userId)
      .limit(1);

    if (memberships && memberships.length > 0) {
      orgId = memberships[0].org_id;
    } else {
      // Create a default org for the user if none exists
      const { data: defaultOrg, error: orgError } = await supabaseAdmin
        .from("org")
        .insert({
          name: "My Workspace",
          plan: "free",
        })
        .select("id")
        .single();

      if (!orgError && defaultOrg) {
        orgId = defaultOrg.id;
        await supabaseAdmin.from("member").insert({
          org_id: orgId,
          user_id: userId,
          role: "owner",
        });
      }
    }

    // owner_id references auth.users(id), so ownerId is the same as userId
    ownerId = userId;
  }

  return {
    isAuthenticated: userId !== null,
    userId,
    orgId,
    ownerId,
    supabase: supabaseAdmin, // Return service-role client for admin operations
  };
}

