import type { MissionTemplate } from "../types";

export const missionTemplates: MissionTemplate[] = [
  {
    id: "trend-recon-sweep",
    name: "Trend Recon Sweep",
    description: "Route a trend scan through ORACLE for supervised signal mapping.",
    task: {
      title: "Trend Recon Sweep",
      type: "TREND_SCAN",
      priority: "MEDIUM",
      assignedRoom: "ORACLE",
      difficulty: "NORMAL",
    },
  },
  {
    id: "emergency-market-signal",
    name: "Emergency Market Signal",
    description: "Escalate a high-priority market signal packet to ORACLE.",
    task: {
      title: "Emergency Market Signal",
      type: "MARKET_SIGNAL",
      priority: "CRITICAL",
      assignedRoom: "ORACLE",
      difficulty: "HARD",
    },
  },
  {
    id: "asset-draft-batch",
    name: "Asset Draft Batch",
    description: "Dispatch a simulated creative asset batch to FORGE.",
    task: {
      title: "Asset Draft Batch",
      type: "ASSET_DRAFT",
      priority: "HIGH",
      assignedRoom: "FORGE",
      difficulty: "NORMAL",
    },
  },
  {
    id: "listing-blueprint",
    name: "Listing Blueprint",
    description: "Send structured listing logic through LEDGER.",
    task: {
      title: "Listing Blueprint",
      type: "LISTING_BLUEPRINT",
      priority: "HIGH",
      assignedRoom: "LEDGER",
      difficulty: "HARD",
    },
  },
  {
    id: "full-system-diagnostic",
    name: "Full System Diagnostic",
    description: "Auto-route a light diagnostic to the least loaded room.",
    task: {
      title: "Full System Diagnostic",
      type: "SYSTEM_DIAGNOSTIC",
      priority: "MEDIUM",
      assignedRoom: "AUTO_ASSIGN",
      difficulty: "EASY",
    },
  },
  {
    id: "quality-audit",
    name: "Quality Audit",
    description: "Route a quality review packet to JUDGE.",
    task: {
      title: "Quality Audit",
      type: "QUALITY_REVIEW",
      priority: "HIGH",
      assignedRoom: "JUDGE",
      difficulty: "NORMAL",
    },
  },
];
