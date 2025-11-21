// Manual test:
// 1) Visit /builder: page should load without freezing.
// 2) Select a template, add clauses, instructions, generate Version 1, then click "Save to Vault":
//    - On success: toast "Saved to Vault" and doc appears in Vault/Workbench.
//    - On failure: toast error and console.error("[builder] Save to Vault error", ...), but no page crash.

import React from "react";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { BuilderClient } from "@/components/builder/builder-client";

export default async function BuilderPage() {
  const supabase = createServerSupabaseClient();

  const { data: templatesData, error: templatesError } = await supabase
    .from("template")
    .select(
      "id, name, category, description, default_prompt, org_id, is_active",
    )
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (templatesError) {
    console.error("Failed to load templates for Builder", templatesError);
  }

  const { data: clausesData, error: clausesError } = await supabase
    .from("clause")
    .select("id, name, category, body, org_id")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (clausesError) {
    console.error("Failed to load clauses for Builder", clausesError);
  }

  const templates = templatesData ?? [];
  const clauses = clausesData ?? [];

  return (
    <div className="h-full flex flex-col">
      <BuilderClient templates={templates} clauses={clauses} />
    </div>
  );
}
