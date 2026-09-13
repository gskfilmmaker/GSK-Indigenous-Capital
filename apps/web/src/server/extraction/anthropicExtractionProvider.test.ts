import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  AnthropicExtractionProvider,
  parseExtractionResponse,
  type FetchLike,
} from "./anthropicExtractionProvider.js";
import { ExtractionNotConfiguredError, ExtractionResponseError } from "./extractionProvider.js";

describe("AnthropicExtractionProvider.fromEnv", () => {
  it("throws ExtractionNotConfiguredError when ANTHROPIC_API_KEY is unset", () => {
    const original = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      expect(() => AnthropicExtractionProvider.fromEnv()).toThrow(ExtractionNotConfiguredError);
    } finally {
      if (original !== undefined) process.env.ANTHROPIC_API_KEY = original;
    }
  });
});

describe("AnthropicExtractionProvider.extractStartupIntake", () => {
  function providerWithFetch(fetchImpl: FetchLike) {
    return new AnthropicExtractionProvider({ apiKey: "test-key", fetchImpl });
  }

  it("sends every document as a content block plus one text instruction block", async () => {
    let sentBody: Record<string, unknown> | undefined;
    const provider = providerWithFetch((_url, init) => {
      sentBody = JSON.parse(init.body as string) as Record<string, unknown>;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ content: [{ type: "text", text: '{"data": {}}' }] }),
        text: () => Promise.resolve(""),
      });
    });

    await provider.extractStartupIntake([
      { name: "deck.pdf", mimeType: "application/pdf", base64Content: "AAAA" },
    ]);

    const messages = sentBody?.messages as { content: unknown[] }[];
    expect(messages[0]?.content).toHaveLength(2);
    expect(sentBody?.system).toContain("You do not evaluate, score, rate, or recommend");
  });

  it("throws ExtractionResponseError on a non-ok HTTP response, never returning partial data", async () => {
    const provider = providerWithFetch(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve("invalid api key"),
      }),
    );

    await expect(
      provider.extractStartupIntake([{ name: "d.pdf", mimeType: "application/pdf", base64Content: "AA" }]),
    ).rejects.toThrow(ExtractionResponseError);
  });

  it("returns the parsed data/warnings/contradictions on a well-formed response", async () => {
    const provider = providerWithFetch(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  data: { unitEconomics: { monthlyRevenuePerCustomer: "1000" } },
                  warnings: ["could not find market sizing data"],
                  contradictions: [
                    {
                      description: "deck says $2M ARR, financials show $1.4M",
                      sourceDocuments: ["deck.pdf"],
                    },
                  ],
                }),
              },
            ],
          }),
        text: () => Promise.resolve(""),
      }),
    );

    const result = await provider.extractStartupIntake([
      { name: "deck.pdf", mimeType: "application/pdf", base64Content: "AA" },
    ]);

    expect(result.data.unitEconomics?.monthlyRevenuePerCustomer).toBe("1000");
    expect(result.warnings).toEqual(["could not find market sizing data"]);
    expect(result.contradictions).toHaveLength(1);
  });
});

describe("parseExtractionResponse", () => {
  it("throws ExtractionResponseError on non-JSON text, never silently returning empty data", () => {
    expect(() => parseExtractionResponse("not json at all")).toThrow(ExtractionResponseError);
  });

  it("defaults warnings/contradictions to empty arrays when absent", () => {
    const result = parseExtractionResponse('{"data": {}}');
    expect(result.warnings).toEqual([]);
    expect(result.contradictions).toEqual([]);
  });
});
