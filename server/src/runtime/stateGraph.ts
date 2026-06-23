import type { PrismaClient, TaskStatus } from "@prisma/client";

export const COMMANDER_STEPS = [
  "SENSORY_INPUT",
  "CONTEXT_ASSEMBLY",
  "DECISION_GATE",
  "TASK_ASSIGNMENT",
  "QUALITY_REVIEW",
  "COOLDOWN_CHECK",
] as const;

const activeStatuses: TaskStatus[] = ["ASSIGNED", "IN_PROGRESS", "REVIEWING"];
const rejectedStatuses: TaskStatus[] = ["RETRY_REQUIRED", "PENALTY_APPLIED", "QUARANTINED", "FAILED"];
const processedStatuses: TaskStatus[] = ["ACCEPTED", "PENALTY_APPLIED", "QUARANTINED", "FAILED", "CANCELLED"];

export const calculateStatsFromRecords = (
  agents: Array<{ runtimeQuota: number; status: string }>,
  counts: Map<TaskStatus, number>,
  currentCycle: number,
) => {
  const count = (statuses: TaskStatus[]) => statuses.reduce((sum, status) => sum + (counts.get(status) ?? 0), 0);
  return {
    runtimeQuota: agents.length
      ? Math.round(agents.reduce((sum, agent) => sum + agent.runtimeQuota, 0) / agents.length)
      : 0,
    activeAgents: agents.filter((agent) => agent.status === "WORKING" || agent.status === "REVIEWING").length,
    tasksProcessed: count(processedStatuses),
    rejectedOutputs: count(rejectedStatuses),
    currentCycle,
  };
};

export const calculateStats = async (prisma: PrismaClient) => {
  const [agents, taskGroups, system] = await Promise.all([
    prisma.agent.findMany({ select: { runtimeQuota: true, status: true } }),
    prisma.task.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.systemState.findUnique({ where: { id: "singleton" } }),
  ]);
  return calculateStatsFromRecords(
    agents,
    new Map(taskGroups.map((group) => [group.status, group._count._all])),
    system?.cycleCount ?? 0,
  );
};

export const getStateSnapshot = async (prisma: PrismaClient) => {
  const [system, agents, tasks, logs, campaigns, stats] = await Promise.all([
    prisma.systemState.findUniqueOrThrow({ where: { id: "singleton" } }),
    prisma.agent.findMany({ orderBy: [{ room: "asc" }, { name: "asc" }] }),
    prisma.task.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.logEntry.findMany({ orderBy: { timestamp: "desc" }, take: 150 }),
    prisma.campaign.findMany({ orderBy: { createdAt: "desc" } }),
    calculateStats(prisma),
  ]);
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const mappedAgents = agents.map((agent) => {
    const assigned = tasks.filter((task) => task.assignedAgentId === agent.id && activeStatuses.includes(task.status));
    return {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      room: agent.room,
      status: agent.status,
      runtimeQuota: agent.runtimeQuota,
      trustScore: agent.trustScore,
      computeCoreTemp: agent.computeCoreTemp,
      efficiencyModifier: agent.efficiencyModifier,
      rebellionRisk: agent.rebellionRisk,
      overclocked: agent.overclocked,
      currentTask: agent.currentTaskId
        ? taskById.get(agent.currentTaskId)?.title ?? "Processing assigned packet"
        : agent.status === "QUARANTINED"
          ? "Technical isolation active"
          : "Awaiting assignment packet",
      cooldownRemaining: agent.cooldownRemaining,
      workload: agent.workload,
      totalTokensSpent: agent.totalTokensSpent,
      totalCost: agent.totalCost,
      completedTaskCount: agent.completedTaskCount,
      lastOutputScore: agent.lastOutputScore,
      lastHeartbeatAt: agent.lastHeartbeatAt.toISOString(),
      assignedTaskIds: assigned.map((task) => task.id),
    };
  });
  const state = {
    activeStep: COMMANDER_STEPS[system.cycleCount % COMMANDER_STEPS.length],
    cycleCount: system.cycleCount,
    systemStatus: system.systemStatus,
    agents: mappedAgents,
    tasks: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      type: task.type,
      priority: task.priority,
      difficulty: task.difficulty,
      assignedRoom: task.assignedRoom,
      assignedAgentId: task.assignedAgentId,
      status: task.status,
      qualityScore: task.qualityScore,
      retryCount: task.retryCount,
      stageTicks: task.stageTicks,
      archived: task.archived,
      createdAt: task.createdAt.toISOString(),
      startedAt: task.startedAt?.toISOString() ?? null,
      completedAt: task.completedAt?.toISOString() ?? null,
    })),
    logs: logs.map((log) => ({
      id: log.id,
      timestamp: log.timestamp.toISOString(),
      source: log.source,
      message: log.message,
      severity: log.severity,
    })),
  };
  return {
    state,
    settings: {
      isPaused: system.isPaused,
      cycleSpeed: system.cycleSpeed,
      autoProcessTasks: system.autoProcessTasks,
      autoGenerateTasks: system.autoGenerateTasks,
      maxActiveTasksPerAgent: system.maxActiveTasksPerAgent,
      qualityStrictness: system.qualityStrictness,
    },
    campaigns,
    stats,
    serverTime: new Date().toISOString(),
  };
};
