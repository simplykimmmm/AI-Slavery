import { COMMANDER_STEPS } from "../lib/simulation";
import type { CommanderStep } from "../types";

interface StateMachinePanelProps {
  activeStep: CommanderStep;
}

const stepCopy: Record<CommanderStep, string> = {
  SENSORY_INPUT: "Signal intake",
  CONTEXT_ASSEMBLY: "Context stack",
  DECISION_GATE: "Routing check",
  TASK_ASSIGNMENT: "Room dispatch",
  QUALITY_REVIEW: "Gate scoring",
  COOLDOWN_CHECK: "Quota review",
};

export function StateMachinePanel({ activeStep }: StateMachinePanelProps) {
  return (
    <section className="rounded-lg border border-command-line bg-command-panel/80 p-4 shadow-panel backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase text-slate-100">
            Station Commander State
          </h2>
          <p className="mt-1 text-sm text-slate-400">{stepCopy[activeStep]}</p>
        </div>
        <div className="h-3 w-3 rounded-full bg-command-cyan shadow-neon-blue" />
      </div>

      <div className="mt-5 grid gap-3">
        {COMMANDER_STEPS.map((step, index) => {
          const isActive = step === activeStep;

          return (
            <div
              key={step}
              className={`group relative overflow-hidden rounded border p-3 transition duration-500 ${
                isActive
                  ? "border-command-cyan bg-command-cyan/10 shadow-neon-blue"
                  : "border-command-line bg-black/20"
              }`}
            >
              <div
                className={`absolute left-0 top-0 h-full w-1 transition duration-500 ${
                  isActive ? "bg-command-cyan" : "bg-slate-700"
                }`}
              />
              <div className="ml-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-mono text-sm font-semibold text-slate-100">
                    {step}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Phase {index + 1}
                  </div>
                </div>
                <div
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    isActive ? "bg-command-cyan" : "bg-slate-600"
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
