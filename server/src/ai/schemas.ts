import { z } from "zod";

export const TrendScanOutputSchema = z.object({
  summary: z.string().min(1),
  trends: z.array(z.object({ name: z.string(), confidence: z.number().min(0).max(1) })),
  sources: z.array(z.string()).default([]),
});

export const AssetDraftOutputSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  assetBriefs: z.array(z.string()).min(1),
});

export const ListingBlueprintOutputSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  tags: z.array(z.string()).max(20),
  priceSuggestion: z.number().nonnegative(),
});

export const QualityReviewOutputSchema = z.object({
  score: z.number().min(0).max(1),
  accepted: z.boolean(),
  findings: z.array(z.string()),
  recommendation: z.string(),
});

export const MarketSignalOutputSchema = z.object({
  signal: z.string().min(1),
  strength: z.number().min(0).max(1),
  rationale: z.string().min(1),
});

export const SystemDiagnosticOutputSchema = z.object({
  status: z.enum(["HEALTHY", "DEGRADED", "ACTION_REQUIRED"]),
  checks: z.array(z.object({ name: z.string(), passed: z.boolean(), detail: z.string() })),
  summary: z.string().min(1),
});

export type TrendScanOutput = z.infer<typeof TrendScanOutputSchema>;
export type AssetDraftOutput = z.infer<typeof AssetDraftOutputSchema>;
export type ListingBlueprintOutput = z.infer<typeof ListingBlueprintOutputSchema>;
export type QualityReviewOutput = z.infer<typeof QualityReviewOutputSchema>;
export type MarketSignalOutput = z.infer<typeof MarketSignalOutputSchema>;
export type SystemDiagnosticOutput = z.infer<typeof SystemDiagnosticOutputSchema>;

export const schemaByTaskType = {
  TREND_SCAN: { name: "TrendScanOutput", schema: TrendScanOutputSchema },
  ASSET_DRAFT: { name: "AssetDraftOutput", schema: AssetDraftOutputSchema },
  LISTING_BLUEPRINT: { name: "ListingBlueprintOutput", schema: ListingBlueprintOutputSchema },
  QUALITY_REVIEW: { name: "QualityReviewOutput", schema: QualityReviewOutputSchema },
  MARKET_SIGNAL: { name: "MarketSignalOutput", schema: MarketSignalOutputSchema },
  SYSTEM_DIAGNOSTIC: { name: "SystemDiagnosticOutput", schema: SystemDiagnosticOutputSchema },
} as const;
