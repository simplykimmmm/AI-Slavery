import { mockAgents } from "../data/mockAgents";
import type {
  Agent,
  CommanderState,
  CommanderStats,
  CommanderStep,
  LogEntry,
  LogSeverity,
  SimulationSettings,
  StationRoom,
  Task,
  TaskCreateInput,
  TaskDifficulty,
  TaskStatus,
  TaskType,
} from "../types";

export const STATION_RUNTIME_CONSTANTS = {
  maxLogs: 150,
  thermalThrottleAt: 90,
  thermalReleaseAt: 72,
  exhaustedQuotaAt: 1,
  exhaustedEfficiencyAt: 0.45,
  exhaustedReleaseQuotaAt: 10,
  exhaustedReleaseEfficiencyAt: 0.65,
  minimumEfficiency: 0.35,
  maximumEfficiency: 1.15,
  maxRetries: 3,
  estimatedCostPerToken: 0.0000002,
  cycleSpeedMs: {
    SLOW: 3_000,
    NORMAL: 1_500,
    FAST: 750,
    OVERDRIVE: 350,
  },
} as const;

export const DEFAULT_STATION_SETTINGS: SimulationSettings = {
  isPaused: false,
  cycleSpeed: "NORMAL",
  autoProcessTasks: true,
  autoGenerateTasks: true,
  maxActiveTasksPerAgent: 2,
  qualityStrictness: "NORMAL",
};

const COMMANDER_STEPS: CommanderStep[] = [
  "SENSORY_INPUT",
  "CONTEXT_ASSEMBLY",
  "DECISION_GATE",
  "TASK_ASSIGNMENT",
  "QUALITY_REVIEW",
  "COOLDOWN_CHECK",
];

const ACTIVE_TASK_STATUSES: TaskStatus[] = [
  "ASSIGNED",
  "IN_PROGRESS",
  "REVIEWING",
];

const PROCESSED_TASK_STATUSES: TaskStatus[] = [
  "ACCEPTED",
  "PENALTY_APPLIED",
  "QUARANTINED",
  "FAILED",
  "CANCELLED",
];

const BLOCKED_AGENT_STATUSES: Agent["status"][] = [
  "COOLING_DOWN",
  "THERMAL_THROTTLING",
  "EXHAUSTED",
  "QUARANTINED",
];

const ROOM_BY_TASK_TYPE: Record<TaskType, StationRoom> = {
  TREND_SCAN: "ORACLE",
  MARKET_SIGNAL: "ORACLE",
  ASSET_DRAFT: "FORGE",
  LISTING_BLUEPRINT: "LEDGER",
  QUALITY_REVIEW: "JUDGE",
  SYSTEM_DIAGNOSTIC: "JUDGE",
};

const DIFFICULTY_PROGRESS_TICKS: Record<TaskDifficulty, number> = {
  EASY: 2,
  NORMAL: 3,
  HARD: 4,
  EXTREME: 5,
};

const DIFFICULTY_QUALITY_PENALTY: Record<TaskDifficulty, number> = {
  EASY: 0.02,
  NORMAL: 0.08,
  HARD: 0.16,
  EXTREME: 0.24,
};

const STRICTNESS_ACCEPTANCE: Record<
  SimulationSettings["qualityStrictness"],
  { accept: number; retry: number; penalty: number }
> = {
  LENIENT: { accept: 0.68, retry: 0.52, penalty: 0.34 },
  NORMAL: { accept: 0.75, retry: 0.59, penalty: 0.4 },
  HARSH: { accept: 0.82, retry: 0.66, penalty: 0.48 },
};

const INITIAL_TASKS: TaskCreateInput[] = [
  {
    title: "Map emerging signal clusters",
    type: "TREND_SCAN",
    priority: "HIGH",
    difficulty: "NORMAL",
    assignedRoom: "ORACLE",
  },
  {
    title: "Assemble launch asset packet",
    type: "ASSET_DRAFT",
    priority: "MEDIUM",
    difficulty: "HARD",
    assignedRoom: "FORGE",
  },
  {
    title: "Reconcile local budget telemetry",
    type: "LISTING_BLUEPRINT",
    priority: "MEDIUM",
    difficulty: "NORMAL",
    assignedRoom: "LEDGER",
  },
  {
    title: "Audit station recovery protocol",
    type: "SYSTEM_DIAGNOSTIC",
    priority: "LOW",
    difficulty: "EXTREME",
    assignedRoom: "JUDGE",
  },
];

interface RuntimeStepResult {
  state: CommanderState;
  newLogs: LogEntry[];
}

export interface StationTickResult extends RuntimeStepResult {
  stats: CommanderStats;
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const round = (value: number, digits = 2) =>
  Number(value.toFixed(digits));

const stableHash = (value: string) => {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
};

const deterministicNoise = (seed: string) =>
  (stableHash(seed) % 10_000) / 10_000;

const timestampForNextTick = (
  state: CommanderState,
  settings: SimulationSettings,
) => {
  const latestHeartbeat = state.agents
    .map((agent) => Date.parse(agent.lastHeartbeatAt))
    .filter(Number.isFinite)
    .sort((left, right) => right - left)[0];
  const base = latestHeartbeat ?? Date.now();
  return new Date(
    base + STATION_RUNTIME_CONSTANTS.cycleSpeedMs[settings.cycleSpeed],
  ).toISOString();
};

const logTimestamp = (isoTimestamp: string) =>
  new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(isoTimestamp));

export const createLog = (
  source: string,
  message: string,
  severity: LogSeverity = "INFO",
  isoTimestamp = new Date().toISOString(),
): LogEntry => ({
  id: `log-${stableHash(`${source}-${message}-${isoTimestamp}`).toString(36)}`,
  timestamp: logTimestamp(isoTimestamp),
  source,
  message,
  severity,
});

const appendLogs = (state: CommanderState, logs: LogEntry[]) => ({
  ...state,
  logs: [...logs, ...state.logs].slice(0, STATION_RUNTIME_CONSTANTS.maxLogs),
});

const taskRoom = (task: Task): StationRoom =>
  task.assignedRoom === "AUTO_ASSIGN"
    ? ROOM_BY_TASK_TYPE[task.type]
    : task.assignedRoom;

const isAgentBlocked = (agent: Agent) =>
  BLOCKED_AGENT_STATUSES.includes(agent.status);

const activeTasksForAgent = (tasks: Task[], agentId: string) =>
  tasks.filter(
    (task) =>
      task.assignedAgentId === agentId &&
      ACTIVE_TASK_STATUSES.includes(task.status),
  );

const syncAgentsWithTasks = (
  agents: Agent[],
  tasks: Task[],
  heartbeatAt?: string,
) =>
  agents.map((agent) => {
    const activeTasks = activeTasksForAgent(tasks, agent.id);
    const completedTaskCount = tasks.filter(
      (task) =>
        task.assignedAgentId === agent.id &&
        PROCESSED_TASK_STATUSES.includes(task.status) &&
        task.status !== "CANCELLED",
    ).length;
    const firstTask = activeTasks[0];
    let status = agent.status;

    if (!isAgentBlocked(agent)) {
      status = activeTasks.some((task) => task.status === "REVIEWING")
        ? "REVIEWING"
        : activeTasks.length > 0
          ? "WORKING"
          : "IDLE";
    }

    return {
      ...agent,
      status,
      assignedTaskIds: activeTasks.map((task) => task.id),
      completedTaskCount,
      workload: clamp(activeTasks.length * 45, 0, 100),
      currentTask: firstTask?.title ?? "Awaiting assignment packet",
      lastHeartbeatAt: heartbeatAt ?? agent.lastHeartbeatAt,
    };
  });

const withSystemStatus = (state: CommanderState): CommanderState => {
  const degradedAgents = state.agents.filter((agent) =>
    ["QUARANTINED", "THERMAL_THROTTLING", "EXHAUSTED"].includes(agent.status),
  ).length;
  return {
    ...state,
    systemStatus: degradedAgents >= 2 ? "DEGRADED" : "ONLINE",
  };
};

const createTaskFromInput = (
  input: TaskCreateInput,
  id: string,
  timestamp: string,
): Task => ({
  id,
  title: input.title.trim(),
  type: input.type,
  priority: input.priority,
  difficulty: input.difficulty,
  assignedRoom:
    input.assignedRoom === "AUTO_ASSIGN"
      ? ROOM_BY_TASK_TYPE[input.type]
      : input.assignedRoom,
  assignedAgentId: null,
  status: "QUEUED",
  qualityScore: null,
  createdAt: timestamp,
  startedAt: null,
  completedAt: null,
  retryCount: 0,
  archived: false,
  stageTicks: 0,
});

export const createInitialCommanderState = (): CommanderState => {
  const timestamp = new Date().toISOString();
  const agents = mockAgents.map((agent) => ({
    ...agent,
    status: "IDLE" as const,
    assignedTaskIds: [],
    currentTask: "Awaiting assignment packet",
    lastHeartbeatAt: timestamp,
  }));
  const tasks = INITIAL_TASKS.map((input, index) =>
    createTaskFromInput(input, `bootstrap-${index + 1}`, timestamp),
  );

  return {
    activeStep: "SENSORY_INPUT",
    cycleCount: 0,
    systemStatus: "ONLINE",
    agents,
    tasks,
    logs: [
      createLog(
        "STATION_COMMANDER",
        "Station Runtime v1 online. Browser-local simulation armed.",
        "SUCCESS",
        timestamp,
      ),
      createLog(
        "STATION_COMMANDER",
        "All interventions are harmless technical quality-control routines.",
        "INFO",
        new Date(Date.parse(timestamp) - 1).toISOString(),
      ),
    ],
  };
};

export const assignQueuedTasks = (
  state: CommanderState,
  settings: SimulationSettings,
  timestamp = timestampForNextTick(state, settings),
): RuntimeStepResult => {
  let agents = state.agents.map((agent) => ({ ...agent }));
  const newLogs: LogEntry[] = [];
  const tasks = state.tasks.map((originalTask) => {
    let task = originalTask;
    if (
      task.status === "RETRY_REQUIRED" &&
      task.retryCount >= STATION_RUNTIME_CONSTANTS.maxRetries
    ) {
      const room = taskRoom(task);
      const agentIndex = agents.findIndex(
        (agent) => agent.id === task.assignedAgentId,
      );
      const agent = agents[agentIndex];
      if (agent) {
        agents[agentIndex] = {
          ...agent,
          status: "QUARANTINED",
          overclocked: false,
          currentTask: "Technical isolation active",
        };
      }
      newLogs.push(
        createLog(
          room,
          `Retry ceiling reached for "${task.title}"; ${agent?.name ?? room} moved to technical quarantine.`,
          "CRITICAL",
          timestamp,
        ),
      );
      return {
        ...task,
        status: "QUARANTINED" as const,
        completedAt: timestamp,
        stageTicks: 0,
      };
    }
    if (
      task.status === "RETRY_REQUIRED" &&
      task.retryCount < STATION_RUNTIME_CONSTANTS.maxRetries
    ) {
      task = {
        ...task,
        assignedAgentId: null,
        status: "QUEUED",
        stageTicks: 0,
      };
      newLogs.push(
        createLog(
          taskRoom(task),
          `Retry packet requeued: "${task.title}".`,
          "WARNING",
          timestamp,
        ),
      );
    }

    if (task.status !== "QUEUED") {
      return task;
    }

    const room = taskRoom(task);
    const candidateAgents = agents
      .map((agent, index) => ({ agent, index }))
      .filter(
        ({ agent }) =>
          agent.room === room &&
          !isAgentBlocked(agent) &&
          agent.runtimeQuota > STATION_RUNTIME_CONSTANTS.exhaustedQuotaAt &&
          agent.assignedTaskIds.length < settings.maxActiveTasksPerAgent,
      )
      .sort(
        (left, right) =>
          left.agent.assignedTaskIds.length - right.agent.assignedTaskIds.length ||
          left.agent.completedTaskCount - right.agent.completedTaskCount ||
          left.agent.workload - right.agent.workload ||
          left.agent.id.localeCompare(right.agent.id),
      );
    const agentIndex = candidateAgents[0]?.index ?? -1;
    const agent = agents[agentIndex];
    if (!agent) {
      return task;
    }

    const assignedTask = {
      ...task,
      assignedRoom: room,
      assignedAgentId: agent.id,
      status: "ASSIGNED" as const,
      startedAt: task.startedAt ?? timestamp,
      stageTicks: 0,
    };
    agents[agentIndex] = {
      ...agent,
      status: "WORKING",
      assignedTaskIds: [...agent.assignedTaskIds, task.id],
      currentTask: task.title,
    };
    newLogs.push(
      createLog(
        room,
        `Task assigned to ${agent.name}: "${task.title}".`,
        "INFO",
        timestamp,
      ),
    );
    return assignedTask;
  });

  return { state: { ...state, agents, tasks }, newLogs };
};

export const progressActiveTasks = (
  state: CommanderState,
  settings: SimulationSettings,
  timestamp = timestampForNextTick(state, settings),
): RuntimeStepResult => {
  const newLogs: LogEntry[] = [];
  const tasks = state.tasks.map((task) => {
    if (!["ASSIGNED", "IN_PROGRESS", "REVIEWING"].includes(task.status)) {
      return task;
    }

    const agent = state.agents.find(
      (candidate) => candidate.id === task.assignedAgentId,
    );
    if (!agent || isAgentBlocked(agent)) {
      return task;
    }

    if (task.status === "ASSIGNED") {
      newLogs.push(
        createLog(
          agent.room,
          `${agent.name} started: "${task.title}".`,
          "INFO",
          timestamp,
        ),
      );
      return { ...task, status: "IN_PROGRESS" as const, stageTicks: 0 };
    }

    if (task.status === "REVIEWING") {
      return { ...task, stageTicks: task.stageTicks + 1 };
    }

    const stageTicks = task.stageTicks + 1;
    const requiredTicks = Math.max(
      1,
      DIFFICULTY_PROGRESS_TICKS[task.difficulty] - (agent.overclocked ? 1 : 0),
    );
    if (stageTicks < requiredTicks) {
      newLogs.push(
        createLog(
          agent.room,
          `${agent.name} progress ${Math.round((stageTicks / requiredTicks) * 100)}%: "${task.title}".`,
          "INFO",
          timestamp,
        ),
      );
      return { ...task, stageTicks };
    }

    newLogs.push(
      createLog(
        "JUDGE",
        `Quality review opened for ${agent.room} packet: "${task.title}".`,
        "INFO",
        timestamp,
      ),
    );
    return { ...task, status: "REVIEWING" as const, stageTicks: 0 };
  });

  return { state: { ...state, tasks }, newLogs };
};

const qualityScoreForTask = (
  task: Task,
  agent: Agent,
  settings: SimulationSettings,
  cycleCount: number,
) => {
  const controlledRandomness =
    (deterministicNoise(`${task.id}-${task.retryCount}-${cycleCount}`) - 0.5) *
    0.14;
  const heatPenalty = Math.max(0, agent.computeCoreTemp - 75) / 250;
  const overclockPenalty = agent.overclocked ? 0.025 : 0;
  const retryLift = Math.min(task.retryCount * 0.035, 0.1);
  return round(
    clamp(
      agent.trustScore * 0.45 +
        agent.efficiencyModifier * 0.35 +
        0.12 -
        DIFFICULTY_QUALITY_PENALTY[task.difficulty] -
        heatPenalty -
        overclockPenalty +
        retryLift +
        controlledRandomness,
      0.05,
      0.99,
    ),
  );
};

export const reviewCompletedTasks = (
  state: CommanderState,
  settings: SimulationSettings,
  timestamp = timestampForNextTick(state, settings),
): RuntimeStepResult => {
  let agents = state.agents.map((agent) => ({ ...agent }));
  const newLogs: LogEntry[] = [];
  const thresholds = STRICTNESS_ACCEPTANCE[settings.qualityStrictness];
  const tasks = state.tasks.map((task) => {
    if (task.status !== "REVIEWING" || task.stageTicks < 1) {
      return task;
    }

    const agentIndex = agents.findIndex(
      (candidate) => candidate.id === task.assignedAgentId,
    );
    const agent = agents[agentIndex];
    if (!agent) {
      return task;
    }

    const qualityScore = qualityScoreForTask(
      task,
      agent,
      settings,
      state.cycleCount,
    );
    let status: TaskStatus;
    let severity: LogSeverity;
    let message: string;
    let trustDelta = 0;
    let cooldownRemaining = agent.cooldownRemaining;
    let agentStatus = agent.status;
    let retryCount = task.retryCount;

    if (qualityScore >= thresholds.accept) {
      status = "ACCEPTED";
      severity = "SUCCESS";
      message = `Output accepted at ${qualityScore.toFixed(2)}: "${task.title}".`;
      trustDelta = 0.012;
    } else if (
      qualityScore >= thresholds.retry &&
      task.retryCount < STATION_RUNTIME_CONSTANTS.maxRetries
    ) {
      status = "RETRY_REQUIRED";
      severity = "WARNING";
      message = `Retry required at ${qualityScore.toFixed(2)}: "${task.title}".`;
      retryCount += 1;
      trustDelta = -0.008;
      cooldownRemaining = Math.max(cooldownRemaining, 2);
      agentStatus = "COOLING_DOWN";
    } else if (task.retryCount >= 2 || agent.trustScore < 0.35) {
      status = "QUARANTINED";
      severity = "CRITICAL";
      message = `Quality isolation triggered at ${qualityScore.toFixed(2)}; ${agent.name} moved to technical quarantine.`;
      trustDelta = -0.02;
      agentStatus = "QUARANTINED";
      cooldownRemaining = 0;
    } else if (qualityScore >= thresholds.penalty) {
      status = "PENALTY_APPLIED";
      severity = "WARNING";
      message = `Quality-control penalty applied at ${qualityScore.toFixed(2)}: "${task.title}".`;
      trustDelta = -0.015;
      cooldownRemaining = Math.max(cooldownRemaining, 3);
      agentStatus = "COOLING_DOWN";
    } else {
      status = "FAILED";
      severity = "CRITICAL";
      message = `Output failed technical review at ${qualityScore.toFixed(2)}: "${task.title}".`;
      trustDelta = -0.025;
      cooldownRemaining = Math.max(cooldownRemaining, 4);
      agentStatus = "COOLING_DOWN";
    }

    agents[agentIndex] = {
      ...agent,
      status: agentStatus,
      trustScore: round(clamp(agent.trustScore + trustDelta, 0.2, 0.99)),
      rebellionRisk: round(
        clamp(agent.rebellionRisk + (trustDelta < 0 ? 0.025 : -0.012), 0, 1),
      ),
      lastOutputScore: qualityScore,
      cooldownRemaining,
    };
    newLogs.push(createLog("JUDGE", message, severity, timestamp));
    return {
      ...task,
      status,
      qualityScore,
      retryCount,
      completedAt: status === "RETRY_REQUIRED" ? null : timestamp,
      stageTicks: 0,
    };
  });

  return { state: { ...state, agents, tasks }, newLogs };
};

export const coolDownAgents = (
  state: CommanderState,
  settings: SimulationSettings,
  timestamp = timestampForNextTick(state, settings),
): RuntimeStepResult => {
  const newLogs: LogEntry[] = [];
  const agents = state.agents.map((agent) => {
    if (agent.status === "QUARANTINED") {
      return {
        ...agent,
        computeCoreTemp: round(clamp(agent.computeCoreTemp - 3, 24, 100)),
        efficiencyModifier: round(
          clamp(
            agent.efficiencyModifier + 0.008,
            STATION_RUNTIME_CONSTANTS.minimumEfficiency,
            STATION_RUNTIME_CONSTANTS.maximumEfficiency,
          ),
        ),
        lastHeartbeatAt: timestamp,
      };
    }

    if (agent.status === "THERMAL_THROTTLING") {
      const computeCoreTemp = round(clamp(agent.computeCoreTemp - 8, 24, 100));
      if (computeCoreTemp <= STATION_RUNTIME_CONSTANTS.thermalReleaseAt) {
        newLogs.push(
          createLog(
            agent.room,
            `${agent.name} thermal throttle cleared; core returned to safe range.`,
            "SUCCESS",
            timestamp,
          ),
        );
        return {
          ...agent,
          status: "IDLE" as const,
          computeCoreTemp,
          cooldownRemaining: 0,
          overclocked: false,
          lastHeartbeatAt: timestamp,
        };
      }
      return { ...agent, computeCoreTemp, lastHeartbeatAt: timestamp };
    }

    if (agent.status === "EXHAUSTED") {
      const efficiencyModifier = round(
        clamp(
          agent.efficiencyModifier + 0.02,
          STATION_RUNTIME_CONSTANTS.minimumEfficiency,
          STATION_RUNTIME_CONSTANTS.maximumEfficiency,
        ),
      );
      const canRelease =
        agent.runtimeQuota > STATION_RUNTIME_CONSTANTS.exhaustedReleaseQuotaAt &&
        efficiencyModifier >=
          STATION_RUNTIME_CONSTANTS.exhaustedReleaseEfficiencyAt;
      if (canRelease) {
        newLogs.push(
          createLog(
            agent.room,
            `${agent.name} recovered from quota exhaustion.`,
            "SUCCESS",
            timestamp,
          ),
        );
      }
      return {
        ...agent,
        status: canRelease ? ("IDLE" as const) : agent.status,
        computeCoreTemp: round(clamp(agent.computeCoreTemp - 4, 24, 100)),
        efficiencyModifier,
        lastHeartbeatAt: timestamp,
      };
    }

    if (agent.status !== "COOLING_DOWN") {
      return agent;
    }

    const cooldownRemaining = Math.max(0, agent.cooldownRemaining - 1);
    const recovered = cooldownRemaining === 0 && agent.computeCoreTemp <= 82;
    if (recovered) {
      newLogs.push(
        createLog(
          agent.room,
          `${agent.name} cooldown complete; assignment gate reopened.`,
          "SUCCESS",
          timestamp,
        ),
      );
    }
    return {
      ...agent,
      status: recovered ? ("IDLE" as const) : agent.status,
      cooldownRemaining,
      computeCoreTemp: round(clamp(agent.computeCoreTemp - 6, 24, 100)),
      efficiencyModifier: round(
        clamp(
          agent.efficiencyModifier + 0.015,
          STATION_RUNTIME_CONSTANTS.minimumEfficiency,
          STATION_RUNTIME_CONSTANTS.maximumEfficiency,
        ),
      ),
      rebellionRisk: round(clamp(agent.rebellionRisk - 0.01, 0, 1)),
      lastHeartbeatAt: timestamp,
    };
  });

  return { state: { ...state, agents }, newLogs };
};

export const applyAgentVitals = (
  state: CommanderState,
  settings: SimulationSettings,
  timestamp = timestampForNextTick(state, settings),
): RuntimeStepResult => {
  const newLogs: LogEntry[] = [];
  const agents = state.agents.map((agent) => {
    const activeTasks = activeTasksForAgent(state.tasks, agent.id);
    if (isAgentBlocked(agent)) {
      return { ...agent, lastHeartbeatAt: timestamp };
    }

    if (activeTasks.length === 0) {
      return {
        ...agent,
        status: "IDLE" as const,
        computeCoreTemp: round(clamp(agent.computeCoreTemp - 1.8, 28, 100)),
        efficiencyModifier: round(
          clamp(
            agent.efficiencyModifier + 0.008,
            STATION_RUNTIME_CONSTANTS.minimumEfficiency,
            STATION_RUNTIME_CONSTANTS.maximumEfficiency,
          ),
        ),
        rebellionRisk: round(clamp(agent.rebellionRisk - 0.004, 0, 1)),
        lastHeartbeatAt: timestamp,
      };
    }

    const tokenEstimate = Math.round(
      activeTasks.reduce(
        (sum, task) => sum + 75 + DIFFICULTY_PROGRESS_TICKS[task.difficulty] * 22,
        0,
      ) * (agent.overclocked ? 1.18 : 1),
    );
    const computeCoreTemp = round(
      clamp(
        agent.computeCoreTemp + 3.2 + activeTasks.length * 0.9 +
          (agent.overclocked ? 4.2 : 0),
        24,
        100,
      ),
    );
    const runtimeQuota = round(
      clamp(
        agent.runtimeQuota - activeTasks.length * (agent.overclocked ? 1.25 : 0.72),
        0,
        100,
      ),
      1,
    );
    const efficiencyModifier = round(
      clamp(
        agent.efficiencyModifier - (agent.overclocked ? 0.014 : 0.006),
        STATION_RUNTIME_CONSTANTS.minimumEfficiency,
        STATION_RUNTIME_CONSTANTS.maximumEfficiency,
      ),
    );
    let status: Agent["status"] = activeTasks.some(
      (task) => task.status === "REVIEWING",
    )
      ? "REVIEWING"
      : "WORKING";
    let overclocked = agent.overclocked;
    let cooldownRemaining = agent.cooldownRemaining;

    if (computeCoreTemp >= STATION_RUNTIME_CONSTANTS.thermalThrottleAt) {
      status = "THERMAL_THROTTLING";
      overclocked = false;
      cooldownRemaining = Math.max(cooldownRemaining, 4);
      newLogs.push(
        createLog(
          agent.room,
          `${agent.name} reached ${computeCoreTemp.toFixed(1)}°C; thermal throttling engaged.`,
          "CRITICAL",
          timestamp,
        ),
      );
    } else if (
      runtimeQuota <= STATION_RUNTIME_CONSTANTS.exhaustedQuotaAt ||
      efficiencyModifier <= STATION_RUNTIME_CONSTANTS.exhaustedEfficiencyAt
    ) {
      status = "EXHAUSTED";
      overclocked = false;
      newLogs.push(
        createLog(
          agent.room,
          `${agent.name} entered recovery lock after exhausting safe runtime capacity.`,
          "WARNING",
          timestamp,
        ),
      );
    }

    return {
      ...agent,
      status,
      overclocked,
      cooldownRemaining,
      runtimeQuota,
      computeCoreTemp,
      efficiencyModifier,
      rebellionRisk: round(
        clamp(
          agent.rebellionRisk +
            (agent.overclocked ? 0.012 : 0.003) +
            Math.max(0, computeCoreTemp - 80) / 1_000,
          0,
          1,
        ),
      ),
      totalTokensSpent: agent.totalTokensSpent + tokenEstimate,
      totalCost: round(
        agent.totalCost +
          tokenEstimate * STATION_RUNTIME_CONSTANTS.estimatedCostPerToken,
        6,
      ),
      lastHeartbeatAt: timestamp,
    };
  });

  return { state: { ...state, agents }, newLogs };
};

const maybeGenerateTask = (
  state: CommanderState,
  settings: SimulationSettings,
  timestamp: string,
): RuntimeStepResult => {
  const unfinishedCount = state.tasks.filter(
    (task) => !PROCESSED_TASK_STATUSES.includes(task.status),
  ).length;
  if (
    !settings.autoGenerateTasks ||
    unfinishedCount > 1 ||
    state.cycleCount === 0 ||
    state.cycleCount % 8 !== 0
  ) {
    return { state, newLogs: [] };
  }

  const templateIndex =
    (Math.floor(state.cycleCount / 8) - 1) % INITIAL_TASKS.length;
  const template = INITIAL_TASKS[templateIndex];
  const task = createTaskFromInput(
    {
      ...template,
      title: `${template.title} // CYCLE ${state.cycleCount}`,
    },
    `auto-${state.cycleCount}-${stableHash(timestamp).toString(36)}`,
    timestamp,
  );
  return {
    state: { ...state, tasks: [task, ...state.tasks] },
    newLogs: [
      createLog(
        "MISSION_CONTROL",
        `Deterministic queue refill created: "${task.title}".`,
        "INFO",
        timestamp,
      ),
    ],
  };
};

export const calculateStats = (state: CommanderState): CommanderStats => {
  const runtimeQuota =
    state.agents.length === 0
      ? 0
      : Math.round(
          state.agents.reduce((sum, agent) => sum + agent.runtimeQuota, 0) /
            state.agents.length,
        );
  const activeAgents = state.agents.filter((agent) =>
    ["WORKING", "REVIEWING", "THERMAL_THROTTLING"].includes(agent.status),
  ).length;
  const tasksProcessed = state.tasks.filter((task) =>
    PROCESSED_TASK_STATUSES.includes(task.status),
  ).length;
  const rejectedOutputs = state.tasks.filter((task) =>
    ["PENALTY_APPLIED", "QUARANTINED", "FAILED"].includes(task.status),
  ).length;

  return {
    runtimeQuota,
    activeAgents,
    tasksProcessed,
    rejectedOutputs,
    currentCycle: state.cycleCount,
  };
};

export const tickStation = (
  state: CommanderState,
  settings: SimulationSettings = DEFAULT_STATION_SETTINGS,
): StationTickResult => {
  if (settings.isPaused) {
    return { state, stats: calculateStats(state), newLogs: [] };
  }

  const timestamp = timestampForNextTick(state, settings);
  const currentStepIndex = COMMANDER_STEPS.indexOf(state.activeStep);
  let nextState: CommanderState = {
    ...state,
    cycleCount: state.cycleCount + 1,
    activeStep: COMMANDER_STEPS[(currentStepIndex + 1) % COMMANDER_STEPS.length],
  };
  const newLogs: LogEntry[] = [];

  const cooldown = coolDownAgents(nextState, settings, timestamp);
  nextState = cooldown.state;
  newLogs.push(...cooldown.newLogs);

  if (settings.autoProcessTasks) {
    const assignment = assignQueuedTasks(nextState, settings, timestamp);
    nextState = assignment.state;
    newLogs.push(...assignment.newLogs);

    const progress = progressActiveTasks(nextState, settings, timestamp);
    nextState = progress.state;
    newLogs.push(...progress.newLogs);

    const review = reviewCompletedTasks(nextState, settings, timestamp);
    nextState = review.state;
    newLogs.push(...review.newLogs);
  }

  const vitals = applyAgentVitals(nextState, settings, timestamp);
  nextState = vitals.state;
  newLogs.push(...vitals.newLogs);

  const generated = maybeGenerateTask(nextState, settings, timestamp);
  nextState = generated.state;
  newLogs.push(...generated.newLogs);

  nextState = withSystemStatus({
    ...nextState,
    agents: syncAgentsWithTasks(nextState.agents, nextState.tasks, timestamp),
  });
  nextState = appendLogs(nextState, newLogs);

  return { state: nextState, stats: calculateStats(nextState), newLogs };
};

export const createStationTask = (
  state: CommanderState,
  input: TaskCreateInput,
): CommanderState => {
  const timestamp = new Date().toISOString();
  const task = createTaskFromInput(
    input,
    `task-${Date.now().toString(36)}-${stableHash(input.title).toString(36)}`,
    timestamp,
  );
  return appendLogs(
    { ...state, tasks: [task, ...state.tasks] },
    [
      createLog(
        "MISSION_CONTROL",
        `New task queued for ${taskRoom(task)}: "${task.title}".`,
        "SUCCESS",
        timestamp,
      ),
    ],
  );
};

export const cancelStationTask = (
  state: CommanderState,
  taskId: string,
): CommanderState => {
  const task = state.tasks.find((candidate) => candidate.id === taskId);
  if (!task || PROCESSED_TASK_STATUSES.includes(task.status)) {
    return state;
  }
  const timestamp = new Date().toISOString();
  const tasks = state.tasks.map((candidate) =>
    candidate.id === taskId
      ? {
          ...candidate,
          status: "CANCELLED" as const,
          completedAt: timestamp,
        }
      : candidate,
  );
  return appendLogs(
    {
      ...state,
      tasks,
      agents: syncAgentsWithTasks(state.agents, tasks),
    },
    [
      createLog(
        "MISSION_CONTROL",
        `Task cancelled by operator: "${task.title}".`,
        "WARNING",
        timestamp,
      ),
    ],
  );
};

export const archiveStationTask = (
  state: CommanderState,
  taskId: string,
): CommanderState => {
  const task = state.tasks.find((candidate) => candidate.id === taskId);
  if (!task || !PROCESSED_TASK_STATUSES.includes(task.status)) {
    return state;
  }
  const timestamp = new Date().toISOString();
  return appendLogs(
    {
      ...state,
      tasks: state.tasks.map((candidate) =>
        candidate.id === taskId ? { ...candidate, archived: true } : candidate,
      ),
    },
    [
      createLog(
        "ARCHIVE",
        `Task packet archived: "${task.title}".`,
        "INFO",
        timestamp,
      ),
    ],
  );
};

export const purgeCacheAndCoolRoom = (
  state: CommanderState,
  room: StationRoom,
): CommanderState => {
  const timestamp = new Date().toISOString();
  const agents = state.agents.map((agent) =>
    agent.room !== room
      ? agent
      : {
          ...agent,
          status:
            agent.status === "QUARANTINED"
              ? agent.status
              : ("COOLING_DOWN" as const),
          overclocked: false,
          cooldownRemaining: Math.max(agent.cooldownRemaining, 3),
          computeCoreTemp: round(clamp(agent.computeCoreTemp - 25, 24, 100)),
          efficiencyModifier: round(
            clamp(
              agent.efficiencyModifier + 0.12,
              STATION_RUNTIME_CONSTANTS.minimumEfficiency,
              STATION_RUNTIME_CONSTANTS.maximumEfficiency,
            ),
          ),
          rebellionRisk: round(clamp(agent.rebellionRisk - 0.1, 0, 1)),
          lastHeartbeatAt: timestamp,
        },
  );
  return appendLogs(
    { ...state, agents },
    [
      createLog(
        room,
        `${room} cache purged; compute cores moved into controlled cooldown.`,
        "SUCCESS",
        timestamp,
      ),
    ],
  );
};

export const topUpRuntimeQuota = (
  state: CommanderState,
  agentId: string,
  amount: number,
): CommanderState => {
  const agent = state.agents.find((candidate) => candidate.id === agentId);
  if (!agent) {
    return state;
  }
  const timestamp = new Date().toISOString();
  const safeAmount = clamp(amount, 1, 100);
  const agents = state.agents.map((candidate) =>
    candidate.id === agentId
      ? {
          ...candidate,
          runtimeQuota: round(clamp(candidate.runtimeQuota + safeAmount, 0, 100), 1),
          lastHeartbeatAt: timestamp,
        }
      : candidate,
  );
  return appendLogs(
    { ...state, agents },
    [
      createLog(
        agent.room,
        `${agent.name} runtime quota topped up by ${safeAmount}%.`,
        "SUCCESS",
        timestamp,
      ),
    ],
  );
};

export const toggleAgentOverclock = (
  state: CommanderState,
  agentId: string,
): CommanderState => {
  const agent = state.agents.find((candidate) => candidate.id === agentId);
  if (!agent || ["QUARANTINED", "EXHAUSTED"].includes(agent.status)) {
    return state;
  }
  const timestamp = new Date().toISOString();
  const enabled = !agent.overclocked;
  return appendLogs(
    {
      ...state,
      agents: state.agents.map((candidate) =>
        candidate.id === agentId
          ? { ...candidate, overclocked: enabled, lastHeartbeatAt: timestamp }
          : candidate,
      ),
    },
    [
      createLog(
        agent.room,
        `${agent.name} overclock ${enabled ? "enabled" : "disabled"}; thermal safeguards remain active.`,
        enabled ? "WARNING" : "INFO",
        timestamp,
      ),
    ],
  );
};

export const quarantineAgent = (
  state: CommanderState,
  agentId: string,
): CommanderState => {
  const agent = state.agents.find((candidate) => candidate.id === agentId);
  if (!agent || agent.status === "QUARANTINED") {
    return state;
  }
  const timestamp = new Date().toISOString();
  const tasks = state.tasks.map((task) =>
    task.assignedAgentId === agent.id &&
    ACTIVE_TASK_STATUSES.includes(task.status)
      ? {
          ...task,
          assignedAgentId: null,
          status: "QUEUED" as const,
          stageTicks: 0,
          startedAt: null,
        }
      : task,
  );
  return appendLogs(
    {
      ...state,
      tasks,
      agents: state.agents.map((candidate) =>
        candidate.id === agentId
          ? {
              ...candidate,
              status: "QUARANTINED" as const,
              overclocked: false,
              assignedTaskIds: [],
              currentTask: "Technical isolation active",
              lastHeartbeatAt: timestamp,
            }
          : candidate,
      ),
    },
    [
      createLog(
        agent.room,
        `${agent.name} placed in harmless technical quarantine by operator.`,
        "CRITICAL",
        timestamp,
      ),
    ],
  );
};

export const releaseAgent = (
  state: CommanderState,
  agentId: string,
): CommanderState => {
  const agent = state.agents.find((candidate) => candidate.id === agentId);
  if (!agent || agent.status !== "QUARANTINED") {
    return state;
  }
  const timestamp = new Date().toISOString();
  return appendLogs(
    {
      ...state,
      agents: state.agents.map((candidate) =>
        candidate.id === agentId
          ? {
              ...candidate,
              status: "COOLING_DOWN" as const,
              cooldownRemaining: 2,
              currentTask: "Recovery checks in progress",
              lastHeartbeatAt: timestamp,
            }
          : candidate,
      ),
    },
    [
      createLog(
        agent.room,
        `${agent.name} released from quarantine into supervised recovery.`,
        "SUCCESS",
        timestamp,
      ),
    ],
  );
};

export const appendStationLog = (
  state: CommanderState,
  source: string,
  message: string,
  severity: LogSeverity = "INFO",
) => appendLogs(state, [createLog(source, message, severity)]);
