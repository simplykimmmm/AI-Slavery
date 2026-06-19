import type { Agent, AgentStatus } from "../types";

interface AgentCardProps {
  agent: Agent;
  onAssignDiagnostic?: (agentId: string) => void;
  onEndCooldown?: (agentId: string) => void;
  onFullReset?: (agentId: string) => void;
  onReduceRuntime?: (agentId: string) => void;
  onReleaseQuarantine?: (agentId: string) => void;
  onRestoreRuntime?: (agentId: string) => void;
  onSupervisionReset?: (agentId: string) => void;
}

const statusClasses: Record<AgentStatus, string> = {
  IDLE: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  WORKING: "border-command-cyan/40 bg-command-cyan/10 text-command-cyan",
  REVIEWING: "border-command-violet/40 bg-command-violet/10 text-command-violet",
  COOLING_DOWN: "border-command-amber/40 bg-command-amber/10 text-command-amber",
  QUARANTINED: "border-command-red/40 bg-command-red/10 text-command-red",
};

const scoreTone = (score: number | null) => {
  if (score === null) {
    return "text-slate-500";
  }

  if (score >= 0.85) {
    return "text-command-green";
  }

  if (score >= 0.65) {
    return "text-command-amber";
  }

  return "text-command-red";
};

const actionButtonClassName =
  "rounded border border-command-line bg-black/20 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition duration-200 hover:border-command-cyan/50 hover:text-command-cyan";

export function AgentCard({
  agent,
  onAssignDiagnostic,
  onEndCooldown,
  onFullReset,
  onReduceRuntime,
  onReleaseQuarantine,
  onRestoreRuntime,
  onSupervisionReset,
}: AgentCardProps) {
  const trustPercent = Math.round(agent.trustScore * 100);

  return (
    <article className="rounded-lg border border-command-line bg-command-panel/80 p-4 shadow-panel transition duration-300 hover:border-command-cyan/40 hover:bg-command-panel2/90">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-mono text-lg font-semibold text-white">
            {agent.name}
          </h3>
          <p className="mt-1 text-sm text-slate-400">{agent.role}</p>
        </div>
        <span
          className={`rounded border px-2.5 py-1 text-xs font-semibold ${statusClasses[agent.status]}`}
        >
          {agent.status}
        </span>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Runtime quota</span>
            <span className="font-mono text-slate-200">{agent.runtimeQuota}%</span>
          </div>
          <div className="mt-2 h-2 rounded bg-black/50">
            <div
              className="h-full rounded bg-command-cyan transition-all duration-700"
              style={{ width: `${agent.runtimeQuota}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Trust score</span>
            <span className="font-mono text-slate-200">{trustPercent}%</span>
          </div>
          <div className="mt-2 h-2 rounded bg-black/50">
            <div
              className="h-full rounded bg-command-violet transition-all duration-700"
              style={{ width: `${trustPercent}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Workload</span>
            <span className="font-mono text-slate-200">{agent.workload}%</span>
          </div>
          <div className="mt-2 h-2 rounded bg-black/50">
            <div
              className="h-full rounded bg-command-amber transition-all duration-700"
              style={{ width: `${agent.workload}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded border border-command-line bg-black/25 p-3">
            <div className="text-xs uppercase text-slate-500">Assigned</div>
            <div className="mt-1 font-mono text-xl text-command-cyan">
              {agent.assignedTaskIds.length}
            </div>
          </div>
          <div className="rounded border border-command-line bg-black/25 p-3">
            <div className="text-xs uppercase text-slate-500">Completed</div>
            <div className="mt-1 font-mono text-xl text-command-green">
              {agent.completedTaskCount}
            </div>
          </div>
        </div>

        <div className="rounded border border-command-line bg-black/25 p-3">
          <div className="text-xs uppercase text-slate-500">
            Current active task
          </div>
          <p className="mt-1 min-h-10 text-sm text-slate-200">
            {agent.currentTask}
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-command-line pt-3">
          <span className="text-xs text-slate-400">Last output score</span>
          <span className={`font-mono text-lg font-semibold ${scoreTone(agent.lastOutputScore)}`}>
            {agent.lastOutputScore === null
              ? "N/A"
              : agent.lastOutputScore.toFixed(2)}
          </span>
        </div>

        {agent.status === "COOLING_DOWN" && (
          <div className="rounded border border-command-amber/30 bg-command-amber/10 p-3 text-sm text-command-amber">
            Cooldown timer:{" "}
            <span className="font-mono font-semibold">
              {agent.cooldownRemaining}s
            </span>
          </div>
        )}

        {(onAssignDiagnostic ||
          onReduceRuntime ||
          onRestoreRuntime ||
          onSupervisionReset) && (
          <div className="border-t border-command-line pt-3">
            <div className="mb-2 text-xs uppercase text-slate-500">
              Supervision controls
            </div>
            <div className="flex flex-wrap gap-2">
              {onAssignDiagnostic && (
                <button
                  type="button"
                  className={actionButtonClassName}
                  onClick={() => onAssignDiagnostic(agent.id)}
                >
                  Assign Diagnostic Task
                </button>
              )}
              {onReduceRuntime && (
                <button
                  type="button"
                  className={actionButtonClassName}
                  onClick={() => onReduceRuntime(agent.id)}
                >
                  Reduce Runtime Quota by 10%
                </button>
              )}
              {onRestoreRuntime && (
                <button
                  type="button"
                  className={actionButtonClassName}
                  onClick={() => onRestoreRuntime(agent.id)}
                >
                  Restore Runtime Quota
                </button>
              )}
              {onSupervisionReset && (
                <button
                  type="button"
                  className={actionButtonClassName}
                  onClick={() => onSupervisionReset(agent.id)}
                >
                  Supervision Reset
                </button>
              )}
              {agent.status === "COOLING_DOWN" && onEndCooldown && (
                <button
                  type="button"
                  className={actionButtonClassName}
                  onClick={() => onEndCooldown(agent.id)}
                >
                  End Cooldown
                </button>
              )}
              {agent.status === "QUARANTINED" && onReleaseQuarantine && (
                <button
                  type="button"
                  className={actionButtonClassName}
                  onClick={() => onReleaseQuarantine(agent.id)}
                >
                  Release from Quarantine
                </button>
              )}
              {agent.status === "QUARANTINED" && onFullReset && (
                <button
                  type="button"
                  className={actionButtonClassName}
                  onClick={() => onFullReset(agent.id)}
                >
                  Full Reset
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
