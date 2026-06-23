import type {
  Agent,
  Campaign,
  CommanderState,
  CommanderStats,
  SimulationSettings,
  StorageState,
} from "../types";
import { migrateCampaigns } from "./campaigns";
import { calculateStats, createLog } from "./stationRuntime";

const STORAGE_KEY = "ultron-command-deck:v2";
const STORAGE_VERSION = 4;

const roomByAgentId: Record<string, Agent["room"]> = {
  oracle: "ORACLE",
  forge: "FORGE",
  ledger: "LEDGER",
  judge: "JUDGE",
};

const migrateAgent = (agent: Agent, index: number): Agent => ({
  ...agent,
  computeCoreTemp:
    typeof agent.computeCoreTemp === "number"
      ? agent.computeCoreTemp
      : 36 + index * 3,
  efficiencyModifier:
    typeof agent.efficiencyModifier === "number"
      ? agent.efficiencyModifier
      : 1,
  rebellionRisk:
    typeof agent.rebellionRisk === "number" ? agent.rebellionRisk : 0.08,
  overclocked:
    typeof agent.overclocked === "boolean" ? agent.overclocked : false,
  totalTokensSpent:
    typeof agent.totalTokensSpent === "number" ? agent.totalTokensSpent : 0,
  totalCost: typeof agent.totalCost === "number" ? agent.totalCost : 0,
  lastHeartbeatAt:
    typeof agent.lastHeartbeatAt === "string"
      ? agent.lastHeartbeatAt
      : new Date().toISOString(),
  room:
    agent.room ?? roomByAgentId[agent.id] ?? ("ORACLE" as Agent["room"]),
});

const migrateStorageState = (
  parsed: Partial<StorageState>,
  importMessage: string,
): StorageState | null => {
  if (
    !parsed.commanderState ||
    !parsed.settings ||
    !Array.isArray(parsed.commanderState.agents) ||
    !Array.isArray(parsed.commanderState.tasks) ||
    !Array.isArray(parsed.commanderState.logs)
  ) {
    return null;
  }

  const campaignMigration = migrateCampaigns(parsed.campaigns);
  const commanderState: CommanderState = {
    ...parsed.commanderState,
    agents: parsed.commanderState.agents.map(migrateAgent),
    logs: [
      ...(parsed.version !== STORAGE_VERSION || campaignMigration.migrated
        ? [createLog("STORAGE", importMessage, "INFO")]
        : []),
      ...parsed.commanderState.logs,
    ].slice(0, 150),
  };

  return {
    version: STORAGE_VERSION,
    commanderState,
    settings: {
      ...parsed.settings,
      isPaused: Boolean(parsed.settings.isPaused),
      autoGenerateTasks:
        parsed.version === STORAGE_VERSION
          ? Boolean(parsed.settings.autoGenerateTasks)
          : true,
    },
    campaigns: campaignMigration.campaigns,
    stats: calculateStats(commanderState),
    lastSavedAt: parsed.lastSavedAt ?? new Date().toISOString(),
  };
};

export const formatSaveTime = (iso: string | null) => {
  if (!iso) {
    return "UNSAVED";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(iso));
};

export const buildStorageState = (
  commanderState: CommanderState,
  settings: SimulationSettings,
  campaigns: Campaign[],
  stats: CommanderStats,
  lastSavedAt = new Date().toISOString(),
): StorageState => ({
  version: STORAGE_VERSION,
  commanderState,
  settings,
  campaigns,
  stats,
  lastSavedAt,
});

export const saveStorageState = (storageState: StorageState) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storageState));
  return storageState.lastSavedAt;
};

export const loadStorageState = (): StorageState | null => {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StorageState>;
    const migrated = migrateStorageState(
      parsed,
      "Local storage migrated to Station Runtime v1.",
    );
    if (!migrated) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    return migrated;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

export const clearStorageState = () => {
  window.localStorage.removeItem(STORAGE_KEY);
};

export const downloadStorageJson = (storageState: StorageState) => {
  const payload = JSON.stringify(storageState, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `ultron-command-deck-${Date.now()}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const parseStorageJson = (raw: string): StorageState | null => {
  try {
    const parsed = JSON.parse(raw) as Partial<StorageState>;
    return migrateStorageState(
      parsed,
      "Imported storage migrated to Station Runtime v1.",
    );
  } catch {
    return null;
  }
};
