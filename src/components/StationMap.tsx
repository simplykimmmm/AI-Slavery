import { useMemo, useState } from "react";
import type { Agent, StationRoom, Task, TaskStatus } from "../types";

interface StationMapProps {
  agents: Agent[];
  tasks: Task[];
}

const ROOMS: Array<{
  id: StationRoom;
  label: string;
  description: string;
}> = [
  { id: "ORACLE", label: "ORACLE", description: "Trend and recon signals" },
  { id: "FORGE", label: "FORGE", description: "Asset and listing creation" },
  { id: "LEDGER", label: "LEDGER", description: "Budget and economy telemetry" },
  { id: "JUDGE", label: "JUDGE", description: "Quality review and release gate" },
];

const inactiveStatuses: TaskStatus[] = [
  "ACCEPTED",
  "PENALTY_APPLIED",
  "QUARANTINED",
  "FAILED",
  "CANCELLED",
];

const roomForTask = (task: Task): StationRoom =>
  task.assignedRoom === "AUTO_ASSIGN" ? "ORACLE" : task.assignedRoom;

const heatTone = (temperature: number) => {
  if (temperature >= 90) {
    return "border-command-red/60 bg-command-red/10 shadow-neon-red";
  }
  if (temperature >= 72) {
    return "border-command-amber/50 bg-command-amber/10";
  }
  return "border-command-cyan/30 bg-command-cyan/5";
};

export function StationMap({ agents, tasks }: StationMapProps) {
  const [selectedRoom, setSelectedRoom] = useState<StationRoom>("ORACLE");
  const roomSignals = useMemo(
    () =>
      ROOMS.map((room) => {
        const roomAgents = agents.filter((agent) => agent.room === room.id);
        const activeTasks = tasks.filter(
          (task) =>
            roomForTask(task) === room.id &&
            !inactiveStatuses.includes(task.status),
        );
        const averageHeat =
          roomAgents.length === 0
            ? 0
            : roomAgents.reduce(
                (sum, agent) => sum + agent.computeCoreTemp,
                0,
              ) / roomAgents.length;
        return { ...room, agents: roomAgents, activeTasks, averageHeat };
      }),
    [agents, tasks],
  );
  const selected =
    roomSignals.find((room) => room.id === selectedRoom) ?? roomSignals[0];
  const packetRoutes = roomSignals
    .filter((room) => room.id !== "JUDGE" && room.activeTasks.length > 0)
    .map((room) => room.id);

  return (
    <section className="rounded-lg border border-command-line bg-command-panel/75 p-4 shadow-panel backdrop-blur">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase text-command-violet">
            STATION TOPOLOGY // LIVE TRAVERSAL
          </div>
          <h2 className="mt-1 text-lg font-semibold text-white">Station Map</h2>
        </div>
        <div className="font-mono text-xs text-slate-500">
          {packetRoutes.length} ACTIVE DATA ROUTES
        </div>
      </div>

      <div className="relative mt-4 overflow-hidden rounded border border-command-line bg-black/35 p-3">
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <path d="M26 25 L74 72" stroke="rgba(34,211,238,.22)" strokeDasharray="2 2" fill="none" />
          <path d="M74 25 L78 68" stroke="rgba(167,139,250,.22)" strokeDasharray="2 2" fill="none" />
          <path d="M26 75 L74 75" stroke="rgba(52,211,153,.22)" strokeDasharray="2 2" fill="none" />
          {packetRoutes.includes("ORACLE") && (
            <circle r="1.2" fill="#22d3ee">
              <animateMotion dur="1.8s" repeatCount="indefinite" path="M26 25 L74 72" />
            </circle>
          )}
          {packetRoutes.includes("FORGE") && (
            <circle r="1.2" fill="#a78bfa">
              <animateMotion dur="1.35s" repeatCount="indefinite" path="M74 25 L78 68" />
            </circle>
          )}
          {packetRoutes.includes("LEDGER") && (
            <circle r="1.2" fill="#34d399">
              <animateMotion dur="1.55s" repeatCount="indefinite" path="M26 75 L74 75" />
            </circle>
          )}
        </svg>

        <div className="relative grid gap-3 sm:grid-cols-2">
          {roomSignals.map((room) => (
            <button
              key={room.id}
              type="button"
              aria-pressed={selectedRoom === room.id}
              onClick={() => setSelectedRoom(room.id)}
              className={`min-h-28 rounded border p-3 text-left transition duration-300 ${heatTone(room.averageHeat)} ${selectedRoom === room.id ? "ring-1 ring-command-violet" : "hover:border-command-violet/50"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-sm font-semibold text-white">
                    {room.label}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {room.description}
                  </div>
                </div>
                <div className="rounded border border-command-line bg-black/40 px-2 py-1 font-mono text-xs text-command-cyan">
                  {room.averageHeat.toFixed(0)}°C
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between text-xs">
                <span className="text-slate-300">
                  {room.agents.map((agent) => agent.name).join(", ") || "NO AGENT"}
                </span>
                <span className="font-mono text-command-amber">
                  {room.activeTasks.length} ACTIVE
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <div className="mt-3 grid gap-3 rounded border border-command-line bg-black/25 p-3 text-xs sm:grid-cols-3">
          <div>
            <div className="uppercase text-slate-500">Selected room</div>
            <div className="mt-1 font-mono text-command-violet">
              {selected.id}
            </div>
          </div>
          <div>
            <div className="uppercase text-slate-500">Agent state</div>
            <div className="mt-1 font-mono text-slate-200">
              {selected.agents.map((agent) => agent.status).join(", ") || "VACANT"}
            </div>
          </div>
          <div>
            <div className="uppercase text-slate-500">Current packet</div>
            <div className="mt-1 truncate font-mono text-slate-200">
              {selected.activeTasks[0]?.title ?? "NO ACTIVE PACKET"}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
