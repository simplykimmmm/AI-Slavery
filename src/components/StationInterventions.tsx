import type { SimulationSettings, StationRoom } from "../types";

interface StationInterventionsProps {
  settings: SimulationSettings;
  onChangeSettings: (settings: SimulationSettings) => void;
  onPurgeRoom: (room: StationRoom) => void;
  onReset: () => void;
  onOpenStationMap?: () => void;
}

const rooms: StationRoom[] = ["ORACLE", "FORGE", "LEDGER", "JUDGE"];

const controlClassName =
  "rounded border border-command-line bg-black/25 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-command-cyan/50 hover:text-command-cyan";

export function StationInterventions({
  settings,
  onChangeSettings,
  onPurgeRoom,
  onReset,
  onOpenStationMap,
}: StationInterventionsProps) {
  return (
    <section className="rounded-lg border border-command-violet/25 bg-command-panel/80 p-4 shadow-panel backdrop-blur">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase text-command-violet">
            STATION COMMANDER INTERVENTIONS
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Reversible browser-local quality-control actions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenStationMap && (
            <button
              type="button"
              className={`${controlClassName} border-command-cyan/40 text-command-cyan`}
              onClick={onOpenStationMap}
            >
              Open Station Map
            </button>
          )}
          <button
            type="button"
            className={`${controlClassName} ${settings.isPaused ? "border-command-green/50 text-command-green" : "border-command-amber/50 text-command-amber"}`}
            onClick={() =>
              onChangeSettings({ ...settings, isPaused: !settings.isPaused })
            }
          >
            {settings.isPaused ? "Resume Station" : "Pause Station"}
          </button>

          <label className="sr-only" htmlFor="station-cycle-speed">
            Station cycle speed
          </label>
          <select
            id="station-cycle-speed"
            className={controlClassName}
            value={settings.cycleSpeed}
            onChange={(event) =>
              onChangeSettings({
                ...settings,
                cycleSpeed: event.target.value as SimulationSettings["cycleSpeed"],
              })
            }
          >
            <option value="SLOW">Slow · 3.0s</option>
            <option value="NORMAL">Normal · 1.5s</option>
            <option value="FAST">Fast · 0.75s</option>
            <option value="OVERDRIVE">Overdrive · 0.35s</option>
          </select>

          {rooms.map((room) => (
            <button
              key={room}
              type="button"
              className={controlClassName}
              onClick={() => onPurgeRoom(room)}
            >
              Cool {room}
            </button>
          ))}

          <button
            type="button"
            className={`${controlClassName} border-command-red/40 text-command-red hover:border-command-red`}
            onClick={onReset}
          >
            Reset Simulation
          </button>
        </div>
      </div>
    </section>
  );
}
