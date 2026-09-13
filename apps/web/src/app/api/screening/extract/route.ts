import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { AnthropicExtractionProvider } from "../../../../server/extraction/anthropicExtractionProvider";
import {
  ExtractionNotConfiguredError,
  ExtractionResponseError,
  type ExtractionDocument,
} from "../../../../server/extraction/extractionProvider";

const ALLOWED_MIME_TYPES: ExtractionDocument["mimeType"][] = [
  "application/pdf",
  "image/png",
  "image/jpeg",
];

/**
 * Turns uploaded founder documents into a draft StartupIntakeData for the
 * intake form to prefill — see ADR 0008. Requires authentication (any
 * signed-in member can try this; the actual intake submission is what
 * gets capability-checked) so this endpoint isn't an open door to spend
 * the project's Anthropic API budget.
 */
export async function POST(request: Request): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to use document extraction." }, { status: 401 });
  }

  const formData = await request.formData();
  const files = formData.getAll("documents").filter((entry): entry is File => entry instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No documents were uploaded." }, { status: 400 });
  }

  const documents: ExtractionDocument[] = [];
  for (const file of files) {
    if (!ALLOWED_MIME_TYPES.includes(file.type as ExtractionDocument["mimeType"])) {
      return NextResponse.json(
        { error: `${file.name}: only PDF, PNG, and JPEG are supported.` },
        { status: 400 },
      );
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    documents.push({
      name: file.name,
      mimeType: file.type as ExtractionDocument["mimeType"],
      base64Content: bytes.toString("base64"),
    });
  }

  try {
    const provider = AnthropicExtractionProvider.fromEnv();
    const result = await provider.extractStartupIntake(documents);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ExtractionNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof ExtractionResponseError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    throw error;
  }
}
