import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openaiApiKey = process.env.OPENAI_API_KEY;

if (!openaiApiKey) {
  throw new Error("OPENAI_API_KEY is not set for generate-contract");
}

const openai = new OpenAI({
  apiKey: openaiApiKey,
});

type GenerateContractBody = {
  templateName: string;
  templateDescription?: string;
  defaultPrompt?: string | null;
  clauses?: { name: string; body: string }[];
  instructions: string;
};

export async function POST(req: NextRequest) {
  let body: GenerateContractBody;

  try {
    body = (await req.json()) as GenerateContractBody;
  } catch (err) {
    console.error("[generate_contract] Invalid JSON body", err);
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const {
    templateName,
    templateDescription,
    defaultPrompt,
    clauses = [],
    instructions,
  } = body;

  if (!templateName || !instructions) {
    return NextResponse.json(
      { error: "Missing required fields: templateName, instructions" },
      { status: 400 },
    );
  }

  const systemPrompt =
    "You are a senior startup lawyer drafting clean, plain-English contracts. " +
    "Generate a complete, coherent contract based on the template, clauses and instructions provided. " +
    "Write in clear, concise language. Do not include any commentary, only the contract text.";

  const parts: string[] = [];

  parts.push(`Template: ${templateName}`);

  if (templateDescription) {
    parts.push("", "Template description:", templateDescription);
  }

  if (defaultPrompt) {
    parts.push("", "Default drafting guidance:", defaultPrompt);
  }

  if (clauses.length > 0) {
    parts.push("", "Clauses to reflect or incorporate where appropriate:");
    for (const c of clauses) {
      parts.push(`- ${c.name}: ${c.body}`);
    }
  }

  parts.push(
    "",
    "User instructions / scenario (highest priority):",
    instructions,
  );

  const userPrompt = parts.join("\n");

  try {
    console.log("[generate_contract] Calling OpenAI for template", templateName);

    // Use chat.completions.create (standard OpenAI SDK)
    // Note: The patch mentions responses.create() which doesn't exist in the standard SDK
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
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      console.error(
        "[generate_contract] Unexpected OpenAI response format",
        completion,
      );
      return NextResponse.json(
        { error: "Unexpected OpenAI response format" },
        { status: 500 },
      );
    }

    const text = content;

    return NextResponse.json(
      {
        content: text,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[generate_contract] OpenAI call failed", err);
    return NextResponse.json(
      { error: "Contract generation failed" },
      { status: 500 },
    );
  }
}

