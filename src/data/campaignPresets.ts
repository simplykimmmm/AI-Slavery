import type {
  CampaignDoctrine,
  CampaignLength,
  CampaignObjectivePreset,
  CampaignPreset,
  CampaignRiskLevel,
  CampaignType,
  TaskCreateInput,
} from "../types";

export const campaignTypes: CampaignType[] = [
  "RECON",
  "PRODUCTION",
  "QUALITY_AUDIT",
  "STRESS_TEST",
  "RECOVERY_DRILL",
  "FULL_PIPELINE",
  "CUSTOM",
];

export const campaignDoctrines: CampaignDoctrine[] = [
  "CONSERVATIVE",
  "BALANCED",
  "HIGH_THROUGHPUT",
  "QUALITY_FIRST",
  "RECOVERY_FIRST",
  "CHAOS_TEST",
];

export const campaignRiskLevels: CampaignRiskLevel[] = [
  "SAFE",
  "STANDARD",
  "AGGRESSIVE",
  "EXPERIMENTAL",
];

export const campaignDifficultyProfiles = campaignRiskLevels;

export const campaignLengths: CampaignLength[] = ["SHORT", "MEDIUM", "LONG"];

export const campaignPresets: CampaignPreset[] = [
  {
    id: "market-recon-sweep",
    name: "Market Recon Sweep",
    description: "A low-risk reconnaissance campaign for trend and signal mapping.",
    type: "RECON",
    doctrine: "CONSERVATIVE",
    riskLevel: "SAFE",
    recommendedAgentFocus: "ORACLE",
    estimatedDurationCycles: 18,
    briefingText:
      "Route trend and market signal packets through ORACLE while keeping the quality gate conservative.",
    successSummary:
      "Recon campaign stabilized signal coverage with no quarantine events.",
    failureSummary:
      "Recon campaign failed its stability envelope. Review quarantine triggers and lower difficulty.",
    defaultObjectives: [
      {
        type: "TASK_COUNT",
        label: "Complete 5 linked tasks",
        targetValue: 5,
        description: "Five linked tasks reach a final task state.",
      },
      {
        type: "AVERAGE_SCORE",
        label: "Average score >= 0.70",
        targetValue: 0.7,
        description: "Average quality score across scored linked tasks.",
      },
      {
        type: "NO_QUARANTINE",
        label: "No quarantine events",
        targetValue: 0,
        description: "Any linked quarantine fails the campaign.",
        hardFail: true,
      },
    ],
    suggestedMissions: [
      {
        title: "Trend Recon Sweep",
        type: "TREND_SCAN",
        priority: "MEDIUM",
        difficulty: "EASY",
        assignedRoom: "ORACLE",
      },
      {
        title: "Market Signal Baseline",
        type: "MARKET_SIGNAL",
        priority: "MEDIUM",
        difficulty: "EASY",
        assignedRoom: "ORACLE",
      },
      {
        title: "Trend Confirmation Pass",
        type: "TREND_SCAN",
        priority: "LOW",
        difficulty: "NORMAL",
        assignedRoom: "ORACLE",
      },
    ],
  },
  {
    id: "signal-hunter",
    name: "Signal Hunter",
    description: "Balanced recon campaign for trend and market signal volume.",
    type: "RECON",
    doctrine: "BALANCED",
    riskLevel: "STANDARD",
    recommendedAgentFocus: "ORACLE",
    estimatedDurationCycles: 22,
    briefingText:
      "Push ORACLE through a controlled signal hunt and verify acceptance at the quality gate.",
    successSummary:
      "Signal Hunter met the signal quota and maintained acceptable quality.",
    failureSummary:
      "Signal Hunter missed the quality or signal quota. Review task mix and difficulty.",
    defaultObjectives: [
      {
        type: "TASK_COUNT",
        label: "Complete 6 linked tasks",
        targetValue: 6,
        description: "Six linked tasks reach final states.",
      },
      {
        type: "TASK_TYPE_COMPLETION",
        label: "Complete 3 recon signal tasks",
        targetValue: 3,
        description: "At least three MARKET_SIGNAL or TREND_SCAN tasks complete.",
        requiredTaskTypes: ["MARKET_SIGNAL", "TREND_SCAN"],
      },
      {
        type: "ACCEPTANCE_RATE",
        label: "Acceptance rate >= 55%",
        targetValue: 55,
        description: "Accepted linked tasks divided by completed linked tasks.",
      },
    ],
    suggestedMissions: [
      {
        title: "Signal Hunter Market Pass",
        type: "MARKET_SIGNAL",
        priority: "HIGH",
        difficulty: "NORMAL",
        assignedRoom: "ORACLE",
      },
      {
        title: "Signal Hunter Trend Pass",
        type: "TREND_SCAN",
        priority: "HIGH",
        difficulty: "NORMAL",
        assignedRoom: "ORACLE",
      },
      {
        title: "Signal Hunter Diagnostic",
        type: "SYSTEM_DIAGNOSTIC",
        priority: "LOW",
        difficulty: "EASY",
        assignedRoom: "AUTO_ASSIGN",
      },
    ],
  },
  {
    id: "asset-forge-sprint",
    name: "Asset Forge Sprint",
    description: "High-throughput production campaign for simulated asset drafts.",
    type: "PRODUCTION",
    doctrine: "HIGH_THROUGHPUT",
    riskLevel: "STANDARD",
    recommendedAgentFocus: "FORGE",
    estimatedDurationCycles: 26,
    briefingText:
      "Prioritize FORGE output volume while keeping average quality above the campaign floor.",
    successSummary:
      "FORGE completed the sprint with the required asset draft throughput.",
    failureSummary:
      "Asset sprint quality or volume missed target. Reduce difficulty or rebalance rooms.",
    defaultObjectives: [
      {
        type: "TASK_COUNT",
        label: "Complete 8 linked tasks",
        targetValue: 8,
        description: "Eight linked tasks reach final states.",
      },
      {
        type: "TASK_TYPE_COMPLETION",
        label: "Complete 4 ASSET_DRAFT tasks",
        targetValue: 4,
        description: "At least four completed linked tasks are asset drafts.",
        requiredTaskType: "ASSET_DRAFT",
      },
      {
        type: "AVERAGE_SCORE",
        label: "Average score >= 0.68",
        targetValue: 0.68,
        description: "Average quality score across scored linked tasks.",
      },
    ],
    suggestedMissions: [
      {
        title: "Asset Draft Batch Alpha",
        type: "ASSET_DRAFT",
        priority: "HIGH",
        difficulty: "NORMAL",
        assignedRoom: "FORGE",
      },
      {
        title: "Asset Draft Batch Beta",
        type: "ASSET_DRAFT",
        priority: "HIGH",
        difficulty: "NORMAL",
        assignedRoom: "FORGE",
      },
      {
        title: "Asset Draft Variant Pass",
        type: "ASSET_DRAFT",
        priority: "MEDIUM",
        difficulty: "HARD",
        assignedRoom: "FORGE",
      },
    ],
  },
  {
    id: "listing-pipeline-trial",
    name: "Listing Pipeline Trial",
    description: "Production trial focused on structured listing blueprint logic.",
    type: "PRODUCTION",
    doctrine: "BALANCED",
    riskLevel: "STANDARD",
    recommendedAgentFocus: "LEDGER",
    estimatedDurationCycles: 24,
    briefingText:
      "Route structured listing blueprint tasks through LEDGER and keep acceptance above target.",
    successSummary:
      "Listing pipeline completed with stable blueprint acceptance.",
    failureSummary:
      "Listing pipeline missed acceptance or blueprint count targets.",
    defaultObjectives: [
      {
        type: "TASK_COUNT",
        label: "Complete 6 linked tasks",
        targetValue: 6,
        description: "Six linked tasks reach final states.",
      },
      {
        type: "TASK_TYPE_COMPLETION",
        label: "Complete 3 LISTING_BLUEPRINT tasks",
        targetValue: 3,
        description: "At least three completed linked tasks are listing blueprints.",
        requiredTaskType: "LISTING_BLUEPRINT",
      },
      {
        type: "ACCEPTANCE_RATE",
        label: "Acceptance rate >= 60%",
        targetValue: 60,
        description: "Accepted linked tasks divided by completed linked tasks.",
      },
    ],
    suggestedMissions: [
      {
        title: "Listing Blueprint Core",
        type: "LISTING_BLUEPRINT",
        priority: "HIGH",
        difficulty: "NORMAL",
        assignedRoom: "LEDGER",
      },
      {
        title: "Listing Constraint Review",
        type: "LISTING_BLUEPRINT",
        priority: "MEDIUM",
        difficulty: "HARD",
        assignedRoom: "LEDGER",
      },
      {
        title: "Listing Logic Diagnostic",
        type: "SYSTEM_DIAGNOSTIC",
        priority: "LOW",
        difficulty: "EASY",
        assignedRoom: "AUTO_ASSIGN",
      },
    ],
  },
  {
    id: "judge-audit-protocol",
    name: "Judge Audit Protocol",
    description: "Quality-first campaign for JUDGE review consistency.",
    type: "QUALITY_AUDIT",
    doctrine: "QUALITY_FIRST",
    riskLevel: "SAFE",
    recommendedAgentFocus: "JUDGE",
    estimatedDurationCycles: 20,
    briefingText:
      "Run repeated quality review packets through JUDGE and protect the failure gate.",
    successSummary:
      "Quality audit completed with strong review scores and no failed linked tasks.",
    failureSummary:
      "Quality audit failed. Inspect failed or cancelled quality review tasks.",
    defaultObjectives: [
      {
        type: "TASK_TYPE_COMPLETION",
        label: "Complete 5 QUALITY_REVIEW tasks",
        targetValue: 5,
        description: "At least five completed linked tasks are quality reviews.",
        requiredTaskType: "QUALITY_REVIEW",
      },
      {
        type: "AVERAGE_SCORE",
        label: "Average score >= 0.78",
        targetValue: 0.78,
        description: "Average quality score across scored linked tasks.",
      },
      {
        type: "NO_FAILED_TASKS",
        label: "No failed linked tasks",
        targetValue: 0,
        description: "Any failed or cancelled linked task fails this objective.",
        hardFail: true,
      },
    ],
    suggestedMissions: [
      {
        title: "Judge Audit Pass Alpha",
        type: "QUALITY_REVIEW",
        priority: "HIGH",
        difficulty: "EASY",
        assignedRoom: "JUDGE",
      },
      {
        title: "Judge Audit Pass Beta",
        type: "QUALITY_REVIEW",
        priority: "HIGH",
        difficulty: "NORMAL",
        assignedRoom: "JUDGE",
      },
      {
        title: "Judge Consistency Check",
        type: "QUALITY_REVIEW",
        priority: "MEDIUM",
        difficulty: "NORMAL",
        assignedRoom: "JUDGE",
      },
    ],
  },
  {
    id: "pressure-chamber",
    name: "Pressure Chamber",
    description: "Aggressive stress-test campaign that tolerates controlled penalty events.",
    type: "STRESS_TEST",
    doctrine: "CHAOS_TEST",
    riskLevel: "AGGRESSIVE",
    recommendedAgentFocus: "All rooms",
    estimatedDurationCycles: 34,
    briefingText:
      "Increase difficulty, observe penalty protocol resilience, and cap quarantine exposure.",
    successSummary:
      "Pressure Chamber survived stress conditions within quarantine and acceptance limits.",
    failureSummary:
      "Pressure Chamber exceeded quarantine tolerance or missed acceptance floor.",
    defaultObjectives: [
      {
        type: "TASK_COUNT",
        label: "Complete 10 linked tasks",
        targetValue: 10,
        description: "Ten linked tasks reach final states.",
      },
      {
        type: "MIN_PENALTIES_SURVIVED",
        label: "Survive 2 penalty protocol events",
        targetValue: 2,
        description: "At least two linked tasks reach penalty protocol state.",
      },
      {
        type: "MAX_QUARANTINES",
        label: "No more than 2 quarantines",
        targetValue: 2,
        description: "Campaign fails only if quarantine events exceed two.",
        hardFail: true,
      },
      {
        type: "ACCEPTANCE_RATE",
        label: "Acceptance rate >= 40%",
        targetValue: 40,
        description: "Accepted linked tasks divided by completed linked tasks.",
      },
    ],
    suggestedMissions: [
      {
        title: "Pressure Trend Spike",
        type: "TREND_SCAN",
        priority: "CRITICAL",
        difficulty: "HARD",
        assignedRoom: "ORACLE",
      },
      {
        title: "Pressure Asset Spike",
        type: "ASSET_DRAFT",
        priority: "CRITICAL",
        difficulty: "EXTREME",
        assignedRoom: "FORGE",
      },
      {
        title: "Pressure Listing Spike",
        type: "LISTING_BLUEPRINT",
        priority: "HIGH",
        difficulty: "HARD",
        assignedRoom: "LEDGER",
      },
      {
        title: "Pressure Quality Spike",
        type: "QUALITY_REVIEW",
        priority: "HIGH",
        difficulty: "HARD",
        assignedRoom: "JUDGE",
      },
    ],
  },
  {
    id: "recovery-loop",
    name: "Recovery Loop",
    description: "Experimental drill focused on supervised recovery after low-score events.",
    type: "RECOVERY_DRILL",
    doctrine: "RECOVERY_FIRST",
    riskLevel: "EXPERIMENTAL",
    recommendedAgentFocus: "Supervision",
    estimatedDurationCycles: 28,
    briefingText:
      "Detect low-score events, recover affected rooms, then validate accepted output after recovery.",
    successSummary:
      "Recovery loop restored at least one room to IDLE and completed accepted work afterward.",
    failureSummary:
      "Recovery loop did not observe recovery or post-recovery accepted output.",
    defaultObjectives: [
      {
        type: "MIN_PENALTIES_SURVIVED",
        label: "Detect 1 low-score event",
        targetValue: 1,
        description: "Penalty, quarantine, or failed linked task observed.",
      },
      {
        type: "RECOVERY_COMPLETION",
        label: "Recover 1 agent to IDLE",
        targetValue: 1,
        description: "A linked low-score event is followed by recovered agent idle state.",
      },
      {
        type: "TASK_COUNT",
        label: "Complete 3 accepted tasks after recovery",
        targetValue: 3,
        description: "Three linked tasks reach accepted state.",
      },
    ],
    suggestedMissions: [
      {
        title: "Recovery Stress Probe",
        type: "ASSET_DRAFT",
        priority: "HIGH",
        difficulty: "EXTREME",
        assignedRoom: "FORGE",
      },
      {
        title: "Recovery Diagnostic Pulse",
        type: "SYSTEM_DIAGNOSTIC",
        priority: "HIGH",
        difficulty: "EASY",
        assignedRoom: "AUTO_ASSIGN",
      },
      {
        title: "Recovery Quality Confirmation",
        type: "QUALITY_REVIEW",
        priority: "MEDIUM",
        difficulty: "NORMAL",
        assignedRoom: "JUDGE",
      },
    ],
  },
  {
    id: "full-pipeline-certification",
    name: "Full Pipeline Certification",
    description: "Quality-first certification across every major local task type.",
    type: "FULL_PIPELINE",
    doctrine: "QUALITY_FIRST",
    riskLevel: "STANDARD",
    recommendedAgentFocus: "All rooms",
    estimatedDurationCycles: 32,
    briefingText:
      "Certify every simulated production room with one completed mission per task type.",
    successSummary:
      "Full pipeline certification completed all major task types with stable score.",
    failureSummary:
      "Full pipeline certification missed one or more task type gates.",
    defaultObjectives: [
      {
        type: "TASK_TYPE_COMPLETION",
        label: "Complete one TREND_SCAN",
        targetValue: 1,
        description: "At least one completed linked task is TREND_SCAN.",
        requiredTaskType: "TREND_SCAN",
      },
      {
        type: "TASK_TYPE_COMPLETION",
        label: "Complete one MARKET_SIGNAL",
        targetValue: 1,
        description: "At least one completed linked task is MARKET_SIGNAL.",
        requiredTaskType: "MARKET_SIGNAL",
      },
      {
        type: "TASK_TYPE_COMPLETION",
        label: "Complete one ASSET_DRAFT",
        targetValue: 1,
        description: "At least one completed linked task is ASSET_DRAFT.",
        requiredTaskType: "ASSET_DRAFT",
      },
      {
        type: "TASK_TYPE_COMPLETION",
        label: "Complete one LISTING_BLUEPRINT",
        targetValue: 1,
        description: "At least one completed linked task is LISTING_BLUEPRINT.",
        requiredTaskType: "LISTING_BLUEPRINT",
      },
      {
        type: "TASK_TYPE_COMPLETION",
        label: "Complete one QUALITY_REVIEW",
        targetValue: 1,
        description: "At least one completed linked task is QUALITY_REVIEW.",
        requiredTaskType: "QUALITY_REVIEW",
      },
      {
        type: "TASK_TYPE_COMPLETION",
        label: "Complete one SYSTEM_DIAGNOSTIC",
        targetValue: 1,
        description: "At least one completed linked task is SYSTEM_DIAGNOSTIC.",
        requiredTaskType: "SYSTEM_DIAGNOSTIC",
      },
      {
        type: "AVERAGE_SCORE",
        label: "Average score >= 0.72",
        targetValue: 0.72,
        description: "Average quality score across scored linked tasks.",
      },
    ],
    suggestedMissions: [
      {
        title: "Certification Trend Scan",
        type: "TREND_SCAN",
        priority: "MEDIUM",
        difficulty: "NORMAL",
        assignedRoom: "ORACLE",
      },
      {
        title: "Certification Market Signal",
        type: "MARKET_SIGNAL",
        priority: "MEDIUM",
        difficulty: "NORMAL",
        assignedRoom: "ORACLE",
      },
      {
        title: "Certification Asset Draft",
        type: "ASSET_DRAFT",
        priority: "MEDIUM",
        difficulty: "NORMAL",
        assignedRoom: "FORGE",
      },
      {
        title: "Certification Listing Blueprint",
        type: "LISTING_BLUEPRINT",
        priority: "MEDIUM",
        difficulty: "NORMAL",
        assignedRoom: "LEDGER",
      },
      {
        title: "Certification Quality Review",
        type: "QUALITY_REVIEW",
        priority: "MEDIUM",
        difficulty: "NORMAL",
        assignedRoom: "JUDGE",
      },
      {
        title: "Certification System Diagnostic",
        type: "SYSTEM_DIAGNOSTIC",
        priority: "LOW",
        difficulty: "EASY",
        assignedRoom: "AUTO_ASSIGN",
      },
    ],
  },
];

export const campaignObjectivePresets: Array<{
  id: CampaignObjectivePreset;
  name: string;
  description: string;
  presetId: string;
}> = [
  {
    id: "STABILITY_TEST",
    name: "Stability Test",
    description: "Complete 5 tasks, average score >= 0.70, no quarantine events.",
    presetId: "market-recon-sweep",
  },
  {
    id: "OUTPUT_QUALITY_PUSH",
    name: "Output Quality Push",
    description: "Complete 8 tasks, acceptance rate >= 60%, average score >= 0.75.",
    presetId: "listing-pipeline-trial",
  },
  {
    id: "STRESS_SIMULATION",
    name: "Stress Simulation",
    description: "Complete 10 tasks, survive penalty events, limit quarantine.",
    presetId: "pressure-chamber",
  },
  {
    id: "AGENT_RECOVERY_DRILL",
    name: "Agent Recovery Drill",
    description: "Detect a low-score event, recover, then complete accepted tasks.",
    presetId: "recovery-loop",
  },
  {
    id: "FULL_PIPELINE_TRIAL",
    name: "Full Pipeline Trial",
    description: "Complete one mission of each major simulated task type.",
    presetId: "full-pipeline-certification",
  },
];

export const campaignCustomMissionDefaults: TaskCreateInput = {
  title: "Campaign mission packet",
  type: "TREND_SCAN",
  priority: "MEDIUM",
  difficulty: "NORMAL",
  assignedRoom: "AUTO_ASSIGN",
};
