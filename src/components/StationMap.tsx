import { useMemo, useState } from "react";
import type {
  Agent,
  AgentStatus,
  LogEntry,
  StationRoom,
  Task,
  TaskStatus,
} from "../types";

interface StationMapProps {
  agents: Agent[];
  tasks: Task[];
  logs: LogEntry[];
}

type RouteId =
  | "ORACLE_CORE"
  | "CORE_FORGE"
  | "FORGE_JUDGE"
  | "JUDGE_LEDGER"
  | "LEDGER_CORE";

interface RoomDefinition {
  id: StationRoom;
  code: string;
  title: string;
  description: string;
  style: {
    height: string;
    left: string;
    top: string;
    width: string;
  };
}

const ROOMS: RoomDefinition[] = [
  {
    id: "ORACLE",
    code: "R-01",
    title: "Recon Bay",
    description: "Trend scans and market signals",
    style: { left: "4%", top: "8%", width: "22%", height: "24%" },
  },
  {
    id: "FORGE",
    code: "P-02",
    title: "Production Bay",
    description: "Asset drafts and listing packets",
    style: { left: "5%", top: "66%", width: "24%", height: "24%" },
  },
  {
    id: "JUDGE",
    code: "Q-04",
    title: "Review Chamber",
    description: "Quality review and release gate",
    style: { left: "75%", top: "8%", width: "21%", height: "24%" },
  },
  {
    id: "LEDGER",
    code: "E-03",
    title: "Economy Core",
    description: "Quota, token and cost telemetry",
    style: { left: "73%", top: "66%", width: "23%", height: "24%" },
  },
];

const ROUTES: Array<{
  id: RouteId;
  label: string;
  path: string;
  color: string;
  duration: string;
}> = [
  {
    id: "ORACLE_CORE",
    label: "RECON INGRESS",
    path: "M260 120 H330 V270 H375",
    color: "#22d3ee",
    duration: "2.4s",
  },
  {
    id: "CORE_FORGE",
    label: "PRODUCTION DISPATCH",
    path: "M375 335 H330 V470 H290",
    color: "#34d399",
    duration: "2.1s",
  },
  {
    id: "FORGE_JUDGE",
    label: "REVIEW TRANSFER",
    path: "M290 435 H340 V205 H700 V125 H750",
    color: "#a78bfa",
    duration: "3.2s",
  },
  {
    id: "JUDGE_LEDGER",
    label: "RELEASE ACCOUNTING",
    path: "M855 195 V365 H845 V395",
    color: "#f59e0b",
    duration: "1.9s",
  },
  {
    id: "LEDGER_CORE",
    label: "QUOTA RETURN",
    path: "M730 470 H675 V335 H625",
    color: "#34d399",
    duration: "2.3s",
  },
];

const activeTaskStatuses: TaskStatus[] = [
  "QUEUED",
  "ASSIGNED",
  "IN_PROGRESS",
  "REVIEWING",
  "RETRY_REQUIRED",
];

const statusMarkerClassName: Record<AgentStatus, string> = {
  IDLE: "border-slate-300 bg-slate-400",
  WORKING: "border-cyan-100 bg-command-cyan shadow-neon-blue",
  REVIEWING: "border-violet-100 bg-command-violet",
  COOLING_DOWN: "border-amber-100 bg-command-amber",
  THERMAL_THROTTLING: "border-red-100 bg-command-red shadow-neon-red",
  EXHAUSTED: "border-slate-300 bg-slate-600",
  QUARANTINED: "border-red-100 bg-command-red shadow-neon-red",
};

const taskRoom = (task: Task): StationRoom => {
  if (task.assignedRoom !== "AUTO_ASSIGN") {
    return task.assignedRoom;
  }
  if (task.type === "ASSET_DRAFT") {
    return "FORGE";
  }
  if (task.type === "LISTING_BLUEPRINT") {
    return "LEDGER";
  }
  if (task.type === "QUALITY_REVIEW" || task.type === "SYSTEM_DIAGNOSTIC") {
    return "JUDGE";
  }
  return "ORACLE";
};

const roomTone = (agents: Agent[], averageHeat: number) => {
  if (
    averageHeat >= 90 ||
    agents.some((agent) =>
      ["THERMAL_THROTTLING", "QUARANTINED"].includes(agent.status),
    )
  ) {
    return "border-command-red/75 bg-command-red/[0.08] shadow-neon-red";
  }
  if (
    averageHeat >= 72 ||
    agents.some((agent) =>
      ["COOLING_DOWN", "EXHAUSTED"].includes(agent.status),
    )
  ) {
    return "border-command-amber/65 bg-command-amber/[0.07]";
  }
  if (agents.some((agent) => agent.overclocked)) {
    return "station-map-overclock border-command-violet/70 bg-command-violet/[0.08]";
  }
  return "border-command-green/45 bg-command-green/[0.035]";
};

export function StationMap({ agents, tasks, logs }: StationMapProps) {
  const [selectedRoom, setSelectedRoom] = useState<StationRoom>("ORACLE");
  const roomSignals = useMemo(
    () =>
      ROOMS.map((room) => {
        const roomAgents = agents.filter((agent) => agent.room === room.id);
        const activeTasks = tasks.filter(
          (task) =>
            taskRoom(task) === room.id &&
            activeTaskStatuses.includes(task.status),
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
  const activeRouteIds = useMemo(() => {
    const active = new Set<RouteId>();
    const signalFor = (room: StationRoom) =>
      roomSignals.find((signal) => signal.id === room);

    if ((signalFor("ORACLE")?.activeTasks.length ?? 0) > 0) {
      active.add("ORACLE_CORE");
    }
    if ((signalFor("FORGE")?.activeTasks.length ?? 0) > 0) {
      active.add("CORE_FORGE");
    }
    if (tasks.some((task) => task.status === "REVIEWING")) {
      active.add("FORGE_JUDGE");
    }
    if ((signalFor("JUDGE")?.activeTasks.length ?? 0) > 0) {
      active.add("JUDGE_LEDGER");
    }
    if ((signalFor("LEDGER")?.activeTasks.length ?? 0) > 0) {
      active.add("LEDGER_CORE");
    }
    return active;
  }, [roomSignals, tasks]);
  const animatedRouteIds = useMemo(
    () =>
      new Set(
        ROUTES.filter((route) => activeRouteIds.has(route.id))
          .slice(0, 3)
          .map((route) => route.id),
      ),
    [activeRouteIds],
  );
  const selected =
    roomSignals.find((room) => room.id === selectedRoom) ?? roomSignals[0];
  const activeTaskCount = roomSignals.reduce(
    (sum, room) => sum + room.activeTasks.length,
    0,
  );
  const warningAgentCount = agents.filter((agent) =>
    [
      "COOLING_DOWN",
      "THERMAL_THROTTLING",
      "EXHAUSTED",
      "QUARANTINED",
    ].includes(agent.status),
  ).length;
  const latestEvent = logs[0]?.message ?? "Awaiting station telemetry";

  return (
    <section
      aria-labelledby="station-map-title"
      className="station-map-crt overflow-hidden rounded-lg border border-command-green/35 bg-[#020705] shadow-[0_0_35px_rgba(52,211,153,0.08)]"
    >
      <header className="relative z-40 flex flex-col gap-3 border-b border-command-green/20 bg-black/65 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-command-green/65">
            TACTICAL STATION SCHEMATIC // LOCAL SIMULATION
          </div>
          <h2
            id="station-map-title"
            className="mt-1 font-mono text-xl font-semibold uppercase tracking-[0.16em] text-command-green"
          >
            Station Map
          </h2>
        </div>
        <div className="flex flex-wrap gap-2 font-mono text-[10px] uppercase">
          <span className="rounded-sm border border-command-green/25 bg-command-green/5 px-2 py-1 text-command-green">
            {activeRouteIds.size} routes active
          </span>
          <span className="rounded-sm border border-command-cyan/25 bg-command-cyan/5 px-2 py-1 text-command-cyan">
            {activeTaskCount} task packets
          </span>
          <span
            className={`rounded-sm border px-2 py-1 ${
              warningAgentCount > 0
                ? "border-command-amber/35 bg-command-amber/5 text-command-amber"
                : "border-command-green/25 bg-command-green/5 text-command-green"
            }`}
          >
            {warningAgentCount > 0
              ? `${warningAgentCount} crew alerts`
              : "systems nominal"}
          </span>
        </div>
      </header>

      <div className="overflow-x-auto">
        <div className="station-map-grid relative h-[660px] min-w-[1050px] overflow-hidden bg-[#020604]">
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 h-full w-full"
            viewBox="0 0 1000 600"
            preserveAspectRatio="none"
          >
            <defs>
              <filter id="station-route-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {ROUTES.map((route) => {
              const isActive = activeRouteIds.has(route.id);
              const isAnimated = animatedRouteIds.has(route.id);
              return (
                <g key={route.id}>
                  <path
                    d={route.path}
                    fill="none"
                    stroke={isActive ? route.color : "rgba(52,211,153,0.24)"}
                    strokeDasharray={isActive ? "8 6" : "4 8"}
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                    strokeWidth={isActive ? 2 : 1}
                    vectorEffect="non-scaling-stroke"
                    filter={isActive ? "url(#station-route-glow)" : undefined}
                  />
                  {isAnimated && (
                    <rect
                      className="station-map-packet"
                      width="8"
                      height="8"
                      x="-4"
                      y="-4"
                      fill={route.color}
                      rx="1"
                      filter="url(#station-route-glow)"
                    >
                      <animateMotion
                        dur={route.duration}
                        path={route.path}
                        repeatCount="indefinite"
                      />
                    </rect>
                  )}
                </g>
              );
            })}
          </svg>

          <div className="absolute left-[37.5%] top-[37%] z-10 h-[26%] w-[25%] border border-command-green/55 bg-black/85 p-4 shadow-[0_0_28px_rgba(52,211,153,0.12)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-mono text-[10px] tracking-[0.2em] text-command-green/55">
                  M-00 // ROUTING HUB
                </div>
                <h3 className="mt-1 font-mono text-base font-semibold uppercase text-command-green">
                  Command Core
                </h3>
              </div>
              <div className="h-2 w-2 animate-pulse rounded-full bg-command-green shadow-[0_0_12px_#34d399]" />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 font-mono text-[10px] uppercase">
              <div className="border border-command-green/15 bg-command-green/5 p-2">
                <div className="text-slate-600">Packets</div>
                <div className="mt-1 text-base text-command-cyan">
                  {activeTaskCount}
                </div>
              </div>
              <div className="border border-command-green/15 bg-command-green/5 p-2">
                <div className="text-slate-600">Routes</div>
                <div className="mt-1 text-base text-command-green">
                  {activeRouteIds.size}
                </div>
              </div>
            </div>
            <div className="mt-3 truncate border-t border-command-green/15 pt-2 font-mono text-[9px] text-slate-500">
              EVENT // {latestEvent}
            </div>
          </div>

          {roomSignals.map((room) => (
            <button
              key={room.id}
              type="button"
              aria-pressed={selectedRoom === room.id}
              onClick={() => setSelectedRoom(room.id)}
              style={room.style}
              className={`absolute z-10 border p-3 text-left transition duration-300 ${roomTone(room.agents, room.averageHeat)} ${
                selectedRoom === room.id
                  ? "ring-1 ring-command-cyan/80"
                  : "hover:border-command-cyan/60"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-mono text-[9px] tracking-[0.18em] text-slate-600">
                    {room.code} // {room.title.toUpperCase()}
                  </div>
                  <div className="mt-1 font-mono text-sm font-semibold tracking-[0.12em] text-slate-100">
                    {room.id}
                  </div>
                </div>
                <div
                  className={`border bg-black/55 px-2 py-1 font-mono text-[10px] ${
                    room.averageHeat >= 90
                      ? "border-command-red/40 text-command-red"
                      : room.averageHeat >= 72
                        ? "border-command-amber/40 text-command-amber"
                        : "border-command-green/25 text-command-green"
                  }`}
                >
                  {room.averageHeat.toFixed(0)}°C
                </div>
              </div>
              <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-600">
                {room.description}
              </p>
              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1">
                  {room.agents.length === 0 ? (
                    <span className="font-mono text-[9px] text-slate-700">
                      BAY VACANT
                    </span>
                  ) : (
                    room.agents.map((agent) => (
                      <span
                        key={agent.id}
                        aria-label={`${agent.name}: ${agent.status}`}
                        title={`${agent.name}: ${agent.status}`}
                        className={`grid h-4 w-4 place-items-center rounded-full border font-mono text-[7px] text-black ${statusMarkerClassName[agent.status]}`}
                      >
                        {agent.name.slice(0, 1)}
                      </span>
                    ))
                  )}
                </div>
                <span className="font-mono text-[10px] text-command-cyan">
                  {room.activeTasks.length} ACTIVE
                </span>
              </div>
              <div className="mt-3 truncate border-t border-white/5 pt-2 font-mono text-[9px] text-slate-500">
                {room.activeTasks[0]?.title ?? "NO TASK PACKETS"}
              </div>
            </button>
          ))}

          {selected && (
            <aside className="absolute left-[36%] top-[5%] z-10 w-[28%] border border-command-cyan/20 bg-black/80 px-3 py-2 font-mono text-[9px] uppercase text-slate-500">
              <div className="flex items-center justify-between gap-3">
                <span className="text-command-cyan">
                  Selected // {selected.id}
                </span>
                <span>{selected.activeTasks.length} task packets</span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-3 border-t border-command-cyan/10 pt-1">
                <span>
                  State: {selected.agents.map((agent) => agent.status).join(", ") || "VACANT"}
                </span>
                <span>Heat: {selected.averageHeat.toFixed(0)}°C</span>
              </div>
            </aside>
          )}

          <div className="absolute bottom-[2%] left-[35%] z-10 flex w-[30%] items-center justify-center gap-4 border border-command-green/10 bg-black/65 px-3 py-2 font-mono text-[8px] uppercase text-slate-600">
            <span className="flex items-center gap-1">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-command-cyan"
              />{" "}
              Working
            </span>
            <span className="flex items-center gap-1">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-command-amber"
              />{" "}
              Recovery
            </span>
            <span className="flex items-center gap-1">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-command-red"
              />{" "}
              Alert
            </span>
          </div>

          <div
            aria-hidden="true"
            className="absolute bottom-[1.5%] right-[2%] z-10 h-[8%] w-[16%] border border-command-green/45 bg-black/90 p-1 shadow-[0_0_12px_rgba(52,211,153,0.12)]"
          >
            <div className="relative h-full w-full border border-command-green/10">
              <span className="absolute left-[4%] top-[8%] h-[28%] w-[22%] border border-command-green/40" />
              <span className="absolute left-[5%] top-[64%] h-[28%] w-[24%] border border-command-green/40" />
              <span className="absolute left-[38%] top-[38%] h-[27%] w-[25%] border border-command-cyan/50" />
              <span className="absolute left-[75%] top-[8%] h-[28%] w-[21%] border border-command-green/40" />
              <span className="absolute left-[73%] top-[64%] h-[28%] w-[23%] border border-command-green/40" />
              <span className="absolute bottom-0 right-0 bg-command-green px-1 font-mono text-[6px] text-black">
                MINIMAP
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
