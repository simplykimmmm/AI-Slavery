import type { SimulationSettings } from "../../types";

interface SimulationControlsProps {
  settings: SimulationSettings;
  onChange: (settings: SimulationSettings) => void;
}

const fieldClassName =
  "w-full rounded border border-command-line bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none transition duration-200 focus:border-command-cyan focus:shadow-neon-blue";

const labelClassName = "text-xs font-semibold uppercase text-slate-500";

export function SimulationControls({
  settings,
  onChange,
}: SimulationControlsProps) {
  const patchSettings = (patch: Partial<SimulationSettings>) => {
    onChange({ ...settings, ...patch });
  };

  return (
    <section className="rounded-lg border border-command-line bg-command-panel/80 p-4 shadow-panel backdrop-blur">
      <div className="mb-4">
        <h2 className="text-sm font-semibold uppercase text-slate-100">
          Simulation Control
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Local runtime behavior for the commander loop and task pipeline.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded border border-command-line bg-black/25 p-3">
          <div className={labelClassName}>Simulation</div>
          <button
            type="button"
            onClick={() => patchSettings({ isPaused: !settings.isPaused })}
            className={`mt-2 w-full rounded border px-3 py-2 text-sm font-semibold transition duration-200 ${
              settings.isPaused
                ? "border-command-green/40 bg-command-green/10 text-command-green"
                : "border-command-amber/40 bg-command-amber/10 text-command-amber"
            }`}
          >
            {settings.isPaused ? "Resume Simulation" : "Pause Simulation"}
          </button>
        </div>

        <div>
          <label className={labelClassName} htmlFor="cycle-speed">
            Cycle speed
          </label>
          <select
            id="cycle-speed"
            className={`mt-1 ${fieldClassName}`}
            value={settings.cycleSpeed}
            onChange={(event) =>
              patchSettings({
                cycleSpeed: event.target.value as SimulationSettings["cycleSpeed"],
              })
            }
          >
            <option value="SLOW">Slow</option>
            <option value="NORMAL">Normal</option>
            <option value="FAST">Fast</option>
            <option value="OVERDRIVE">Overdrive</option>
          </select>
        </div>

        <div>
          <label className={labelClassName} htmlFor="auto-process">
            Auto-process tasks
          </label>
          <select
            id="auto-process"
            className={`mt-1 ${fieldClassName}`}
            value={settings.autoProcessTasks ? "ON" : "OFF"}
            onChange={(event) =>
              patchSettings({ autoProcessTasks: event.target.value === "ON" })
            }
          >
            <option value="ON">ON</option>
            <option value="OFF">OFF</option>
          </select>
        </div>

        <div>
          <label className={labelClassName} htmlFor="auto-generate">
            Auto-generate random tasks
          </label>
          <select
            id="auto-generate"
            className={`mt-1 ${fieldClassName}`}
            value={settings.autoGenerateTasks ? "ON" : "OFF"}
            onChange={(event) =>
              patchSettings({ autoGenerateTasks: event.target.value === "ON" })
            }
          >
            <option value="OFF">OFF</option>
            <option value="ON">ON</option>
          </select>
        </div>

        <div>
          <label className={labelClassName} htmlFor="max-active">
            Max active tasks per agent
          </label>
          <input
            id="max-active"
            className={`mt-1 ${fieldClassName}`}
            min={1}
            max={8}
            type="number"
            value={settings.maxActiveTasksPerAgent}
            onChange={(event) =>
              patchSettings({
                maxActiveTasksPerAgent: Number(event.target.value),
              })
            }
          />
        </div>

        <div>
          <label className={labelClassName} htmlFor="quality-strictness">
            Quality strictness
          </label>
          <select
            id="quality-strictness"
            className={`mt-1 ${fieldClassName}`}
            value={settings.qualityStrictness}
            onChange={(event) =>
              patchSettings({
                qualityStrictness:
                  event.target.value as SimulationSettings["qualityStrictness"],
              })
            }
          >
            <option value="LENIENT">Lenient</option>
            <option value="NORMAL">Normal</option>
            <option value="HARSH">Harsh</option>
          </select>
        </div>
      </div>
    </section>
  );
}
