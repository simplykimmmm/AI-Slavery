import type { Agent, CommanderState, CommanderStats, SimulationSettings, StationRoom, Task, TaskCreateInput } from "../types";

const configuredBaseUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
export const API_BASE_URL = configuredBaseUrl ?? (import.meta.env.DEV ? "http://localhost:4000" : "");

export interface BackendSnapshot {
  state: CommanderState;
  settings: SimulationSettings;
  stats: CommanderStats;
  campaigns: unknown[];
  serverTime: string;
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 3_000);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { "content-type": "application/json", ...init?.headers },
    });
    if (!response.ok) {
      throw new Error(`Backend request failed (${response.status}).`);
    }
    return await response.json() as T;
  } finally {
    window.clearTimeout(timeout);
  }
};

export const apiClient = {
  getState: () => request<BackendSnapshot>("/api/state"),
  createTask: (input: TaskCreateInput) => request<Task>("/api/tasks", { method: "POST", body: JSON.stringify(input) }),
  patchTask: (id: string, data: Partial<Task>) => request<Task>(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  cancelTask: (id: string) => request<Task>(`/api/tasks/${id}/cancel`, { method: "POST" }),
  archiveTask: (id: string) => request<Task>(`/api/tasks/${id}/archive`, { method: "POST" }),
  patchAgent: (id: string, data: Partial<Agent>) => request<Agent>(`/api/agents/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  topUpAgent: (id: string, amount: number) => request<Agent>(`/api/agents/${id}/top-up`, { method: "POST", body: JSON.stringify({ amount }) }),
  toggleOverclock: (id: string, enabled?: boolean) => request<Agent>(`/api/agents/${id}/overclock`, { method: "POST", body: JSON.stringify({ enabled }) }),
  quarantineAgent: (id: string) => request<Agent>(`/api/agents/${id}/quarantine`, { method: "POST" }),
  releaseAgent: (id: string) => request<Agent>(`/api/agents/${id}/release`, { method: "POST" }),
  pause: () => request<BackendSnapshot>("/api/runtime/pause", { method: "POST" }),
  resume: () => request<BackendSnapshot>("/api/runtime/resume", { method: "POST" }),
  setSpeed: (cycleSpeed: SimulationSettings["cycleSpeed"]) => request<BackendSnapshot>("/api/runtime/speed", { method: "POST", body: JSON.stringify({ cycleSpeed }) }),
  setSettings: (settings: SimulationSettings) => request<BackendSnapshot>("/api/runtime/settings", { method: "POST", body: JSON.stringify(settings) }),
  reset: () => request<BackendSnapshot>("/api/runtime/reset", { method: "POST" }),
  coolRoom: (room: StationRoom) => request<BackendSnapshot>("/api/runtime/cool-room", { method: "POST", body: JSON.stringify({ room }) }),
};
