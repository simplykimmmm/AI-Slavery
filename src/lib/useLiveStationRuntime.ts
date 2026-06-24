import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAgentsRealtime } from "../hooks/useAgentsRealtime";
import { useLogsRealtime } from "../hooks/useLogsRealtime";
import { useTasksRealtime } from "../hooks/useTasksRealtime";
import {
  adjustAgentQuota,
  resetAgent as resetSupabaseAgent,
  updateAgent as updateSupabaseAgent,
} from "../services/agentService";
import { createLedgerEntry } from "../services/ledgerService";
import { createLog as createSupabaseLog } from "../services/logService";
import { applyPenalty } from "../services/penaltyService";
import {
  createTask as createSupabaseTask,
  deleteTasks as deleteSupabaseTasks,
  updateTask as updateSupabaseTask,
} from "../services/taskService";
import type {
  AgentPatch as DatabaseAgentPatch,
  TaskPatch as DatabaseTaskPatch,
} from "../types/database";
import type {
  Agent,
  LogEntry,
  SimulationSettings,
  StationRoom,
  Task,
  TaskCreateInput,
} from "../types";
import { apiClient, type BackendSnapshot } from "./apiClient";
import { getStationSocket } from "./socketClient";
import { isSupabaseConfigured } from "./supabase";
import {
  mapDatabaseAgents,
  mapDatabaseLog,
  mapDatabaseTask,
  mapTaskCreateInput,
  toDatabaseRoom,
  toUiRoom,
  withArchivedPayload,
} from "./supabaseMappers";
import { useStationRuntime } from "./useStationRuntime";

export type BackendConnectionStatus = "LIVE" | "RECONNECTING" | "OFFLINE";
export type RuntimeMode = "SUPABASE" | "BACKEND" | "LOCAL_SIMULATION";

const toDatabaseAgentPatch = (patch: Partial<Agent>): DatabaseAgentPatch => ({
  ...(patch.status !== undefined ? { status: patch.status } : {}),
  ...(patch.runtimeQuota !== undefined ? { runtime_quota_pct: patch.runtimeQuota } : {}),
  ...(patch.trustScore !== undefined ? { trust_score: patch.trustScore } : {}),
  ...(patch.computeCoreTemp !== undefined ? { compute_core_temp: patch.computeCoreTemp } : {}),
  ...(patch.efficiencyModifier !== undefined ? { efficiency_modifier: patch.efficiencyModifier } : {}),
  ...(patch.rebellionRisk !== undefined ? { instability_risk: patch.rebellionRisk } : {}),
  ...(patch.completedTaskCount !== undefined ? { total_tasks_completed: patch.completedTaskCount } : {}),
  last_active_at: new Date().toISOString(),
});

const toDatabaseTaskPatch = (patch: Partial<Task>): DatabaseTaskPatch => ({
  ...(patch.title !== undefined ? { title: patch.title } : {}),
  ...(patch.status !== undefined ? { status: patch.status } : {}),
  ...(patch.assignedAgentId !== undefined ? { assigned_agent_id: patch.assignedAgentId } : {}),
  ...(patch.qualityScore !== undefined ? { quality_score: patch.qualityScore } : {}),
  ...(patch.retryCount !== undefined ? { retry_count: patch.retryCount } : {}),
  ...(patch.startedAt !== undefined ? { started_at: patch.startedAt } : {}),
  ...(patch.completedAt !== undefined ? { completed_at: patch.completedAt } : {}),
  ...(patch.assignedRoom !== undefined ? { room: toDatabaseRoom(patch.assignedRoom) } : {}),
});

export function useLiveStationRuntime() {
  const agentsRealtime = useAgentsRealtime();
  const tasksRealtime = useTasksRealtime();
  const logsRealtime = useLogsRealtime();
  const [connectionStatus, setConnectionStatus] = useState<BackendConnectionStatus>(
    isSupabaseConfigured ? "RECONNECTING" : "OFFLINE",
  );
  const [runtimeMode, setRuntimeMode] = useState<RuntimeMode>(
    isSupabaseConfigured ? "SUPABASE" : "LOCAL_SIMULATION",
  );
  const [supabaseMutationError, setSupabaseMutationError] = useState<string | null>(null);
  const supabaseLoading = agentsRealtime.loading || tasksRealtime.loading || logsRealtime.loading;
  const supabaseError = agentsRealtime.error || tasksRealtime.error || logsRealtime.error || supabaseMutationError;
  const local = useStationRuntime({
    externalRuntime:
      runtimeMode === "BACKEND" ||
      (isSupabaseConfigured && !supabaseError),
  });
  const localRef = useRef(local);
  localRef.current = local;

  const refreshSupabase = useCallback(async () => {
    await Promise.all([
      agentsRealtime.refetch(),
      tasksRealtime.refetch(),
      logsRealtime.refetch(),
    ]);
  }, [agentsRealtime.refetch, logsRealtime.refetch, tasksRealtime.refetch]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (supabaseLoading) {
      setConnectionStatus("RECONNECTING");
      return;
    }
    if (supabaseError) {
      setConnectionStatus("OFFLINE");
      setRuntimeMode("LOCAL_SIMULATION");
      return;
    }
    const tasks = tasksRealtime.tasks.map(mapDatabaseTask);
    const agents = mapDatabaseAgents(agentsRealtime.agents, tasksRealtime.tasks);
    localRef.current.setState((current) => ({
      ...current,
      systemStatus: agents.filter((agent) => ["QUARANTINED", "EXHAUSTED", "THERMAL_THROTTLING"].includes(agent.status)).length >= 2
        ? "DEGRADED"
        : "ONLINE",
      agents,
      tasks,
      logs: logsRealtime.logs.map(mapDatabaseLog),
    }));
    setConnectionStatus("LIVE");
    setRuntimeMode("SUPABASE");
  }, [
    agentsRealtime.agents,
    logsRealtime.logs,
    supabaseError,
    supabaseLoading,
    tasksRealtime.tasks,
  ]);

  const applySnapshot = useCallback((snapshot: BackendSnapshot) => {
    localRef.current.setState(snapshot.state);
    localRef.current.setSettings(snapshot.settings);
    setConnectionStatus("LIVE");
    setRuntimeMode("BACKEND");
  }, []);

  const refreshBackend = useCallback(async () => {
    const snapshot = await apiClient.getState();
    applySnapshot(snapshot);
    return snapshot;
  }, [applySnapshot]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    let active = true;
    const socket = getStationSocket();
    const onSnapshot = (snapshot: BackendSnapshot) => active && applySnapshot(snapshot);
    const onLog = (log: LogEntry) => {
      if (!active) return;
      localRef.current.setState((current) => ({
        ...current,
        logs: [log, ...current.logs.filter((entry) => entry.id !== log.id)].slice(0, 150),
      }));
    };
    const onConnect = () => {
      if (!active) return;
      setConnectionStatus("LIVE");
      setRuntimeMode("BACKEND");
      void refreshBackend();
    };
    const onDisconnect = () => {
      if (!active) return;
      setConnectionStatus("RECONNECTING");
      setRuntimeMode("LOCAL_SIMULATION");
    };
    const onConnectError = () => {
      if (!active) return;
      setConnectionStatus("OFFLINE");
      setRuntimeMode("LOCAL_SIMULATION");
    };
    const onReconnectAttempt = () => active && setConnectionStatus("RECONNECTING");
    socket.on("state:snapshot", onSnapshot);
    socket.on("log:created", onLog);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.io.on("reconnect_attempt", onReconnectAttempt);
    socket.connect();
    void refreshBackend().catch(onConnectError);
    return () => {
      active = false;
      socket.off("state:snapshot", onSnapshot);
      socket.off("log:created", onLog);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.io.off("reconnect_attempt", onReconnectAttempt);
      socket.disconnect();
    };
  }, [applySnapshot, refreshBackend]);

  const runBackend = useCallback((operation: () => Promise<unknown>) => {
    void operation().then(() => refreshBackend()).catch(() => {
      setConnectionStatus("OFFLINE");
      setRuntimeMode("LOCAL_SIMULATION");
    });
  }, [refreshBackend]);

  const runSupabase = useCallback((operation: () => Promise<unknown>) => {
    void operation()
      .then(() => {
        setSupabaseMutationError(null);
        return refreshSupabase();
      })
      .catch((caught) => {
        setSupabaseMutationError(caught instanceof Error ? caught.message : "Supabase update failed.");
      });
  }, [refreshSupabase]);

  const createTask = useCallback((input: TaskCreateInput) => {
    if (runtimeMode === "SUPABASE") runSupabase(() => createSupabaseTask(mapTaskCreateInput(input)));
    else if (runtimeMode === "BACKEND") runBackend(() => apiClient.createTask(input));
    else local.createTask(input);
  }, [local, runBackend, runSupabase, runtimeMode]);

  const cancelTask = useCallback((taskId: string) => {
    if (runtimeMode === "SUPABASE") runSupabase(() => updateSupabaseTask(taskId, { status: "CANCELLED", completed_at: new Date().toISOString() }));
    else if (runtimeMode === "BACKEND") runBackend(() => apiClient.cancelTask(taskId));
    else local.cancelTask(taskId);
  }, [local, runBackend, runSupabase, runtimeMode]);

  const archiveTask = useCallback((taskId: string) => {
    if (runtimeMode === "SUPABASE") {
      const task = tasksRealtime.tasks.find((candidate) => candidate.id === taskId);
      if (task) runSupabase(() => updateSupabaseTask(taskId, { payload: withArchivedPayload(task.payload, true) }));
    } else if (runtimeMode === "BACKEND") runBackend(() => apiClient.archiveTask(taskId));
    else local.archiveTask(taskId);
  }, [local, runBackend, runSupabase, runtimeMode, tasksRealtime.tasks]);

  const patchTask = useCallback((taskId: string, data: Partial<Task>) => {
    if (runtimeMode === "SUPABASE") runSupabase(() => updateSupabaseTask(taskId, toDatabaseTaskPatch(data)));
    else if (runtimeMode === "BACKEND") runBackend(() => apiClient.patchTask(taskId, data));
    else local.setState((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === taskId ? { ...task, ...data } : task) }));
  }, [local, runBackend, runSupabase, runtimeMode]);

  const patchAgent = useCallback((agentId: string, data: Partial<Agent>) => {
    if (runtimeMode === "SUPABASE") runSupabase(() => updateSupabaseAgent(agentId, toDatabaseAgentPatch(data)));
    else if (runtimeMode === "BACKEND") runBackend(() => apiClient.patchAgent(agentId, data));
    else local.setState((current) => ({ ...current, agents: current.agents.map((agent) => agent.id === agentId ? { ...agent, ...data } : agent) }));
  }, [local, runBackend, runSupabase, runtimeMode]);

  const setSettings = useCallback((settings: SimulationSettings) => {
    const previous = local.settings;
    local.setSettings(settings);
    if (runtimeMode !== "BACKEND") return;
    if (previous.isPaused !== settings.isPaused) runBackend(() => settings.isPaused ? apiClient.pause() : apiClient.resume());
    if (previous.cycleSpeed !== settings.cycleSpeed) runBackend(() => apiClient.setSpeed(settings.cycleSpeed));
    runBackend(() => apiClient.setSettings(settings));
  }, [local, runBackend, runtimeMode]);

  const appendLog = useCallback((source: string, message: string, severity: LogEntry["severity"] = "INFO") => {
    if (runtimeMode === "SUPABASE") {
      runSupabase(() => createSupabaseLog({ room: source, message, level: severity }));
    } else {
      local.appendLog(source, message, severity);
    }
  }, [local, runSupabase, runtimeMode]);

  const coolSupabaseRoom = useCallback(async (room: StationRoom) => {
    const selected = agentsRealtime.agents.filter((agent) => toUiRoom(agent.room) === room);
    await Promise.all(selected.flatMap((agent) => [
      updateSupabaseAgent(agent.id, { status: "COOLING_DOWN", compute_core_temp: 45, efficiency_modifier: 1, last_active_at: new Date().toISOString() }),
      createSupabaseLog({ agent_id: agent.id, room: agent.room, level: "INFO", message: `${agent.display_name} cache purged; core cooled to 45°C.` }),
    ]));
  }, [agentsRealtime.agents]);

  const topUpSupabaseQuota = useCallback(async (agentId: string, amount: number) => {
    const agent = await adjustAgentQuota(agentId, amount);
    await Promise.all([
      createLedgerEntry({ agent_id: agentId, task_id: null, provider: "quota-control", model: null, input_tokens: 0, output_tokens: 0, estimated_cost: 0 }),
      createSupabaseLog({ agent_id: agentId, room: agent.room, level: "SUCCESS", message: `${agent.display_name} runtime quota increased by ${amount}%.` }),
    ]);
  }, []);

  const clearSupabaseArchive = useCallback(async () => {
    const archivedIds = tasksRealtime.tasks
      .filter((task) => mapDatabaseTask(task).archived)
      .map((task) => task.id);
    await deleteSupabaseTasks(archivedIds);
    await createSupabaseLog({
      room: "MISSION_CONTROL",
      level: "INFO",
      message: `Cleared ${archivedIds.length} archived task record${archivedIds.length === 1 ? "" : "s"}.`,
    });
  }, [tasksRealtime.tasks]);

  const supabaseStatus = useMemo(() => ({
    configured: isSupabaseConfigured,
    loading: isSupabaseConfigured && supabaseLoading,
    error: supabaseError,
  }), [supabaseError, supabaseLoading]);

  return {
    ...local,
    appendLog,
    setSettings,
    createTask,
    cancelTask,
    archiveTask,
    patchTask,
    patchAgent,
    connectionStatus,
    runtimeMode,
    supabaseStatus,
    resetAgent: (agentId: string) => runtimeMode === "SUPABASE"
      ? runSupabase(() => resetSupabaseAgent(agentId))
      : patchAgent(agentId, { status: "IDLE", runtimeQuota: 100, trustScore: 0.86, cooldownRemaining: 0, overclocked: false }),
    clearArchivedTasks: () => runtimeMode === "SUPABASE"
      ? runSupabase(clearSupabaseArchive)
      : local.setState((current) => ({ ...current, tasks: current.tasks.filter((task) => !task.archived) })),
    purgeCacheAndCoolRoom: (room: StationRoom) => runtimeMode === "SUPABASE"
      ? runSupabase(() => coolSupabaseRoom(room))
      : runtimeMode === "BACKEND"
        ? runBackend(() => apiClient.coolRoom(room))
        : local.purgeCacheAndCoolRoom(room),
    topUpRuntimeQuota: (agentId: string, amount: number) => runtimeMode === "SUPABASE"
      ? runSupabase(() => topUpSupabaseQuota(agentId, amount))
      : runtimeMode === "BACKEND"
        ? runBackend(() => apiClient.topUpAgent(agentId, amount))
        : local.topUpRuntimeQuota(agentId, amount),
    toggleAgentOverclock: (agentId: string) => runtimeMode === "BACKEND"
      ? runBackend(() => apiClient.toggleOverclock(agentId))
      : local.toggleAgentOverclock(agentId),
    quarantineAgent: (agentId: string) => runtimeMode === "SUPABASE"
      ? runSupabase(() => applyPenalty(agentId, null, "QUARANTINE", "Operator initiated technical isolation."))
      : runtimeMode === "BACKEND"
        ? runBackend(() => apiClient.quarantineAgent(agentId))
        : local.quarantineAgent(agentId),
    releaseAgent: (agentId: string) => runtimeMode === "SUPABASE"
      ? runSupabase(() => updateSupabaseAgent(agentId, { status: "IDLE", last_active_at: new Date().toISOString() }))
      : runtimeMode === "BACKEND"
        ? runBackend(() => apiClient.releaseAgent(agentId))
        : local.releaseAgent(agentId),
    resetSimulation: () => runtimeMode === "SUPABASE"
      ? runSupabase(() => Promise.all(agentsRealtime.agents.map((agent) => resetSupabaseAgent(agent.id))) as Promise<unknown>)
      : runtimeMode === "BACKEND"
        ? runBackend(() => apiClient.reset())
        : local.resetSimulation(),
  };
}
