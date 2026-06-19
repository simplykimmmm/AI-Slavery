import {
  campaignObjectivePresets,
  campaignPresets,
} from "../data/campaignPresets";
import { missionTemplates } from "../data/missionTemplates";
import { createLogEntry, createMissionTaskWithResult } from "./simulation";
import type {
  Agent,
  AssignedRoom,
  Campaign,
  CampaignCreateInput,
  CampaignDoctrine,
  CampaignMission,
  CampaignMissionStatus,
  CampaignObjective,
  CampaignPreset,
  CampaignReport,
  CampaignRiskLevel,
  CampaignStatus,
  CampaignType,
  CommanderState,
  LogEntry,
  MissionTemplate,
  Task,
  TaskCreateInput,
  TaskStatus,
  TaskType,
} from "../types";

const finalTaskStatuses: TaskStatus[] = [
  "ACCEPTED",
  "RETRY_REQUIRED",
  "PENALTY_APPLIED",
  "QUARANTINED",
  "FAILED",
  "CANCELLED",
];

const majorMissionTypes: TaskType[] = [
  "TREND_SCAN",
  "MARKET_SIGNAL",
  "ASSET_DRAFT",
  "LISTING_BLUEPRINT",
  "QUALITY_REVIEW",
  "SYSTEM_DIAGNOSTIC",
];

const roomAgentId: Record<Exclude<AssignedRoom, "AUTO_ASSIGN">, string> = {
  ORACLE: "oracle",
  FORGE: "forge",
  LEDGER: "ledger",
  JUDGE: "judge",
};

const nowIso = () => new Date().toISOString();

const makeId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const isFinalTask = (task: Task) => finalTaskStatuses.includes(task.status);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getLinkedTasks = (campaign: Campaign, tasks: Task[]) =>
  tasks.filter((task) => campaign.linkedTaskIds.includes(task.id));

const countStatus = (tasks: Task[], status: TaskStatus) =>
  tasks.filter((task) => task.status === status).length;

const getCompletedTasks = (tasks: Task[]) => tasks.filter(isFinalTask);

const getScoredTasks = (tasks: Task[]) =>
  tasks.filter((task) => typeof task.qualityScore === "number");

const averageScore = (tasks: Task[]) => {
  const scoredTasks = getScoredTasks(tasks);
  if (scoredTasks.length === 0) {
    return 0;
  }

  return Number(
    (
      scoredTasks.reduce((sum, task) => sum + (task.qualityScore ?? 0), 0) /
      scoredTasks.length
    ).toFixed(2),
  );
};

const acceptanceRate = (tasks: Task[]) => {
  const completedTasks = getCompletedTasks(tasks);
  if (completedTasks.length === 0) {
    return 0;
  }

  return Math.round(
    (countStatus(completedTasks, "ACCEPTED") / completedTasks.length) * 100,
  );
};

const bestAgent = (agents: Agent[]) =>
  [...agents].sort((a, b) => b.trustScore - a.trustScore)[0]?.name ?? "N/A";

const weakestAgent = (agents: Agent[]) =>
  [...agents].sort((a, b) => a.trustScore - b.trustScore)[0]?.name ?? "N/A";

const getAgentForRoom = (agents: Agent[], room: AssignedRoom) => {
  if (room === "AUTO_ASSIGN") {
    return undefined;
  }

  return agents.find((agent) => agent.id === roomAgentId[room]);
};

const statusFromTaskStatus = (status: TaskStatus): CampaignMissionStatus => {
  if (status === "IN_PROGRESS") {
    return "IN_PROGRESS";
  }

  if (status === "REVIEWING") {
    return "REVIEWING";
  }

  if (status === "QUEUED" || status === "ASSIGNED") {
    return "DEPLOYED";
  }

  return status;
};

const normalizeMissionStatus = (status: unknown): CampaignMissionStatus => {
  if (
    status === "PLANNED" ||
    status === "DEPLOYED" ||
    status === "IN_PROGRESS" ||
    status === "REVIEWING" ||
    status === "ACCEPTED" ||
    status === "RETRY_REQUIRED" ||
    status === "PENALTY_APPLIED" ||
    status === "QUARANTINED" ||
    status === "FAILED" ||
    status === "CANCELLED"
  ) {
    return status;
  }

  if (status === "PENDING") {
    return "PLANNED";
  }

  if (typeof status === "string") {
    return statusFromTaskStatus(status as TaskStatus);
  }

  return "PLANNED";
};

const normalizeCampaignType = (value: unknown): CampaignType =>
  campaignPresets.some((preset) => preset.type === value) || value === "CUSTOM"
    ? (value as CampaignType)
    : "CUSTOM";

const normalizeDoctrine = (value: unknown): CampaignDoctrine =>
  [
    "CONSERVATIVE",
    "BALANCED",
    "HIGH_THROUGHPUT",
    "QUALITY_FIRST",
    "RECOVERY_FIRST",
    "CHAOS_TEST",
  ].includes(String(value))
    ? (value as CampaignDoctrine)
    : "BALANCED";

const normalizeRiskLevel = (value: unknown): CampaignRiskLevel =>
  ["SAFE", "STANDARD", "AGGRESSIVE", "EXPERIMENTAL"].includes(String(value))
    ? (value as CampaignRiskLevel)
    : "STANDARD";

const createObjective = (
  input: Omit<
    CampaignObjective,
    "id" | "currentValue" | "completed" | "failed"
  >,
): CampaignObjective => ({
  id: makeId("objective"),
  ...input,
  currentValue: 0,
  completed: false,
  failed: false,
});

export const buildCampaignObjectives = (
  definitions: CampaignPreset["defaultObjectives"],
) => definitions.map((definition) => createObjective(definition));

const missionFromInput = (
  input: TaskCreateInput,
  templateId?: string,
  status: CampaignMissionStatus = "PLANNED",
): CampaignMission => ({
  id: makeId("campaign-mission"),
  templateId,
  title: input.title,
  type: input.type,
  priority: input.priority,
  difficulty: input.difficulty,
  assignedRoom: input.assignedRoom,
  status,
  linkedTaskIds: [],
  createdAt: nowIso(),
});

export const createCampaignFromPreset = (
  preset: CampaignPreset,
  overrides: Partial<Pick<Campaign, "name" | "description" | "notes">> = {},
): Campaign => ({
  id: makeId("campaign"),
  name: overrides.name?.trim() || preset.name,
  description: overrides.description?.trim() || preset.description,
  type: preset.type,
  doctrine: preset.doctrine,
  riskLevel: preset.riskLevel,
  recommendedAgentFocus: preset.recommendedAgentFocus,
  estimatedDurationCycles: preset.estimatedDurationCycles,
  successSummary: preset.successSummary,
  failureSummary: preset.failureSummary,
  briefingText: preset.briefingText,
  presetId: preset.id,
  status: "DRAFT",
  createdAt: nowIso(),
  missions: preset.suggestedMissions.map((mission) =>
    missionFromInput(mission, preset.id, "PLANNED"),
  ),
  objectives: buildCampaignObjectives(preset.defaultObjectives),
  linkedTaskIds: [],
  reports: [],
  notes: overrides.notes ?? `Campaign preset: ${preset.name}`,
});

const presetForObjectivePreset = (objectivePreset: CampaignCreateInput["objectivePreset"]) => {
  const mapping = campaignObjectivePresets.find(
    (candidate) => candidate.id === objectivePreset,
  );
  return (
    campaignPresets.find((preset) => preset.id === mapping?.presetId) ??
    campaignPresets[0]
  );
};

export const createCustomCampaign = (input: CampaignCreateInput): Campaign => {
  const basePreset = presetForObjectivePreset(input.objectivePreset);
  const riskLevel = normalizeRiskLevel(input.riskLevel ?? input.difficultyProfile);
  const type = normalizeCampaignType(input.type);
  const doctrine = normalizeDoctrine(input.doctrine);

  return {
    id: makeId("campaign"),
    name: input.name.trim(),
    description: input.description.trim(),
    type,
    doctrine,
    riskLevel,
    recommendedAgentFocus:
      type === "RECON"
        ? "ORACLE"
        : type === "PRODUCTION"
          ? "FORGE / LEDGER"
          : type === "QUALITY_AUDIT"
            ? "JUDGE"
            : type === "RECOVERY_DRILL"
              ? "Supervision"
              : "All rooms",
    estimatedDurationCycles:
      input.length === "SHORT" ? 16 : input.length === "LONG" ? 34 : 24,
    successSummary:
      "Custom operation plan completed its configured objective gates.",
    failureSummary:
      "Custom operation plan failed one or more configured objective gates.",
    briefingText:
      "Custom campaign doctrine configured locally. Add planned missions before deployment.",
    status: "DRAFT",
    createdAt: nowIso(),
    missions: [],
    objectives: buildCampaignObjectives(basePreset.defaultObjectives),
    linkedTaskIds: [],
    reports: [],
    notes: `Campaign type: ${type}\nDoctrine: ${doctrine}\nRisk level: ${riskLevel}\nCampaign length: ${input.length}`,
  };
};

export const createCampaign = (input: CampaignCreateInput): Campaign =>
  createCustomCampaign(input);

const withLog = (
  campaigns: Campaign[],
  logs: LogEntry[],
  source: string,
  message: string,
  severity: "INFO" | "SUCCESS" | "WARNING" | "CRITICAL" = "INFO",
) => ({
  campaigns,
  logs: [createLogEntry(source, message, severity), ...logs].slice(0, 100),
});

export const updateCampaignStatus = (
  campaigns: Campaign[],
  logs: LogEntry[],
  campaignId: string,
  status: CampaignStatus,
) => {
  let campaignName = "";
  const timestamp = nowIso();
  const nextCampaigns = campaigns.map((campaign) => {
    if (campaign.id !== campaignId) {
      return campaign;
    }

    campaignName = campaign.name;
    return {
      ...campaign,
      status,
      startedAt:
        status === "ACTIVE" && !campaign.startedAt
          ? timestamp
          : campaign.startedAt,
      completedAt:
        status === "COMPLETED" || status === "FAILED"
          ? timestamp
          : campaign.completedAt,
    };
  });

  return withLog(
    nextCampaigns,
    logs,
    "CAMPAIGN_CONTROL",
    `${campaignName || "Campaign"} status changed to ${status}.`,
    status === "FAILED"
      ? "CRITICAL"
      : status === "COMPLETED"
        ? "SUCCESS"
        : "INFO",
  );
};

export const archiveCampaign = (
  campaigns: Campaign[],
  logs: LogEntry[],
  campaignId: string,
) => updateCampaignStatus(campaigns, logs, campaignId, "ARCHIVED");

export const deleteCampaign = (campaigns: Campaign[], campaignId: string) =>
  campaigns.filter((campaign) => campaign.id !== campaignId);

export const updateCampaignNotes = (
  campaigns: Campaign[],
  campaignId: string,
  notes: string,
) =>
  campaigns.map((campaign) =>
    campaign.id === campaignId ? { ...campaign, notes } : campaign,
  );

export const addCampaignMission = (
  campaigns: Campaign[],
  campaignId: string,
  input: TaskCreateInput,
  templateId?: string,
) =>
  campaigns.map((campaign) => {
    if (campaign.id !== campaignId || campaign.status === "ARCHIVED") {
      return campaign;
    }

    return {
      ...campaign,
      missions: [missionFromInput(input, templateId, "PLANNED"), ...campaign.missions],
    };
  });

export const addCampaignMissionFromTemplate = (
  campaigns: Campaign[],
  campaignId: string,
  template: MissionTemplate,
) => addCampaignMission(campaigns, campaignId, template.task, template.id);

export const deployCampaignMission = (
  commanderState: CommanderState,
  campaigns: Campaign[],
  logs: LogEntry[],
  campaignId: string,
  missionId: string,
) => {
  const campaign = campaigns.find((candidate) => candidate.id === campaignId);
  const mission = campaign?.missions.find((candidate) => candidate.id === missionId);
  if (!campaign || !mission || campaign.status === "ARCHIVED") {
    return { commanderState, campaigns, logs };
  }

  const result = createMissionTaskWithResult(commanderState, {
    title: mission.title,
    type: mission.type,
    priority: mission.priority,
    difficulty: mission.difficulty,
    assignedRoom: mission.assignedRoom,
  });
  const timestamp = nowIso();

  const nextCampaigns = campaigns.map((candidate) => {
    if (candidate.id !== campaignId) {
      return candidate;
    }

    return {
      ...candidate,
      status: candidate.status === "DRAFT" ? "ACTIVE" : candidate.status,
      startedAt: candidate.startedAt ?? timestamp,
      linkedTaskIds: [...new Set([result.task.id, ...candidate.linkedTaskIds])],
      missions: candidate.missions.map((candidateMission) =>
        candidateMission.id === missionId
          ? {
              ...candidateMission,
              status: statusFromTaskStatus(result.task.status),
              deployedAt: timestamp,
              linkedTaskIds: [
                ...new Set([result.task.id, ...candidateMission.linkedTaskIds]),
              ],
            }
          : candidateMission,
      ),
    };
  });

  const deploymentLog = createLogEntry(
    "CAMPAIGN_CONTROL",
    `Planned mission deployed for ${campaign.type}: "${mission.title}" linked to task ${result.task.id}.`,
    "SUCCESS",
  );
  const nextLogs = [deploymentLog, ...result.state.logs].slice(0, 100);

  return {
    commanderState: {
      ...result.state,
      logs: nextLogs,
    },
    campaigns: nextCampaigns,
    logs: nextLogs,
  };
};

export const syncCampaignMissionsWithTasks = (
  campaign: Campaign,
  tasks: Task[],
): Campaign => ({
  ...campaign,
  missions: campaign.missions.map((mission) => {
    const linkedTasks = tasks.filter((task) => mission.linkedTaskIds.includes(task.id));
    const latestTask = linkedTasks[0];
    const finalTask = linkedTasks.find(isFinalTask);

    if (!latestTask) {
      return {
        ...mission,
        status: normalizeMissionStatus(mission.status),
      };
    }

    return {
      ...mission,
      status: statusFromTaskStatus(latestTask.status),
      completedAt: finalTask?.completedAt ?? mission.completedAt,
      finalStatus: finalTask?.status ?? mission.finalStatus,
    };
  }),
});

const taskTypeMatches = (task: Task, objective: CampaignObjective) => {
  if (objective.requiredTaskType) {
    return task.type === objective.requiredTaskType;
  }

  if (objective.requiredTaskTypes?.length) {
    return objective.requiredTaskTypes.includes(task.type);
  }

  return true;
};

const recoveryCount = (campaign: Campaign, tasks: Task[], agents: Agent[]) => {
  const lowScoreTasks = getLinkedTasks(campaign, tasks).filter(
    (task) =>
      task.status === "PENALTY_APPLIED" ||
      task.status === "QUARANTINED" ||
      task.status === "FAILED",
  );
  const recoveredRooms = new Set(
    lowScoreTasks
      .map((task) => getAgentForRoom(agents, task.assignedRoom))
      .filter((agent): agent is Agent => Boolean(agent))
      .filter((agent) => agent.status === "IDLE")
      .map((agent) => agent.id),
  );

  return recoveredRooms.size;
};

export const evaluateCampaignObjectives = (
  campaign: Campaign,
  tasks: Task[],
  agents: Agent[],
) => {
  const linkedTasks = getLinkedTasks(campaign, tasks);
  const completedTasks = getCompletedTasks(linkedTasks);
  const penalties = countStatus(linkedTasks, "PENALTY_APPLIED");
  const quarantines = countStatus(linkedTasks, "QUARANTINED");
  const failures =
    countStatus(linkedTasks, "FAILED") + countStatus(linkedTasks, "CANCELLED");
  const lowScoreEvents = penalties + quarantines + countStatus(linkedTasks, "FAILED");

  return campaign.objectives.map((objective) => {
    if (objective.type === "TASK_COUNT") {
      const acceptedOnly = objective.label.toLowerCase().includes("accepted");
      const currentValue = acceptedOnly
        ? countStatus(linkedTasks, "ACCEPTED")
        : completedTasks.length;
      return {
        ...objective,
        currentValue,
        completed: currentValue >= objective.targetValue,
        failed: false,
      };
    }

    if (objective.type === "ACCEPTANCE_RATE") {
      const currentValue = acceptanceRate(linkedTasks);
      return {
        ...objective,
        currentValue,
        completed: completedTasks.length > 0 && currentValue >= objective.targetValue,
        failed: false,
      };
    }

    if (objective.type === "AVERAGE_SCORE") {
      const currentValue = averageScore(linkedTasks);
      return {
        ...objective,
        currentValue,
        completed:
          getScoredTasks(linkedTasks).length > 0 &&
          currentValue >= objective.targetValue,
        failed: false,
      };
    }

    if (objective.type === "AGENT_TRUST") {
      const currentValue =
        agents.length === 0
          ? 0
          : Math.round(
              (agents.reduce((sum, agent) => sum + agent.trustScore, 0) /
                agents.length) *
                100,
            );
      return {
        ...objective,
        currentValue,
        completed: currentValue >= objective.targetValue,
        failed: currentValue < 45,
      };
    }

    if (objective.type === "NO_QUARANTINE") {
      return {
        ...objective,
        currentValue: quarantines,
        completed: quarantines === 0,
        failed: quarantines > 0,
      };
    }

    if (objective.type === "MAX_QUARANTINES") {
      return {
        ...objective,
        currentValue: quarantines,
        completed: quarantines <= objective.targetValue,
        failed: quarantines > objective.targetValue,
      };
    }

    if (
      objective.type === "MIN_PENALTIES_SURVIVED" ||
      objective.type === "RUNTIME_LIMIT"
    ) {
      const currentValue = objective.label.toLowerCase().includes("low-score")
        ? lowScoreEvents
        : penalties;
      return {
        ...objective,
        currentValue,
        completed: currentValue >= objective.targetValue,
        failed: false,
      };
    }

    if (objective.type === "TASK_TYPE_COMPLETION") {
      const currentValue = completedTasks.filter((task) =>
        taskTypeMatches(task, objective),
      ).length;
      return {
        ...objective,
        currentValue,
        completed: currentValue >= objective.targetValue,
        failed: false,
      };
    }

    if (objective.type === "SPECIFIC_MISSION_COMPLETION") {
      const requiredTypes = objective.requiredTaskTypes ?? majorMissionTypes;
      const completedTypes = new Set(completedTasks.map((task) => task.type));
      const currentValue = requiredTypes.filter((type) =>
        completedTypes.has(type),
      ).length;
      return {
        ...objective,
        currentValue,
        completed: currentValue >= Math.min(objective.targetValue, requiredTypes.length),
        failed: false,
      };
    }

    if (objective.type === "RECOVERY_COMPLETION") {
      const currentValue = recoveryCount(campaign, tasks, agents);
      return {
        ...objective,
        currentValue,
        completed: currentValue >= objective.targetValue,
        failed: false,
      };
    }

    if (objective.type === "NO_FAILED_TASKS") {
      return {
        ...objective,
        currentValue: failures,
        completed: failures === 0,
        failed: failures > 0,
      };
    }

    return objective;
  });
};

export const shouldAutoCompleteCampaign = (campaign: Campaign) =>
  campaign.objectives.length > 0 &&
  campaign.objectives.every((objective) => objective.completed) &&
  campaign.status !== "COMPLETED" &&
  campaign.status !== "FAILED" &&
  campaign.status !== "ARCHIVED";

export const shouldAutoFailCampaign = (campaign: Campaign) =>
  campaign.objectives.some((objective) => objective.failed || objective.hardFail === true && objective.failed) &&
  campaign.status !== "FAILED" &&
  campaign.status !== "COMPLETED" &&
  campaign.status !== "ARCHIVED";

export const syncCampaignsWithTasks = (
  campaigns: Campaign[],
  tasks: Task[],
  agents: Agent[],
  logs: LogEntry[],
) => {
  const nextLogs: LogEntry[] = [];
  const nextCampaigns = campaigns.map((campaign) => {
    const withMissions = syncCampaignMissionsWithTasks(campaign, tasks);
    if (withMissions.status === "ARCHIVED") {
      return withMissions;
    }

    const objectives = evaluateCampaignObjectives(withMissions, tasks, agents);
    const completedObjectives = objectives.filter((objective) => {
      const previous = withMissions.objectives.find(
        (candidate) => candidate.id === objective.id,
      );
      return objective.completed && !previous?.completed;
    });
    completedObjectives.forEach((objective) => {
      nextLogs.push(
        createLogEntry(
          "CAMPAIGN_CONTROL",
          `${withMissions.type} objective completed for "${withMissions.name}": ${objective.label}.`,
          "SUCCESS",
        ),
      );
    });

    const evaluatedCampaign = {
      ...withMissions,
      objectives,
    };
    let status = evaluatedCampaign.status;
    let completedAt = evaluatedCampaign.completedAt;

    if (shouldAutoFailCampaign(evaluatedCampaign)) {
      status = "FAILED";
      completedAt = completedAt ?? nowIso();
      nextLogs.push(
        createLogEntry(
          "CAMPAIGN_CONTROL",
          `Campaign auto-failed objective gate: "${evaluatedCampaign.name}".`,
          "CRITICAL",
        ),
      );
    } else if (shouldAutoCompleteCampaign(evaluatedCampaign)) {
      status = "COMPLETED";
      completedAt = completedAt ?? nowIso();
      nextLogs.push(
        createLogEntry(
          "CAMPAIGN_CONTROL",
          `Campaign auto-completed objectives: "${evaluatedCampaign.name}".`,
          "SUCCESS",
        ),
      );
    }

    return {
      ...evaluatedCampaign,
      status,
      completedAt,
    };
  });

  return {
    campaigns: nextCampaigns,
    logs: [...nextLogs, ...logs].slice(0, 100),
  };
};

const collectEventHighlights = (logs: LogEntry[], campaign: Campaign) =>
  logs
    .filter(
      (log) =>
        log.message.includes(campaign.name) ||
        campaign.missions.some((mission) => log.message.includes(mission.title)),
    )
    .slice(0, 8)
    .map((log) => `[${log.timestamp}] ${log.source}: ${log.message}`);

export const generateCampaignReport = (
  campaigns: Campaign[],
  campaignId: string,
  state: CommanderState,
) =>
  campaigns.map((campaign) => {
    if (campaign.id !== campaignId) {
      return campaign;
    }

    const linkedTasks = getLinkedTasks(campaign, state.tasks);
    const completedTasks = getCompletedTasks(linkedTasks);
    const score = averageScore(linkedTasks);
    const accepted = countStatus(linkedTasks, "ACCEPTED");
    const retries = countStatus(linkedTasks, "RETRY_REQUIRED");
    const penalties = countStatus(linkedTasks, "PENALTY_APPLIED");
    const quarantines = countStatus(linkedTasks, "QUARANTINED");
    const failures =
      countStatus(linkedTasks, "FAILED") + countStatus(linkedTasks, "CANCELLED");
    const rate = acceptanceRate(linkedTasks);
    const report: CampaignReport = {
      id: makeId("campaign-report"),
      campaignId: campaign.id,
      title: `${campaign.name} Report`,
      generatedAt: nowIso(),
      summary: `${campaign.name} finished as a ${campaign.type} operation plan with ${completedTasks.length} completed linked tasks, ${accepted} accepted outputs, ${penalties} penalty protocol events, and an acceptance rate of ${rate}%.`,
      finalStatus: campaign.status,
      tasksCreated: linkedTasks.length,
      tasksAccepted: accepted,
      tasksRetried: retries,
      penaltiesApplied: penalties,
      quarantinesTriggered: quarantines,
      failures,
      averageScore: score,
      acceptanceRate: rate,
      bestAgent: bestAgent(state.agents),
      weakestAgent: weakestAgent(state.agents),
      eventHighlights: collectEventHighlights(state.logs, campaign),
      campaignType: campaign.type,
      doctrine: campaign.doctrine,
      riskLevel: campaign.riskLevel,
      objectiveResults: campaign.objectives.map((objective) => ({
        label: objective.label,
        currentValue: objective.currentValue,
        targetValue: objective.targetValue,
        completed: objective.completed,
        failed: objective.failed,
      })),
    };

    return {
      ...campaign,
      reports: [report, ...campaign.reports],
    };
  });

export const formatCampaignReportText = (
  report: CampaignReport,
  campaign?: Campaign,
) => [
  report.title,
  "",
  `Campaign: ${campaign?.name ?? report.campaignId}`,
  `Type: ${campaign?.type ?? report.campaignType ?? "CUSTOM"}`,
  `Doctrine: ${campaign?.doctrine ?? report.doctrine ?? "BALANCED"}`,
  `Risk level: ${campaign?.riskLevel ?? report.riskLevel ?? "STANDARD"}`,
  `Final status: ${report.finalStatus}`,
  `Generated: ${new Date(report.generatedAt).toLocaleString()}`,
  `Started: ${campaign?.startedAt ? new Date(campaign.startedAt).toLocaleString() : "PENDING"}`,
  `Completed: ${campaign?.completedAt ? new Date(campaign.completedAt).toLocaleString() : "PENDING"}`,
  "",
  report.summary,
  "",
  `Recommended agent focus: ${campaign?.recommendedAgentFocus ?? "N/A"}`,
  `Estimated duration cycles: ${campaign?.estimatedDurationCycles ?? 0}`,
  `Total missions: ${campaign?.missions.length ?? 0}`,
  `Planned missions: ${campaign?.missions.filter((mission) => mission.status === "PLANNED").length ?? 0}`,
  `Deployed missions: ${campaign?.missions.filter((mission) => mission.linkedTaskIds.length > 0).length ?? 0}`,
  `Total linked tasks: ${campaign?.linkedTaskIds.length ?? report.tasksCreated}`,
  `Tasks created: ${report.tasksCreated}`,
  `Accepted: ${report.tasksAccepted}`,
  `Retry required: ${report.tasksRetried}`,
  `Penalty protocol events: ${report.penaltiesApplied}`,
  `Quarantines: ${report.quarantinesTriggered}`,
  `Failures/cancellations: ${report.failures}`,
  `Average score: ${report.averageScore.toFixed(2)}`,
  `Acceptance rate: ${report.acceptanceRate}%`,
  `Best agent: ${report.bestAgent}`,
  `Weakest agent: ${report.weakestAgent}`,
  "",
  "Objective results:",
  ...(campaign?.objectives.map(
    (objective) =>
      `- ${objective.label}: ${objective.currentValue}/${objective.targetValue} ${
        objective.completed ? "complete" : objective.failed ? "failed" : "open"
      }`,
  ) ??
    report.objectiveResults?.map(
      (objective) =>
        `- ${objective.label}: ${objective.currentValue}/${objective.targetValue} ${
          objective.completed ? "complete" : objective.failed ? "failed" : "open"
        }`,
    ) ?? ["- No campaign objective snapshot available."]),
  "",
  "Event highlights:",
  ...(report.eventHighlights.length > 0
    ? report.eventHighlights.map((highlight) => `- ${highlight}`)
    : ["- No campaign-specific highlights captured."]),
].join("\n");

export const reportToJson = (report: CampaignReport) =>
  JSON.stringify(report, null, 2);

export const downloadTextFile = (
  filename: string,
  contents: string,
  mimeType: string,
) => {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const templateById = (templateId?: string) =>
  missionTemplates.find((template) => template.id === templateId);

export const calculateCampaignProgress = (campaign: Campaign) => {
  if (campaign.objectives.length === 0) {
    return 0;
  }

  const objectiveProgress = campaign.objectives.reduce((sum, objective) => {
    if (objective.failed) {
      return sum;
    }

    if (objective.completed) {
      return sum + 1;
    }

    return (
      sum +
      clamp(objective.currentValue / Math.max(objective.targetValue, 1), 0, 1)
    );
  }, 0);

  return Math.round((objectiveProgress / campaign.objectives.length) * 100);
};

export const campaignProgress = calculateCampaignProgress;

export const getCampaignStatusBadgeStyle = (status: CampaignStatus) => {
  const styles: Record<CampaignStatus, string> = {
    DRAFT: "border-slate-500/30 bg-slate-500/10 text-slate-300",
    ACTIVE: "border-command-cyan/40 bg-command-cyan/10 text-command-cyan",
    PAUSED: "border-command-amber/40 bg-command-amber/10 text-command-amber",
    COMPLETED: "border-command-green/40 bg-command-green/10 text-command-green",
    FAILED: "border-command-red/40 bg-command-red/10 text-command-red",
    ARCHIVED:
      "border-command-violet/40 bg-command-violet/10 text-command-violet",
  };
  return styles[status];
};

export const getCampaignTypeLabel = (type: CampaignType) =>
  type
    .split("_")
    .map((part) => part[0] + part.slice(1).toLowerCase())
    .join(" ");

export const getCampaignRiskLabel = (riskLevel: CampaignRiskLevel) =>
  riskLevel
    .split("_")
    .map((part) => part[0] + part.slice(1).toLowerCase())
    .join(" ");

const sanitizeMission = (mission: unknown): CampaignMission => {
  const record = isRecord(mission) ? mission : {};
  return {
    id: typeof record.id === "string" ? record.id : makeId("campaign-mission"),
    templateId:
      typeof record.templateId === "string" ? record.templateId : undefined,
    title: typeof record.title === "string" ? record.title : "Migrated mission",
    type: (typeof record.type === "string" ? record.type : "TREND_SCAN") as TaskType,
    priority: (typeof record.priority === "string"
      ? record.priority
      : "MEDIUM") as CampaignMission["priority"],
    difficulty: (typeof record.difficulty === "string"
      ? record.difficulty
      : "NORMAL") as CampaignMission["difficulty"],
    assignedRoom: (typeof record.assignedRoom === "string"
      ? record.assignedRoom
      : "AUTO_ASSIGN") as AssignedRoom,
    status: normalizeMissionStatus(record.status),
    linkedTaskIds: Array.isArray(record.linkedTaskIds)
      ? record.linkedTaskIds.filter((id): id is string => typeof id === "string")
      : [],
    createdAt: typeof record.createdAt === "string" ? record.createdAt : nowIso(),
    completedAt:
      typeof record.completedAt === "string" ? record.completedAt : undefined,
    deployedAt:
      typeof record.deployedAt === "string" ? record.deployedAt : undefined,
    finalStatus:
      typeof record.finalStatus === "string"
        ? (record.finalStatus as TaskStatus)
        : undefined,
  };
};

const sanitizeObjective = (objective: unknown): CampaignObjective => {
  const record = isRecord(objective) ? objective : {};
  return {
    id: typeof record.id === "string" ? record.id : makeId("objective"),
    type: (typeof record.type === "string"
      ? record.type
      : "TASK_COUNT") as CampaignObjective["type"],
    label: typeof record.label === "string" ? record.label : "Migrated objective",
    targetValue:
      typeof record.targetValue === "number" ? record.targetValue : 1,
    currentValue:
      typeof record.currentValue === "number" ? record.currentValue : 0,
    completed: Boolean(record.completed),
    failed: Boolean(record.failed),
    description:
      typeof record.description === "string"
        ? record.description
        : "Migrated objective from older local storage.",
    requiredTaskType:
      typeof record.requiredTaskType === "string"
        ? (record.requiredTaskType as TaskType)
        : undefined,
    requiredTaskTypes: Array.isArray(record.requiredTaskTypes)
      ? record.requiredTaskTypes.filter(
          (type): type is TaskType => typeof type === "string",
        )
      : undefined,
    hardFail: Boolean(record.hardFail),
  };
};

const sanitizeReport = (report: unknown): CampaignReport => {
  const record = isRecord(report) ? report : {};
  return {
    id: typeof record.id === "string" ? record.id : makeId("campaign-report"),
    campaignId: typeof record.campaignId === "string" ? record.campaignId : "",
    title: typeof record.title === "string" ? record.title : "Migrated Report",
    generatedAt:
      typeof record.generatedAt === "string" ? record.generatedAt : nowIso(),
    summary: typeof record.summary === "string" ? record.summary : "",
    finalStatus: (typeof record.finalStatus === "string"
      ? record.finalStatus
      : "DRAFT") as CampaignStatus,
    tasksCreated:
      typeof record.tasksCreated === "number" ? record.tasksCreated : 0,
    tasksAccepted:
      typeof record.tasksAccepted === "number" ? record.tasksAccepted : 0,
    tasksRetried:
      typeof record.tasksRetried === "number" ? record.tasksRetried : 0,
    penaltiesApplied:
      typeof record.penaltiesApplied === "number" ? record.penaltiesApplied : 0,
    quarantinesTriggered:
      typeof record.quarantinesTriggered === "number"
        ? record.quarantinesTriggered
        : 0,
    failures: typeof record.failures === "number" ? record.failures : 0,
    averageScore:
      typeof record.averageScore === "number" ? record.averageScore : 0,
    acceptanceRate:
      typeof record.acceptanceRate === "number" ? record.acceptanceRate : 0,
    bestAgent: typeof record.bestAgent === "string" ? record.bestAgent : "N/A",
    weakestAgent:
      typeof record.weakestAgent === "string" ? record.weakestAgent : "N/A",
    eventHighlights: Array.isArray(record.eventHighlights)
      ? record.eventHighlights.filter(
          (highlight): highlight is string => typeof highlight === "string",
        )
      : [],
    campaignType: normalizeCampaignType(record.campaignType),
    doctrine: normalizeDoctrine(record.doctrine),
    riskLevel: normalizeRiskLevel(record.riskLevel),
    objectiveResults: Array.isArray(record.objectiveResults)
      ? record.objectiveResults.filter(isRecord).map((objective) => ({
          label:
            typeof objective.label === "string"
              ? objective.label
              : "Migrated objective",
          currentValue:
            typeof objective.currentValue === "number"
              ? objective.currentValue
              : 0,
          targetValue:
            typeof objective.targetValue === "number"
              ? objective.targetValue
              : 0,
          completed: Boolean(objective.completed),
          failed: Boolean(objective.failed),
        }))
      : undefined,
  };
};

export const migrateCampaigns = (value: unknown) => {
  if (!Array.isArray(value)) {
    return { campaigns: [] as Campaign[], migrated: false };
  }

  let migrated = false;
  const campaigns = value.filter(isRecord).map((record) => {
    const hadNewShape =
      typeof record.type === "string" &&
      typeof record.doctrine === "string" &&
      typeof record.riskLevel === "string";
    if (!hadNewShape) {
      migrated = true;
    }

    const type = normalizeCampaignType(record.type);
    const doctrine = normalizeDoctrine(record.doctrine);
    const riskLevel = normalizeRiskLevel(record.riskLevel);

    return {
      id: typeof record.id === "string" ? record.id : makeId("campaign"),
      name: typeof record.name === "string" ? record.name : "Migrated Campaign",
      description:
        typeof record.description === "string" ? record.description : "",
      type,
      doctrine,
      riskLevel,
      recommendedAgentFocus:
        typeof record.recommendedAgentFocus === "string"
          ? record.recommendedAgentFocus
          : type === "CUSTOM"
            ? "Manual configuration"
            : "All rooms",
      estimatedDurationCycles:
        typeof record.estimatedDurationCycles === "number"
          ? record.estimatedDurationCycles
          : 24,
      successSummary:
        typeof record.successSummary === "string"
          ? record.successSummary
          : "Campaign objectives completed.",
      failureSummary:
        typeof record.failureSummary === "string"
          ? record.failureSummary
          : "Campaign failed an objective gate.",
      briefingText:
        typeof record.briefingText === "string"
          ? record.briefingText
          : "Migrated local campaign. Review doctrine and planned missions.",
      presetId: typeof record.presetId === "string" ? record.presetId : undefined,
      status: (typeof record.status === "string"
        ? record.status
        : "DRAFT") as CampaignStatus,
      createdAt: typeof record.createdAt === "string" ? record.createdAt : nowIso(),
      startedAt:
        typeof record.startedAt === "string" ? record.startedAt : undefined,
      completedAt:
        typeof record.completedAt === "string" ? record.completedAt : undefined,
      missions: Array.isArray(record.missions)
        ? record.missions.map(sanitizeMission)
        : [],
      objectives: Array.isArray(record.objectives)
        ? record.objectives.map(sanitizeObjective)
        : [],
      linkedTaskIds: Array.isArray(record.linkedTaskIds)
        ? record.linkedTaskIds.filter((id): id is string => typeof id === "string")
        : [],
      reports: Array.isArray(record.reports)
        ? record.reports.map(sanitizeReport)
        : [],
      notes: typeof record.notes === "string" ? record.notes : "",
    } satisfies Campaign;
  });

  return { campaigns, migrated };
};
