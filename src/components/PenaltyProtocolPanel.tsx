import type { Task, TaskStatus } from "../types";

interface PenaltyProtocolPanelProps {
  tasks: Task[];
}

const rules = [
  {
    label: "Accepted",
    range: "score >= 0.85",
    detail: "Trust score increases",
    className: "border-command-green/30 bg-command-green/10 text-command-green",
  },
  {
    label: "Retry requested",
    range: "score >= 0.65",
    detail: "Small warning logged",
    className: "border-command-amber/30 bg-command-amber/10 text-command-amber",
  },
  {
    label: "Penalty Protocol",
    range: "score >= 0.40",
    detail: "Cooldown and quota reduction",
    className: "border-command-red/30 bg-command-red/10 text-command-red",
  },
  {
    label: "Quarantine",
    range: "score < 0.40",
    detail: "Room pauses for supervision",
    className: "border-command-violet/30 bg-command-violet/10 text-command-violet",
  },
];

const countStatus = (tasks: Task[], status: TaskStatus) =>
  tasks.filter((task) => task.status === status).length;

export function PenaltyProtocolPanel({ tasks }: PenaltyProtocolPanelProps) {
  const latestScoredTask = tasks.find((task) => task.qualityScore !== null);

  return (
    <section className="rounded-lg border border-command-line bg-command-panel/80 p-4 shadow-panel backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase text-slate-100">
            Penalty Protocol
          </h2>
          <p className="mt-1 text-sm text-slate-400">Quality gate thresholds</p>
        </div>
        <div className="font-mono text-xl font-semibold text-command-red">
          {latestScoredTask?.qualityScore?.toFixed(2) ?? "0.00"}
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {rules.map((rule) => (
          <div
            key={rule.label}
            className={`rounded border p-3 transition duration-300 ${rule.className}`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-slate-100">{rule.label}</span>
              <span className="font-mono text-xs">{rule.range}</span>
            </div>
            <p className="mt-1 text-sm text-slate-300">{rule.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded border border-command-line bg-black/25 p-3">
          <div className="text-xs uppercase text-slate-500">Accepted</div>
          <div className="mt-1 font-mono text-xl text-command-green">
            {countStatus(tasks, "ACCEPTED")}
          </div>
        </div>
        <div className="rounded border border-command-line bg-black/25 p-3">
          <div className="text-xs uppercase text-slate-500">Retry</div>
          <div className="mt-1 font-mono text-xl text-command-amber">
            {countStatus(tasks, "RETRY_REQUIRED")}
          </div>
        </div>
        <div className="rounded border border-command-line bg-black/25 p-3">
          <div className="text-xs uppercase text-slate-500">Protocol</div>
          <div className="mt-1 font-mono text-xl text-command-red">
            {countStatus(tasks, "PENALTY_APPLIED")}
          </div>
        </div>
        <div className="rounded border border-command-line bg-black/25 p-3">
          <div className="text-xs uppercase text-slate-500">Quarantine</div>
          <div className="mt-1 font-mono text-xl text-command-violet">
            {countStatus(tasks, "QUARANTINED")}
          </div>
        </div>
      </div>
    </section>
  );
}
