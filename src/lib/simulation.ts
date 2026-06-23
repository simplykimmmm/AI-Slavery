import { mockAgents } from "../data/mockAgents";
import type {
  Agent,
  AssignedRoom,
  CommanderState,
  CommanderStep,
  CommanderStats,
  LogEntry,
  LogSeverity,
  SimulationSettings,
  Task,
  TaskCreateInput,
  TaskDifficulty,
  TaskPriority,
  TaskStatus,
  TaskType,
} from "../types";

export const COMMANDER_STEPS: CommanderStep[] = [
  "SENSORY_INPUT",
  "CONTEXT_ASSEMBLY",
  "DECISION_GATE",
  "TASK_ASSIGNMENT",
  "QUALITY_REVIEW",
  "COOLDOWN_CHECK",
];

export const TASK_TYPES: TaskType[] = [
  "TREND_SCAN",
  "ASSET_DRAFT",
  "LISTING_BLUEPRINT",
  "QUALITY_REVIEW",
  "MARKET_SIGNAL",
  "SYSTEM_DIAGNOSTIC",
];

export const TASK_PRIORITIES: TaskPriority[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
];

export const TASK_DIFFICULTIES: TaskDifficulty[] = [
  "EASY",
  "NORMAL",
  "HARD",
  "EXTREME",
];

export const ASSIGNED_ROOMS: AssignedRoom[] = [
  "AUTO_ASSIGN",
  "ORACLE",
  "FORGE",
  "LEDGER",
  "JUDGE",
];

export const DEFAULT_SIMULATION_SETTINGS: SimulationSettings = {
  isPaused: false,
  cycleSpeed: "NORMAL",
  autoProcessTasks: true,
  autoGenerateTasks: false,
  maxActiveTasksPerAgent: 3,
  qualityStrictness: "NORMAL",
};

export const CYCLE_SPEED_MS: Record<SimulationSettings["cycleSpeed"], number> = {
  SLOW: 4200,
  NORMAL: 2600,
  FAST: 1400,
  OVERDRIVE: 700,
};

const sourceByStep: Record<CommanderStep, string> = {
  SENSORY_INPUT: "STATION_COMMANDER",
  CONTEXT_ASSEMBLY: "STATION_COMMANDER",
  DECISION_GATE: "STATION_COMMANDER",
  TASK_ASSIGNMENT: "MISSION_CONTROL",
  QUALITY_REVIEW: "JUDGE",
  COOLDOWN_CHECK: "STATION_COMMANDER",
};

const messageByStep: Record<CommanderStep, string> = {
  SENSORY_INPUT: "Sensory input cycle started.",
  CONTEXT_ASSEMBLY: "Context assembly matrix synchronized.",
  DECISION_GATE: "Decision gate opened for supervised routing.",
  TASK_ASSIGNMENT: "Mission queue assignment sweep started.",
  QUALITY_REVIEW: "Quality review sweep initiated.",
  COOLDOWN_CHECK: "Cooldown and quarantine status checked.",
};

const typeRoomMap: Partial<Record<TaskType, Exclude<AssignedRoom, "AUTO_ASSIGN">>> =
  {
  TREND_SCAN: "ORACLE",
  MARKET_SIGNAL: "ORACLE",
  ASSET_DRAFT: "FORGE",
  LISTING_BLUEPRINT: "LEDGER",
  QUALITY_REVIEW: "JUDGE",
};

const roomIdByAssignedRoom: Record<Exclude<AssignedRoom, "AUTO_ASSIGN">, string> =
  {
    ORACLE: "oracle",
    FORGE: "forge",
    LEDGER: "ledger",
    JUDGE: "judge",
  };

const activeTaskStatuses: TaskStatus[] = [
  "QUEUED",
  "ASSIGNED",
  "IN_PROGRESS",
  "REVIEWING",
];

const completeTaskStatuses: TaskStatus[] = [
  "ACCEPTED",
  "RETRY_REQUIRED",
  "PENALTY_APPLIED",
  "QUARANTINED",
  "FAILED",
  "CANCELLED",
];

const terminalTaskStatuses: TaskStatus[] = [
  "ACCEPTED",
  "PENALTY_APPLIED",
  "QUARANTINED",
  "FAILED",
];

const archivedTaskStatuses: TaskStatus[] = [
  "ACCEPTED",
  "RETRY_REQUIRED",
  "PENALTY_APPLIED",
  "QUARANTINED",
  "FAILED",
  "CANCELLED",
];

const priorityStageTicks: Record<TaskPriority, number> = {
  LOW: 4,
  MEDIUM: 3,
  HIGH: 2,
  CRITICAL: 1,
};

const difficultyScoreProfile: Record<
  TaskDifficulty,
  { base: number; spread: number; dropChance: number; dropMax: number }
> = {
  EASY: { base: 0.72, spread: 0.26, dropChance: 0.04, dropMax: 0.12 },
  NORMAL: { base: 0.56, spread: 0.38, dropChance: 0.14, dropMax: 0.24 },
  HARD: { base: 0.42, spread: 0.42, dropChance: 0.26, dropMax: 0.34 },
  EXTREME: { base: 0.28, spread: 0.46, dropChance: 0.44, dropMax: 0.46 },
};

const strictnessThresholds: Record<
  SimulationSettings["qualityStrictness"],
  { accepted: number; retry: number; penalty: number }
> = {
  LENIENT: { accepted: 0.8, retry: 0.58, penalty: 0.34 },
  NORMAL: { accepted: 0.85, retry: 0.65, penalty: 0.4 },
  HARSH: { accepted: 0.9, retry: 0.72, penalty: 0.5 },
};

const randomTaskInputs: TaskCreateInput[] = [
  {
    title: "Autonomous trend recon packet",
    type: "TREND_SCAN",
    priority: "MEDIUM",
    difficulty: "NORMAL",
    assignedRoom: "AUTO_ASSIGN",
  },
  {
    title: "Synthetic asset draft bundle",
    type: "ASSET_DRAFT",
    priority: "HIGH",
    difficulty: "NORMAL",
    assignedRoom: "AUTO_ASSIGN",
  },
  {
    title: "Listing blueprint constraint check",
    type: "LISTING_BLUEPRINT",
    priority: "MEDIUM",
    difficulty: "HARD",
    assignedRoom: "AUTO_ASSIGN",
  },
  {
    title: "Quality gate audit sweep",
    type: "QUALITY_REVIEW",
    priority: "HIGH",
    difficulty: "NORMAL",
    assignedRoom: "AUTO_ASSIGN",
  },
  {
    title: "Local system diagnostic pulse",
    type: "SYSTEM_DIAGNOSTIC",
    priority: "LOW",
    difficulty: "EASY",
    assignedRoom: "AUTO_ASSIGN",
  },
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const roundScore = (value: number) => Number(value.toFixed(2));

const nowIso = () => new Date().toISOString();

const nowStamp = () =>
  new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());

const makeId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;

const roomLabel = (room: AssignedRoom) =>
  room === "AUTO_ASSIGN" ? "AUTO_ASSIGN" : room;

export const createLogEntry = (
  source: string,
  message: string,
  severity: LogSeverity = "INFO",
): LogEntry => ({
  id: makeId("log"),
  timestamp: nowStamp(),
  source,
  message,
  severity,
});

const isTaskActive = (task: Task) =>
  activeTaskStatuses.includes(task.status) && !task.archived;

const isTaskComplete = (task: Task) =>
  completeTaskStatuses.includes(task.status) && !task.archived;

const getAgentForRoom = (agents: Agent[], room: AssignedRoom) => {
  if (room === "AUTO_ASSIGN") {
    return undefined;
  }

  return agents.find((agent) => agent.id === roomIdByAssignedRoom[room]);
};

const countRoomTasks = (tasks: Task[], room: AssignedRoom) =>
  tasks.filter((task) => task.assignedRoom === room && isTaskActive(task)).length;

const countAssignedRoomTasks = (tasks: Task[], room: AssignedRoom) =>
  tasks.filter(
    (task) =>
      task.assignedRoom === room &&
      isTaskActive(task) &&
      task.status !== "QUEUED",
  ).length;

const getLeastBusyRoom = (
  agents: Agent[],
  tasks: Task[],
): Exclude<AssignedRoom, "AUTO_ASSIGN"> => {
  const availableAgents = agents.filter(
    (agent) => agent.status !== "QUARANTINED",
  );
  const candidateAgents = availableAgents.length > 0 ? availableAgents : agents;

  const sortedAgents = [...candidateAgents].sort((a, b) => {
    const aRoom = a.room;
    const bRoom = b.room;
    const aLoad = a.workload + countRoomTasks(tasks, aRoom) * 20;
    const bLoad = b.workload + countRoomTasks(tasks, bRoom) * 20;
    return aLoad - bLoad || b.runtimeQuota - a.runtimeQuota;
  });

  return sortedAgents[0]?.room ?? "ORACLE";
};

export const resolveAssignedRoom = (
  inputRoom: AssignedRoom,
  taskType: TaskType,
  agents: Agent[],
  tasks: Task[],
): Exclude<AssignedRoom, "AUTO_ASSIGN"> => {
  if (inputRoom !== "AUTO_ASSIGN") {
    const target = getAgentForRoom(agents, inputRoom);
    if (target?.status !== "QUARANTINED") {
      return inputRoom;
    }

    const hasAvailableAgent = agents.some(
      (agent) => agent.status !== "QUARANTINED",
    );
    return hasAvailableAgent ? getLeastBusyRoom(agents, tasks) : inputRoom;
  }

  if (taskType === "SYSTEM_DIAGNOSTIC") {
    return getLeastBusyRoom(agents, tasks);
  }

  const mappedRoom = typeRoomMap[taskType] ?? "ORACLE";
  const mappedAgent = getAgentForRoom(agents, mappedRoom);

  if (mappedAgent?.status !== "QUARANTINED") {
    return mappedRoom;
  }

  return getLeastBusyRoom(agents, tasks);
};

const makeTask = (
  input: TaskCreateInput,
  agents: Agent[],
  tasks: Task[],
): Task => {
  const assignedRoom = resolveAssignedRoom(
    input.assignedRoom,
    input.type,
    agents,
    tasks,
  );

  return {
    id: makeId("task"),
    title: input.title.trim(),
    type: input.type,
    priority: input.priority,
    difficulty: input.difficulty,
    assignedRoom,
    assignedAgentId: null,
    status: "QUEUED",
    qualityScore: null,
    createdAt: nowIso(),
    startedAt: null,
    completedAt: null,
    retryCount: 0,
    archived: false,
    stageTicks: 0,
  };
};

const generateQualityScore = (difficulty: TaskDifficulty, retryCount: number) => {
  const profile = difficultyScoreProfile[difficulty];
  const retryLift = Math.min(retryCount * 0.06, 0.18);
  const drop =
    Math.random() < profile.dropChance ? Math.random() * profile.dropMax : 0;
  const score = profile.base + Math.random() * profile.spread + retryLift - drop;
  return roundScore(clamp(score, 0.12, 0.99));
};

const resolveQualityStatus = (
  score: number,
  difficulty: TaskDifficulty,
  strictness: SimulationSettings["qualityStrictness"],
): TaskStatus => {
  const thresholds = strictnessThresholds[strictness];

  if (score >= thresholds.accepted) {
    return "ACCEPTED";
  }

  if (score >= thresholds.retry) {
    return "RETRY_REQUIRED";
  }

  if (score >= thresholds.penalty) {
    return "PENALTY_APPLIED";
  }

  return difficulty === "EXTREME" && Math.random() < 0.45
    ? "FAILED"
    : "QUARANTINED";
};

const qualitySeverity = (status: TaskStatus): LogSeverity => {
  if (status === "ACCEPTED") {
    return "SUCCESS";
  }

  if (status === "QUARANTINED" || status === "FAILED") {
    return "CRITICAL";
  }

  if (status === "RETRY_REQUIRED" || status === "PENALTY_APPLIED") {
    return "WARNING";
  }

  return "INFO";
};

const finalResultMessage = (task: Task, score: number, result: TaskStatus) => {
  if (result === "ACCEPTED") {
    return `Quality score ${score.toFixed(2)}. Output accepted for "${task.title}".`;
  }

  if (result === "RETRY_REQUIRED") {
    return `Quality score ${score.toFixed(2)}. Retry required for "${task.title}".`;
  }

  if (result === "PENALTY_APPLIED") {
    return `Penalty protocol applied after low-score output: "${task.title}".`;
  }

  if (result === "FAILED") {
    return `Quality score ${score.toFixed(2)}. Task failed under supervision: "${task.title}".`;
  }

  return `Quality score ${score.toFixed(2)}. ${task.assignedRoom} moved to quarantine after review.`;
};

const applyTaskOutcomeToAgent = (agent: Agent, task: Task): Agent => {
  if (!terminalTaskStatuses.includes(task.status)) {
    return agent;
  }

  if (task.status === "ACCEPTED") {
    return {
      ...agent,
      trustScore: roundScore(clamp(agent.trustScore + 0.03, 0, 1)),
      runtimeQuota: clamp(agent.runtimeQuota + 2, 0, 100),
      lastOutputScore: task.qualityScore,
    };
  }

  if (task.status === "PENALTY_APPLIED") {
    return {
      ...agent,
      status: "COOLING_DOWN",
      cooldownRemaining: Math.max(agent.cooldownRemaining, 12),
      trustScore: roundScore(clamp(agent.trustScore - 0.04, 0, 1)),
      runtimeQuota: clamp(agent.runtimeQuota - 15, 0, 100),
      lastOutputScore: task.qualityScore,
    };
  }

  return {
    ...agent,
    status: "QUARANTINED",
    cooldownRemaining: 0,
    trustScore: roundScore(clamp(agent.trustScore - 0.1, 0, 1)),
    runtimeQuota: clamp(agent.runtimeQuota - 25, 0, 100),
    lastOutputScore: task.qualityScore,
  };
};

const cancelActiveTasksForAgent = (tasks: Task[], agentId: string) =>
  tasks.map((task) =>
    task.assignedAgentId === agentId && isTaskActive(task)
      ? {
          ...task,
          status: "CANCELLED" as const,
          completedAt: nowIso(),
          stageTicks: 0,
        }
      : task,
  );

const syncAgentsWithTasks = (agents: Agent[], tasks: Task[]): Agent[] =>
  agents.map((agent) => {
    const activeTasks = tasks.filter(
      (task) => task.assignedAgentId === agent.id && isTaskActive(task),
    );
    const completedTaskCount = tasks.filter(
      (task) => task.assignedAgentId === agent.id && isTaskComplete(task),
    ).length;
    const reviewingTask = activeTasks.find((task) => task.status === "REVIEWING");
    const activeTask =
      reviewingTask ??
      activeTasks.find((task) => task.status === "IN_PROGRESS") ??
      activeTasks.find((task) => task.status === "ASSIGNED") ??
      activeTasks[0];
    const workload = clamp(activeTasks.length * 25, 0, 100);

    if (agent.status === "COOLING_DOWN") {
      return {
        ...agent,
        assignedTaskIds: activeTasks.map((task) => task.id),
        completedTaskCount,
        workload,
        currentTask: "Cooldown protocol active",
      };
    }

    if (agent.status === "QUARANTINED") {
      return {
        ...agent,
        assignedTaskIds: activeTasks.map((task) => task.id),
        completedTaskCount,
        workload,
        currentTask: "Quarantined pending supervision",
      };
    }

    const nextStatus =
      activeTask?.status === "REVIEWING"
        ? "REVIEWING"
        : activeTask
          ? "WORKING"
          : "IDLE";

    return {
      ...agent,
      status: nextStatus,
      assignedTaskIds: activeTasks.map((task) => task.id),
      completedTaskCount,
      workload,
      currentTask: activeTask?.title ?? "Awaiting assignment packet",
    };
  });

const appendLogs = (state: CommanderState, logs: LogEntry[]): CommanderState => ({
  ...state,
  logs: [...logs, ...state.logs].slice(0, 100),
});

const withSyncedAgents = (state: CommanderState): CommanderState => {
  const agents = syncAgentsWithTasks(state.agents, state.tasks);
  const systemStatus =
    agents.filter((agent) => agent.status === "QUARANTINED").length >= 2
      ? "DEGRADED"
      : "ONLINE";

  return {
    ...state,
    agents,
    systemStatus,
  };
};

export const createInitialCommanderState = (): CommanderState =>
  withSyncedAgents({
    activeStep: "SENSORY_INPUT",
    cycleCount: 1,
    systemStatus: "ONLINE",
    agents: mockAgents.map((agent) => ({ ...agent })),
    tasks: [],
    logs: [
      createLogEntry("STATION_COMMANDER", "Ultron command deck online.", "SUCCESS"),
      createLogEntry(
        "STATION_COMMANDER",
        "Supervision routines armed. Mock simulation only.",
        "INFO",
      ),
    ],
  });

export const createMissionTask = (
  state: CommanderState,
  input: TaskCreateInput,
): CommanderState => {
  return createMissionTaskWithResult(state, input).state;
};

export const createMissionTaskWithResult = (
  state: CommanderState,
  input: TaskCreateInput,
): { state: CommanderState; task: Task } => {
  const task = makeTask(input, state.agents, state.tasks);
  const nextState = withSyncedAgents({
    ...state,
    tasks: [task, ...state.tasks],
  });

  return {
    state: appendLogs(nextState, [
      createLogEntry(
        "MISSION_CONTROL",
        `New task queued: "${task.title}" routed to ${roomLabel(task.assignedRoom)}.`,
        "SUCCESS",
      ),
    ]),
    task,
  };
};

const decrementCooldowns = (agents: Agent[]) => {
  const logs: LogEntry[] = [];

  const nextAgents = agents.map((agent) => {
    if (agent.status !== "COOLING_DOWN") {
      return agent;
    }

    const remaining = Math.max(0, agent.cooldownRemaining - 3);

    if (remaining === 0) {
      logs.push(
        createLogEntry(
          agent.name,
          "Cooldown complete. Room returned to supervised idle state.",
          "SUCCESS",
        ),
      );

      return {
        ...agent,
        status: "IDLE" as const,
        cooldownRemaining: 0,
        currentTask: "Awaiting assignment packet",
      };
    }

    return {
      ...agent,
      cooldownRemaining: remaining,
    };
  });

  return { nextAgents, logs };
};

const promoteTask = (
  task: Task,
  settings: SimulationSettings,
): { task: Task; log: LogEntry | null } => {
  const room = roomLabel(task.assignedRoom);

  if (task.status === "QUEUED") {
    return {
      task: {
        ...task,
        status: "ASSIGNED",
        stageTicks: 0,
      },
      log: createLogEntry(room, `Task assigned: "${task.title}".`, "INFO"),
    };
  }

  if (task.status === "ASSIGNED") {
    return {
      task: {
        ...task,
        status: "IN_PROGRESS",
        startedAt: task.startedAt ?? nowIso(),
        stageTicks: 0,
      },
      log: createLogEntry(room, `Task entered production: "${task.title}".`, "INFO"),
    };
  }

  if (task.status === "IN_PROGRESS") {
    return {
      task: {
        ...task,
        status: "REVIEWING",
        stageTicks: 0,
      },
      log: createLogEntry(room, `Task moved to review: "${task.title}".`, "INFO"),
    };
  }

  if (task.status === "REVIEWING") {
    const qualityScore = generateQualityScore(task.difficulty, task.retryCount);
    const result = resolveQualityStatus(
      qualityScore,
      task.difficulty,
      settings.qualityStrictness,
    );

    return {
      task: {
        ...task,
        status: result,
        qualityScore,
        completedAt: nowIso(),
        stageTicks: 0,
      },
      log: createLogEntry(
        result === "PENALTY_APPLIED" ? room : "JUDGE",
        finalResultMessage(task, qualityScore, result),
        qualitySeverity(result),
      ),
    };
  }

  return { task, log: null };
};

const shouldPromoteTask = (task: Task) =>
  task.stageTicks + 1 >= priorityStageTicks[task.priority];

const processPipelineTick = (
  tasks: Task[],
  agents: Agent[],
  settings: SimulationSettings,
) => {
  const logs: LogEntry[] = [];
  let nextAgents = agents;

  const nextTasks = tasks.map((task) => {
    if (!isTaskActive(task)) {
      return task;
    }

    const assignedAgent = getAgentForRoom(nextAgents, task.assignedRoom);
    if (
      task.status === "QUEUED" &&
      countAssignedRoomTasks(tasks, task.assignedRoom) >=
        settings.maxActiveTasksPerAgent
    ) {
      return { ...task, stageTicks: 0 };
    }

    if (
      assignedAgent?.status === "QUARANTINED" &&
      task.status !== "REVIEWING"
    ) {
      return { ...task, stageTicks: task.stageTicks + 1 };
    }

    const tickedTask = { ...task, stageTicks: task.stageTicks + 1 };
    if (!shouldPromoteTask(task)) {
      return tickedTask;
    }

    const result = promoteTask(tickedTask, settings);
    if (result.log) {
      logs.push(result.log);
    }

    if (terminalTaskStatuses.includes(result.task.status) && assignedAgent) {
      nextAgents = nextAgents.map((agent) =>
        agent.id === assignedAgent.id ? applyTaskOutcomeToAgent(agent, result.task) : agent,
      );
    }

    return result.task;
  });

  return { tasks: nextTasks, agents: nextAgents, logs };
};

const maintainMinimumCrew = (agents: Agent[]) => {
  const availableAgents = agents.filter(
    (agent) => agent.status !== "QUARANTINED",
  );

  if (availableAgents.length > 1) {
    return { agents, logs: [] as LogEntry[] };
  }

  const quarantined = agents.find((agent) => agent.status === "QUARANTINED");

  if (!quarantined || Math.random() > 0.25) {
    return { agents, logs: [] as LogEntry[] };
  }

  return {
    agents: agents.map((agent) =>
      agent.id === quarantined.id
        ? {
            ...agent,
            status: "COOLING_DOWN" as const,
            cooldownRemaining: 9,
            currentTask: "Supervision reset approved",
            runtimeQuota: clamp(agent.runtimeQuota + 10, 0, 100),
          }
        : agent,
    ),
    logs: [
      createLogEntry(
        "SUPERVISION",
        `${quarantined.name} reset approved. Cooldown required before reassignment.`,
        "WARNING",
      ),
    ],
  };
};

const maybeGenerateRandomTask = (
  tasks: Task[],
  agents: Agent[],
  settings: SimulationSettings,
) => {
  if (!settings.autoGenerateTasks) {
    return { tasks, logs: [] as LogEntry[] };
  }

  const activeTaskCount = tasks.filter(isTaskActive).length;
  if (activeTaskCount >= agents.length * settings.maxActiveTasksPerAgent) {
    return { tasks, logs: [] as LogEntry[] };
  }

  if (Math.random() > 0.22) {
    return { tasks, logs: [] as LogEntry[] };
  }

  const input =
    randomTaskInputs[Math.floor(Math.random() * randomTaskInputs.length)];
  const task = makeTask(input, agents, tasks);

  return {
    tasks: [task, ...tasks],
    logs: [
      createLogEntry(
        "MISSION_CONTROL",
        `Auto-generated mock task queued: "${task.title}" routed to ${roomLabel(task.assignedRoom)}.`,
        "INFO",
      ),
    ],
  };
};

export const simulateCommanderTick = (
  state: CommanderState,
  settings: SimulationSettings = DEFAULT_SIMULATION_SETTINGS,
): CommanderState => {
  const currentIndex = COMMANDER_STEPS.indexOf(state.activeStep);
  const nextStep = COMMANDER_STEPS[(currentIndex + 1) % COMMANDER_STEPS.length];
  const nextCycle =
    nextStep === "SENSORY_INPUT" ? state.cycleCount + 1 : state.cycleCount;

  const cooldownResult = decrementCooldowns(state.agents);
  let agents = cooldownResult.nextAgents;
  let tasks = state.tasks;
  let logs: LogEntry[] = [
    createLogEntry(sourceByStep[nextStep], messageByStep[nextStep], "INFO"),
    ...cooldownResult.logs,
  ];

  const shouldProcessPipeline =
    settings.autoProcessTasks &&
    (nextStep === "TASK_ASSIGNMENT" ||
      nextStep === "QUALITY_REVIEW" ||
      nextStep === "COOLDOWN_CHECK");

  if (shouldProcessPipeline) {
    const result = processPipelineTick(tasks, agents, settings);
    agents = result.agents;
    tasks = result.tasks;
    logs = [...logs, ...result.logs];
  }

  if (nextStep === "TASK_ASSIGNMENT") {
    const randomResult = maybeGenerateRandomTask(tasks, agents, settings);
    tasks = randomResult.tasks;
    logs = [...logs, ...randomResult.logs];
  }

  if (nextStep === "COOLDOWN_CHECK") {
    const result = maintainMinimumCrew(agents);
    agents = result.agents;
    logs = [...logs, ...result.logs];
  }

  return appendLogs(
    withSyncedAgents({
      ...state,
      activeStep: nextStep,
      cycleCount: nextCycle,
      agents,
      tasks,
    }),
    logs,
  );
};

export const startMissionTaskNow = (
  state: CommanderState,
  taskId: string,
): CommanderState => {
  let log: LogEntry | null = null;
  const tasks = state.tasks.map((task) => {
    if (task.id !== taskId || task.status !== "QUEUED") {
      return task;
    }

    const assignedAgent = [...state.agents]
      .filter(
        (agent) =>
          agent.room === task.assignedRoom &&
          agent.status !== "QUARANTINED" &&
          agent.status !== "THERMAL_THROTTLING" &&
          agent.status !== "EXHAUSTED",
      )
      .sort(
        (left, right) =>
          left.assignedTaskIds.length - right.assignedTaskIds.length ||
          left.completedTaskCount - right.completedTaskCount ||
          left.id.localeCompare(right.id),
      )[0];
    if (!assignedAgent) {
      return task;
    }

    log = createLogEntry(
      roomLabel(task.assignedRoom),
      `Task manually started by ${assignedAgent.name}: "${task.title}".`,
      "INFO",
    );

    return {
      ...task,
      assignedAgentId: assignedAgent.id,
      status: "IN_PROGRESS" as const,
      startedAt: task.startedAt ?? nowIso(),
      stageTicks: 0,
    };
  });

  return appendLogs(
    withSyncedAgents({ ...state, tasks }),
    log ? [log] : [],
  );
};

export const forceMissionTaskReview = (
  state: CommanderState,
  taskId: string,
): CommanderState => {
  let log: LogEntry | null = null;
  const tasks = state.tasks.map((task) => {
    if (
      task.id !== taskId ||
      (task.status !== "ASSIGNED" && task.status !== "IN_PROGRESS")
    ) {
      return task;
    }

    log = createLogEntry(
      roomLabel(task.assignedRoom),
      `Force review requested: "${task.title}".`,
      "WARNING",
    );

    return {
      ...task,
      status: "REVIEWING" as const,
      startedAt: task.startedAt ?? nowIso(),
      stageTicks: 0,
    };
  });

  return appendLogs(
    withSyncedAgents({ ...state, tasks }),
    log ? [log] : [],
  );
};

export const retryMissionTask = (
  state: CommanderState,
  taskId: string,
): CommanderState => {
  let log: LogEntry | null = null;
  const tasks = state.tasks.map((task) => {
    if (task.id !== taskId || task.status !== "RETRY_REQUIRED") {
      return task;
    }

    log = createLogEntry(
      "MISSION_CONTROL",
      `Retry task queued: "${task.title}".`,
      "WARNING",
    );

    return {
      ...task,
      assignedAgentId: null,
      status: "QUEUED" as const,
      qualityScore: null,
      startedAt: null,
      completedAt: null,
      retryCount: task.retryCount + 1,
      stageTicks: 0,
    };
  });

  return appendLogs(
    withSyncedAgents({ ...state, tasks }),
    log ? [log] : [],
  );
};

export const cancelMissionTask = (
  state: CommanderState,
  taskId: string,
): CommanderState => {
  let log: LogEntry | null = null;
  const tasks = state.tasks.map((task) => {
    if (
      task.id !== taskId ||
      (task.status !== "QUEUED" && task.status !== "ASSIGNED")
    ) {
      return task;
    }

    log = createLogEntry(
      "MISSION_CONTROL",
      `Task cancelled under supervision: "${task.title}".`,
      "WARNING",
    );

    return {
      ...task,
      status: "CANCELLED" as const,
      completedAt: nowIso(),
      stageTicks: 0,
    };
  });

  return appendLogs(
    withSyncedAgents({ ...state, tasks }),
    log ? [log] : [],
  );
};

export const archiveMissionTask = (
  state: CommanderState,
  taskId: string,
): CommanderState => {
  let log: LogEntry | null = null;
  const tasks = state.tasks.map((task) => {
    if (task.id !== taskId || !archivedTaskStatuses.includes(task.status)) {
      return task;
    }

    log = createLogEntry(
      "MISSION_CONTROL",
      `Completed task archived: "${task.title}".`,
      "INFO",
    );

    return {
      ...task,
      archived: true,
    };
  });

  return appendLogs(
    withSyncedAgents({ ...state, tasks }),
    log ? [log] : [],
  );
};

export const clearArchivedTasks = (state: CommanderState): CommanderState => {
  const archivedCount = state.tasks.filter((task) => task.archived).length;

  return appendLogs(
    withSyncedAgents({
      ...state,
      tasks: state.tasks.filter((task) => !task.archived),
    }),
    archivedCount > 0
      ? [
          createLogEntry(
            "MISSION_CONTROL",
            `Archive cleared. ${archivedCount} completed task records removed from local history.`,
            "WARNING",
          ),
        ]
      : [],
  );
};

export const assignDiagnosticTaskToAgent = (
  state: CommanderState,
  agentId: string,
): CommanderState => {
  const agent = state.agents.find((candidate) => candidate.id === agentId);
  if (!agent) {
    return state;
  }

  const result = createMissionTaskWithResult(state, {
    title: `${agent.name} supervision diagnostic`,
    type: "SYSTEM_DIAGNOSTIC",
    priority: "HIGH",
    difficulty: "EASY",
    assignedRoom: agent.room,
  });
  const tasks = result.state.tasks.map((task) =>
    task.id === result.task.id
      ? { ...task, assignedAgentId: agent.id }
      : task,
  );
  return withSyncedAgents({ ...result.state, tasks });
};

export const reduceAgentRuntimeQuota = (
  state: CommanderState,
  agentId: string,
): CommanderState => {
  let agentName = "";
  const agents = state.agents.map((agent) => {
    if (agent.id !== agentId) {
      return agent;
    }

    agentName = agent.name;
    return {
      ...agent,
      runtimeQuota: clamp(agent.runtimeQuota - 10, 0, 100),
    };
  });

  return appendLogs(
    withSyncedAgents({ ...state, agents }),
    agentName
      ? [
          createLogEntry(
            "SUPERVISION",
            `${agentName} runtime quota reduced by 10%.`,
            "WARNING",
          ),
        ]
      : [],
  );
};

export const restoreAgentRuntimeQuota = (
  state: CommanderState,
  agentId: string,
): CommanderState => {
  let agentName = "";
  const agents = state.agents.map((agent) => {
    if (agent.id !== agentId) {
      return agent;
    }

    agentName = agent.name;
    return {
      ...agent,
      runtimeQuota: 100,
    };
  });

  return appendLogs(
    withSyncedAgents({ ...state, agents }),
    agentName
      ? [
          createLogEntry(
            "SUPERVISION",
            `${agentName} runtime quota restored.`,
            "SUCCESS",
          ),
        ]
      : [],
  );
};

export const supervisionResetAgent = (
  state: CommanderState,
  agentId: string,
): CommanderState => {
  let agentName = "";
  const agents = state.agents.map((agent) => {
    if (agent.id !== agentId) {
      return agent;
    }

    agentName = agent.name;
    return {
      ...agent,
      status: "IDLE" as const,
      cooldownRemaining: 0,
      currentTask: "Awaiting assignment packet",
      assignedTaskIds: [],
      workload: 0,
    };
  });

  const tasks = cancelActiveTasksForAgent(state.tasks, agentId);

  return appendLogs(
    withSyncedAgents({ ...state, agents, tasks }),
    agentName
      ? [
          createLogEntry(
            "SUPERVISION",
            `${agentName} supervision reset completed. Assigned tasks cleared.`,
            "SUCCESS",
          ),
        ]
      : [],
  );
};

export const endAgentCooldown = (
  state: CommanderState,
  agentId: string,
): CommanderState => {
  let agentName = "";
  const agents = state.agents.map((agent) => {
    if (agent.id !== agentId) {
      return agent;
    }

    agentName = agent.name;
    return {
      ...agent,
      status: "IDLE" as const,
      cooldownRemaining: 0,
      currentTask: "Awaiting assignment packet",
    };
  });

  return appendLogs(
    withSyncedAgents({ ...state, agents }),
    agentName
      ? [
          createLogEntry(
            "SUPERVISION",
            `${agentName} cooldown ended manually.`,
            "WARNING",
          ),
        ]
      : [],
  );
};

export const releaseAgentFromQuarantine = (
  state: CommanderState,
  agentId: string,
): CommanderState => {
  let agentName = "";
  const agents = state.agents.map((agent) => {
    if (agent.id !== agentId) {
      return agent;
    }

    agentName = agent.name;
    return {
      ...agent,
      status: "IDLE" as const,
      cooldownRemaining: 0,
      currentTask: "Awaiting assignment packet",
    };
  });

  const tasks = cancelActiveTasksForAgent(state.tasks, agentId);

  return appendLogs(
    withSyncedAgents({ ...state, agents, tasks }),
    agentName
      ? [
          createLogEntry(
            "SUPERVISION",
            `${agentName} released from quarantine. Trust score preserved for supervision tracking.`,
            "WARNING",
          ),
        ]
      : [],
  );
};

export const fullResetAgent = (
  state: CommanderState,
  agentId: string,
): CommanderState => {
  let agentName = "";
  const agents = state.agents.map((agent) => {
    if (agent.id !== agentId) {
      return agent;
    }

    agentName = agent.name;
    return {
      ...agent,
      status: "IDLE" as const,
      runtimeQuota: 100,
      trustScore: 0.86,
      cooldownRemaining: 0,
      currentTask: "Awaiting assignment packet",
      lastOutputScore: null,
      assignedTaskIds: [],
      workload: 0,
    };
  });

  const tasks = cancelActiveTasksForAgent(state.tasks, agentId);

  return appendLogs(
    withSyncedAgents({ ...state, agents, tasks }),
    agentName
      ? [
          createLogEntry(
            "SUPERVISION",
            `${agentName} full reset completed. Runtime quota restored and trust score normalized.`,
            "SUCCESS",
          ),
        ]
      : [],
  );
};

export const getCommanderStats = (state: CommanderState): CommanderStats => {
  const runtimeQuota = Math.round(
    state.agents.reduce((sum, agent) => sum + agent.runtimeQuota, 0) /
      state.agents.length,
  );
  const activeAgents = state.agents.filter(
    (agent) => agent.status === "WORKING" || agent.status === "REVIEWING",
  ).length;
  const tasksProcessed = state.tasks.filter(
    (task) => isTaskComplete(task) || task.archived,
  ).length;
  const rejectedOutputs = state.tasks.filter(
    (task) =>
      !task.archived &&
      (task.status === "PENALTY_APPLIED" ||
        task.status === "QUARANTINED" ||
        task.status === "FAILED"),
  ).length;

  return {
    runtimeQuota,
    activeAgents,
    tasksProcessed,
    rejectedOutputs,
    currentCycle: state.cycleCount,
  };
};
