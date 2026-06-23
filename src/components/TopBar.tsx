import type { CommanderState } from "../types";
import { calculateStats } from "../lib/stationRuntime";
import { StatCard } from "./StatCard";
import type { BackendConnectionStatus, RuntimeMode } from "../lib/useLiveStationRuntime";

interface TopBarProps {
  lastSavedAt: string | null;
  state: CommanderState;
  connectionStatus: BackendConnectionStatus;
  runtimeMode: RuntimeMode;
}

export function TopBar({ lastSavedAt, state, connectionStatus, runtimeMode }: TopBarProps) {
  const stats = calculateStats(state);

  return (
    <header className="rounded-lg border border-command-line bg-command-panel/85 p-4 shadow-panel backdrop-blur">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase text-command-cyan">
            ULTRON-OS // STATION COMMANDER
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-white md:text-3xl">
            Command Deck
          </h1>
          <div className="mt-3 flex flex-wrap gap-2 font-mono text-xs">
            <span className={`rounded border px-3 py-1 ${connectionStatus === "LIVE" ? "border-command-green/40 bg-command-green/10 text-command-green" : connectionStatus === "RECONNECTING" ? "border-command-amber/40 bg-command-amber/10 text-command-amber" : "border-command-red/40 bg-command-red/10 text-command-red"}`}>
              CONNECTION: {connectionStatus}
            </span>
            <span className={`rounded border px-3 py-1 ${runtimeMode === "BACKEND" ? "border-command-cyan/40 bg-command-cyan/10 text-command-cyan" : "border-command-amber/50 bg-command-amber/10 text-command-amber"}`}>
              {runtimeMode === "BACKEND" ? "PERSISTENT BACKEND MODE" : "LOCAL SIMULATION MODE"}
            </span>
            <span className="rounded border border-command-line bg-black/25 px-3 py-1 text-slate-400">
              LAST LOCAL SAVE: {lastSavedAt ?? "UNSAVED"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <StatCard
            label="System"
            value={state.systemStatus}
            tone={state.systemStatus === "ONLINE" ? "green" : "amber"}
          />
          <StatCard
            label="Runtime quota"
            value={`${stats.runtimeQuota}%`}
            tone="cyan"
          />
          <StatCard
            label="Active agents"
            value={stats.activeAgents}
            tone="violet"
          />
          <StatCard
            label="Tasks processed"
            value={stats.tasksProcessed}
            tone="green"
          />
          <StatCard
            label="Rejected outputs"
            value={stats.rejectedOutputs}
            tone={stats.rejectedOutputs > 0 ? "red" : "green"}
          />
          <StatCard label="Current cycle" value={stats.currentCycle} tone="amber" />
        </div>
      </div>
    </header>
  );
}
