import type { CampaignObjective } from "../../types";

interface CampaignObjectivesProps {
  objectives: CampaignObjective[];
}

export function CampaignObjectives({ objectives }: CampaignObjectivesProps) {
  return (
    <section className="rounded border border-command-line bg-black/20 p-3">
      <h3 className="text-sm font-semibold uppercase text-slate-100">
        Objectives
      </h3>
      <div className="mt-3 grid gap-3">
        {objectives.map((objective) => {
          const progress =
            objective.targetValue === 0
              ? objective.failed
                ? 100
                : objective.completed
                  ? 100
                  : 0
              : Math.min(
                  Math.round((objective.currentValue / objective.targetValue) * 100),
                  100,
                );

          return (
            <div
              key={objective.id}
              className="rounded border border-command-line bg-command-panel/60 p-3"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-100">
                    {objective.completed
                      ? "[COMPLETE] "
                      : objective.failed
                        ? "[FAILED] "
                        : ""}
                    {objective.label}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {objective.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 font-mono text-[0.65rem] text-slate-500">
                    <span>TYPE: {objective.type}</span>
                    {objective.requiredTaskType && (
                      <span>REQUIRED: {objective.requiredTaskType}</span>
                    )}
                    {objective.requiredTaskTypes &&
                      objective.requiredTaskTypes.length > 0 && (
                        <span>
                          REQUIRED: {objective.requiredTaskTypes.join(" / ")}
                        </span>
                      )}
                    {objective.hardFail && <span>HARD FAIL GATE</span>}
                  </div>
                </div>
                <div className="font-mono text-xs text-slate-400">
                  {objective.currentValue}/{objective.targetValue}
                </div>
              </div>
              <div className="mt-3 h-2 rounded bg-black/50">
                <div
                  className={`h-full rounded transition-all duration-700 ${
                    objective.failed
                      ? "bg-command-red"
                      : objective.completed
                        ? "bg-command-green"
                        : "bg-command-cyan"
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
