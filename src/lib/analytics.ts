import { campaignDoctrines, campaignRiskLevels, campaignTypes } from "../data/campaignPresets";
import type {
  AnalyticsSnapshot,
  Campaign,
  CampaignDoctrine,
  CampaignRiskLevel,
  CampaignStatus,
  CampaignType,
  CommanderState,
  Task,
  TaskStatus,
} from "../types";

const finalStatuses: TaskStatus[] = [
  "ACCEPTED",
  "RETRY_REQUIRED",
  "PENALTY_APPLIED",
  "QUARANTINED",
  "FAILED",
  "CANCELLED",
];

const countStatus = (state: CommanderState, status: TaskStatus) =>
  state.tasks.filter((task) => task.status === status).length;

const percent = (value: number, total: number) =>
  total === 0 ? 0 : Math.round((value / total) * 100);

const linkedTasksForCampaign = (state: CommanderState, campaign: Campaign) =>
  state.tasks.filter((task) => campaign.linkedTaskIds.includes(task.id));

const completedTasks = (tasks: Task[]) =>
  tasks.filter((task) => finalStatuses.includes(task.status));

const acceptedCount = (tasks: Task[]) =>
  tasks.filter((task) => task.status === "ACCEPTED").length;

const penaltyExposure = (tasks: Task[]) =>
  tasks.filter(
    (task) =>
      task.status === "PENALTY_APPLIED" ||
      task.status === "QUARANTINED" ||
      task.status === "FAILED",
  ).length;

const averageScore = (tasks: Task[]) => {
  const scoredTasks = completedTasks(tasks).filter(
    (task) => typeof task.qualityScore === "number",
  );
  if (scoredTasks.length === 0) {
    return 0;
  }

  return Math.round(
    (scoredTasks.reduce((sum, task) => sum + (task.qualityScore ?? 0), 0) /
      scoredTasks.length) *
      100,
  );
};

const campaignAcceptanceRate = (state: CommanderState, campaign: Campaign) => {
  const linkedTasks = completedTasks(linkedTasksForCampaign(state, campaign));
  return percent(acceptedCount(linkedTasks), linkedTasks.length);
};

const campaignTone = (index: number) =>
  ["cyan", "violet", "green", "amber", "red", "slate"][index % 6];

const distribution = <T extends string>(
  values: T[],
  campaigns: Campaign[],
  picker: (campaign: Campaign) => T,
) =>
  values.map((value, index) => ({
    label: value,
    value: campaigns.filter((campaign) => picker(campaign) === value).length,
    tone: campaignTone(index),
  }));

const typeCompletionRate = (
  state: CommanderState,
  campaigns: Campaign[],
  type: CampaignType,
) => {
  const campaignsForType = campaigns.filter((campaign) => campaign.type === type);
  if (campaignsForType.length === 0) {
    return 0;
  }

  return percent(
    campaignsForType.filter((campaign) => campaign.status === "COMPLETED")
      .length,
    campaignsForType.length,
  );
};

const typeAverageScore = (
  state: CommanderState,
  campaigns: Campaign[],
  type: CampaignType,
) => {
  const linkedTasks = campaigns
    .filter((campaign) => campaign.type === type)
    .flatMap((campaign) => linkedTasksForCampaign(state, campaign));

  return averageScore(linkedTasks);
};

export const createAnalyticsSnapshot = (
  state: CommanderState,
  campaigns: Campaign[] = [],
): AnalyticsSnapshot => {
  const completed = completedTasks(state.tasks);
  const scoredTasks = completed.filter(
    (task) => typeof task.qualityScore === "number",
  );
  const accepted = countStatus(state, "ACCEPTED");
  const retryCount = countStatus(state, "RETRY_REQUIRED");
  const penaltyCount = countStatus(state, "PENALTY_APPLIED");
  const quarantineCount = countStatus(state, "QUARANTINED");
  const failedCount = countStatus(state, "FAILED");
  const cancelledCount = countStatus(state, "CANCELLED");
  const averageOutputScore =
    scoredTasks.length === 0
      ? 0
      : Number(
          (
            scoredTasks.reduce(
              (sum, task) => sum + (task.qualityScore ?? 0),
              0,
            ) / scoredTasks.length
          ).toFixed(2),
        );
  const mostReliableAgent =
    [...state.agents].sort((a, b) => b.trustScore - a.trustScore)[0]?.name ??
    "N/A";
  const mostOverloadedAgent =
    [...state.agents].sort((a, b) => b.workload - a.workload)[0]?.name ?? "N/A";

  const campaignAcceptanceRates = campaigns.map((campaign) => {
    const linkedTasks = linkedTasksForCampaign(state, campaign);
    return {
      name: campaign.name,
      presetId: campaign.presetId ?? campaign.name,
      rate: campaignAcceptanceRate(state, campaign),
      penalties: penaltyExposure(linkedTasks),
    };
  });
  const averageCampaignAcceptanceRate =
    campaignAcceptanceRates.length === 0
      ? 0
      : Math.round(
          campaignAcceptanceRates.reduce(
            (sum, campaign) => sum + campaign.rate,
            0,
          ) / campaignAcceptanceRates.length,
        );
  const bestCampaignByAcceptanceRate =
    [...campaignAcceptanceRates].sort((a, b) => b.rate - a.rate)[0]?.name ??
    "N/A";
  const campaignWithMostPenalties =
    [...campaignAcceptanceRates].sort((a, b) => b.penalties - a.penalties)[0]
      ?.name ?? "N/A";
  const bestPerformingCampaignPreset =
    [...campaignAcceptanceRates].sort((a, b) => b.rate - a.rate)[0]?.presetId ??
    "N/A";
  const riskiestCampaignPreset =
    [...campaignAcceptanceRates].sort((a, b) => b.penalties - a.penalties)[0]
      ?.presetId ?? "N/A";
  const campaignStatusDistribution: Array<{
    label: CampaignStatus;
    value: number;
    tone: "green" | "amber" | "red" | "violet" | "cyan" | "slate";
  }> = [
    {
      label: "DRAFT",
      value: campaigns.filter((campaign) => campaign.status === "DRAFT").length,
      tone: "slate",
    },
    {
      label: "ACTIVE",
      value: campaigns.filter((campaign) => campaign.status === "ACTIVE").length,
      tone: "cyan",
    },
    {
      label: "PAUSED",
      value: campaigns.filter((campaign) => campaign.status === "PAUSED").length,
      tone: "amber",
    },
    {
      label: "COMPLETED",
      value: campaigns.filter((campaign) => campaign.status === "COMPLETED")
        .length,
      tone: "green",
    },
    {
      label: "FAILED",
      value: campaigns.filter((campaign) => campaign.status === "FAILED").length,
      tone: "red",
    },
    {
      label: "ARCHIVED",
      value: campaigns.filter((campaign) => campaign.status === "ARCHIVED")
        .length,
      tone: "violet",
    },
  ];

  return {
    totalTasksCreated: state.tasks.length,
    acceptedCount: accepted,
    retryCount,
    penaltyCount,
    quarantineCount,
    failedCount,
    cancelledCount,
    acceptanceRate: percent(accepted, completed.length),
    averageOutputScore,
    mostReliableAgent,
    mostOverloadedAgent,
    resultDistribution: [
      { label: "Accepted", value: accepted, tone: "green" },
      { label: "Retry", value: retryCount, tone: "amber" },
      { label: "Penalty", value: penaltyCount, tone: "red" },
      { label: "Quarantine", value: quarantineCount, tone: "violet" },
      { label: "Failed", value: failedCount, tone: "red" },
      { label: "Cancelled", value: cancelledCount, tone: "slate" },
    ],
    agentTrustScores: state.agents.map((agent) => ({
      agentName: agent.name,
      value: Math.round(agent.trustScore * 100),
    })),
    agentRuntimeQuotas: state.agents.map((agent) => ({
      agentName: agent.name,
      value: agent.runtimeQuota,
    })),
    agentWorkloads: state.agents.map((agent) => ({
      agentName: agent.name,
      value: agent.workload,
    })),
    totalCampaigns: campaigns.length,
    activeCampaigns: campaigns.filter((campaign) => campaign.status === "ACTIVE")
      .length,
    completedCampaigns: campaigns.filter(
      (campaign) => campaign.status === "COMPLETED",
    ).length,
    failedCampaigns: campaigns.filter((campaign) => campaign.status === "FAILED")
      .length,
    averageCampaignAcceptanceRate,
    bestCampaignByAcceptanceRate,
    campaignWithMostPenalties,
    campaignStatusDistribution,
    campaignsByType: distribution<CampaignType>(
      campaignTypes,
      campaigns,
      (campaign) => campaign.type,
    ),
    campaignsByRiskLevel: distribution<CampaignRiskLevel>(
      campaignRiskLevels,
      campaigns,
      (campaign) => campaign.riskLevel,
    ),
    campaignsByDoctrine: distribution<CampaignDoctrine>(
      campaignDoctrines,
      campaigns,
      (campaign) => campaign.doctrine,
    ),
    completionRateByCampaignType: campaignTypes.map((type, index) => ({
      label: type,
      value: typeCompletionRate(state, campaigns, type),
      tone: campaignTone(index),
    })),
    averageScoreByCampaignType: campaignTypes.map((type, index) => ({
      label: type,
      value: typeAverageScore(state, campaigns, type),
      tone: campaignTone(index),
    })),
    bestPerformingCampaignPreset,
    riskiestCampaignPreset,
    activeCampaignsByType: campaignTypes.map((type, index) => ({
      label: type,
      value: campaigns.filter(
        (campaign) => campaign.type === type && campaign.status === "ACTIVE",
      ).length,
      tone: campaignTone(index),
    })),
    failedCampaignsByType: campaignTypes.map((type, index) => ({
      label: type,
      value: campaigns.filter(
        (campaign) => campaign.type === type && campaign.status === "FAILED",
      ).length,
      tone: campaignTone(index),
    })),
  };
};
