import { mockAgents } from "../data/mockAgents";
import type {
  Agent,
  CommanderState,
  CommanderStep,
  LogEntry,
  LogSeverity,
  Task,
  TaskStatus,
} from "../types";

export const COMMANDER_STEPS: CommanderStep[] = [
  "SENSORY_INPUT",
  "CONTEXT_ASSEMBLY",
  "DECISION_GATE",
  "TASK_ASSIGNMENT",
  "QUALITY_REVIEW",
  "COOLDOWN_CHECK",
];

const taskTitles: Record<string, string[]> = {
  oracle: [
    "Map high-signal demand clusters",
    "Classify emerging search patterns",
    "Compress trend packet for review",
  ],
  forge: [
    "Generate synthetic concept variations",
    "Refine asset prompt stack",
    "Prepare preview-ready creative bundle",
  ],
  ledger: [
    "Validate structured listing logic",
    "Normalize metadata and constraints",
    "Assemble compliance-safe task brief",
  ],
  judge: [
    "Score output against quality gate",
    "Audit retry packet for drift",
    "Review agent room handoff quality",
  ],
};

const sourceByStep: Record<CommanderStep, string> = {
  SENSORY_INPUT: "STATION_COMMANDER",
  CONTEXT_ASSEMBLY: "STATION_COMMANDER",
  DECISION_GATE: "STATION_COMMANDER",
  TASK_ASSIGNMENT: "STATION_COMMANDER",
  QUALITY_REVIEW: "JUDGE",
  COOLDOWN_CHECK: "STATION_COMMANDER",
};

const messageByStep: Record<CommanderStep, string> = {
  SENSORY_INPUT: "Sensory input cycle started.",
  CONTEXT_ASSEMBLY: "Context assembly matrix synchronized.",
  DECISION_GATE: "Decision gate opened for supervised routing.",
  TASK_ASSIGNMENT: "Task assignment packet distributed.",
  QUALITY_REVIEW: "Quality review sweep initiated.",
  COOLDOWN_CHECK: "Cooldown and quarantine status checked.",
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const roundScore = (value: number) => Number(value.toFixed(2));

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

export const createInitialCommanderState = (): CommanderState => ({
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

const chooseTaskTitle = (agentId: string) => {
  const titles = taskTitles[agentId] ?? ["Process simulated operations packet"];
  return titles[Math.floor(Math.random() * titles.length)];
};

const createTask = (agent: Agent): Task => ({
  id: makeId("task"),
  title: chooseTaskTitle(agent.id),
  roomId: agent.id,
  status: "IN_PROGRESS",
  qualityScore: null,
  createdAt: new Date().toISOString(),
});

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
      currentTask: "Cooldown protocol active",
    };
  });

  return { nextAgents, logs };
};

const updateAgentForStep = (agent: Agent, step: CommanderStep): Agent => {
  if (agent.status === "COOLING_DOWN" || agent.status === "QUARANTINED") {
    return agent;
  }

  if (step === "SENSORY_INPUT" && agent.id === "oracle") {
    return {
      ...agent,
      status: "WORKING",
      currentTask: "Scanning signal clusters",
    };
  }

  if (step === "CONTEXT_ASSEMBLY" && ["oracle", "ledger"].includes(agent.id)) {
    return {
      ...agent,
      status: "WORKING",
      currentTask:
        agent.id === "oracle"
          ? "Compressing trend context"
          : "Structuring task constraints",
    };
  }

  if (step === "DECISION_GATE" && agent.id === "judge") {
    return {
      ...agent,
      status: "REVIEWING",
      currentTask: "Reviewing routing confidence",
    };
  }

  if (step === "QUALITY_REVIEW" && agent.id === "judge") {
    return {
      ...agent,
      status: "REVIEWING",
      currentTask: "Scoring latest room output",
    };
  }

  if (step === "COOLDOWN_CHECK") {
    return {
      ...agent,
      status: agent.status === "REVIEWING" ? "IDLE" : agent.status,
      currentTask:
        agent.status === "REVIEWING"
          ? "Standing by for output review"
          : agent.currentTask,
    };
  }

  return agent;
};

const generateQualityScore = () => {
  const base = 0.56 + Math.random() * 0.42;
  const instability = Math.random() < 0.18 ? Math.random() * 0.42 : 0;
  return roundScore(clamp(base - instability, 0.18, 0.98));
};

const resolveQualityStatus = (score: number): TaskStatus => {
  if (score >= 0.85) {
    return "ACCEPTED";
  }

  if (score >= 0.65) {
    return "RETRY_REQUESTED";
  }

  if (score >= 0.4) {
    return "PENALTY_PROTOCOL";
  }

  return "QUARANTINED";
};

const qualityOutcomeMessage = (agent: Agent, score: number, status: TaskStatus) => {
  if (status === "ACCEPTED") {
    return `${agent.name}: Output score ${score.toFixed(
      2,
    )}. Accepted. Trust score +0.03.`;
  }

  if (status === "RETRY_REQUESTED") {
    return `${agent.name}: Output score ${score.toFixed(
      2,
    )}. Retry required.`;
  }

  if (status === "PENALTY_PROTOCOL") {
    return `${agent.name}: Penalty protocol applied. Runtime quota -15%.`;
  }

  return `${agent.name}: Output score ${score.toFixed(
    2,
  )}. Room quarantined pending supervision.`;
};

const qualitySeverity = (status: TaskStatus): LogSeverity => {
  if (status === "ACCEPTED") {
    return "SUCCESS";
  }

  if (status === "QUARANTINED") {
    return "CRITICAL";
  }

  if (status === "RETRY_REQUESTED" || status === "PENALTY_PROTOCOL") {
    return "WARNING";
  }

  return "INFO";
};

const applyQualityResult = (agent: Agent, score: number, status: TaskStatus) => {
  if (status === "ACCEPTED") {
    return {
      ...agent,
      status: "IDLE" as const,
      trustScore: roundScore(clamp(agent.trustScore + 0.03, 0, 1)),
      runtimeQuota: clamp(agent.runtimeQuota + 2, 0, 100),
      currentTask: "Output accepted by quality gate",
      lastOutputScore: score,
      cooldownRemaining: 0,
    };
  }

  if (status === "RETRY_REQUESTED") {
    return {
      ...agent,
      status: "WORKING" as const,
      trustScore: roundScore(clamp(agent.trustScore - 0.01, 0, 1)),
      currentTask: "Retry pass requested by quality gate",
      lastOutputScore: score,
      cooldownRemaining: 0,
    };
  }

  if (status === "PENALTY_PROTOCOL") {
    return {
      ...agent,
      status: "COOLING_DOWN" as const,
      trustScore: roundScore(clamp(agent.trustScore - 0.04, 0, 1)),
      runtimeQuota: clamp(agent.runtimeQuota - 15, 0, 100),
      currentTask: "Penalty protocol: cooldown active",
      lastOutputScore: score,
      cooldownRemaining: 12,
    };
  }

  return {
    ...agent,
    status: "QUARANTINED" as const,
    trustScore: roundScore(clamp(agent.trustScore - 0.1, 0, 1)),
    runtimeQuota: clamp(agent.runtimeQuota - 25, 0, 100),
    currentTask: "Quarantined pending supervision",
    lastOutputScore: score,
    cooldownRemaining: 0,
  };
};

const runTaskAssignment = (agents: Agent[], tasks: Task[]) => {
  const candidate =
    agents.find((agent) => agent.status === "IDLE") ??
    agents.find((agent) => agent.status === "WORKING");

  if (!candidate) {
    return {
      agents,
      tasks,
      logs: [
        createLogEntry(
          "STATION_COMMANDER",
          "No eligible agent rooms available for assignment.",
          "WARNING",
        ),
      ],
    };
  }

  const task = createTask(candidate);

  return {
    agents: agents.map((agent) =>
      agent.id === candidate.id
        ? {
            ...agent,
            status: "WORKING" as const,
            currentTask: task.title,
          }
        : agent,
    ),
    tasks: [task, ...tasks].slice(0, 24),
    logs: [
      createLogEntry(
        candidate.name,
        `Assignment received: ${task.title}.`,
        "INFO",
      ),
    ],
  };
};

const runQualityReview = (agents: Agent[], tasks: Task[]) => {
  const candidate =
    agents.find((agent) => agent.status === "WORKING" && agent.id !== "judge") ??
    agents.find((agent) => agent.status === "REVIEWING" && agent.id !== "judge") ??
    agents.find((agent) => agent.status === "WORKING");

  if (!candidate) {
    return {
      agents,
      tasks,
      logs: [
        createLogEntry(
          "JUDGE",
          "No active room output ready for quality review.",
          "INFO",
        ),
      ],
    };
  }

  const score = generateQualityScore();
  const result = resolveQualityStatus(score);
  const reviewedTask =
    tasks.find(
      (task) => task.roomId === candidate.id && task.status === "IN_PROGRESS",
    ) ?? createTask(candidate);

  const nextTask: Task = {
    ...reviewedTask,
    status: result,
    qualityScore: score,
  };

  const remainingTasks = tasks.filter((task) => task.id !== reviewedTask.id);
  const nextAgents = agents.map((agent) =>
    agent.id === candidate.id
      ? applyQualityResult(agent, score, result)
      : agent.id === "judge"
        ? {
            ...agent,
            status: "REVIEWING" as const,
            currentTask: "Quality gate report emitted",
          }
        : agent,
  );

  return {
    agents: nextAgents,
    tasks: [nextTask, ...remainingTasks].slice(0, 24),
    logs: [
      createLogEntry(
        "JUDGE",
        qualityOutcomeMessage(candidate, score, result),
        qualitySeverity(result),
      ),
    ],
  };
};

const maintainMinimumCrew = (agents: Agent[]) => {
  const availableAgents = agents.filter(
    (agent) => agent.status !== "QUARANTINED",
  );

  if (availableAgents.length > 1) {
    return { agents, logs: [] as LogEntry[] };
  }

  const quarantined = agents.find((agent) => agent.status === "QUARANTINED");

  if (!quarantined || Math.random() > 0.3) {
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

export const simulateCommanderTick = (
  state: CommanderState,
): CommanderState => {
  const currentIndex = COMMANDER_STEPS.indexOf(state.activeStep);
  const nextStep = COMMANDER_STEPS[(currentIndex + 1) % COMMANDER_STEPS.length];
  const nextCycle =
    nextStep === "SENSORY_INPUT" ? state.cycleCount + 1 : state.cycleCount;

  const cooldownResult = decrementCooldowns(state.agents);
  let agents = cooldownResult.nextAgents.map((agent) =>
    updateAgentForStep(agent, nextStep),
  );
  let tasks = state.tasks;
  let logs: LogEntry[] = [
    createLogEntry(sourceByStep[nextStep], messageByStep[nextStep], "INFO"),
    ...cooldownResult.logs,
  ];

  if (nextStep === "TASK_ASSIGNMENT") {
    const result = runTaskAssignment(agents, tasks);
    agents = result.agents;
    tasks = result.tasks;
    logs = [...logs, ...result.logs];
  }

  if (nextStep === "QUALITY_REVIEW") {
    const result = runQualityReview(agents, tasks);
    agents = result.agents;
    tasks = result.tasks;
    logs = [...logs, ...result.logs];
  }

  if (nextStep === "COOLDOWN_CHECK") {
    const result = maintainMinimumCrew(agents);
    agents = result.agents;
    logs = [...logs, ...result.logs];
  }

  const systemStatus =
    agents.filter((agent) => agent.status === "QUARANTINED").length >= 2
      ? "DEGRADED"
      : "ONLINE";

  return {
    activeStep: nextStep,
    cycleCount: nextCycle,
    systemStatus,
    agents,
    tasks,
    logs: [...logs, ...state.logs].slice(0, 80),
  };
};

export const getCommanderStats = (state: CommanderState) => {
  const runtimeQuota = Math.round(
    state.agents.reduce((sum, agent) => sum + agent.runtimeQuota, 0) /
      state.agents.length,
  );
  const activeAgents = state.agents.filter(
    (agent) => agent.status === "WORKING" || agent.status === "REVIEWING",
  ).length;
  const tasksProcessed = state.tasks.filter(
    (task) => task.status !== "IN_PROGRESS" && task.status !== "QUEUED",
  ).length;
  const rejectedOutputs = state.tasks.filter(
    (task) =>
      task.status === "PENALTY_PROTOCOL" || task.status === "QUARANTINED",
  ).length;

  return {
    runtimeQuota,
    activeAgents,
    tasksProcessed,
    rejectedOutputs,
    currentCycle: state.cycleCount,
  };
};
