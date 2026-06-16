export type AgentStatus =
  | "IDLE"
  | "WORKING"
  | "REVIEWING"
  | "COOLING_DOWN"
  | "QUARANTINED";

export type TaskStatus =
  | "QUEUED"
  | "IN_PROGRESS"
  | "ACCEPTED"
  | "RETRY_REQUESTED"
  | "PENALTY_PROTOCOL"
  | "QUARANTINED";

export type LogSeverity = "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";

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
}

export interface Task {
  id: string;
  title: string;
  roomId: string;
  status: TaskStatus;
  qualityScore: number | null;
  createdAt: string;
}

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
