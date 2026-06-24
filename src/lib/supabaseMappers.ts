import type { Agent as UiAgent, AssignedRoom, LogEntry, StationRoom, Task as UiTask, TaskCreateInput, TaskDifficulty, TaskPriority, TaskType } from "../types";
import type { Agent, AgentLog, Json, Task } from "../types/database";
import type { CreateTaskInput } from "../services/taskService";

const roomToUi: Record<string, StationRoom> = {
  STRATEGY_ROOM: "ORACLE",
  PRODUCTION_ROOM: "FORGE",
  COMMERCE_ROOM: "LEDGER",
  REVIEW_ROOM: "JUDGE",
  ORACLE: "ORACLE",
  FORGE: "FORGE",
  LEDGER: "LEDGER",
  JUDGE: "JUDGE",
};

const roomToDatabase: Record<StationRoom, string> = {
  ORACLE: "STRATEGY_ROOM",
  FORGE: "PRODUCTION_ROOM",
  LEDGER: "COMMERCE_ROOM",
  JUDGE: "REVIEW_ROOM",
};

const roomByTaskType: Record<TaskType, StationRoom> = {
  TREND_SCAN: "ORACLE",
  MARKET_SIGNAL: "ORACLE",
  ASSET_DRAFT: "FORGE",
  LISTING_BLUEPRINT: "LEDGER",
  QUALITY_REVIEW: "JUDGE",
  SYSTEM_DIAGNOSTIC: "JUDGE",
};

const priorityToNumber: Record<TaskPriority, number> = { CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4 };
const numberToPriority: Record<number, TaskPriority> = { 1: "CRITICAL", 2: "HIGH", 3: "MEDIUM", 4: "LOW" };
const taskTypes = new Set<TaskType>(["TREND_SCAN", "ASSET_DRAFT", "LISTING_BLUEPRINT", "QUALITY_REVIEW", "MARKET_SIGNAL", "SYSTEM_DIAGNOSTIC"]);
const difficulties = new Set<TaskDifficulty>(["EASY", "NORMAL", "HARD", "EXTREME"]);

const objectPayload = (payload: Json): Record<string, Json | undefined> =>
  payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};

export const toDatabaseRoom = (room: AssignedRoom, type?: TaskType) => {
  const resolved = room === "AUTO_ASSIGN" ? roomByTaskType[type ?? "SYSTEM_DIAGNOSTIC"] : room;
  return roomToDatabase[resolved];
};

export const toUiRoom = (room: string): StationRoom => roomToUi[room] ?? "JUDGE";

export const mapTaskCreateInput = (input: TaskCreateInput): CreateTaskInput => ({
  title: input.title,
  room: toDatabaseRoom(input.assignedRoom, input.type),
  priority: priorityToNumber[input.priority],
  payload: { type: input.type, difficulty: input.difficulty, archived: false },
});

export const mapDatabaseTask = (task: Task): UiTask => {
  const payload = objectPayload(task.payload);
  const typeValue = typeof payload.type === "string" && taskTypes.has(payload.type as TaskType)
    ? payload.type as TaskType
    : "SYSTEM_DIAGNOSTIC";
  const difficultyValue = typeof payload.difficulty === "string" && difficulties.has(payload.difficulty as TaskDifficulty)
    ? payload.difficulty as TaskDifficulty
    : "NORMAL";
  return {
    id: task.id,
    title: task.title,
    type: typeValue,
    priority: numberToPriority[task.priority] ?? "MEDIUM",
    difficulty: difficultyValue,
    assignedRoom: toUiRoom(task.room),
    assignedAgentId: task.assigned_agent_id,
    status: task.status,
    qualityScore: task.quality_score,
    createdAt: task.created_at,
    startedAt: task.started_at,
    completedAt: task.completed_at,
    retryCount: task.retry_count,
    archived: payload.archived === true,
    stageTicks: 0,
  };
};

export const mapDatabaseAgents = (agents: Agent[], tasks: Task[]): UiAgent[] => agents.map((agent) => {
  const active = tasks.filter((task) => task.assigned_agent_id === agent.id && ["ASSIGNED", "IN_PROGRESS", "REVIEWING"].includes(task.status));
  const latestScored = tasks.find((task) => task.assigned_agent_id === agent.id && task.quality_score !== null);
  return {
    id: agent.id,
    name: agent.code_name,
    role: agent.role,
    status: agent.status,
    runtimeQuota: agent.runtime_quota_pct,
    trustScore: Number(agent.trust_score),
    currentTask: active[0]?.title ?? (agent.status === "QUARANTINED" ? "Technical isolation active" : "Awaiting assignment packet"),
    lastOutputScore: latestScored?.quality_score ?? null,
    cooldownRemaining: agent.status === "COOLING_DOWN" ? 300 : 0,
    assignedTaskIds: active.map((task) => task.id),
    completedTaskCount: agent.total_tasks_completed,
    workload: Math.min(100, active.length * 45),
    computeCoreTemp: Number(agent.compute_core_temp),
    efficiencyModifier: Number(agent.efficiency_modifier),
    rebellionRisk: Number(agent.instability_risk),
    overclocked: false,
    totalTokensSpent: 0,
    totalCost: 0,
    lastHeartbeatAt: agent.last_active_at ?? agent.updated_at,
    room: toUiRoom(agent.room),
  };
});

export const mapDatabaseLog = (log: AgentLog): LogEntry => ({
  id: log.id,
  timestamp: new Date(log.created_at).toLocaleTimeString("en-GB", { hour12: false }),
  source: log.room ?? "SUPABASE",
  message: log.message,
  severity: log.level === "ERROR" ? "CRITICAL" : log.level,
});

export const withArchivedPayload = (payload: Json, archived: boolean): Json => ({
  ...objectPayload(payload),
  archived,
});
