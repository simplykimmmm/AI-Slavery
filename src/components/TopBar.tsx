import type { CommanderState } from "../types";
import { getCommanderStats } from "../lib/simulation";
import { StatCard } from "./StatCard";

interface TopBarProps {
  lastSavedAt: string | null;
  state: CommanderState;
}

export function TopBar({ lastSavedAt, state }: TopBarProps) {
  const stats = getCommanderStats(state);

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
          <div className="mt-3 inline-flex rounded border border-command-line bg-black/25 px-3 py-1 font-mono text-xs text-slate-400">
            STORAGE: LOCAL // LAST SAVE: {lastSavedAt ?? "UNSAVED"}
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
