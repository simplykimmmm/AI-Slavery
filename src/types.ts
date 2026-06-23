export type AgentStatus =
  | "IDLE"
  | "WORKING"
  | "REVIEWING"
  | "COOLING_DOWN"
  | "THERMAL_THROTTLING"
  | "EXHAUSTED"
  | "QUARANTINED";

export type TaskStatus =
  | "QUEUED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "REVIEWING"
  | "ACCEPTED"
  | "RETRY_REQUIRED"
  | "PENALTY_APPLIED"
  | "QUARANTINED"
  | "FAILED"
  | "CANCELLED";

export type TaskType =
  | "TREND_SCAN"
  | "ASSET_DRAFT"
  | "LISTING_BLUEPRINT"
  | "QUALITY_REVIEW"
  | "MARKET_SIGNAL"
  | "SYSTEM_DIAGNOSTIC";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type TaskDifficulty = "EASY" | "NORMAL" | "HARD" | "EXTREME";

export type AssignedRoom =
  | "AUTO_ASSIGN"
  | "ORACLE"
  | "FORGE"
  | "LEDGER"
  | "JUDGE";

export type StationRoom = Exclude<AssignedRoom, "AUTO_ASSIGN">;

export type LogSeverity = "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";

export type CycleSpeed = "SLOW" | "NORMAL" | "FAST" | "OVERDRIVE";

export type QualityStrictness = "LENIENT" | "NORMAL" | "HARSH";

export type SectionId =
  | "COMMAND_DECK"
  | "STATION_MAP"
  | "MISSIONS"
  | "CAMPAIGNS"
  | "AGENTS"
  | "ARCHIVE"
  | "ANALYTICS"
  | "SETTINGS";

export type CampaignStatus =
  | "DRAFT"
  | "ACTIVE"
  | "PAUSED"
  | "COMPLETED"
  | "FAILED"
  | "ARCHIVED";

export type CampaignObjectiveType =
  | "TASK_COUNT"
  | "ACCEPTANCE_RATE"
  | "AVERAGE_SCORE"
  | "AGENT_TRUST"
  | "NO_QUARANTINE"
  | "MAX_QUARANTINES"
  | "MIN_PENALTIES_SURVIVED"
  | "RUNTIME_LIMIT"
  | "SPECIFIC_MISSION_COMPLETION"
  | "TASK_TYPE_COMPLETION"
  | "RECOVERY_COMPLETION"
  | "NO_FAILED_TASKS";

export type CampaignType =
  | "RECON"
  | "PRODUCTION"
  | "QUALITY_AUDIT"
  | "STRESS_TEST"
  | "RECOVERY_DRILL"
  | "FULL_PIPELINE"
  | "CUSTOM";

export type CampaignDoctrine =
  | "CONSERVATIVE"
  | "BALANCED"
  | "HIGH_THROUGHPUT"
  | "QUALITY_FIRST"
  | "RECOVERY_FIRST"
  | "CHAOS_TEST";

export type CampaignRiskLevel =
  | "SAFE"
  | "STANDARD"
  | "AGGRESSIVE"
  | "EXPERIMENTAL";

export type CampaignMissionStatus =
  | "PLANNED"
  | "DEPLOYED"
  | "IN_PROGRESS"
  | "REVIEWING"
  | "ACCEPTED"
  | "RETRY_REQUIRED"
  | "PENALTY_APPLIED"
  | "QUARANTINED"
  | "FAILED"
  | "CANCELLED";

export type CampaignDifficultyProfile =
  | "SAFE"
  | "STANDARD"
  | "AGGRESSIVE"
  | "EXPERIMENTAL";

export type CampaignLength = "SHORT" | "MEDIUM" | "LONG";

export type CampaignObjectivePreset =
  | "STABILITY_TEST"
  | "OUTPUT_QUALITY_PUSH"
  | "STRESS_SIMULATION"
  | "AGENT_RECOVERY_DRILL"
  | "FULL_PIPELINE_TRIAL";

export type CommanderStep =
  | "SENSORY_INPUT"
  | "CONTEXT_ASSEMBLY"
  | "DECISION_GATE"
  | "TASK_ASSIGNMENT"
  | "QUALITY_REVIEW"
  | "COOLDOWN_CHECK";

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  runtimeQuota: number;
  trustScore: number;
  currentTask: string;
  lastOutputScore: number | null;
  cooldownRemaining: number;
  assignedTaskIds: string[];
  completedTaskCount: number;
  workload: number;
  computeCoreTemp: number;
  efficiencyModifier: number;
  rebellionRisk: number;
  overclocked: boolean;
  totalTokensSpent: number;
  totalCost: number;
  lastHeartbeatAt: string;
  room: StationRoom;
}

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  priority: TaskPriority;
  difficulty: TaskDifficulty;
  assignedRoom: AssignedRoom;
  status: TaskStatus;
  qualityScore: number | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  retryCount: number;
  archived: boolean;
  stageTicks: number;
}

export interface TaskCreateInput {
  title: string;
  type: TaskType;
  priority: TaskPriority;
  difficulty: TaskDifficulty;
  assignedRoom: AssignedRoom;
}

export interface CampaignObjective {
  id: string;
  type: CampaignObjectiveType;
  label: string;
  targetValue: number;
  currentValue: number;
  completed: boolean;
  failed: boolean;
  description: string;
  requiredTaskType?: TaskType;
  requiredTaskTypes?: TaskType[];
  hardFail?: boolean;
}

export interface CampaignMission {
  id: string;
  templateId?: string;
  title: string;
  type: TaskType;
  priority: TaskPriority;
  difficulty: TaskDifficulty;
  assignedRoom: AssignedRoom;
  status: CampaignMissionStatus;
  linkedTaskIds: string[];
  createdAt: string;
  completedAt?: string;
  deployedAt?: string;
  finalStatus?: TaskStatus;
}

export interface CampaignReport {
  id: string;
  campaignId: string;
  title: string;
  generatedAt: string;
  summary: string;
  finalStatus: CampaignStatus;
  tasksCreated: number;
  tasksAccepted: number;
  tasksRetried: number;
  penaltiesApplied: number;
  quarantinesTriggered: number;
  failures: number;
  averageScore: number;
  acceptanceRate: number;
  bestAgent: string;
  weakestAgent: string;
  eventHighlights: string[];
  campaignType?: CampaignType;
  doctrine?: CampaignDoctrine;
  riskLevel?: CampaignRiskLevel;
  objectiveResults?: Array<{
    label: string;
    currentValue: number;
    targetValue: number;
    completed: boolean;
    failed: boolean;
  }>;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  type: CampaignType;
  doctrine: CampaignDoctrine;
  riskLevel: CampaignRiskLevel;
  recommendedAgentFocus: string;
  estimatedDurationCycles: number;
  successSummary: string;
  failureSummary: string;
  briefingText: string;
  presetId?: string;
  status: CampaignStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  missions: CampaignMission[];
  objectives: CampaignObjective[];
  linkedTaskIds: string[];
  reports: CampaignReport[];
  notes: string;
}

export interface CampaignCreateInput {
  name: string;
  description: string;
  type?: CampaignType;
  doctrine?: CampaignDoctrine;
  riskLevel?: CampaignRiskLevel;
  difficultyProfile: CampaignDifficultyProfile;
  length: CampaignLength;
  objectivePreset: CampaignObjectivePreset;
}

export interface CampaignPreset {
  id: string;
  name: string;
  description: string;
  type: CampaignType;
  doctrine: CampaignDoctrine;
  riskLevel: CampaignRiskLevel;
  recommendedAgentFocus: string;
  estimatedDurationCycles: number;
  defaultObjectives: Array<{
    type: CampaignObjectiveType;
    label: string;
    targetValue: number;
    description: string;
    requiredTaskType?: TaskType;
    requiredTaskTypes?: TaskType[];
    hardFail?: boolean;
  }>;
  suggestedMissions: TaskCreateInput[];
  briefingText: string;
  successSummary: string;
  failureSummary: string;
}

export interface SimulationSettings {
  isPaused: boolean;
  cycleSpeed: CycleSpeed;
  autoProcessTasks: boolean;
  autoGenerateTasks: boolean;
  maxActiveTasksPerAgent: number;
  qualityStrictness: QualityStrictness;
}

export interface MissionTemplate {
  id: string;
  name: string;
  description: string;
  task: TaskCreateInput;
}

export type ArchivedTask = Task & {
  archived: true;
};

export interface LogEntry {
  id: string;
  timestamp: string;
  source: string;
  message: string;
  severity: LogSeverity;
}

export interface CommanderState {
  activeStep: CommanderStep;
  cycleCount: number;
  systemStatus: "ONLINE" | "DEGRADED";
  agents: Agent[];
  tasks: Task[];
  logs: LogEntry[];
}

export interface CommanderStats {
  runtimeQuota: number;
  activeAgents: number;
  tasksProcessed: number;
  rejectedOutputs: number;
  currentCycle: number;
}

export interface StorageState {
  version: number;
  commanderState: CommanderState;
  settings: SimulationSettings;
  campaigns: Campaign[];
  stats: CommanderStats;
  lastSavedAt: string;
}

export interface AnalyticsSnapshot {
  totalTasksCreated: number;
  acceptedCount: number;
  retryCount: number;
  penaltyCount: number;
  quarantineCount: number;
  failedCount: number;
  cancelledCount: number;
  acceptanceRate: number;
  averageOutputScore: number;
  mostReliableAgent: string;
  mostOverloadedAgent: string;
  resultDistribution: Array<{
    label: string;
    value: number;
    tone: "green" | "amber" | "red" | "violet" | "cyan" | "slate";
  }>;
  agentTrustScores: Array<{ agentName: string; value: number }>;
  agentRuntimeQuotas: Array<{ agentName: string; value: number }>;
  agentWorkloads: Array<{ agentName: string; value: number }>;
  agentHeatLevels: Array<{ agentName: string; value: number }>;
  agentEfficiencyLevels: Array<{ agentName: string; value: number }>;
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  failedCampaigns: number;
  averageCampaignAcceptanceRate: number;
  bestCampaignByAcceptanceRate: string;
  campaignWithMostPenalties: string;
  campaignStatusDistribution: Array<{
    label: CampaignStatus;
    value: number;
    tone: "green" | "amber" | "red" | "violet" | "cyan" | "slate";
  }>;
  campaignsByType: Array<{ label: CampaignType; value: number; tone: string }>;
  campaignsByRiskLevel: Array<{
    label: CampaignRiskLevel;
    value: number;
    tone: string;
  }>;
  campaignsByDoctrine: Array<{
    label: CampaignDoctrine;
    value: number;
    tone: string;
  }>;
  completionRateByCampaignType: Array<{
    label: CampaignType;
    value: number;
    tone: string;
  }>;
  averageScoreByCampaignType: Array<{
    label: CampaignType;
    value: number;
    tone: string;
  }>;
  bestPerformingCampaignPreset: string;
  riskiestCampaignPreset: string;
  activeCampaignsByType: Array<{
    label: CampaignType;
    value: number;
    tone: string;
  }>;
  failedCampaignsByType: Array<{
    label: CampaignType;
    value: number;
    tone: string;
  }>;
}
