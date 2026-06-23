import type { ModelClient } from "./modelClient.js";

const fixtureBySchema: Record<string, unknown> = {
  TrendScanOutput: {
    summary: "Mock trend scan completed using local deterministic data.",
    trends: [{ name: "Structured automation", confidence: 0.82 }],
    sources: ["local-simulation"],
  },
  AssetDraftOutput: {
    title: "Mock asset packet",
    description: "A safe local draft generated without an external provider.",
    assetBriefs: ["Primary square mockup", "Clean product detail view"],
  },
  ListingBlueprintOutput: {
    title: "Mock listing blueprint",
    description: "A dry-run listing package for operator review.",
    tags: ["digital", "template", "mock"],
    priceSuggestion: 9.99,
  },
  QualityReviewOutput: {
    score: 0.86,
    accepted: true,
    findings: ["Schema valid", "Dry-run safety maintained"],
    recommendation: "Accept for supervised review.",
  },
  MarketSignalOutput: {
    signal: "Stable simulated demand",
    strength: 0.74,
    rationale: "Generated from local mock telemetry.",
  },
  SystemDiagnosticOutput: {
    status: "HEALTHY",
    checks: [{ name: "structured-output", passed: true, detail: "Mock provider available" }],
    summary: "Runtime diagnostic completed locally.",
  },
};

export class MockModelClient implements ModelClient {
  async generateStructured<T>(args: Parameters<ModelClient["generateStructured"]>[0]) {
    const data = args.zodSchema.parse(fixtureBySchema[args.schemaName]) as T;
    const inputTokens = Math.max(1, Math.ceil((args.systemPrompt.length + args.userPrompt.length) / 4));
    const outputTokens = Math.max(1, Math.ceil(JSON.stringify(data).length / 4));
    return {
      data,
      usage: {
        provider: "mock",
        model: "local-structured-mock-v1",
        inputTokens,
        outputTokens,
        estimatedCost: 0,
      },
    };
  }
}
