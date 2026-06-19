import type {
  Campaign,
  CommanderState,
  CommanderStats,
  SimulationSettings,
  StorageState,
} from "../types";
import { migrateCampaigns } from "./campaigns";
import { createLogEntry } from "./simulation";

const STORAGE_KEY = "ultron-command-deck:v2";
const STORAGE_VERSION = 3;

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
    if (!parsed.commanderState || !parsed.settings) {
      return null;
    }

    const migrated = migrateCampaigns(parsed.campaigns);
    const commanderState = parsed.commanderState as CommanderState;
    const logs = migrated.migrated
      ? [
          createLogEntry(
            "CAMPAIGN_CONTROL",
            "Campaign storage migrated to typed operation plan schema.",
            "INFO",
          ),
          ...(commanderState.logs ?? []),
        ].slice(0, 100)
      : commanderState.logs;

    return {
      ...parsed,
      commanderState: {
        ...commanderState,
        logs,
      },
      campaigns: migrated.campaigns,
    } as StorageState;
  } catch {
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
    if (!parsed.commanderState || !parsed.settings) {
      return null;
    }

    const migrated = migrateCampaigns(parsed.campaigns);
    const commanderState = parsed.commanderState as CommanderState;
    const logs = migrated.migrated
      ? [
          createLogEntry(
            "CAMPAIGN_CONTROL",
            "Imported campaign data migrated to typed operation plan schema.",
            "INFO",
          ),
          ...(commanderState.logs ?? []),
        ].slice(0, 100)
      : commanderState.logs;

    return {
      ...parsed,
      commanderState: {
        ...commanderState,
        logs,
      },
      campaigns: migrated.campaigns,
    } as StorageState;
  } catch {
    return null;
  }
};
