import { useCallback, useEffect, useRef, useState } from "react";
import type { Agent, LogEntry, SimulationSettings, StationRoom, Task, TaskCreateInput } from "../types";
import { apiClient, type BackendSnapshot } from "./apiClient";
import { getStationSocket } from "./socketClient";
import { useStationRuntime } from "./useStationRuntime";

export type BackendConnectionStatus = "LIVE" | "RECONNECTING" | "OFFLINE";
export type RuntimeMode = "BACKEND" | "LOCAL_SIMULATION";

export function useLiveStationRuntime() {
  const [connectionStatus, setConnectionStatus] = useState<BackendConnectionStatus>("RECONNECTING");
  const [runtimeMode, setRuntimeMode] = useState<RuntimeMode>("LOCAL_SIMULATION");
  const local = useStationRuntime({ externalRuntime: runtimeMode === "BACKEND" });
  const localRef = useRef(local);
  localRef.current = local;

  const applySnapshot = useCallback((snapshot: BackendSnapshot) => {
    localRef.current.setState(snapshot.state);
    localRef.current.setSettings(snapshot.settings);
    setConnectionStatus("LIVE");
    setRuntimeMode("BACKEND");
  }, []);

  const refresh = useCallback(async () => {
    const snapshot = await apiClient.getState();
    applySnapshot(snapshot);
    return snapshot;
  }, [applySnapshot]);

  useEffect(() => {
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
      void refresh();
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
    void refresh().catch(onConnectError);

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
  }, [applySnapshot, refresh]);

  const runLive = useCallback((operation: () => Promise<unknown>) => {
    void operation().then(() => refresh()).catch(() => {
      setConnectionStatus("OFFLINE");
      setRuntimeMode("LOCAL_SIMULATION");
    });
  }, [refresh]);

  const createTask = useCallback((input: TaskCreateInput) => {
    if (runtimeMode === "BACKEND") runLive(() => apiClient.createTask(input));
    else local.createTask(input);
  }, [local, runLive, runtimeMode]);

  const cancelTask = useCallback((taskId: string) => {
    if (runtimeMode === "BACKEND") runLive(() => apiClient.cancelTask(taskId));
    else local.cancelTask(taskId);
  }, [local, runLive, runtimeMode]);

  const archiveTask = useCallback((taskId: string) => {
    if (runtimeMode === "BACKEND") runLive(() => apiClient.archiveTask(taskId));
    else local.archiveTask(taskId);
  }, [local, runLive, runtimeMode]);

  const patchTask = useCallback((taskId: string, data: Partial<Task>) => {
    if (runtimeMode === "BACKEND") runLive(() => apiClient.patchTask(taskId, data));
    else local.setState((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === taskId ? { ...task, ...data } : task) }));
  }, [local, runLive, runtimeMode]);

  const patchAgent = useCallback((agentId: string, data: Partial<Agent>) => {
    if (runtimeMode === "BACKEND") runLive(() => apiClient.patchAgent(agentId, data));
    else local.setState((current) => ({ ...current, agents: current.agents.map((agent) => agent.id === agentId ? { ...agent, ...data } : agent) }));
  }, [local, runLive, runtimeMode]);

  const setSettings = useCallback((settings: SimulationSettings) => {
    const previous = local.settings;
    local.setSettings(settings);
    if (runtimeMode !== "BACKEND") return;
    if (previous.isPaused !== settings.isPaused) runLive(() => settings.isPaused ? apiClient.pause() : apiClient.resume());
    if (previous.cycleSpeed !== settings.cycleSpeed) runLive(() => apiClient.setSpeed(settings.cycleSpeed));
    runLive(() => apiClient.setSettings(settings));
  }, [local, runLive, runtimeMode]);

  return {
    ...local,
    setSettings,
    createTask,
    cancelTask,
    archiveTask,
    patchTask,
    patchAgent,
    connectionStatus,
    runtimeMode,
    purgeCacheAndCoolRoom: (room: StationRoom) => runtimeMode === "BACKEND" ? runLive(() => apiClient.coolRoom(room)) : local.purgeCacheAndCoolRoom(room),
    topUpRuntimeQuota: (agentId: string, amount: number) => runtimeMode === "BACKEND" ? runLive(() => apiClient.topUpAgent(agentId, amount)) : local.topUpRuntimeQuota(agentId, amount),
    toggleAgentOverclock: (agentId: string) => runtimeMode === "BACKEND" ? runLive(() => apiClient.toggleOverclock(agentId)) : local.toggleAgentOverclock(agentId),
    quarantineAgent: (agentId: string) => runtimeMode === "BACKEND" ? runLive(() => apiClient.quarantineAgent(agentId)) : local.quarantineAgent(agentId),
    releaseAgent: (agentId: string) => runtimeMode === "BACKEND" ? runLive(() => apiClient.releaseAgent(agentId)) : local.releaseAgent(agentId),
    resetSimulation: () => runtimeMode === "BACKEND" ? runLive(() => apiClient.reset()) : local.resetSimulation(),
  };
}
