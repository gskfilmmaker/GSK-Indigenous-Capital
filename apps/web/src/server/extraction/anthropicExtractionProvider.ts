import "server-only";

import {
  ExtractionNotConfiguredError,
  ExtractionResponseError,
  type ExtractionDocument,
  type ExtractionProvider,
  type ExtractionResult,
} from "./extractionProvider";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_API_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-5";

/**
 * The instruction that keeps this module inside packages/deal-screening's
 * "never a verdict" discipline at the extraction step too: the model is
 * asked to report what it found, what it couldn't find, and where
 * documents disagree — never to judge the startup.
 */
const SYSTEM_PROMPT = `You extract structured startup data from founder-submitted documents (pitch decks, financial statements, cap tables) for a screening tool. You do not evaluate, score, rate, or recommend the startup in any way — that is explicitly out of scope and forbidden.

Respond with ONLY a single JSON object, no prose before or after, in this exact shape:
{
  "data": {
    "unitEconomics": { "monthlyRevenuePerCustomer": "<decimal string>", "grossMargin": "<0-1 decimal string>", "monthlyChurnRate": "<0-1 decimal string>", "customerAcquisitionCost": "<decimal string>", "annualGrowthRate": "<decimal string>", "profitMargin": "<decimal string>" },
    "marketSizing": { "annualContractValue": "<decimal string>", "reachableCustomers": "<decimal string>", "totalAddressableMarket": "<decimal string>", "serviceableShare": "<0-1 decimal string>", "nearTermCaptureRate": "<0-1 decimal string>" },
    "berkus": { "soundIdea": "<0-500000>", "workingPrototype": "<0-500000>", "qualityManagementTeam": "<0-500000>", "strategicRelationships": "<0-500000>", "productRolloutOrSales": "<0-500000>" },
    "scorecard": { "regionalMedianPreMoney": { "amount": "<decimal string>", "currency": "CAD" }, "ratings": { "team": "<decimal string>", "marketSize": "<decimal string>", "product": "<decimal string>", "competitiveEnvironment": "<decimal string>", "salesChannels": "<decimal string>", "needForFinancing": "<decimal string>", "other": "<decimal string>" } },
    "exitAssumption": { "exitValue": { "amount": "<decimal string>", "currency": "CAD" }, "yearsToExit": "<decimal string>", "proposedInvestment": { "amount": "<decimal string>", "currency": "CAD" } }
  },
  "warnings": ["<field or group you could not find in any supplied document, in plain English>"],
  "contradictions": [{ "description": "<what disagrees, in plain English>", "sourceDocuments": ["<document name>", "<document name>"] }]
}

Every field above is optional — omit an entire group entirely if the documents do not contain enough information to fill it in confidently. Never invent, estimate, or interpolate a number that is not actually stated or directly computable from stated numbers in the documents. All numbers are plain decimal strings (no currency symbols, no thousands separators, no percent signs — 0.05 not 5%).`;

interface AnthropicMessageContentBlock {
  type: "text";
  text: string;
}

interface AnthropicMessagesResponse {
  content: AnthropicMessageContentBlock[];
}

/** Minimal fetch shape this module needs — injectable for tests, never a real network call in the test suite. */
export type FetchLike = (
  url: string,
  init: RequestInit,
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown>; text(): Promise<string> }>;

export class AnthropicExtractionProvider implements ExtractionProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetchImpl: FetchLike;

  constructor(config: { apiKey: string; model?: string; fetchImpl?: FetchLike }) {
    this.apiKey = config.apiKey;
    this.model = config.model ?? DEFAULT_MODEL;
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  /**
   * Reads `ANTHROPIC_API_KEY` from the environment — see ADR 0008. This
   * is a distinct, product-owned key with its own billing/scope, never
   * the Claude Code session's own credential. Throws
   * `ExtractionNotConfiguredError` rather than silently disabling the
   * feature, so a misconfiguration is loud, not a quiet no-op.
   */
  static fromEnv(): AnthropicExtractionProvider {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new ExtractionNotConfiguredError();
    }
    return new AnthropicExtractionProvider({ apiKey });
  }

  async extractStartupIntake(documents: ExtractionDocument[]): Promise<ExtractionResult> {
    const content: unknown[] = documents.map((doc) => ({
      type: doc.mimeType === "application/pdf" ? "document" : "image",
      source: { type: "base64", media_type: doc.mimeType, data: doc.base64Content },
    }));
    content.push({
      type: "text",
      text: `Extract structured startup screening data from the ${documents.length} document(s) above (${documents.map((d) => d.name).join(", ")}).`,
    });

    const response = await this.fetchImpl(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": ANTHROPIC_API_VERSION,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content }],
      }),
    });

    if (!response.ok) {
      throw new ExtractionResponseError(
        `extraction request failed with status ${response.status}: ${await response.text()}`,
      );
    }

    const parsed = (await response.json()) as AnthropicMessagesResponse;
    const textBlock = parsed.content.find((block) => block.type === "text");
    if (!textBlock) {
      throw new ExtractionResponseError("extraction response contained no text content");
    }

    return parseExtractionResponse(textBlock.text);
  }
}

export function parseExtractionResponse(rawText: string): ExtractionResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new ExtractionResponseError(
      "extraction response was not valid JSON — refusing to guess at its meaning",
    );
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new ExtractionResponseError("extraction response was not a JSON object");
  }
  const candidate = parsed as Record<string, unknown>;
  return {
    data: (candidate.data as ExtractionResult["data"] | undefined) ?? {},
    warnings: Array.isArray(candidate.warnings) ? (candidate.warnings as string[]) : [],
    contradictions: Array.isArray(candidate.contradictions)
      ? (candidate.contradictions as ExtractionResult["contradictions"])
      : [],
  };
}
