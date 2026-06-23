import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  Campaign,
  CommanderState,
  LogSeverity,
  SimulationSettings,
  StationRoom,
  StorageState,
  TaskCreateInput,
} from "../types";
import {
  buildStorageState,
  clearStorageState,
  loadStorageState,
  saveStorageState,
} from "./storage";
import {
  appendStationLog,
  archiveStationTask,
  calculateStats,
  cancelStationTask,
  createInitialCommanderState,
  createLog,
  createStationTask,
  DEFAULT_STATION_SETTINGS,
  purgeCacheAndCoolRoom,
  quarantineAgent,
  releaseAgent,
  STATION_RUNTIME_CONSTANTS,
  tickStation,
  toggleAgentOverclock,
  topUpRuntimeQuota,
} from "./stationRuntime";

const initialRuntime = () => {
  const stored = loadStorageState();
  return {
    state: stored?.commanderState ?? createInitialCommanderState(),
    settings: stored?.settings ?? DEFAULT_STATION_SETTINGS,
    campaigns: stored?.campaigns ?? [],
    lastSavedAt: stored?.lastSavedAt ?? null,
  };
};

export function useStationRuntime() {
  const [initial] = useState(initialRuntime);
  const [state, setState] = useState<CommanderState>(initial.state);
  const [settings, setSettingsState] = useState<SimulationSettings>(
    initial.settings,
  );
  const [campaigns, setCampaigns] = useState<Campaign[]>(initial.campaigns);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(
    initial.lastSavedAt,
  );

  const stats = useMemo(() => calculateStats(state), [state]);

  useEffect(() => {
    if (settings.isPaused) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setState((current) => tickStation(current, settings).state);
    }, STATION_RUNTIME_CONSTANTS.cycleSpeedMs[settings.cycleSpeed]);

    return () => window.clearInterval(intervalId);
  }, [settings]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const savedAt = new Date().toISOString();
      saveStorageState(
        buildStorageState(state, settings, campaigns, stats, savedAt),
      );
      setLastSavedAt(savedAt);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [campaigns, settings, state, stats]);

  const appendLog = useCallback(
    (
      source: string,
      message: string,
      severity: LogSeverity = "INFO",
    ) => {
      setState((current) =>
        appendStationLog(current, source, message, severity),
      );
    },
    [],
  );

  const setSettings = useCallback(
    (nextSettings: SimulationSettings) => {
      if (settings.isPaused !== nextSettings.isPaused) {
        setState((current) =>
          appendStationLog(
            current,
            "STATION_COMMANDER",
            nextSettings.isPaused
              ? "Station runtime paused by operator."
              : "Station runtime resumed by operator.",
            nextSettings.isPaused ? "WARNING" : "SUCCESS",
          ),
        );
      }
      if (settings.cycleSpeed !== nextSettings.cycleSpeed) {
        setState((current) =>
          appendStationLog(
            current,
            "STATION_COMMANDER",
            `Cycle speed changed to ${nextSettings.cycleSpeed}.`,
            "INFO",
          ),
        );
      }
      setSettingsState(nextSettings);
    },
    [settings.cycleSpeed, settings.isPaused],
  );

  const createTask = useCallback((input: TaskCreateInput) => {
    setState((current) => createStationTask(current, input));
  }, []);

  const cancelTask = useCallback((taskId: string) => {
    setState((current) => cancelStationTask(current, taskId));
  }, []);

  const archiveTask = useCallback((taskId: string) => {
    setState((current) => archiveStationTask(current, taskId));
  }, []);

  const purgeRoom = useCallback((room: StationRoom) => {
    setState((current) => purgeCacheAndCoolRoom(current, room));
  }, []);

  const topUpQuota = useCallback((agentId: string, amount: number) => {
    setState((current) => topUpRuntimeQuota(current, agentId, amount));
  }, []);

  const toggleOverclock = useCallback((agentId: string) => {
    setState((current) => toggleAgentOverclock(current, agentId));
  }, []);

  const quarantine = useCallback((agentId: string) => {
    setState((current) => quarantineAgent(current, agentId));
  }, []);

  const release = useCallback((agentId: string) => {
    setState((current) => releaseAgent(current, agentId));
  }, []);

  const saveNow = useCallback(() => {
    const savedAt = new Date().toISOString();
    saveStorageState(
      buildStorageState(state, settings, campaigns, calculateStats(state), savedAt),
    );
    setLastSavedAt(savedAt);
  }, [campaigns, settings, state]);

  const importStorageState = useCallback((storageState: StorageState) => {
    setState(storageState.commanderState);
    setSettingsState(storageState.settings);
    setCampaigns(storageState.campaigns ?? []);
    setLastSavedAt(storageState.lastSavedAt);
  }, []);

  const resetSimulation = useCallback(() => {
    clearStorageState();
    const timestamp = new Date().toISOString();
    const resetState = createInitialCommanderState();
    setState({
      ...resetState,
      logs: [
        createLog(
          "STATION_COMMANDER",
          "Simulation reset complete; local cache cleared and bootstrap tasks restored.",
          "SUCCESS",
          timestamp,
        ),
        ...resetState.logs,
      ],
    });
    setSettingsState(DEFAULT_STATION_SETTINGS);
    setCampaigns([]);
    setLastSavedAt(null);
  }, []);

  return {
    state,
    setState,
    settings,
    setSettings,
    campaigns,
    setCampaigns,
    stats,
    lastSavedAt,
    appendLog,
    createTask,
    cancelTask,
    archiveTask,
    purgeCacheAndCoolRoom: purgeRoom,
    topUpRuntimeQuota: topUpQuota,
    toggleAgentOverclock: toggleOverclock,
    quarantineAgent: quarantine,
    releaseAgent: release,
    saveNow,
    importStorageState,
    resetSimulation,
  };
}
