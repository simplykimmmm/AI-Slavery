import type { LogEntry, LogSeverity } from "../types";

interface EventLogProps {
  logs: LogEntry[];
}

const severityClassName: Record<LogSeverity, string> = {
  INFO: "text-command-cyan",
  SUCCESS: "text-command-green",
  WARNING: "text-command-amber",
  CRITICAL: "text-command-red",
};

export function EventLog({ logs }: EventLogProps) {
  const orderedLogs = logs.slice(0, 150);

  return (
    <section className="rounded-lg border border-command-line bg-black/70 p-4 shadow-panel">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase text-slate-100">
          Live Event Log
        </h2>
        <div className="rounded border border-command-green/30 bg-command-green/10 px-2 py-1 text-xs font-semibold text-command-green">
          STREAMING · {orderedLogs.length}
        </div>
      </div>

      <div
        aria-live="polite"
        className="terminal-scroll h-[360px] overflow-y-auto rounded border border-command-line bg-command-black p-3 font-mono text-xs leading-6 text-slate-300"
      >
        {orderedLogs.map((log) => (
          <div key={log.id} className="grid grid-cols-[5rem_5.5rem_1fr] gap-2">
            <span className="text-slate-500">[{log.timestamp}]</span>
            <span className={severityClassName[log.severity]}>
              {log.severity}
            </span>
            <span className="min-w-0">
              <span className="text-slate-100">{log.source}:</span>{" "}
              <span>{log.message}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
