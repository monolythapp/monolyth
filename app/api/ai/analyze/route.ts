// Manual test: run Analyze on any Workbench item. Expect 200 response and a new analyze_completed row in /dev/activity-log without FK errors.

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AnalyzeResultSchema } from "@/lib/ai/schemas";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { logAnalyzeCompleted } from "@/lib/activity-log";
import { logServerEvent, logServerError } from "@/lib/telemetry-server";

// If there is already a central OpenAI helper (e.g. lib/ai.ts or lib/openai.ts),
// you can refactor this to reuse it. For now we create a minimal client here.
import OpenAI from "openai";

const openaiApiKey = process.env.OPENAI_API_KEY;

if (!openaiApiKey) {
  // We throw at module evaluation so misconfig is obvious in dev.
  throw new Error("OPENAI_API_KEY is not set");
}

const openai = new OpenAI({
  apiKey: openaiApiKey,
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set for Supabase admin client");
}

if (!serviceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set for Supabase admin client");
}

// Admin client (service-role) for server-side writes such as ActivityLog.
// This bypasses RLS and must never be used on the client.
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

const DEMO_OWNER_ID =
  process.env.NEXT_PUBLIC_DEMO_OWNER_ID ?? "00000000-0000-0000-0000-000000000000";

async function getUserAndOrg(req: NextRequest) {
  let userId: string | null = DEMO_OWNER_ID;
  let orgId: string | null = null;

  const supabase = createServerSupabaseClient();

  // Try to get user from auth session via cookies
  const cookieStore = await cookies();
  // Supabase stores auth in cookies with pattern: sb-<project-ref>-auth-token
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
        // Add user as owner
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

// Simple JSON Schema to match AnalyzeResultSchema
const analyzeResultJsonSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    entities: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          value: { type: "string" },
        },
        required: ["label", "value"],
        additionalProperties: false,
      },
    },
    dates: {
      type: "array",
      items: { type: "string" },
    },
    nextAction: {
      type: ["string", "null"],
    },
  },
  required: ["summary", "entities", "dates", "nextAction"],
  additionalProperties: false,
} as const;

type AnalyzeRequestBody = {
  itemId: string;
  title: string;
  snippet: string;
  metadata?: Record<string, unknown>;
};

function logPosthogEventStub(
  event: "ai_analyze_requested" | "ai_analyze_failed" | "ai_analyze_completed",
  payload: Record<string, unknown>,
) {
  // Stub for now; can be wired to real PostHog later.
  console.log(`[telemetry] ${event}`, payload);
}

export async function POST(req: NextRequest) {
  let body: AnalyzeRequestBody;

  try {
    console.log("[analyze_api] POST /api/ai/analyze called");
    body = (await req.json()) as AnalyzeRequestBody;
  } catch {
    console.error("[analyze_api] Invalid JSON body");
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { itemId, title, snippet, metadata } = body;

  if (!itemId || !title || !snippet) {
    return NextResponse.json(
      { error: "Missing required fields: itemId, title, snippet" },
      { status: 400 },
    );
  }


  // Guardrail: no external HTTP fetch, no arbitrary URL scraping.
  // We only use title, snippet and metadata. If we later add Vault content,
  // it must come from Supabase, not from external URLs.

  const systemPrompt =
    "You are an assistant that analyzes business documents. " +
    "Summarize the document, extract key entities (names, companies, amounts, etc.), " +
    "list any important dates in ISO format where possible, and propose a next action " +
    "for the user if it makes sense. Always respond as strict JSON only.";

  const userPromptParts = [
    `Title: ${title}`,
    "",
    "Snippet:",
    snippet,
  ];

  if (metadata && Object.keys(metadata).length > 0) {
    userPromptParts.push("", "Metadata:", JSON.stringify(metadata, null, 2));
  }

  const userPrompt = userPromptParts.join("\n");

  // Get user and org context for activity_log
  const { userId, orgId } = await getUserAndOrg(req);

  const startedAt = performance.now();

  try {
    console.log("[analyze_api] Calling OpenAI for item", itemId);
    // Use chat.completions.create with structured outputs (JSON mode)
    // Note: The patch mentions responses.create() which may not exist in the current SDK
    // Using the standard chat.completions API with response_format for JSON output
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "AnalyzeResult",
          schema: analyzeResultJsonSchema,
          strict: true,
        },
      },
      temperature: 0.2,
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(content);
    } catch (err) {
      throw new Error(`Failed to parse JSON from model: ${(err as Error).message}`);
    }

    const validated = AnalyzeResultSchema.parse(parsedJson);

    const durationMs = performance.now() - startedAt;

    console.log("[analyze_api] OpenAI response validated for item", itemId);

    // Prepare enriched metadata for activity_log and telemetry
    const summaryLength = validated.summary?.length ?? 0;
    const entitiesCount = validated.entities?.length ?? 0;
    const nextStepDetected = Boolean(validated.nextAction);

    // Insert ActivityLog row using the centralized logActivity helper
    // Only insert if we have org_id (required by schema)
    if (!orgId) {
      console.warn(
        "[analyze_api] Skipping activity_log insert: no org_id available for item",
        itemId,
      );
      // Still return success - logging failure shouldn't break the Analyze flow
      // Note: We don't emit telemetry if we can't log to activity_log
      return NextResponse.json(validated, { status: 200 });
    }

    try {
      // Enriched metadata for activity_log
      const activityContext = {
        source: "workbench",
        model: "gpt-4o-mini",
        duration_ms: durationMs,
        summary_length: summaryLength,
        entities_count: entitiesCount,
        next_step_detected: nextStepDetected,
        title,
        snippet,
        metadata: metadata ?? {},
      };

      console.log("[analyze_api] Calling logActivity for item", itemId, "org", orgId);

      // itemId from Workbench should be unified_item.id
      // logAnalyzeCompleted will verify it exists in the database; if not, it will use null
      // This prevents FK constraint violations
      await logAnalyzeCompleted({
        orgId,
        userId: userId !== DEMO_OWNER_ID ? userId : null,
        unifiedItemId: itemId, // Pass itemId as-is; logActivity will verify it exists
        metadata: activityContext,
        source: "workbench",
        triggerRoute: "/api/ai/analyze",
        durationMs,
      });

      console.log("[analyze_api] Activity log inserted successfully for item", itemId);

      // Emit telemetry event
      logServerEvent({
        event: "workbench_analyze",
        userId: userId !== DEMO_OWNER_ID ? userId : null,
        orgId,
        docId: itemId,
        source: "workbench",
        route: "/api/ai/analyze",
        durationMs,
        properties: {
          status: "ok",
          model: "gpt-4o-mini",
          summary_length: summaryLength,
          entities_count: entitiesCount,
          next_step_detected: nextStepDetected,
        },
      });
    } catch (logError) {
      // logActivity should not throw for missing unified_item (it uses null instead)
      // If it still throws, it's a different error (e.g. missing org_id)
      const errorMessage = (logError as Error).message ?? "Unknown error";
      console.error("[analyze_api] logActivity failed for item", itemId, errorMessage);
      // Don't fail the Analyze request if logging fails - just log the error
      // The analysis result is still valid
      console.warn("[analyze_api] Continuing despite logActivity failure");
    }

    return NextResponse.json(validated, { status: 200 });
  } catch (error) {
    const durationMs = performance.now() - startedAt;
    
    console.error("Analyze API failed", error);
    
    logServerError({
      event: "workbench_analyze",
      userId: userId !== DEMO_OWNER_ID ? userId : null,
      orgId: orgId ?? null,
      docId: itemId,
      source: "workbench",
      route: "/api/ai/analyze",
      durationMs,
      properties: {
        status: "error",
      },
      error,
    });

    return NextResponse.json(
      { error: "AI analyze failed" },
      { status: 500 },
    );
  }
}

