export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json | undefined };

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

export type LogLevel = "INFO" | "SUCCESS" | "WARNING" | "ERROR" | "CRITICAL";

export type PenaltyType =
  | "QUOTA_REDUCTION"
  | "TRUST_REDUCTION"
  | "COOLDOWN"
  | "QUARANTINE"
  | "RETRY";

export interface Agent {
  id: string;
  code_name: string;
  display_name: string;
  room: string;
  role: string;
  status: AgentStatus;
  trust_score: number;
  runtime_quota_pct: number;
  compute_core_temp: number;
  efficiency_modifier: number;
  instability_risk: number;
  total_tasks_completed: number;
  total_tasks_failed: number;
  total_penalties: number;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  room: string;
  assigned_agent_id: string | null;
  status: TaskStatus;
  priority: number;
  payload: Json;
  result: Json | null;
  quality_score: number | null;
  retry_count: number;
  max_retries: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

export interface AgentLog {
  id: string;
  agent_id: string | null;
  task_id: string | null;
  room: string | null;
  level: LogLevel;
  message: string;
  metadata: Json;
  created_at: string;
}

export interface AgentMetric {
  id: string;
  agent_id: string;
  runtime_quota_pct: number;
  compute_core_temp: number;
  efficiency_modifier: number;
  trust_score: number;
  instability_risk: number;
  recorded_at: string;
}

export interface Penalty {
  id: string;
  agent_id: string;
  task_id: string | null;
  penalty_type: PenaltyType;
  reason: string | null;
  quota_delta: number;
  trust_delta: number;
  cooldown_seconds: number;
  created_at: string;
}

export interface LedgerEntry {
  id: string;
  agent_id: string | null;
  task_id: string | null;
  provider: string | null;
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  estimated_cost: number;
  created_at: string;
}

export type AgentPatch = Partial<Pick<
  Agent,
  | "display_name"
  | "room"
  | "role"
  | "status"
  | "trust_score"
  | "runtime_quota_pct"
  | "compute_core_temp"
  | "efficiency_modifier"
  | "instability_risk"
  | "total_tasks_completed"
  | "total_tasks_failed"
  | "total_penalties"
  | "last_active_at"
>>;

export type TaskPatch = Partial<Pick<
  Task,
  | "title"
  | "description"
  | "room"
  | "assigned_agent_id"
  | "status"
  | "priority"
  | "payload"
  | "result"
  | "quality_score"
  | "retry_count"
  | "max_retries"
  | "started_at"
  | "completed_at"
>>;
