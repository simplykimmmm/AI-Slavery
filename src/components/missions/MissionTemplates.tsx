import { missionTemplates } from "../../data/missionTemplates";
import type { MissionTemplate } from "../../types";

interface MissionTemplatesProps {
  onDeploy: (template: MissionTemplate) => void;
}

export function MissionTemplates({ onDeploy }: MissionTemplatesProps) {
  return (
    <section className="rounded-lg border border-command-line bg-command-panel/80 p-4 shadow-panel backdrop-blur">
      <div className="mb-4">
        <h2 className="text-sm font-semibold uppercase text-slate-100">
          Mission Templates
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Preset simulated work packets for quick local deployment.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {missionTemplates.map((template) => (
          <article
            key={template.id}
            className="rounded border border-command-line bg-black/25 p-3"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  {template.name}
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  {template.description}
                </p>
                <div className="mt-3 grid gap-1 font-mono text-xs text-slate-500">
                  <span>TYPE: {template.task.type}</span>
                  <span>ROOM: {template.task.assignedRoom}</span>
                  <span>PRIORITY: {template.task.priority}</span>
                  <span>DIFFICULTY: {template.task.difficulty}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onDeploy(template)}
                className="shrink-0 rounded border border-command-violet/40 bg-command-violet/10 px-3 py-2 text-sm font-semibold text-command-violet transition duration-200 hover:border-command-violet hover:bg-command-violet/20"
              >
                Deploy Mission
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
